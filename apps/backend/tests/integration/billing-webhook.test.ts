import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../src/app';
import { prisma } from '../../src/db/client';
import crypto from 'crypto';

describe('Billing Webhook Integration Tests', () => {
  let userId: string;
  let failUserId: string;
  let planId: string;
  const webhookSecret = 'rzp_webhook_secret';

  function signPayload(body: any): string {
    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(JSON.stringify(body));
    return shasum.digest('hex');
  }

  beforeAll(async () => {
    await prisma.$connect();

    // Clean tables
    await prisma.billingEvent.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.plan.deleteMany({});
    await prisma.user.deleteMany({});

    // Create a plan
    const plan = await prisma.plan.create({
      data: {
        name: 'Individual Basic',
        code: 'individual_basic',
        priceMonthly: 1500,
        priceYearly: 15000,
        simulationLimit: 5,
        studentLimit: 0,
        instructorLimit: 0,
        certificateLimit: 5,
        reportExportLimit: 5,
        features: JSON.stringify(['5 Runs', 'Bronze Certificates']),
        durationDays: 30
      }
    });
    planId = plan.id;

    // Create student user
    const student = await prisma.user.create({
      data: {
        email: 'webhook-student@simplab.com',
        name: 'Webhook Student',
        role: 'INDIVIDUAL',
        emailVerified: true
      }
    });
    userId = student.id;

    // Create another student user for failure test
    const failStudent = await prisma.user.create({
      data: {
        email: 'webhook-fail-student@simplab.com',
        name: 'Webhook Fail Student',
        role: 'INDIVIDUAL',
        emailVerified: true
      }
    });
    failUserId = failStudent.id;
  });

  afterAll(async () => {
    await prisma.billingEvent.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.plan.deleteMany({});
    await prisma.user.deleteMany({});
    await app.close();
    await prisma.$disconnect();
  });

  it('should process payment.captured event and upgrade subscription & planType', async () => {
    // 1. Create a pending subscription
    const sub = await prisma.subscription.create({
      data: {
        userId,
        planId,
        status: 'pending',
        billingCycle: 'monthly',
        endDate: new Date(Date.now() + 30 * 86400000),
        gatewaySubscriptionId: 'order_captured_123'
      }
    });

    // 2. Mock payment.captured event body
    const body = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_captured_123',
            order_id: 'order_captured_123',
            amount: 150000 // Rs. 1500.00 (in paise)
          }
        }
      }
    };

    const signature = signPayload(body);

    // 3. Inject POST request to webhook
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/webhook',
      headers: {
        'x-razorpay-signature': signature,
        'content-type': 'application/json'
      },
      payload: JSON.stringify(body)
    });

    expect(res.statusCode).toBe(200);
    const responseBody = JSON.parse(res.body);
    expect(responseBody.received).toBe(true);

    // 4. Assert subscription is active
    const updatedSub = await prisma.subscription.findUnique({
      where: { id: sub.id }
    });
    expect(updatedSub?.status).toBe('active');
    expect(updatedSub?.gatewaySubscriptionId).not.toBe('order_captured_123'); // Updated to active subscription ID format

    // 5. Assert user planType is upgraded
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    expect(updatedUser?.planType).toBe('individual_basic');

    // 6. Assert Invoice was created
    const invoice = await prisma.invoice.findFirst({
      where: { subscriptionId: sub.id }
    });
    expect(invoice).not.toBeNull();
    expect(invoice?.amount).toBe(1500);
    expect(invoice?.status).toBe('paid');

    // 7. Assert Payment is recorded
    const payment = await prisma.payment.findFirst({
      where: { subscriptionId: sub.id }
    });
    expect(payment).not.toBeNull();
    expect(payment?.gatewayPaymentId).toBe('pay_captured_123');
    expect(payment?.status).toBe('captured');
  });

  it('should process payment.failed event and mark subscription cancelled & create failed payment entry', async () => {
    // 1. Create a pending subscription for failure
    const sub = await prisma.subscription.create({
      data: {
        userId: failUserId,
        planId,
        status: 'pending',
        billingCycle: 'monthly',
        endDate: new Date(Date.now() + 30 * 86400000),
        gatewaySubscriptionId: 'order_failed_123'
      }
    });

    // 2. Mock payment.failed event body
    const body = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_failed_123',
            order_id: 'order_failed_123',
            amount: 150000,
            error_description: 'Card expired or insufficient balance'
          }
        }
      }
    };

    const signature = signPayload(body);

    // 3. Inject POST request to webhook
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/webhook',
      headers: {
        'x-razorpay-signature': signature,
        'content-type': 'application/json'
      },
      payload: JSON.stringify(body)
    });

    expect(res.statusCode).toBe(200);

    // 4. Assert subscription is cancelled
    const updatedSub = await prisma.subscription.findUnique({
      where: { id: sub.id }
    });
    expect(updatedSub?.status).toBe('cancelled');

    // 5. Assert user planType is NOT upgraded
    const updatedUser = await prisma.user.findUnique({
      where: { id: failUserId }
    });
    expect(updatedUser?.planType).toBeNull(); // remains null

    // 6. Assert Payment is recorded as failed
    const payment = await prisma.payment.findFirst({
      where: { subscriptionId: sub.id }
    });
    expect(payment).not.toBeNull();
    expect(payment?.gatewayPaymentId).toBe('pay_failed_123');
    expect(payment?.status).toBe('failed');
    expect(payment?.errorMessage).toBe('Card expired or insufficient balance');
  });
});
