import React, { useState, useEffect } from "react";
import { useBillingStore, type Plan, type Coupon } from "@/stores/billingStore";
import { useAuthStore } from "@/stores/authStore";
import { Check, X, ShieldAlert, Sparkles, Receipt, Percent } from "lucide-react";

export function PricingPage() {
  const { plans, fetchPlans, checkout, verifyPayment, validateCoupon, error } = useBillingStore();
  const { user } = useAuthStore();
  
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  // Sandbox modal state
  const [sandboxOrder, setSandboxOrder] = useState<any | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [processingSandbox, setProcessingSandbox] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponError(null);
    setCouponSuccess(null);
    try {
      const coupon = await validateCoupon(couponCode.trim());
      setAppliedCoupon(coupon);
      let desc = "";
      if (coupon.discountType === "percentage") {
        desc = `${coupon.discountValue}% off`;
      } else if (coupon.discountType === "flat") {
        desc = `₹${coupon.discountValue} off`;
      } else if (coupon.discountType === "trial_extension") {
        desc = `${coupon.discountValue} days free trial extension`;
      }
      setCouponSuccess(`Coupon "${coupon.code}" applied: ${desc}!`);
    } catch (err: any) {
      setCouponError(err.message || "Invalid coupon code");
      setAppliedCoupon(null);
    }
  };

  const handleClearCoupon = () => {
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponError(null);
    setCouponSuccess(null);
  };

  const handleSelectPlan = async (plan: Plan) => {
    try {
      const res = await checkout(
        plan.code,
        billingCycle,
        appliedCoupon ? appliedCoupon.code : undefined
      );

      if (res.freeActivation) {
        alert("Free plan activated successfully!");
        window.location.href = "/subscription";
        return;
      }

      // If keyId is standard sandbox key, open our custom modal
      if (res.keyId === "rzp_test_mock_sandbox_key") {
        setSandboxOrder(res);
      } else {
        // Integrate real Razorpay script
        const options = {
          key: res.keyId,
          amount: res.amount * 100, // paise
          currency: res.currency,
          name: "SimLab Platform",
          description: `Subscribe to ${plan.name}`,
          order_id: res.gatewayOrderId,
          handler: async (response: any) => {
            try {
              await verifyPayment({
                gatewayPaymentId: response.razorpay_payment_id,
                gatewayOrderId: response.razorpay_order_id,
                gatewaySignature: response.razorpay_signature,
                couponCode: appliedCoupon ? appliedCoupon.code : undefined,
              });
              alert("Payment successful! Subscription active.");
              window.location.href = "/subscription";
            } catch (err: any) {
              alert(`Payment verification failed: ${err.message}`);
            }
          },
          prefill: {
            name: user?.name,
            email: user?.email,
          },
          theme: {
            color: "#6366f1",
          },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      alert(`Checkout failed: ${err.message}`);
    }
  };

  const handleSandboxPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxOrder) return;
    setProcessingSandbox(true);
    try {
      // Simulate signature verification call
      const mockPaymentId = `pay_sandbox_${Math.random().toString(36).substring(2, 11)}`;
      const mockSignature = `sig_sandbox_${Math.random().toString(36).substring(2, 11)}`;

      await verifyPayment({
        gatewayPaymentId: mockPaymentId,
        gatewayOrderId: sandboxOrder.gatewayOrderId,
        gatewaySignature: mockSignature,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      });

      alert("Sandbox Payment Captured & Verified Successfully!");
      setSandboxOrder(null);
      window.location.href = "/subscription";
    } catch (err: any) {
      alert(`Sandbox verification failed: ${err.message}`);
    } finally {
      setProcessingSandbox(false);
    }
  };

  const calculateDiscountedPrice = (price: number) => {
    if (!appliedCoupon) return price;
    if (appliedCoupon.discountType === "percentage") {
      return price * (1 - appliedCoupon.discountValue / 100);
    }
    if (appliedCoupon.discountType === "flat") {
      return Math.max(0, price - appliedCoupon.discountValue);
    }
    return price;
  };

  const usdEquivalent = (inrPrice: number) => {
    return (inrPrice / 83).toFixed(1);
  };

  const getLimitLabel = (limit: number) => {
    return limit === -1 ? "Unlimited" : limit;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="px-3 py-1 text-xs font-semibold tracking-wider text-indigo-400 uppercase bg-indigo-900/40 rounded-full border border-indigo-500/30">
            SaaS Plan Matrix
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl text-white">
            Choose the Perfect SimLab Tier
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-400">
            Get access to SEO, Google, and Meta simulation engines. Boost classroom engagements or practice campaigns.
          </p>
        </div>

        {/* Pricing Cycle Toggle */}
        <div className="flex justify-center items-center gap-4 mb-8">
          <span className={`text-sm ${billingCycle === "monthly" ? "text-indigo-400 font-bold" : "text-slate-400"}`}>
            Monthly Billing
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
            className="w-12 h-6 flex items-center bg-indigo-900/60 rounded-full p-1 border border-indigo-500/30 transition-colors duration-300"
          >
            <div
              className={`bg-indigo-400 w-4 h-4 rounded-full shadow-md transform duration-300 ${
                billingCycle === "yearly" ? "translate-x-6" : ""
              }`}
            />
          </button>
          <span className={`text-sm ${billingCycle === "yearly" ? "text-indigo-400 font-bold" : "text-slate-400"}`}>
            Yearly Saving (Save ~16.6%)
          </span>
        </div>

        {/* Coupon Input Box */}
        <div className="max-w-md mx-auto mb-12 bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-800/80 shadow-2xl">
          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="PROMO CODE (e.g. WELCOME50)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                disabled={!!appliedCoupon}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none uppercase"
              />
              {appliedCoupon && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-emerald-400 text-xs">
                  <Percent className="w-3.5 h-3.5 mr-1" /> Verified
                </div>
              )}
            </div>
            {appliedCoupon ? (
              <button
                type="button"
                onClick={handleClearCoupon}
                className="px-4 py-2 bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-500/20 rounded-xl text-sm transition"
              >
                Clear
              </button>
            ) : (
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition"
              >
                Apply
              </button>
            )}
          </form>
          {couponError && <p className="mt-2 text-xs text-red-400 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> {couponError}</p>}
          {couponSuccess && <p className="mt-2 text-xs text-emerald-400 font-medium">{couponSuccess}</p>}
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-950/40 border border-red-500/30 text-red-300 rounded-xl max-w-xl mx-auto text-sm text-center">
            {error}
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const rawPrice = billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly;
            const finalPrice = calculateDiscountedPrice(rawPrice);
            const isDiscounted = finalPrice !== rawPrice;

            const isCurrent = user?.planType === plan.code;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between p-8 bg-slate-900/40 backdrop-blur-md rounded-3xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-indigo-500/5 ${
                  isCurrent
                    ? "border-emerald-500/50 shadow-emerald-500/5"
                    : plan.code === "individual_pro" || plan.code === "instructor"
                    ? "border-indigo-500/40 shadow-indigo-500/5 bg-slate-900/70"
                    : "border-slate-800/80"
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 right-6 px-3 py-0.5 text-xs font-semibold text-emerald-400 bg-emerald-950 border border-emerald-500/30 rounded-full flex items-center gap-1">
                    Active Plan
                  </span>
                )}

                {plan.code === "individual_pro" && (
                  <span className="absolute -top-3 left-6 px-3 py-0.5 text-xs font-semibold text-indigo-400 bg-indigo-950 border border-indigo-500/30 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Popular
                  </span>
                )}

                <div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="mt-2 text-xs text-slate-400 uppercase tracking-widest">{plan.code.replace("_", " ")}</p>

                  <div className="mt-6 flex items-baseline">
                    <span className="text-4xl font-extrabold text-white">
                      ₹{finalPrice.toLocaleString()}
                    </span>
                    <span className="ml-1 text-sm text-slate-400">
                      /{billingCycle === "monthly" ? "mo" : "yr"}
                    </span>
                  </div>

                  {isDiscounted && (
                    <p className="text-xs text-slate-500 line-through mt-1">
                      Was ₹{rawPrice.toLocaleString()}
                    </p>
                  )}

                  <div className="mt-2 text-xs text-indigo-400">
                    ≈ ${usdEquivalent(finalPrice)} USD
                  </div>

                  {/* Plan Limits Matrix */}
                  <div className="mt-6 space-y-3 pt-6 border-t border-slate-800/60">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Simulations Limit:</span>
                      <span className="font-semibold text-slate-200">{getLimitLabel(plan.simulationLimit)} runs</span>
                    </div>
                    {plan.studentLimit > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Student Capacity:</span>
                        <span className="font-semibold text-slate-200">{getLimitLabel(plan.studentLimit)} students</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Certificates Claimable:</span>
                      <span className="font-semibold text-slate-200">{getLimitLabel(plan.certificateLimit)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Report Export Cap:</span>
                      <span className="font-semibold text-slate-200">{getLimitLabel(plan.reportExportLimit)} exports</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Storage Assigned:</span>
                      <span className="font-semibold text-slate-200">{(plan.storageLimitMb / 1024).toFixed(1)} GB</span>
                    </div>
                  </div>

                  {/* Feature Lists */}
                  <ul className="mt-6 space-y-2.5">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-xs text-slate-300">
                        <Check className="w-4 h-4 text-indigo-400 mr-2 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isCurrent}
                    className={`w-full py-3 px-4 rounded-xl text-sm font-semibold tracking-wide transition duration-300 ${
                      isCurrent
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                        : plan.code === "individual_pro" || plan.code === "instructor"
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    }`}
                  >
                    {isCurrent ? "Active Plan" : plan.priceMonthly === 0 ? "Activate Trial" : "Subscribe Now"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sandbox Payment Modal */}
      {sandboxOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSandboxOrder(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <span className="px-3 py-0.5 text-[10px] font-semibold tracking-wider text-yellow-400 uppercase bg-yellow-950 border border-yellow-500/20 rounded-full">
                Sandbox Mode
              </span>
              <h3 className="text-xl font-bold text-white mt-2 flex items-center justify-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-400" /> Simulated Payment Checkout
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Verify subscription instantly without gateway credentials
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl mb-6 border border-slate-800/80">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-400">Order ID:</span>
                <span className="font-mono text-indigo-400">{sandboxOrder.gatewayOrderId}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Subtotal Amount:</span>
                <span className="font-bold text-slate-100">₹{sandboxOrder.amount.toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handleSandboxPayment} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Card Number (Simulated)</label>
                <input
                  type="text"
                  placeholder="4111 2222 3333 4444"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Expiration Date</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">CVV</label>
                  <input
                    type="password"
                    placeholder="•••"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/30"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={processingSandbox}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold tracking-wide transition shadow-lg shadow-indigo-500/10 mt-6"
              >
                {processingSandbox ? "Processing Simulation..." : `Simulate Capture (₹${sandboxOrder.amount})`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default PricingPage;
