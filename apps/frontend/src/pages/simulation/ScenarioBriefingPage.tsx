import { useState, useEffect } from "react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import { 
  ArrowLeft, ArrowRight, ShieldAlert, 
  Target, Info, RefreshCw, Layers, Landmark
} from "lucide-react"
import { SimulationProgressTracker } from "@/components/simulation/SimulationProgressTracker"

export function ScenarioBriefingPage() {
  const [loading, setLoading] = useState(true)
  const [fullState, setFullState] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get<{ success: boolean; state: any }>('/api/v1/simulation/state')
        if (res.data?.success && res.data.state) {
          setFullState(res.data.state)
        } else {
          setErrorMsg("Failed to retrieve simulation state details.")
        }
      } catch (err: any) {
        console.error(err)
        setErrorMsg(err.response?.data?.message || "No active simulation state initialized yet.")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
        <span className="text-sm text-neutral-500 font-bold">Loading scenario briefing...</span>
      </div>
    )
  }

  if (errorMsg || !fullState) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-black text-neutral-900">Briefing Not Available</h2>
        <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
          {errorMsg || "No active simulation class cohort found."}
        </p>
      </div>
    )
  }

  const scenario = fullState.class?.scenario
  const isSaaS = scenario?.industry === 'B2B Software'

  // Dynamic context details based on scenario type
  const companyProfile = isSaaS 
    ? {
        name: "Collaborative Cloud CRM Tool (SaaS)",
        desc: "A cloud-based CRM designed for small-to-medium enterprises (SMEs) looking to streamline their sales processes, manage contacts, and track conversions. High ticket size, B2B sales cycle.",
        productValue: "$120.00 / user subscription price",
        idealAudience: "Business owners, tech executives, CRM professionals"
      }
    : {
        name: "Sustainable Apparel Blitz (E-Commerce)",
        desc: "An e-commerce retailer offering eco-friendly custom sneakers and sportswear built from recycled plastics. Fast sales cycle, consumer brand recognition, visual social shopping intent.",
        productValue: "$75.00 average order value",
        idealAudience: "Fitness lovers, green lifestyle enthusiasts, fashion buyers"
      }

  const marketConditions = isSaaS
    ? "Highly competitive B2B software environment. Bidding on high-intent search terms is expensive due to heavy CPC pressure. SEO content quality and backlink building are crucial for organic long-term ranking."
    : "Vibrant social commerce environment. Visual creatives, video reels, and Instagram stories have a massive impact on paid social. Broad search keywords drive traffic, but retargeting site visitors is essential for scaling conversions."

  const rules = [
    "You are allocated a fixed round budget. Spend exceeding this allocation will penalize your budget discipline KPI.",
    "Decisions made across SEO, Google Ads, and Meta Ads must be saved before advancing.",
    "Once you submit the round, the simulation engine locks all decisions, executes daily auction modeling for 30 days, and prepares your scores.",
    "Success is scored based on 5 dimensions: On-Page SEO, Google Ads CTR, Paid Social ROI, Budget discipline, and overall Conversion Revenue."
  ]

  const successMetrics = [
    { label: "Revenue & Conversions", desc: "Total conversion revenue generated from B2C purchases or B2B SaaS signups." },
    { label: "Keyword Rankings", desc: "Organic search ranking positions (SERP) on target transactional keywords." },
    { label: "Bidding Efficiency", desc: "Quality Score, CPC optimization, and overall ROI / ROAS multipliers." },
  ]

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* progress tracker */}
      <SimulationProgressTracker />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
        <div className="space-y-1">
          <Link to="/simulation" className="inline-flex items-center gap-1 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Simulation Home
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 flex items-center gap-2 mt-1">
            <Info className="h-7 w-7 text-indigo-600" />
            Scenario Briefing & Guidelines
          </h1>
        </div>
        
        <div className="flex gap-2">
          <Badge className="bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-black px-3 py-1 rounded-full">
            Round {fullState.currentRound} of {scenario?.maxRounds || 10}
          </Badge>
          <Badge className="bg-slate-100 text-slate-800 border-none text-xs font-bold px-3 py-1 rounded-full capitalize">
            {scenario?.difficulty || "Medium"} Difficulty
          </Badge>
        </div>
      </div>

      {/* Overview & Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        
        {/* Left 2 Columns: Details */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Company Profile */}
          <Card className="border-neutral-200/80 shadow-sm bg-white p-6 space-y-3.5">
            <h3 className="text-base font-black text-neutral-900 flex items-center gap-2">
              <Landmark className="h-4.5 w-4.5 text-indigo-500" />
              Company Profile
            </h3>
            <p className="text-xs text-indigo-600 font-black uppercase tracking-wider bg-indigo-50/50 px-2 py-0.5 rounded w-max">
              {companyProfile.name}
            </p>
            <p className="text-xs sm:text-sm text-neutral-500 font-semibold leading-relaxed">
              {companyProfile.desc}
            </p>
            <div className="flex flex-wrap gap-4 text-xs font-bold pt-2 border-t border-neutral-100 text-neutral-600">
              <span>Average Order Value: <strong className="text-neutral-900">{companyProfile.productValue}</strong></span>
              <span>Primary Audience: <strong className="text-neutral-900">{companyProfile.idealAudience}</strong></span>
            </div>
          </Card>

          {/* Market Conditions */}
          <Card className="border-neutral-200/80 shadow-sm bg-white p-6 space-y-3">
            <h3 className="text-base font-black text-neutral-900 flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-emerald-500" />
              Market Conditions
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 font-semibold leading-relaxed">
              {marketConditions}
            </p>
          </Card>

          {/* Success Metrics */}
          <Card className="border-neutral-200/80 shadow-sm bg-white p-6 space-y-4">
            <h3 className="text-base font-black text-neutral-900 flex items-center gap-2">
              <Target className="h-4.5 w-4.5 text-amber-500" />
              Success Metrics & Evaluation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {successMetrics.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-neutral-200/60 bg-neutral-50/50">
                  <span className="text-xs font-extrabold text-neutral-800 block">{item.label}</span>
                  <span className="text-[10px] text-neutral-500 font-medium leading-relaxed block mt-1">{item.desc}</span>
                </div>
              ))}
            </div>
          </Card>

        </div>

        {/* Right Column: Rules & Actions */}
        <div className="space-y-6">
          
          {/* Rules */}
          <Card className="border-neutral-200/80 shadow-md bg-white p-6 space-y-4">
            <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider border-b border-neutral-150 pb-2">
              Rules of Engagement
            </h3>
            <div className="space-y-3">
              {rules.map((rule, idx) => (
                <div key={idx} className="flex gap-2.5">
                  <span className="text-xs font-black text-indigo-500 bg-indigo-50 h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs text-neutral-500 font-bold leading-relaxed">
                    {rule}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Continue Action */}
          <Card className="border-neutral-200/80 shadow-md bg-white p-5 text-center space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Ready to Begin?</span>
              <p className="text-xs font-semibold text-neutral-500">
                Setup your SEO strategy, keyword index, and backlink budgets.
              </p>
            </div>
            
            <Link to="/simulation/seo" className="block w-full">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs h-10 rounded-xl flex items-center justify-center gap-1.5 shadow-md">
                Configure SEO Decisions
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>

        </div>

      </div>

    </div>
  )
}
export default ScenarioBriefingPage;
