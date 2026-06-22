import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Card, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import { toast } from "sonner"
import { 
  ArrowLeft, ArrowRight, ShieldAlert, RefreshCw,
  FileText, CheckCircle2, ShieldCheck, Zap
} from "lucide-react"
import { SimulationProgressTracker } from "@/components/simulation/SimulationProgressTracker"
import { useResultsStore } from "@/stores/resultsStore"
import { useSimulationStore } from "@/stores/simulationStore"

export function MandatoryCheckpointPage() {
  const navigate = useNavigate()
  const { activeSimulation, fetchLatestState } = useSimulationStore()
  const { fetchResults, overallScore, allMetrics } = useResultsStore()

  const [loading, setLoading] = useState(true)
  const [justification, setJustification] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [checkpointSubmitted, setCheckpointSubmitted] = useState(false)
  const [reflectionScore, setReflectionScore] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const state = await fetchLatestState()
      if (state?.id) {
        await fetchResults(state.id)
        
        // Check if checkpoint already exists for the completed round (currentRound - 1)
        const res = await api.get<{ success: boolean; checkpoints: any[] }>(`/api/v1/simulation/checkpoint/${state.id}`)
        const completedRound = state.currentRound - 1
        const existing = res.data?.checkpoints?.find(cp => cp.roundNumber === completedRound)
        if (existing) {
          setCheckpointSubmitted(true)
          setJustification(existing.justificationText)
          setReflectionScore(existing.reflectionQualityScore)
        }
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.response?.data?.message || "Failed to load checkpoint context.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSubmitCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault()
    if (justification.trim().length < 10) {
      toast.error("Reflection must be at least 10 characters long.")
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post<{ success: boolean; checkpoint: any }>('/api/v1/simulation/checkpoint', {
        simulationId: activeSimulation?.id,
        roundNumber: activeSimulation!.currentRound - 1,
        justificationText: justification
      })
      if (res.data?.success) {
        toast.success("Checkpoint justification submitted successfully!")
        setCheckpointSubmitted(true)
        setReflectionScore(res.data.checkpoint.reflectionQualityScore)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit checkpoint.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
        <span className="text-sm text-neutral-500 font-bold">Loading simulation checkpoint...</span>
      </div>
    )
  }

  if (errorMsg || !activeSimulation) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-black text-neutral-900">Checkpoint Not Available</h2>
        <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
          {errorMsg || "No active simulation state initialized."}
        </p>
      </div>
    )
  }

  const completedRound = activeSimulation.currentRound - 1
  const roundMetrics = allMetrics.filter((m) => m.round === completedRound - 1)
  const totalSpend = roundMetrics.reduce((sum, m) => sum + (m.googleCost || 0) + (m.metaCost || 0), 0)
  const totalRevenue = roundMetrics.reduce((sum, m) => sum + (m.revenue || 0), 0)
  const roas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : "0.00"

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Simulation Progress Tracker */}
      <SimulationProgressTracker />

      {/* Header Summary */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left border-b border-neutral-100 pb-5">
        <div className="space-y-1">
          <Link to="/simulation/results" className="inline-flex items-center gap-1 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Results Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 flex items-center gap-2 mt-1">
            <FileText className="h-7 w-7 text-indigo-600" />
            Round {completedRound} Checkpoint Gate
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-semibold">
            Evaluate your round results and submit your performance reflection to unlock next round optimization decisions.
          </p>
        </div>

        {checkpointSubmitted && (
          <Button
            onClick={() => navigate('/simulation')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs h-11 px-5 rounded-xl shadow-md flex items-center gap-1.5 shrink-0"
          >
            Unlock Next Decisions
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Round Performance Review Block */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-left">
        <Card className="border-neutral-200 bg-white p-4 space-y-1">
          <span className="text-[9px] font-black text-neutral-400 uppercase">Composite Index</span>
          <span className="text-xl font-black text-indigo-600 block">{overallScore}%</span>
        </Card>
        
        <Card className="border-neutral-200 bg-white p-4 space-y-1">
          <span className="text-[9px] font-black text-neutral-400 uppercase">Conversion Revenue</span>
          <span className="text-xl font-black text-neutral-900 block">₹{totalRevenue.toLocaleString()}</span>
        </Card>

        <Card className="border-neutral-200 bg-white p-4 space-y-1">
          <span className="text-[9px] font-black text-neutral-400 uppercase">Advertising Spend</span>
          <span className="text-xl font-black text-neutral-900 block">₹{totalSpend.toLocaleString()}</span>
        </Card>

        <Card className="border-neutral-200 bg-white p-4 space-y-1">
          <span className="text-[9px] font-black text-neutral-400 uppercase">ROAS Efficiency</span>
          <span className="text-xl font-black text-emerald-600 block">{roas}x</span>
        </Card>
      </div>

      {/* Justification Form */}
      <Card className="border-neutral-200 bg-white p-6 text-left space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base font-black text-neutral-900">Strategy Justification & Reflection</CardTitle>
            <CardDescription className="text-xs text-neutral-500 font-semibold mt-1">
              Provide an analytical reflection explaining your budget deployment, keyword choice logic, and CPC bidding decisions.
            </CardDescription>
          </div>
          {checkpointSubmitted ? (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-black text-xs px-3 py-1 flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" />
              Gate Unlocked
            </Badge>
          ) : (
            <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-black text-xs px-3 py-1 flex items-center gap-1 animate-pulse">
              <Zap className="h-4 w-4 text-rose-500" />
              Mandatory Gate
            </Badge>
          )}
        </div>

        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100 space-y-2 mt-2">
          <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Required Reflection Prompt Questions:</span>
          <ol className="list-decimal pl-4 text-xs font-bold text-neutral-600 space-y-1">
            <li>What worked in your strategy?</li>
            <li>What failed or underperformed?</li>
            <li>What will you change in the next round?</li>
            <li>How did market events affect your results?</li>
          </ol>
        </div>

        <form onSubmit={handleSubmitCheckpoint} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Reflection Statement (Min 10 characters)</label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              disabled={checkpointSubmitted}
              className="w-full min-h-[140px] p-3 text-sm border border-neutral-200 rounded-xl bg-neutral-50/50 disabled:bg-neutral-50 disabled:text-neutral-500 font-medium focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed transition-all"
              placeholder="E.g., In Round 1, our CPC bidding strategy focused heavily on 'crm software' search terms. Although conversion revenue grew to ₹12,000, CPC bidding volatility increased spend. To optimize ROAS in Round 2, we will distribute more budget to organic content keywords to build long-term SEO backlinks, while introducing negative keywords to prevent wasted PPC clicks..."
            />
          </div>

          {!checkpointSubmitted && (
            <Button
              type="submit"
              disabled={submitting || justification.trim().length < 10}
              className="bg-neutral-900 text-white hover:bg-neutral-950 font-black text-xs h-10 px-5 rounded-xl"
            >
              {submitting ? "Analyzing Justification..." : "Submit Performance Justification"}
            </Button>
          )}
        </form>

        {checkpointSubmitted && reflectionScore !== null && (
          <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs mt-4">
            <div className="space-y-1 text-left">
              <span className="font-black text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                Reflection Quality Verified
              </span>
              <p className="text-neutral-600 font-semibold leading-relaxed">
                Your strategy reflection has been scored and cataloged under your academic audit record.
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">AI Reflection Score</span>
              <span className="text-lg font-black text-emerald-700 block mt-0.5">{reflectionScore}%</span>
            </div>
          </div>
        )}
      </Card>
      
    </div>
  )
}
export default MandatoryCheckpointPage;
