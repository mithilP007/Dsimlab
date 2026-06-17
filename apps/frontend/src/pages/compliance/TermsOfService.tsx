import { ArrowLeft, BookOpen, ShieldCheck } from "lucide-react"
import { Link } from "react-router"

export function TermsOfService() {
  return (
    <div className="min-h-screen bg-neutral-50/50 py-12 px-6 animate-in fade-in duration-300">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navigation */}
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 hover:bg-white rounded-lg border border-neutral-200 transition-all shadow-sm">
            <ArrowLeft className="h-4 w-4 text-neutral-600" />
          </Link>
          <span className="text-xs font-bold text-neutral-450 uppercase tracking-wider">SimLab Platform Compliance</span>
        </div>

        {/* Document Header */}
        <div className="space-y-3 border-b border-neutral-200 pb-6">
          <div className="flex items-center gap-2.5 text-indigo-600">
            <BookOpen className="h-6 w-6" />
            <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Terms of Service</h1>
          </div>
          <p className="text-xs text-neutral-450 font-bold">Last Updated: June 17, 2026</p>
        </div>

        {/* Content */}
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-8 shadow-sm space-y-6 text-sm text-neutral-600 leading-relaxed font-medium">
          <section className="space-y-2">
            <h2 className="text-base font-black text-neutral-800 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              <span>1. Agreement to Terms</span>
            </h2>
            <p>
              By accessing and operating the SimLab digital marketing simulation platform ("SimLab", "Platform", "Service"), you agree to be bound by these Terms of Service. If you are registering on behalf of an academic institution, you represent and warrant that you hold appropriate delegation authority to bind that entity.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-neutral-800 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              <span>2. Simulation Integrity & Use Rules</span>
            </h2>
            <p>
              SimLab is designed for pedagogical and educational purposes. You agree not to attempt to manipulate the simulation engine, reverse-engineer calculations, scrape competitor rankings, or use script automated triggers to submit round decisions. Account usage is personal and non-transferable.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-neutral-800 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              <span>3. Subscriptions, Invoicing, & Billing</span>
            </h2>
            <p>
              Individual access plans and academic cohort limits are subject to subscription payments billed in advance. All pricing fees are exclusive of statutory taxes (such as GST or VAT). Subscription renewals occur automatically unless cancelled in your billing dashboard prior to the next billing interval.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-neutral-800 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              <span>4. AI Insights & Model Calculations</span>
            </h2>
            <p>
              AI diagnostic recommendations are generated based on mathematical simulation indices and large language modeling. These insights are intended for training purposes and do not represent verified professional marketing suggestions or guaranteed ROI results.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-neutral-800 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              <span>5. Limitation of Liability</span>
            </h2>
            <p>
              In no event shall SimLab, its directors, developers, or affiliates be liable for any indirect, consequential, or incidental damages arising out of your operation of the platform. Maximum cumulative platform liability is capped at the fees paid in the preceding three-month interval.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
export default TermsOfService
