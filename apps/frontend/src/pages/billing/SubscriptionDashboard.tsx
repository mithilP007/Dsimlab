import { useEffect } from "react";
import { useBillingStore } from "@/stores/billingStore";
import { Link } from "react-router";
import { ShieldAlert, ArrowUpRight, Ban, Calendar, Activity, CheckCircle, RefreshCw } from "lucide-react";

export function SubscriptionDashboard() {
  const {
    subscription,
    subscriptionHistory,
    usage,
    fetchSubscription,
    cancelSubscription,
    loading,
    error
  } = useBillingStore();

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your current subscription plan at the end of the billing period? You will retain access until the expiration date.")) {
      return;
    }
    try {
      await cancelSubscription();
      alert("Subscription set to cancel at the end of the cycle.");
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "active" || s === "trialing") {
      return (
        <span className="px-3 py-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/20 rounded-full flex items-center gap-1 w-max">
          <CheckCircle className="w-3.5 h-3.5" /> Active
        </span>
      );
    }
    if (s === "cancelled") {
      return (
        <span className="px-3 py-1 text-xs font-semibold text-amber-400 bg-amber-950/60 border border-amber-500/20 rounded-full flex items-center gap-1 w-max">
          <ShieldAlert className="w-3.5 h-3.5" /> Cancelled
        </span>
      );
    }
    return (
      <span className="px-3 py-1 text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-700 rounded-full flex items-center gap-1 w-max">
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Background glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-900 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-8 h-8 text-indigo-400" /> Subscription & Account Limits
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Monitor your active simulation capacities, classroom quotas, and billing renewals.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => fetchSubscription()}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl transition"
              title="Refresh Stats"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              to="/pricing"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold tracking-wide transition shadow-lg shadow-indigo-500/10 flex items-center gap-1.5"
            >
              Upgrade Plan <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-950/40 border border-red-500/30 text-red-300 rounded-xl text-sm">
            {error}
          </div>
        )}

        {subscription ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Left: Active Subscription Card */}
            <div className="lg:col-span-1 bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/80 shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Current Tier</span>
                <h2 className="text-2xl font-bold text-white mt-1">{subscription.plan.name}</h2>
                <div className="mt-4">{getStatusBadge(subscription.status)}</div>

                <div className="mt-6 space-y-4 pt-6 border-t border-slate-800/60">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Started: {formatDate(subscription.startDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>
                      {subscription.cancelAtPeriodEnd ? "Access Ends:" : "Next Renewal:"} {formatDate(subscription.endDate)}
                    </span>
                  </div>
                  {subscription.cancelAtPeriodEnd && (
                    <div className="p-3 bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-300 rounded-xl leading-relaxed">
                      Plan is cancelled and will remain active until the end date above. Access limit enforcement will revert to the Free tier limits afterwards.
                    </div>
                  )}
                </div>
              </div>

              {!subscription.cancelAtPeriodEnd && subscription.plan.code !== "free" && (
                <button
                  onClick={handleCancel}
                  className="mt-8 w-full py-2.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <Ban className="w-4 h-4" /> Cancel Plan Subscription
                </button>
              )}
            </div>

            {/* Right: Plan Enforcements meters */}
            <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/80 shadow-xl space-y-6">
              <h3 className="text-lg font-bold text-white mb-4">Plan Usage Metrics</h3>

              {/* Simulations Meter */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Campaign Runs Capacity</span>
                  <span className="font-semibold text-slate-200">
                    {usage.simulationsUsed} / {subscription.plan.simulationLimit === -1 ? "Unlimited" : subscription.plan.simulationLimit}
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-850">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        subscription.plan.simulationLimit === -1
                          ? 0
                          : Math.min(100, (usage.simulationsUsed / subscription.plan.simulationLimit) * 100)
                      }%`
                    }}
                  />
                </div>
              </div>

              {/* Students (Instructor limit) */}
              {subscription.plan.studentLimit > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Classroom Roster Limit</span>
                    <span className="font-semibold text-slate-200">
                      {usage.studentsUsed} / {subscription.plan.studentLimit === -1 ? "Unlimited" : subscription.plan.studentLimit}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-850">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          subscription.plan.studentLimit === -1
                            ? 0
                            : Math.min(100, (usage.studentsUsed / subscription.plan.studentLimit) * 100)
                        }%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* General Caps Summary */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-6 border-t border-slate-800/60">
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 text-center">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Certificates claimable</span>
                  <span className="text-lg font-bold text-slate-200 mt-1 block">
                    {subscription.plan.certificateLimit === -1 ? "Unlimited" : subscription.plan.certificateLimit}
                  </span>
                </div>
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 text-center">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Reports export limit</span>
                  <span className="text-lg font-bold text-slate-200 mt-1 block">
                    {subscription.plan.reportExportLimit === -1 ? "Unlimited" : subscription.plan.reportExportLimit}
                  </span>
                </div>
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 text-center col-span-2 md:col-span-1">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Assigned Storage</span>
                  <span className="text-lg font-bold text-slate-200 mt-1 block">
                    {(subscription.plan.storageLimitMb / 1024).toFixed(1)} GB
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/40 backdrop-blur-md p-12 rounded-3xl border border-slate-800/80 text-center mb-12 shadow-xl">
            <ShieldAlert className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white">No active subscription found</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
              Please choose a pricing plan to unlock campaign simulation sandboxes, dashboards, and accreditation features.
            </p>
            <Link
              to="/pricing"
              className="mt-6 inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold tracking-wide transition shadow-lg shadow-indigo-500/10"
            >
              Choose Plan
            </Link>
          </div>
        )}

        {/* Plan History Ledger */}
        <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/80 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4">Subscription Plan History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Plan Name</th>
                  <th className="pb-3">Billing Cycle</th>
                  <th className="pb-3">Period Range</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {subscriptionHistory.map((historyItem) => (
                  <tr key={historyItem.id} className="hover:bg-slate-800/20">
                    <td className="py-3 font-semibold text-slate-200">{historyItem.plan.name}</td>
                    <td className="py-3 capitalize">{historyItem.billingCycle}</td>
                    <td className="py-3">
                      {formatDate(historyItem.startDate)} – {formatDate(historyItem.endDate)}
                    </td>
                    <td className="py-3 capitalize">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          historyItem.status === "active"
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/10"
                            : historyItem.status === "cancelled"
                            ? "bg-amber-950/80 text-amber-400 border border-amber-500/10"
                            : "bg-slate-950 text-slate-400 border border-slate-800"
                        }`}
                      >
                        {historyItem.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {subscriptionHistory.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      No plan history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
export default SubscriptionDashboard;
