import { create } from "zustand";
import api from "@/lib/api";

export interface Plan {
  id: string;
  name: string;
  code: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  simulationLimit: number;
  studentLimit: number;
  instructorLimit: number;
  certificateLimit: number;
  reportExportLimit: number;
  storageLimitMb: number;
  features: string[];
  isActive: boolean;
  durationDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: string; // active, pending, trialing, past_due, cancelled, expired
  billingCycle: string; // monthly, yearly, trial
  startDate: string;
  endDate: string;
  cancelAtPeriodEnd: boolean;
  gatewaySubscriptionId: string | null;
  gatewayCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
  plan: Plan;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  currency: string;
  status: string; // paid, unpaid, void, refunded
  pdfUrl: string | null;
  billingAddress: string | null;
  taxDetails: string | null;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: string; // percentage, flat, trial_extension
  discountValue: number;
  durationMonths: number | null;
  expirationDate: string | null;
  maxRedemptions: number | null;
  redemptionsCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsageStats {
  simulationsUsed: number;
  studentsUsed: number;
}

export interface AdminBillingStats {
  revenue: number;
  mrr: number;
  arr: number;
  churnRate: number;
  activeSubscriptions: number;
  trialConversions: number;
  failedPayments: number;
  refundStatistics: number;
}

export interface PlanDistribution {
  name: string;
  value: number;
}

export interface RevenueTrend {
  month: string;
  amount: number;
}

interface BillingState {
  plans: Plan[];
  subscription: Subscription | null;
  subscriptionHistory: Subscription[];
  usage: UsageStats;
  invoices: Invoice[];
  adminStats: AdminBillingStats | null;
  planDistribution: PlanDistribution[];
  revenueTrends: RevenueTrend[];
  coupons: Coupon[];
  loading: boolean;
  error: string | null;
  
  subscriptions: Subscription[];
  fetchPlans: () => Promise<Plan[]>;
  fetchSubscription: () => Promise<void>;
  checkout: (planCode: string, billingCycle: 'monthly' | 'yearly', couponCode?: string) => Promise<any>;
  verifyPayment: (data: {
    gatewayPaymentId: string;
    gatewayOrderId: string;
    gatewaySignature: string;
    couponCode?: string;
  }) => Promise<any>;
  cancelSubscription: () => Promise<void>;
  fetchInvoices: () => Promise<Invoice[]>;
  updateInvoiceAddress: (id: string, data: { billingAddress: string; taxDetails?: string }) => Promise<Invoice>;
  validateCoupon: (code: string) => Promise<Coupon>;
  fetchAdminBillingData: () => Promise<void>;
  fetchSubscriptions: (status?: string, search?: string) => Promise<Subscription[]>;
  fetchCoupons: () => Promise<Coupon[]>;
  createCoupon: (data: {
    code: string;
    discountType: 'percentage' | 'flat' | 'trial_extension';
    discountValue: number;
    durationMonths?: number | null;
    maxRedemptions?: number | null;
  }) => Promise<Coupon>;
  createPlan: (data: any) => Promise<Plan>;
  updatePlan: (id: string, data: any) => Promise<Plan>;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  plans: [],
  subscription: null,
  subscriptionHistory: [],
  subscriptions: [],
  usage: {
    simulationsUsed: 0,
    studentsUsed: 0
  },
  invoices: [],
  adminStats: null,
  planDistribution: [],
  revenueTrends: [],
  coupons: [],
  loading: false,
  error: null,

  fetchPlans: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<{ success: boolean; plans: Plan[] }>("/api/v1/billing/plans");
      set({ plans: res.data.plans, loading: false });
      return res.data.plans;
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to load plans";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  fetchSubscription: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<{
        success: boolean;
        subscription: Subscription | null;
        history: Subscription[];
        usage: UsageStats;
      }>("/api/v1/billing/subscription");
      set({
        subscription: res.data.subscription,
        subscriptionHistory: res.data.history,
        usage: res.data.usage,
        loading: false
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to fetch active subscription";
      set({ error: msg, loading: false });
    }
  },

  checkout: async (planCode, billingCycle, couponCode) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post("/api/v1/billing/checkout", { planCode, billingCycle, couponCode });
      set({ loading: false });
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.error || "Checkout failed";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  verifyPayment: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post("/api/v1/billing/verify", data);
      await get().fetchSubscription();
      set({ loading: false });
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.error || "Payment verification failed";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  cancelSubscription: async () => {
    set({ loading: true, error: null });
    try {
      await api.post("/api/v1/billing/cancel");
      await get().fetchSubscription();
      set({ loading: false });
    } catch (err: any) {
      const msg = err.response?.data?.error || "Subscription cancellation failed";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  fetchInvoices: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<{ success: boolean; invoices: Invoice[] }>("/api/v1/billing/invoices");
      set({ invoices: res.data.invoices, loading: false });
      return res.data.invoices;
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to fetch invoices";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  updateInvoiceAddress: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.put<{ success: boolean; invoice: Invoice }>(`/api/v1/billing/invoices/${id}/address`, data);
      set((state) => ({
        invoices: state.invoices.map((inv) => (inv.id === id ? res.data.invoice : inv)),
        loading: false
      }));
      return res.data.invoice;
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to update invoice billing address";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  validateCoupon: async (code) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post<{ success: boolean; coupon: Coupon }>("/api/v1/billing/coupon/validate", { code });
      set({ loading: false });
      return res.data.coupon;
    } catch (err: any) {
      const msg = err.response?.data?.error || "Invalid coupon code";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  fetchAdminBillingData: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<{
        success: boolean;
        stats: AdminBillingStats;
        planDistribution: PlanDistribution[];
        revenueTrends: RevenueTrend[];
      }>("/api/v1/admin/billing/stats");
      set({
        adminStats: res.data.stats,
        planDistribution: res.data.planDistribution,
        revenueTrends: res.data.revenueTrends,
        loading: false
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to load admin billing analytics";
      set({ error: msg, loading: false });
    }
  },

  fetchCoupons: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<{ success: boolean; coupons: Coupon[] }>("/api/v1/admin/billing/coupons");
      set({ coupons: res.data.coupons, loading: false });
      return res.data.coupons;
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to load coupons";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  createCoupon: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post<{ success: boolean; coupon: Coupon }>("/api/v1/admin/billing/coupons", data);
      await get().fetchCoupons();
      set({ loading: false });
      return res.data.coupon;
    } catch (err: any) {
      const msg = err.response?.data?.error || "Coupon provisioning failed";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  createPlan: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post<{ success: boolean; plan: Plan }>("/api/v1/admin/billing/plans", data);
      await get().fetchPlans();
      set({ loading: false });
      return res.data.plan;
    } catch (err: any) {
      const msg = err.response?.data?.error || "Plan provisioning failed";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  updatePlan: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.put<{ success: boolean; plan: Plan }>(`/api/v1/admin/billing/plans/${id}`, data);
      await get().fetchPlans();
      set({ loading: false });
      return res.data.plan;
    } catch (err: any) {
      const msg = err.response?.data?.error || "Plan updating failed";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  fetchSubscriptions: async (status = 'all', search = '') => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<{ success: boolean; subscriptions: Subscription[] }>(
        "/api/v1/admin/billing/subscriptions",
        { params: { status, search } }
      );
      set({ subscriptions: res.data.subscriptions, loading: false });
      return res.data.subscriptions;
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to load subscription reports";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  }
}));

export default useBillingStore;
