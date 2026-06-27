import { FastifyInstance } from 'fastify';
import { requireAuth, AuthenticatedRequest } from '../auth/middleware';
import { prisma } from '../db/client';
import { billingService } from '../services/billing/billing.service';
import { z } from 'zod';
import { ValidationError, NotFoundError } from '../utils/errors';
import { paymentGateway } from '../services/billing/payment.gateway';
import { config } from '../config';

function safeParseJSON(str: any, fallback: any = []) {
  if (!str) return fallback;
  try {
    if (typeof str === 'object') return str;
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export async function billingRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/billing/plans
   * Fetches all registered pricing plans.
   */
  fastify.get('/plans', async (_request, reply) => {
    try {
      let plans = await prisma.plan.findMany({
        orderBy: { priceMonthly: 'asc' }
      });

      if (plans.length === 0) {
        await prisma.plan.createMany({
          data: [
            {
              name: 'Free Trial',
              code: 'free',
              priceMonthly: 0,
              priceYearly: 0,
              simulationLimit: 1,
              studentLimit: 5,
              instructorLimit: 0,
              certificateLimit: 0,
              reportExportLimit: 1,
              storageLimitMb: 50,
              features: JSON.stringify(['1 Sandbox Campaign Run', 'Basic SEO Simulator access', 'Email Support']),
              isActive: true,
              durationDays: 14
            },
            {
              name: 'Individual Basic',
              code: 'individual_basic',
              priceMonthly: 1500,
              priceYearly: 15000,
              simulationLimit: 5,
              studentLimit: 0,
              instructorLimit: 0,
              certificateLimit: 5,
              reportExportLimit: 5,
              storageLimitMb: 100,
              features: JSON.stringify(['5 Sandbox Campaign Runs', 'Access to Google & Meta Ads', 'Full Bronze/Silver Certificates', 'Email Support']),
              isActive: true,
              durationDays: 30
            },
            {
              name: 'Individual Pro',
              code: 'individual_pro',
              priceMonthly: 3000,
              priceYearly: 30000,
              simulationLimit: -1,
              studentLimit: 0,
              instructorLimit: 0,
              certificateLimit: -1,
              reportExportLimit: -1,
              storageLimitMb: 500,
              features: JSON.stringify(['Unlimited Campaign Runs', 'All Ads Engines', 'All Certificates (Platinum included)', 'Priority Support']),
              isActive: true,
              durationDays: 30
            },
            {
              name: 'Instructor',
              code: 'instructor',
              priceMonthly: 5000,
              priceYearly: 50000,
              simulationLimit: -1,
              studentLimit: 30,
              instructorLimit: 0,
              certificateLimit: -1,
              reportExportLimit: -1,
              storageLimitMb: 1024,
              features: JSON.stringify(['Classroom Management (Up to 30 students)', 'NBA & OBE Accredited Reports', 'Student Analytics Ledgers', 'Export Reports to PDF/CSV']),
              isActive: true,
              durationDays: 30
            },
            {
              name: 'College License',
              code: 'college',
              priceMonthly: 15000,
              priceYearly: 150000,
              simulationLimit: -1,
              studentLimit: 200,
              instructorLimit: 10,
              certificateLimit: -1,
              reportExportLimit: -1,
              storageLimitMb: 5120,
              features: JSON.stringify(['Colleges Hub (Up to 10 Instructors, 200 Students)', 'Accreditation Readiness Indexes', 'Bulk Student Imports', 'Premium Dedicated Support']),
              isActive: true,
              durationDays: 365
            },
            {
              name: 'Enterprise License',
              code: 'enterprise',
              priceMonthly: 45000,
              priceYearly: 450000,
              simulationLimit: -1,
              studentLimit: -1,
              instructorLimit: -1,
              certificateLimit: -1,
              reportExportLimit: -1,
              storageLimitMb: 20480,
              features: JSON.stringify(['Unlimited Cohorts, Instructors & Students', 'Custom Scenario Builders', 'SLA Dedicated Account Managers', 'Single Sign-On (SSO) integration']),
              isActive: true,
              durationDays: 365
            }
          ]
        });

        plans = await prisma.plan.findMany({
          orderBy: { priceMonthly: 'asc' }
        });
      }

      const parsedPlans = plans.map(p => ({
        ...p,
        features: safeParseJSON(p.features)
      }));

      return reply.status(200).send({
        success: true,
        plans: parsedPlans
      });
    } catch (err: any) {
      return reply.status(200).send({
        success: true,
        plans: []
      });
    }
  });

  /**
   * GET /api/v1/billing/subscription
   * Returns current user subscription details, history, and usage stats.
   */
  fastify.get('/subscription', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const userId = authReq.user!.id;

    const sub = await prisma.subscription.findFirst({
      where: { userId, status: { in: ['active', 'trialing', 'past_due'] } },
      include: { plan: true }
    });

    const subHistory = await prisma.subscription.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    });

    // Compute active usage statistics
    const simulationsUsed = await prisma.simulationState.count({ where: { userId } });
    
    let studentsUsed = 0;
    if (authReq.user!.role === 'INSTRUCTOR') {
      studentsUsed = await prisma.user.count({
        where: { class: { instructorId: userId } }
      });
    }

    return reply.status(200).send({
      success: true,
      subscription: sub ? {
        ...sub,
        plan: {
          ...sub.plan,
          features: safeParseJSON(sub.plan.features)
        }
      } : null,
      history: subHistory.map(s => ({
        ...s,
        plan: {
          ...s.plan,
          features: safeParseJSON(s.plan.features)
        }
      })),
      usage: {
        simulationsUsed,
        studentsUsed
      }
    });
  });

  /**
   * POST /api/v1/billing/checkout
   * Initiates payment order for a plan subscription.
   */
  fastify.post('/checkout', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const bodySchema = z.object({
      planCode: z.string().min(1),
      billingCycle: z.enum(['monthly', 'yearly']),
      couponCode: z.string().optional()
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const orderDetails = await billingService.createSubscriptionOrder(
      authReq.user!.id,
      parsed.data.planCode,
      parsed.data.billingCycle,
      parsed.data.couponCode
    );

    return reply.status(200).send(orderDetails);
  });

  /**
   * POST /api/v1/billing/verify
   * Confirms payment signature after Razorpay checkout window closes.
   */
  fastify.post('/verify', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const bodySchema = z.object({
      gatewayPaymentId: z.string().min(1),
      gatewayOrderId: z.string().min(1),
      gatewaySignature: z.string().min(1),
      couponCode: z.string().optional()
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const result = await billingService.verifySubscriptionPayment(
      authReq.user!.id,
      parsed.data.gatewayPaymentId,
      parsed.data.gatewayOrderId,
      parsed.data.gatewaySignature,
      parsed.data.couponCode
    );

    return reply.status(200).send(result);
  });

  /**
   * POST /api/v1/billing/cancel
   * Requests subscription cancellation at period end.
   */
  fastify.post('/cancel', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const sub = await billingService.cancelSubscription(authReq.user!.id);
    return reply.status(200).send({ success: true, subscription: sub });
  });

  /**
   * GET /api/v1/billing/invoices
   * Fetches user invoice ledgers history.
   */
  fastify.get('/invoices', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const invoices = await prisma.invoice.findMany({
      where: { userId: authReq.user!.id },
      orderBy: { createdAt: 'desc' }
    });

    return reply.status(200).send({ success: true, invoices });
  });

  /**
   * PUT /api/v1/billing/invoices/:id/address
   * Updates billing address and tax details for an invoice.
   */
  fastify.put('/invoices/:id/address', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const bodySchema = z.object({
      billingAddress: z.string().min(1),
      taxDetails: z.string().optional()
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: authReq.user!.id }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found.');
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        billingAddress: parsed.data.billingAddress,
        taxDetails: parsed.data.taxDetails || null
      }
    });

    return reply.status(200).send({ success: true, invoice: updated });
  });

  /**
   * POST /api/v1/billing/coupon/validate
   * Validates code.
   */
  fastify.post('/coupon/validate', { preHandler: [requireAuth] }, async (request, reply) => {
    const bodySchema = z.object({
      code: z.string().min(1)
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const coupon = await billingService.validateCoupon(parsed.data.code);
    return reply.status(200).send({ success: true, coupon });
  });

  /**
   * POST /api/v1/billing/webhook
   * Razorpay Webhook notification receiver.
   */
  fastify.post('/webhook', async (request, reply) => {
    const signature = request.headers['x-razorpay-signature'] as string;
    const payload = JSON.stringify(request.body);

    const isValid = paymentGateway.verifyWebhookSignature(
      payload,
      signature || '',
      config.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret'
    );

    if (!isValid) {
      return reply.status(400).send({ success: false, error: 'Invalid webhook signature verification failed' });
    }

    // Record webhook event audit
    const eventLog = await prisma.billingEvent.create({
      data: {
        eventType: (request.body as any)?.event || 'unknown',
        payload
      }
    });

    try {
      // Process specific webhook hooks (payment, sub cancel, renewals)
      const eventData = request.body as any;
      const type = eventData.event;

      if (type === 'payment.captured') {
        const paymentData = eventData.payload.payment.entity;
        // Invoices and subscriptions can be automatically verified/captured
      } else if (type === 'subscription.cancelled') {
        const subId = eventData.payload.subscription.entity.id;
        const sub = await prisma.subscription.findFirst({
          where: { gatewaySubscriptionId: subId }
        });
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'cancelled' }
          });
        }
      }

      await prisma.billingEvent.update({
        where: { id: eventLog.id },
        data: { processed: true }
      });

      return reply.status(200).send({ received: true });
    } catch (err: any) {
      await prisma.billingEvent.update({
        where: { id: eventLog.id },
        data: { error: err.message }
      });
      return reply.status(400).send({ error: err.message });
    }
  });
}
