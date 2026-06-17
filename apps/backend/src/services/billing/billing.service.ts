import { prisma } from '../../db/client';
import { paymentGateway } from './payment.gateway';
import { ValidationError, NotFoundError } from '../../utils/errors';
import crypto from 'crypto';
import { config } from '../../config';

export class BillingService {
  /**
   * Validates a discount coupon code.
   */
  async validateCoupon(code: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!coupon) {
      throw new NotFoundError('Coupon code not found.');
    }

    if (!coupon.isActive) {
      throw new ValidationError('This coupon is no longer active.');
    }

    if (coupon.expirationDate && coupon.expirationDate < new Date()) {
      throw new ValidationError('This coupon has expired.');
    }

    if (coupon.maxRedemptions && coupon.redemptionsCount >= coupon.maxRedemptions) {
      throw new ValidationError('This coupon has reached its maximum redemptions limit.');
    }

    return coupon;
  }

  /**
   * Initiates a plan checkout order.
   */
  async createSubscriptionOrder(
    userId: string,
    planCode: string,
    billingCycle: 'monthly' | 'yearly',
    couponCode?: string
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found.');

    const plan = await prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan) throw new NotFoundError('Plan tier not found.');

    // 1. Calculate price
    let originalPrice = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
    let finalPrice = originalPrice;
    let coupon = null;

    // 2. Validate coupon if provided
    if (couponCode) {
      coupon = await this.validateCoupon(couponCode);
      if (coupon.discountType === 'percentage') {
        finalPrice = originalPrice * (1 - coupon.discountValue / 100);
      } else if (coupon.discountType === 'flat') {
        finalPrice = Math.max(0, originalPrice - coupon.discountValue);
      } else if (coupon.discountType === 'trial_extension') {
        // Handled below during subscription creation
      }
    }

    // 3. For Free Trials (price is 0)
    if (finalPrice <= 0) {
      const durationDays = planCode === 'free' ? 14 : 30;
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + durationDays + (coupon?.discountType === 'trial_extension' ? coupon.discountValue : 0));

      const newSub = await prisma.subscription.create({
        data: {
          userId,
          planId: plan.id,
          status: 'active',
          billingCycle: 'trial',
          startDate: new Date(),
          endDate: trialEndDate,
          gatewaySubscriptionId: `sub_trial_${crypto.randomBytes(6).toString('hex')}`
        }
      });

      // Update user planType
      await prisma.user.update({
        where: { id: userId },
        data: { planType: planCode }
      });

      // Generate invoice
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await prisma.invoice.create({
        data: {
          userId,
          subscriptionId: newSub.id,
          invoiceNumber,
          amount: 0,
          status: 'paid',
          dueDate: new Date(),
          paidAt: new Date(),
          billingAddress: 'Free Trial Activation',
          taxDetails: 'GST exempt'
        }
      });

      return {
        success: true,
        freeActivation: true,
        subscriptionId: newSub.id
      };
    }

    // 4. Paid plans order generation
    const gatewayOrder = await paymentGateway.createOrder(finalPrice, 'INR');

    // Create a pending subscription
    const trialDuration = 30; // standard month
    const futureEndDate = new Date();
    futureEndDate.setDate(futureEndDate.getDate() + (billingCycle === 'monthly' ? trialDuration : 365));

    const newSub = await prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        status: 'pending',
        billingCycle,
        startDate: new Date(),
        endDate: futureEndDate,
        gatewaySubscriptionId: gatewayOrder.id // Temporarily link to order ID during checkout
      }
    });

    return {
      success: true,
      freeActivation: false,
      gatewayOrderId: gatewayOrder.id,
      amount: finalPrice,
      currency: 'INR',
      keyId: config.RAZORPAY_KEY_ID || 'rzp_test_mock_sandbox_key',
      subscriptionId: newSub.id
    };
  }

  /**
   * Verifies the checkout payment signature.
   */
  async verifySubscriptionPayment(
    userId: string,
    gatewayPaymentId: string,
    gatewayOrderId: string,
    gatewaySignature: string,
    couponCode?: string
  ) {
    // 1. Confirm payment parameters match signature
    const payload = `${gatewayOrderId}|${gatewayPaymentId}`;
    const isValid = paymentGateway.verifyWebhookSignature(
      payload,
      gatewaySignature,
      config.RAZORPAY_KEY_SECRET || 'rzp_sandbox_secret'
    );

    if (!isValid) {
      throw new ValidationError('Invalid payment signature hash verification failed.');
    }

    // 2. Fetch the pending subscription
    const sub = await prisma.subscription.findFirst({
      where: { userId, gatewaySubscriptionId: gatewayOrderId, status: 'pending' },
      include: { plan: true }
    });

    if (!sub) {
      throw new NotFoundError('Pending checkout order not found.');
    }

    // Calculate dynamic dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (sub.billingCycle === 'monthly' ? 30 : 365));

    let finalPrice = sub.billingCycle === 'monthly' ? sub.plan.priceMonthly : sub.plan.priceYearly;
    let coupon = null;

    if (couponCode) {
      coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
      if (coupon && coupon.isActive) {
        if (coupon.discountType === 'percentage') {
          finalPrice = finalPrice * (1 - coupon.discountValue / 100);
        } else if (coupon.discountType === 'flat') {
          finalPrice = Math.max(0, finalPrice - coupon.discountValue);
        } else if (coupon.discountType === 'trial_extension') {
          endDate.setDate(endDate.getDate() + coupon.discountValue);
        }
      }
    }

    // 3. Update subscription status
    const updatedSub = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'active',
        startDate,
        endDate,
        gatewaySubscriptionId: `sub_active_${crypto.randomBytes(6).toString('hex')}`
      }
    });

    // 4. Update user planType
    await prisma.user.update({
      where: { id: userId },
      data: { planType: sub.plan.code }
    });

    // 5. Create Invoice
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const invoice = await prisma.invoice.create({
      data: {
        userId,
        subscriptionId: sub.id,
        invoiceNumber,
        amount: finalPrice,
        tax: parseFloat((finalPrice * 0.18).toFixed(2)), // 18% GST standard in India
        status: 'paid',
        dueDate: new Date(),
        paidAt: new Date(),
        billingAddress: 'Card Payment Checkout Gateway',
        taxDetails: '18% CGST/SGST Included'
      }
    });

    // 6. Record Payment logs
    await prisma.payment.create({
      data: {
        subscriptionId: sub.id,
        invoiceId: invoice.id,
        amount: finalPrice,
        status: 'captured',
        gateway: 'razorpay',
        gatewayPaymentId,
        gatewayOrderId,
        gatewaySignature
      }
    });

    // 7. Coupon redemptions counters
    if (coupon) {
      await prisma.couponUsage.create({
        data: {
          couponId: coupon.id,
          userId,
          subscriptionId: sub.id
        }
      });

      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { redemptionsCount: { increment: 1 } }
      });
    }

    return { success: true, subscription: updatedSub };
  }

  /**
   * Cancels active subscription plan.
   */
  async cancelSubscription(userId: string) {
    const sub = await prisma.subscription.findFirst({
      where: { userId, status: 'active' }
    });

    if (!sub) {
      throw new NotFoundError('No active subscription found.');
    }

    // Cancel gateway subscription
    if (sub.gatewaySubscriptionId) {
      await paymentGateway.cancelSubscription(sub.gatewaySubscriptionId);
    }

    const updatedSub = await prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true }
    });

    return updatedSub;
  }
}

export const billingService = new BillingService();
