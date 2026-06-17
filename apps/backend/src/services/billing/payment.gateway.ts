import crypto from 'crypto';
import { config } from '../../config';

export interface PaymentGateway {
  createCustomer(name: string, email: string): Promise<string>;
  createSubscription(
    customerId: string,
    planCode: string,
    billingCycle: 'monthly' | 'yearly'
  ): Promise<{ id: string; status: string }>;
  cancelSubscription(gatewaySubId: string): Promise<void>;
  createOrder(amount: number, currency: string): Promise<{ id: string; amount: number }>;
  refundPayment(gatewayPaymentId: string, amount?: number): Promise<string>;
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
}

export class RazorpayGateway implements PaymentGateway {
  private keyId = config.RAZORPAY_KEY_ID;
  private keySecret = config.RAZORPAY_KEY_SECRET;

  private isSandbox(): boolean {
    return !this.keyId || !this.keySecret;
  }

  async createCustomer(name: string, email: string): Promise<string> {
    if (this.isSandbox()) {
      return `cust_sandbox_${crypto.randomBytes(6).toString('hex')}`;
    }

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({ name, email }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Razorpay customer creation failed: ${err}`);
    }

    const data = (await response.json()) as { id: string };
    return data.id;
  }

  async createSubscription(
    customerId: string,
    planCode: string,
    billingCycle: 'monthly' | 'yearly'
  ): Promise<{ id: string; status: string }> {
    if (this.isSandbox()) {
      return {
        id: `sub_sandbox_${crypto.randomBytes(6).toString('hex')}`,
        status: 'authenticated',
      };
    }

    // In a real setup, you would create a Plan in Razorpay and use its ID here.
    // For simplicity of mapping, we assume a mapping or standard plans set up.
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        plan_id: `plan_${planCode}_${billingCycle}`,
        customer_id: customerId,
        total_count: billingCycle === 'monthly' ? 12 : 1,
        quantity: 1,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Razorpay subscription creation failed: ${err}`);
    }

    const data = (await response.json()) as { id: string; status: string };
    return { id: data.id, status: data.status };
  }

  async cancelSubscription(gatewaySubId: string): Promise<void> {
    if (this.isSandbox() || gatewaySubId.startsWith('sub_sandbox_')) {
      return;
    }

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${gatewaySubId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({ cancel_at_cycle_end: 1 }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Razorpay subscription cancellation failed: ${err}`);
    }
  }

  async createOrder(amount: number, currency: string): Promise<{ id: string; amount: number }> {
    if (this.isSandbox()) {
      return {
        id: `order_sandbox_${crypto.randomBytes(6).toString('hex')}`,
        amount,
      };
    }

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Razorpay amount is in paise
        currency,
        receipt: `receipt_${crypto.randomBytes(4).toString('hex')}`,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Razorpay order creation failed: ${err}`);
    }

    const data = (await response.json()) as { id: string; amount: number };
    return { id: data.id, amount: data.amount / 100 };
  }

  async refundPayment(gatewayPaymentId: string, amount?: number): Promise<string> {
    if (this.isSandbox() || gatewayPaymentId.startsWith('pay_sandbox_')) {
      return `rfnd_sandbox_${crypto.randomBytes(6).toString('hex')}`;
    }

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const payload: any = {};
    if (amount) {
      payload.amount = Math.round(amount * 100);
    }

    const response = await fetch(`https://api.razorpay.com/v1/payments/${gatewayPaymentId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Razorpay refund failed: ${err}`);
    }

    const data = (await response.json()) as { id: string };
    return data.id;
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    if (this.isSandbox()) {
      return true; // Auto-verify signature in sandbox mode
    }

    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(payload);
    const digest = shasum.digest('hex');
    return digest === signature;
  }
}

export const paymentGateway: PaymentGateway = new RazorpayGateway();
