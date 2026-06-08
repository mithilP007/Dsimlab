import { useState, useEffect } from "react"
import { useNavigate } from "react-router"
import { useAuthStore } from "@/stores/authStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { KpiCard } from "@/components/simulation/KpiCard"
import { MetricSparkline } from "@/components/charts/MetricSparkline"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Activity,
  Calendar,
  TrendingUp,
  Award,
  CheckCircle2,
  Lock,
  Play,
  RotateCcw,
  ArrowRight,
  Zap,
} from "lucide-react"

export function IndividualDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { activeSimulation, startSimulation, fetchLatestState, resetSimulation } = useSimulationStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLatestState().finally(() => {
      setLoading(false)
    })
  }, [fetchLatestState])

  const renderDataModeBadge = () => {
    return (
      <Badge className="font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xs transition-colors bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20">
        <span className="h-1.5 w-1.5 rounded-full mr-1.5 inline-block bg-indigo-400 animate-pulse" />
        Real-Time Trend-Based Simulation
      </Badge>
    )
  }

  const handleFastForwardDev = async () => {
    if (!activeSimulation?.id) return
    setLoading(true)
    try {
      const res = await (await import("@/lib/api")).default.post(`/api/simulations/${activeSimulation.id}/fast-forward`)
      if (res.data?.success) {
        toast.success("Simulation round advanced instantly via fast-forward!")
        await fetchLatestState()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to fast-forward simulation")
    } finally {
      setLoading(false)
    }
  }


  // Mock historical data for sparkline
  const sparklineData = activeSimulation ? [10, 15, 12, 24, 30, 28, Math.round(activeSimulation.score)] : [0, 0, 0]

  const handleStartSimulation = async () => {
    setLoading(true)
    try {
      const sim = await startSimulation()
      if (sim) {
        navigate("/simulation/seo")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start simulation sandbox")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSimulation = async () => {
    // Reset simulation locally and locally clear the active session
    resetSimulation()
    toast.success("Simulation session cleared. Ready to start new campaign sandbox.")
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 bg-white rounded-2xl border border-neutral-200">
        <div className="space-y-4 text-center">
          <div className="h-8 w-8 border-4 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-neutral-500">Loading your sandbox space...</p>
        </div>
      </div>
    )
  }

  if (!activeSimulation) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <EmptyState
            title="Start Your First Simulation"
            description="Create your personalized sandbox simulation workspace to begin practicing keyword bidding, Meta targets, and organic optimization."
            icon={Play}
            actionText="Start Simulation Sandbox"
            onAction={handleStartSimulation}
          />
        </div>
      </div>
    )
  }

  // Map checklist items dynamically from backend values
  const currentRound = activeSimulation.currentRound
  const roiValue = Math.round(activeSimulation.score)
  const progressPct = Math.round(((currentRound - 1) / 10) * 100)
  const isCompleted = activeSimulation.isCompleted

  const checklist = [
    { label: "Initialized Simulation Sandbox", completed: true },
    { label: "Completed Round 1 Campaigns", completed: currentRound > 1 || isCompleted },
    { label: "Completed Round 5 Milestone", completed: currentRound > 5 || isCompleted },
    { label: "Completed All Simulation Rounds", completed: isCompleted },
    { label: "Eligible for Certification Check", completed: isCompleted && roiValue >= 60, isFinal: true },
  ]

  const daysActive = currentRound - 1
  const daysRemaining = Math.max(0, 10 - daysActive)

  return (
    <div className="space-y-6 text-left">
      {/* Greetings & Admin Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-neutral-200/80 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">
              Simulation Console
            </h2>
            {renderDataModeBadge()}
          </div>
          <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
            Workspace: {user?.name || "Marketer"} • Individual Sandbox
          </p>
        </div>
        <div className="flex gap-2">
          {import.meta.env.DEV && (
            <Button
              size="sm"
              className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
              onClick={handleFastForwardDev}
            >
              <Zap className="h-3.5 w-3.5" />
              Fast-Forward (Dev)
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-9 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold"
            onClick={handleDeleteSimulation}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Reset Console Session
          </Button>
        </div>
      </div>


      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Simulation Progress %"
          value={`${progressPct}%`}
          trend={isCompleted ? "Completed" : "Active"}
          description="rounds completed"
          icon={Activity}
        />
        <KpiCard
          title="Rounds Remaining"
          value={`${daysRemaining} Rounds`}
          description="out of 10 max rounds"
          icon={Calendar}
        />
        <KpiCard
          title="Active Bidding Score"
          value={`${roiValue}%`}
          trend={roiValue >= 60 ? "Passing Score" : "Needs Growth"}
          description="composite performance index"
          icon={TrendingUp}
        />
        <KpiCard
          title="Certification Eligibility"
          value={isCompleted && roiValue >= 60 ? "Eligible" : "In Progress"}
          description={isCompleted && roiValue >= 60 ? "Criteria fully met" : "Complete simulator rounds"}
          icon={Award}
        />
      </div>

      {/* Main Grid: Desktop 2 Columns, Mobile 1 Column */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Card: Recent Simulation */}
        <Card className="border-neutral-200 shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold text-neutral-900">Recent Simulation</CardTitle>
                <CardDescription>Metrics progress history over the current round</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-neutral-200 uppercase bg-neutral-50 px-2 py-0.5">
                Round {currentRound}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sparkline Area Chart */}
              <div className="p-2 border border-neutral-100 rounded-xl bg-neutral-50/50">
                <div className="flex justify-between items-center text-xs font-bold text-neutral-400 px-2 pb-2">
                  <span>ROI Trend Tracker</span>
                  <span className="text-neutral-900">Round {currentRound} of 10</span>
                </div>
                <MetricSparkline data={sparklineData} height={70} color="#171717" />
              </div>

              {/* Progress Slider Display */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-neutral-500">
                  <span>Completed Steps</span>
                  <span className="text-neutral-900 font-bold">{progressPct}% ({currentRound - 1}/10 Rounds)</span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>
            </CardContent>
          </div>
          <CardFooter className="pt-2">
            <Button 
              className="w-full h-11 font-bold bg-neutral-950 text-white hover:bg-neutral-800 shadow-sm"
              onClick={() => navigate("/simulation/seo")}
            >
              Continue Simulation
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>

        {/* Right Card: Current Plan */}
        <Card className="border-neutral-200 shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-neutral-900">Current Plan</CardTitle>
              <CardDescription>Your sandbox subscription package terms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Plan detail card */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex items-start gap-4">
                <div className="h-10 w-10 bg-neutral-950 text-white rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                  30D
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-sm text-neutral-900 block">Complete Simulation Plan</span>
                  <span className="text-xs text-neutral-500 block">
                    Full sandbox credentials with automated scorecard analytics.
                  </span>
                </div>
              </div>

              {/* Remaining Days indicator */}
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="p-3 border border-neutral-100 rounded-xl bg-neutral-50/50">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Rounds Completed</span>
                  <span className="text-lg font-black text-neutral-900 block">{currentRound - 1} Rounds</span>
                </div>
                <div className="p-3 border border-neutral-100 rounded-xl bg-neutral-50/50">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Rounds Remaining</span>
                  <span className="text-lg font-black text-neutral-900 block">{daysRemaining} Rounds</span>
                </div>
              </div>
            </CardContent>
          </div>
          <CardFooter className="pt-2">
            <Button variant="outline" className="w-full h-11 font-bold border-neutral-200 hover:bg-neutral-50" disabled>
              Sandbox Plan Active
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Eligibility Checklist Section */}
      <Card className="border-neutral-200 shadow-sm text-left">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-neutral-900">Certification Eligibility Tracker</CardTitle>
          <CardDescription>Verify completed simulation milestones to claim your platform credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-w-md">
            {checklist.map((item) => (
              <div
                key={item.label}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  item.completed
                    ? "border-neutral-150 bg-neutral-50/20"
                    : item.isFinal
                    ? "border-amber-100 bg-amber-50/20"
                    : "border-neutral-200/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    {item.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 stroke-[2.5px]" />
                    ) : item.isFinal ? (
                      <Lock className="h-4.5 w-4.5 text-amber-600" />
                    ) : (
                      <div className="h-4.5 w-4.5 rounded-full border border-neutral-300 bg-white" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      item.completed ? "text-neutral-900 font-bold" : "text-neutral-500"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                {!item.completed && (
                  <Badge variant="outline" className="text-[9px] font-bold py-0.5 px-2 uppercase border-neutral-200">
                    {item.isFinal ? "Locked" : "Pending"}
                  </Badge>
                )}
                {item.completed && (
                  <Badge variant="secondary" className="text-[9px] font-bold py-0.5 px-2 uppercase bg-emerald-50 text-emerald-700">
                    Verified
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
export default IndividualDashboard
