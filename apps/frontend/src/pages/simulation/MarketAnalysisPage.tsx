import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import { 
  ArrowLeft, ArrowRight, ShieldAlert, RefreshCw,
  Search, BarChart3, LineChart, Globe
} from "lucide-react"
import { SimulationProgressTracker } from "@/components/simulation/SimulationProgressTracker"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

import { useSimulationStore } from "@/stores/simulationStore"

export function MarketAnalysisPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [fullState, setFullState] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const activeSimulation = useSimulationStore(state => state.activeSimulation)
  const allowed = activeSimulation?.allowedPlatforms || ["SEO", "GOOGLE_ADS", "META_ADS"]

  const getFirstStrategyPath = () => {
    if (allowed.includes("SEO")) return '/simulation/seo'
    if (allowed.includes("GOOGLE_ADS")) return '/simulation/google-ads'
    return '/simulation/meta-ads'
  }

  const getFirstStrategyLabel = () => {
    if (allowed.includes("SEO")) return 'Configure SEO Strategy'
    if (allowed.includes("GOOGLE_ADS")) return 'Configure Google Ads Strategy'
    return 'Configure Meta Ads Strategy'
  }

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
        <span className="text-sm text-neutral-500 font-bold">Loading market trends...</span>
      </div>
    )
  }

  if (errorMsg || !fullState) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-black text-neutral-900">Analysis Not Available</h2>
        <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
          {errorMsg || "No active simulation state."}
        </p>
      </div>
    )
  }

  const scenario = fullState.class?.scenario
  const isSaaS = scenario?.industry === 'B2B Software'

  // Dynamic Keyword trends
  const keywords = isSaaS 
    ? [
        { name: "crm software", volume: 15400, cpc: 250, difficulty: "High" },
        { name: "sales tracking app", volume: 6200, cpc: 180, difficulty: "Medium" },
        { name: "b2b contact manager", volume: 3800, cpc: 120, difficulty: "Low" },
        { name: "customer relationships tool", volume: 4900, cpc: 190, difficulty: "Medium" },
      ]
    : [
        { name: "sustainable sneakers", volume: 28000, cpc: 45, difficulty: "High" },
        { name: "eco friendly gym clothing", volume: 12500, cpc: 35, difficulty: "Medium" },
        { name: "recycled shoes sale", volume: 9200, cpc: 28, difficulty: "Low" },
        { name: "organic sportswear brand", volume: 7400, cpc: 40, difficulty: "Medium" },
      ]

  // Competitor Share Chart Data
  const marketShareData = isSaaS
    ? [
        { name: "Apex CRM", share: 38, budget: 15000 },
        { name: "SalesForce Pro", share: 29, budget: 12000 },
        { name: "CloudCRM (You)", share: 0, budget: 0 },
        { name: "SME Hub", share: 18, budget: 8000 },
        { name: "B2B Flow", share: 15, budget: 5000 },
      ]
    : [
        { name: "EcoNike", share: 42, budget: 25000 },
        { name: "GreenSneaks", share: 26, budget: 15000 },
        { name: "EarthStride (You)", share: 0, budget: 0 },
        { name: "BioFit", share: 18, budget: 10000 },
        { name: "EcoJogger", share: 14, budget: 6000 },
      ]

  const totalMarketVolume = keywords.reduce((sum, k) => sum + k.volume, 0)

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Simulation Progress Tracker */}
      <SimulationProgressTracker />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left border-b border-neutral-100 pb-5">
        <div className="space-y-1">
          <Link to="/simulation/briefing" className="inline-flex items-center gap-1 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Briefing
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 flex items-center gap-2 mt-1">
            <LineChart className="h-7 w-7 text-indigo-600" />
            Pre-Campaign Market Analysis
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-semibold">
            Evaluate search volumes, competitor bidding capacities, and keyword trends prior to launching Round 1.
          </p>
        </div>

        <Button
          onClick={() => navigate(getFirstStrategyPath())}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs h-11 px-5 rounded-xl shadow-md flex items-center gap-1.5 shrink-0"
        >
          {getFirstStrategyLabel()}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
        <Card className="border-neutral-200/80 shadow-sm bg-white p-5 space-y-1">
          <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Estimated Monthly Search Volume</span>
          <span className="text-2xl font-black text-indigo-600 block">{(totalMarketVolume * 3.5).toLocaleString()} Searches</span>
          <span className="text-[10px] text-neutral-500 font-semibold block mt-1">Across primary organic & paid social indexing channels.</span>
        </Card>
        
        <Card className="border-neutral-200/80 shadow-sm bg-white p-5 space-y-1">
          <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Competitor Average Bid Pressure</span>
          <span className="text-2xl font-black text-amber-600 block">{isSaaS ? "High ($1.80 - $2.50 CPC)" : "Medium ($0.35 - $0.50 CPC)"}</span>
          <span className="text-[10px] text-neutral-500 font-semibold block mt-1">Strong bid concentration on generic transactional terms.</span>
        </Card>

        <Card className="border-neutral-200/80 shadow-sm bg-white p-5 space-y-1">
          <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Baseline Market Share (SERP)</span>
          <span className="text-2xl font-black text-rose-500 block">0.0% (New Entrant)</span>
          <span className="text-[10px] text-neutral-500 font-semibold block mt-1">Round 1 objectives focus on acquiring initial index relevance.</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Keywords Analysis */}
        <Card className="border-neutral-200/80 shadow-sm bg-white p-6 text-left flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-black text-neutral-900 flex items-center gap-2">
              <Search className="h-4.5 w-4.5 text-indigo-500" />
              Target Keyword Insights
            </h3>
            <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
              Review current keyword statistics. Balance high search volume terms (which have intense bidding competition) with low-volume, lower CPC keywords to optimize initial conversion returns.
            </p>

            <div className="divide-y divide-neutral-100 border border-neutral-150 rounded-2xl overflow-hidden text-xs">
              <div className="bg-neutral-50 p-3 flex justify-between font-black text-neutral-700">
                <span className="w-1/3">Keyword</span>
                <span className="w-1/4 text-center">Search Vol</span>
                <span className="w-1/4 text-center">Est. CPC</span>
                <span className="w-1/6 text-right">Difficulty</span>
              </div>
              {keywords.map((kw) => (
                <div key={kw.name} className="p-3 flex justify-between font-semibold text-neutral-600 hover:bg-neutral-50/50">
                  <span className="w-1/3 text-neutral-900 font-bold">{kw.name}</span>
                  <span className="w-1/4 text-center">{kw.volume.toLocaleString()}</span>
                  <span className="w-1/4 text-center">₹{kw.cpc}</span>
                  <span className="w-1/6 text-right">
                    <Badge className={
                      kw.difficulty === 'High' 
                        ? 'bg-rose-50 text-rose-700 border-rose-200' 
                        : kw.difficulty === 'Medium' 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }>
                      {kw.difficulty}
                    </Badge>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Competitor Benchmarks */}
        <Card className="border-neutral-200/80 shadow-sm bg-white p-6 text-left flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-black text-neutral-900 flex items-center gap-2">
              <BarChart3 className="h-4.5 w-4.5 text-emerald-500" />
              Competitor Market Shares & Monthly Budgets
            </h3>
            <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
              Leading brands dominate current search visibility. Your campaigns must optimize ad quality scoring and organic relevance offsets to capture share from entrenched competitors.
            </p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marketShareData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" fontSize={9} fontWeight="bold" stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" width={85} fontSize={9} fontWeight="bold" stroke="#94a3b8" />
                  <Tooltip formatter={(v) => [`${v}% Share`, "Market Share"]} />
                  <Bar dataKey="share" fill="#6366f1" radius={[0, 8, 8, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* Channel Strategy Recommendations */}
      <Card className="border-neutral-200/80 shadow-sm bg-white p-6 text-left">
        <h3 className="text-base font-black text-neutral-900 flex items-center gap-2 mb-4">
          <Globe className="h-4.5 w-4.5 text-indigo-600" />
          Channel Allocation Recommendations (Round 1 Strategy)
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="space-y-2 border border-neutral-100 p-4 rounded-2xl hover:border-indigo-100 transition-colors">
            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-0.5 rounded-full inline-block">
              Organic SEO Focus
            </span>
            <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
              Target low-difficulty keyword variations first. Build out initial internal links structure and content quality to steadily grow Domain Authority.
            </p>
          </div>

          <div className="space-y-2 border border-neutral-100 p-4 rounded-2xl hover:border-indigo-100 transition-colors">
            <span className="text-xs font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2.5 py-0.5 rounded-full inline-block">
              Google Ads Bidding
            </span>
            <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
              Set max CPC ceilings carefully to prevent rapid budget exhaustion. Leverage ad sitelinks and callouts extensions to maximize initial Quality Scores.
            </p>
          </div>

          <div className="space-y-2 border border-neutral-100 p-4 rounded-2xl hover:border-indigo-100 transition-colors">
            <span className="text-xs font-black text-pink-600 uppercase tracking-widest bg-pink-50 px-2.5 py-0.5 rounded-full inline-block">
              Meta Social Bidding
            </span>
            <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
              Configure precise interest grouping matching the primary profile audience. Monitor ad fatigue carefully in subsequent daily campaign runs.
            </p>
          </div>
        </div>
      </Card>
      
    </div>
  )
}
export default MarketAnalysisPage;
