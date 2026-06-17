import { ArrowLeft, KeyRound, CheckSquare } from "lucide-react"
import { Link } from "react-router"

export function PrivacyPolicy() {
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
            <KeyRound className="h-6 w-6" />
            <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Privacy Policy</h1>
          </div>
          <p className="text-xs text-neutral-450 font-bold">Last Updated: June 17, 2026</p>
        </div>

        {/* Content */}
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-8 shadow-sm space-y-6 text-sm text-neutral-600 leading-relaxed font-medium">
          <section className="space-y-2">
            <h2 className="text-base font-black text-neutral-800 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-indigo-500" />
              <span>1. Information We Collect</span>
            </h2>
            <p>
              We collect credentials (name, email, secure password hashes) when you create an account, billing details required for invoicing, and classroom affiliation profiles (instructor IDs, class join codes). Additionally, we record all simulation choices and results (round snapshots, keyword sets, budget bids) to compute scores.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-neutral-800 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-indigo-500" />
              <span>2. Operation & Data Usage</span>
            </h2>
            <p>
              Your data is utilized to execute simulation calculations, render performance growth charts, compile NBA outcome mappings for instructors, issue cryptographic certificates, and maintain application logging loops. We do not sell user data to advertising third parties.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-neutral-800 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-indigo-500" />
              <span>3. Cookies & Session Storage</span>
            </h2>
            <p>
              We store session identifiers using HttpOnly cookies to keep you authenticated. Local storage is utilized to save local interface settings, such as your theme choice or cookie consent flag. You can disable cookies in your browser settings, which will restrict platform access.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-neutral-800 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-indigo-500" />
              <span>4. Data Retention Limits</span>
            </h2>
            <p>
              Consistent with compliance regulations, we retain inactive accounts and simulation states for a maximum of 2 years. After this interval, a scheduled pruning job anonymizes logs and deletes expired records from our database.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-neutral-800 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-indigo-500" />
              <span>5. Your GDPR/CCPA Rights</span>
            </h2>
            <p>
              You hold the right to access, rectify, or demand the deletion of your personal records. For academic accounts affiliated with an institution, data queries should be coordinated through your classroom instructor.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
export default PrivacyPolicy
