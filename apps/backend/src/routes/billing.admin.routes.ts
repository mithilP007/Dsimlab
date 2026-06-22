import { FastifyInstance } from 'fastify';
import { requireRole } from '../auth/middleware';
import { UserRole } from '../auth/roles';
import { prisma } from '../db/client';
import { z } from 'zod';
import { ValidationError, NotFoundError } from '../utils/errors';


export async function billingAdminRoutes(fastify: FastifyInstance) {
  // Guard all endpoints under this router to require ADMIN role
  fastify.addHook('preHandler', requireRole([UserRole.ADMIN]));

  /**
   * GET /api/v1/admin/billing/stats
   * Returns financial overview charts and stats.
   */
  fastify.get('/stats', async (_request, reply) => {
    // 1. Total Revenue
    const revenueSum = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'captured' }
    });
    const revenue = revenueSum._sum.amount || 0;

    // 2. Active subscription count & MRR/ARR
    const activeSubs = await prisma.subscription.findMany({
      where: { status: 'active' },
      include: { plan: true }
    });

    let mrr = 0;
    activeSubs.forEach(sub => {
      if (sub.billingCycle === 'monthly') {
        mrr += sub.plan.priceMonthly;
      } else if (sub.billingCycle === 'yearly') {
        mrr += sub.plan.priceYearly / 12;
      }
    });
    const arr = mrr * 12;

    // 3. Churn estimation
    const totalCancelled = await prisma.subscription.count({
      where: { status: 'cancelled' }
    });
    const totalActive = activeSubs.length || 1;
    const churnRate = parseFloat(((totalCancelled / (totalActive + totalCancelled)) * 100).toFixed(1)) || 0.0;

    // 4. Trial conversions
    const totalTrial = await prisma.subscription.count({
      where: { billingCycle: 'trial' }
    });
    const trialConverted = await prisma.subscription.count({
      where: {
        billingCycle: 'trial',
        user: {
          subscriptions: {
            some: {
              billingCycle: { in: ['monthly', 'yearly'] },
              status: 'active'
            }
          }
        }
      }
    });
    const trialConversions = totalTrial > 0
      ? parseFloat(((trialConverted / totalTrial) * 100).toFixed(1))
      : 0;

    // 5. Failed payments
    const failedPayments = await prisma.payment.count({
      where: { status: 'failed' }
    });

    // 6. Refunds
    const refundData = await prisma.payment.aggregate({
      _sum: { refundedAmount: true },
      where: { refundedAmount: { gt: 0 } }
    });
    const refundStatistics = refundData._sum.refundedAmount || 0;

    // 7. Plan distribution
    const planCounts: Record<string, number> = {};
    activeSubs.forEach(sub => {
      planCounts[sub.plan.name] = (planCounts[sub.plan.name] || 0) + 1;
    });
    const planDistribution = Object.keys(planCounts).map(name => ({
      name,
      value: planCounts[name]
    }));

    // 8. Revenue trends last 6 months
    const now = new Date();
    const revenueTrends: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      revenueTrends.push({ month: key, amount: 0 });
    }

    const payments = await prisma.payment.findMany({
      where: { status: 'captured' },
      select: { amount: true, createdAt: true }
    });

    payments.forEach(pay => {
      const key = pay.createdAt.toLocaleString('default', { month: 'short', year: 'numeric' });
      const trend = revenueTrends.find(t => t.month === key);
      if (trend) {
        trend.amount += pay.amount;
      }
    });

    return reply.status(200).send({
      success: true,
      stats: {
        revenue,
        mrr,
        arr,
        churnRate,
        activeSubscriptions: activeSubs.length,
        trialConversions,
        failedPayments,
        refundStatistics
      },
      planDistribution,
      revenueTrends
    });
  });

  /**
   * GET /api/v1/admin/billing/coupons
   * Returns list of coupons.
   */
  fastify.get('/coupons', async (_request, reply) => {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return reply.status(200).send({ success: true, coupons });
  });

  /**
   * POST /api/v1/admin/billing/coupons
   * Provisions a new coupon.
   */
  fastify.post('/coupons', async (request, reply) => {
    const bodySchema = z.object({
      code: z.string().min(1),
      discountType: z.enum(['percentage', 'flat', 'trial_extension']),
      discountValue: z.number().min(0),
      durationMonths: z.number().nullable().optional(),
      maxRedemptions: z.number().nullable().optional()
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const { code, discountType, discountValue, durationMonths, maxRedemptions } = parsed.data;

    // Check code collision
    const existing = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    });
    if (existing) {
      throw new ValidationError('A coupon code with this name already exists.');
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountType,
        discountValue,
        durationMonths: durationMonths || null,
        maxRedemptions: maxRedemptions || null
      }
    });

    return reply.status(201).send({ success: true, coupon });
  });

  /**
   * POST /api/v1/admin/billing/plans
   * Adds a new pricing plan.
   */
  fastify.post('/plans', {
    schema: {
      description: 'Provisions a new billing/pricing plan (Admin only)',
      tags: ['Admin Billing'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'code', 'priceMonthly', 'priceYearly', 'simulationLimit', 'studentLimit', 'instructorLimit', 'certificateLimit', 'reportExportLimit'],
        properties: {
          name: { type: 'string' },
          code: { type: 'string' },
          priceMonthly: { type: 'number' },
          priceYearly: { type: 'number' },
          currency: { type: 'string', default: 'INR' },
          simulationLimit: { type: 'integer' },
          studentLimit: { type: 'integer' },
          instructorLimit: { type: 'integer' },
          certificateLimit: { type: 'integer' },
          reportExportLimit: { type: 'integer' },
          storageLimitMb: { type: 'integer', default: 50 },
          features: { type: 'array', items: { type: 'string' } },
          isActive: { type: 'boolean', default: true },
          durationDays: { type: 'integer', default: 30 }
        }
      }
    }
  }, async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(1),
      code: z.string().min(1).toLowerCase(),
      priceMonthly: z.number().min(0),
      priceYearly: z.number().min(0),
      currency: z.string().default('INR'),
      simulationLimit: z.number().int(),
      studentLimit: z.number().int(),
      instructorLimit: z.number().int(),
      certificateLimit: z.number().int(),
      reportExportLimit: z.number().int(),
      storageLimitMb: z.number().int().default(50),
      features: z.array(z.string()).default([]),
      isActive: z.boolean().default(true),
      durationDays: z.number().int().min(1).default(30)
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const existing = await prisma.plan.findFirst({
      where: {
        OR: [
          { name: parsed.data.name },
          { code: parsed.data.code }
        ]
      }
    });

    if (existing) {
      throw new ValidationError('A plan with this name or code already exists.');
    }

    const plan = await prisma.plan.create({
      data: {
        ...parsed.data,
        features: JSON.stringify(parsed.data.features)
      }
    });

    return reply.status(201).send({ success: true, plan });
  });

  /**
   * PUT /api/v1/admin/billing/plans/:id
   * Updates an existing pricing plan (name, priceMonthly, priceYearly, features, limits, etc.).
   */
  fastify.put('/plans/:id', {
    schema: {
      description: 'Updates details of an existing billing plan (Admin only)',
      tags: ['Admin Billing'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          priceMonthly: { type: 'number' },
          priceYearly: { type: 'number' },
          currency: { type: 'string' },
          simulationLimit: { type: 'integer' },
          studentLimit: { type: 'integer' },
          instructorLimit: { type: 'integer' },
          certificateLimit: { type: 'integer' },
          reportExportLimit: { type: 'integer' },
          storageLimitMb: { type: 'integer' },
          features: { type: 'array', items: { type: 'string' } },
          isActive: { type: 'boolean' },
          durationDays: { type: 'integer' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const bodySchema = z.object({
      name: z.string().optional(),
      priceMonthly: z.number().min(0).optional(),
      priceYearly: z.number().min(0).optional(),
      currency: z.string().optional(),
      simulationLimit: z.number().int().optional(),
      studentLimit: z.number().int().optional(),
      instructorLimit: z.number().int().optional(),
      certificateLimit: z.number().int().optional(),
      reportExportLimit: z.number().int().optional(),
      storageLimitMb: z.number().int().optional(),
      features: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
      durationDays: z.number().int().min(1).optional()
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const targetPlan = await prisma.plan.findUnique({ where: { id } });
    if (!targetPlan) {
      throw new NotFoundError('Plan not found.');
    }

    const updateData: any = { ...parsed.data };
    if (parsed.data.features) {
      updateData.features = JSON.stringify(parsed.data.features);
    }

    const plan = await prisma.plan.update({
      where: { id },
      data: updateData
    });

    return reply.status(200).send({ success: true, plan });
  });

  /**
   * GET /api/v1/admin/billing/subscriptions
   * Returns list of all subscriptions in the system, with user and plan details, supporting filters (Admin only).
   */
  fastify.get('/subscriptions', {
    schema: {
      description: 'Retrieve subscription reports with status and search filters (Admin only)',
      tags: ['Admin Billing'],
      security: [{ cookieAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['all', 'active', 'expiring', 'cancelled', 'trial'], default: 'all' },
          search: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            subscriptions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  userId: { type: 'string' },
                  planId: { type: 'string' },
                  status: { type: 'string' },
                  billingCycle: { type: 'string' },
                  startDate: { type: 'string' },
                  endDate: { type: 'string' },
                  cancelAtPeriodEnd: { type: 'boolean' },
                  gatewaySubscriptionId: { type: 'string', nullable: true },
                  gatewayCustomerId: { type: 'string', nullable: true },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      email: { type: 'string' },
                      role: { type: 'string' }
                    }
                  },
                  plan: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      code: { type: 'string' },
                      priceMonthly: { type: 'number' },
                      priceYearly: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const querySchema = z.object({
      status: z.enum(['all', 'active', 'expiring', 'cancelled', 'trial']).default('all'),
      search: z.string().optional()
    });

    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const { status, search } = parsed.data;
    const whereClause: any = {};

    if (status === 'active') {
      whereClause.status = 'active';
    } else if (status === 'cancelled') {
      whereClause.status = { in: ['cancelled', 'expired'] };
    } else if (status === 'trial') {
      whereClause.billingCycle = 'trial';
    } else if (status === 'expiring') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      whereClause.status = 'active';
      whereClause.endDate = {
        gte: new Date(),
        lte: thirtyDaysFromNow
      };
    }

    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      whereClause.OR = [
        {
          user: {
            name: { contains: searchTerm, mode: 'insensitive' }
          }
        },
        {
          user: {
            email: { contains: searchTerm, mode: 'insensitive' }
          }
        },
        {
          plan: {
            name: { contains: searchTerm, mode: 'insensitive' }
          }
        }
      ];
    }

    const subscriptions = await prisma.subscription.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        plan: {
          select: {
            id: true,
            name: true,
            code: true,
            priceMonthly: true,
            priceYearly: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return reply.status(200).send({
      success: true,
      subscriptions
    });
  });
}
