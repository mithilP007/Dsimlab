import React, { useEffect, useState } from "react";
import { useBillingStore } from "@/stores/billingStore";
import { useAuthStore } from "@/stores/authStore";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Activity,
  UserCheck,
  AlertTriangle,
  RotateCcw,
  Tag,
  Plus
} from "lucide-react";

const CHART_COLORS = ["#6366f1", "#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];

export function AdminBillingCenter() {
  const {
    adminStats,
    planDistribution,
    revenueTrends,
    coupons,
    fetchAdminBillingData,
    fetchCoupons,
    createCoupon
  } = useBillingStore();
  const { user } = useAuthStore();

  // New coupon form states
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "flat" | "trial_extension">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [maxRedemptions, setMaxRedemptions] = useState<string>("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchAdminBillingData();
      fetchCoupons();
    }
  }, [fetchAdminBillingData, fetchCoupons, user]);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setCreating(true);
    try {
      await createCoupon({
        code: code.trim().toUpperCase(),
        discountType,
        discountValue,
        maxRedemptions: maxRedemptions ? parseInt(maxRedemptions) : null
      });
      alert("Promo coupon created successfully!");
      // Reset form
      setCode("");
      setMaxRedemptions("");
    } catch (err: any) {
      alert(`Coupon creation failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        You do not have permission to access the Administrative Billing Dashboard.
      </div>
    );
  }

  // Format currency
  const formatCurrency = (val: number) => `₹${val.toLocaleString()}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Background glowing effects */}
      <div className="absolute top-0 right-10 w-[500px] h-[300px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10 border-b border-slate-900 pb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-indigo-400" /> Admin Financial Command Center
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Super Admin SaaS billing statistics, revenue analytics, MRR/ARR targets, and promo coupon controls.
            </p>
          </div>
        </div>

        {/* 8 visual KPIs cards */}
        {adminStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            {/* MRR */}
            <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 shadow-lg">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs uppercase tracking-wider">Monthly Rec. Revenue</span>
                <DollarSign className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-xl font-black text-white mt-2">{formatCurrency(adminStats.mrr)}</p>
              <div className="text-[10px] text-emerald-400 mt-1">▲ Steady growth</div>
            </div>

            {/* ARR */}
            <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 shadow-lg">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs uppercase tracking-wider">Annual Rec. Revenue</span>
                <DollarSign className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-xl font-black text-white mt-2">{formatCurrency(adminStats.arr)}</p>
              <div className="text-[10px] text-emerald-400 mt-1">▲ Projected yearly target</div>
            </div>

            {/* Revenue */}
            <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 shadow-lg">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs uppercase tracking-wider">Gross Cumulative Revenue</span>
                <DollarSign className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-xl font-black text-white mt-2">{formatCurrency(adminStats.revenue)}</p>
              <div className="text-[10px] text-emerald-400 mt-1">Captured payments logs</div>
            </div>

            {/* Churn Rate */}
            <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 shadow-lg">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs uppercase tracking-wider">SaaS Churn Rate</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xl font-black text-white mt-2">{adminStats.churnRate}%</p>
              <div className="text-[10px] text-slate-400 mt-1">Cancelled vs Active accounts</div>
            </div>

            {/* Active Subscriptions */}
            <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 shadow-lg">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs uppercase tracking-wider">Active Paid Subs</span>
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-black text-white mt-2">{adminStats.activeSubscriptions}</p>
              <div className="text-[10px] text-indigo-400 mt-1">Premium users license</div>
            </div>

            {/* Trial Conversions */}
            <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 shadow-lg">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs uppercase tracking-wider">Trial Conversion</span>
                <Activity className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-xl font-black text-white mt-2">{adminStats.trialConversions}%</p>
              <div className="text-[10px] text-indigo-400 mt-1">Trial to Paid transition</div>
            </div>

            {/* Failed Payments */}
            <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 shadow-lg">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs uppercase tracking-wider">Failed Transactions</span>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-xl font-black text-white mt-2">{adminStats.failedPayments}</p>
              <div className="text-[10px] text-red-400 mt-1">Gateway card declines</div>
            </div>

            {/* Refund Stats */}
            <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 shadow-lg">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs uppercase tracking-wider">Refunded Capital</span>
                <RotateCcw className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-xl font-black text-white mt-2">{formatCurrency(adminStats.refundStatistics)}</p>
              <div className="text-[10px] text-slate-400 mt-1">Returned payments total</div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Revenue Trends Chart (Col span 2) */}
          <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/80 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6">Revenue Growth Trends (Last 6 Months)</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `₹${val}`} />
                  <ChartTooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="Revenue Collected"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plan Distribution (Col span 1) */}
          <div className="lg:col-span-1 bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/80 shadow-xl flex flex-col justify-between">
            <h3 className="text-lg font-bold text-white mb-6">Active Plan Distribution</h3>
            <div className="h-56 w-full flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {planDistribution.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Chart Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {planDistribution.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-slate-300">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                  <span className="truncate">{entry.name}: {entry.value}</span>
                </div>
              ))}
              {planDistribution.length === 0 && (
                <div className="col-span-2 text-center text-slate-500 py-2">
                  No active subscribers to distribute.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coupons System Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Promo Coupon Form (Col span 1) */}
          <div className="lg:col-span-1 bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/80 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" /> Provision Coupon Code
            </h3>
            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Coupon Promo Code</label>
                <input
                  type="text"
                  placeholder="e.g. SUMMER50"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/30 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Discount Metric Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/30"
                >
                  <option value="percentage">Percentage Discount (%)</option>
                  <option value="flat">Flat Price Reduction (₹)</option>
                  <option value="trial_extension">Trial Extension (Days)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Discount Value ({discountType === "percentage" ? "%" : discountType === "flat" ? "₹" : "Days"})
                </label>
                <input
                  type="number"
                  min={1}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Math.max(1, parseInt(e.target.value) || 0))}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/30"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Max Redemptions Cap (Optional)</label>
                <input
                  type="number"
                  placeholder="Unlimited if empty"
                  value={maxRedemptions}
                  onChange={(e) => setMaxRedemptions(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/30"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold tracking-wide transition shadow-lg shadow-indigo-500/10 mt-4 flex items-center justify-center gap-1"
              >
                <Tag className="w-4 h-4" /> {creating ? "Creating..." : "Provision Coupon"}
              </button>
            </form>
          </div>

          {/* List of Coupons (Col span 2) */}
          <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/80 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4">Redemption Coupons Registry</h3>
            <div className="overflow-x-auto max-h-[350px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider sticky top-0 bg-slate-900 z-10 pb-2">
                    <th className="pb-3">Promo Code</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Discount Value</th>
                    <th className="pb-3">Redemptions</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-slate-800/20">
                      <td className="py-3 font-mono font-bold text-slate-200">{coupon.code}</td>
                      <td className="py-3 capitalize">{coupon.discountType.replace("_", " ")}</td>
                      <td className="py-3">
                        {coupon.discountType === "percentage"
                          ? `${coupon.discountValue}%`
                          : coupon.discountType === "flat"
                          ? `₹${coupon.discountValue}`
                          : `${coupon.discountValue} Days`}
                      </td>
                      <td className="py-3">
                        {coupon.redemptionsCount} / {coupon.maxRedemptions || "∞"}
                      </td>
                      <td className="py-3">
                        {coupon.isActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/10">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-950 text-slate-500 border border-slate-800">
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {coupons.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        No coupon codes provisioned yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default AdminBillingCenter;
