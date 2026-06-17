import { FastifyInstance } from 'fastify';
import { requireRole } from '../auth/middleware';
import { UserRole } from '../auth/roles';
import { prisma } from '../db/client';
import { z } from 'zod';
import { ValidationError } from '../utils/errors';

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
}
