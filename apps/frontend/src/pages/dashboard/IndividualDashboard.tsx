import { useState } from "react"
import { useAuthStore } from "@/stores/authStore"
import { KpiCard } from "@/components/simulation/KpiCard"
import { MetricSparkline } from "@/components/charts/MetricSparkline"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
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
} from "lucide-react"

export function IndividualDashboard() {
  const { user } = useAuthStore()
  const [hasSimulation, setHasSimulation] = useState(true)

  // Mock historical data for sparkline
  const sparklineData = [10, 15, 12, 24, 30, 28, 45]

  const handleStartSimulation = () => {
    setHasSimulation(true)
  }

  const handleDeleteSimulation = () => {
    setHasSimulation(false)
  }

  // Checklist verification states
  const checklist = [
    { label: "Started Simulation", completed: true },
    { label: "Completed 25%", completed: true },
    { label: "Completed 50%", completed: false },
    { label: "Completed 75%", completed: false },
    { label: "Eligible for Certification", completed: false, isFinal: true },
  ]

  if (!hasSimulation) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <EmptyState
            title="Start Your First Simulation"
            description="Begin your digital marketing journey."
            icon={Play}
            actionText="Start Simulation"
            onAction={handleStartSimulation}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-left">
      {/* Greetings & Admin Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-neutral-200/80 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">
            Simulation Console
          </h2>
          <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
            Workspace: {user?.name || "Marketer"} • Individual Sandbox
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-9 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold"
            onClick={handleDeleteSimulation}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Reset Simulation
          </Button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Simulation Progress %"
          value="45%"
          trend="+10%"
          description="completed"
          icon={Activity}
        />
        <KpiCard
          title="Days Remaining"
          value="15 Days"
          description="out of 30"
          icon={Calendar}
        />
        <KpiCard
          title="Best ROI Score"
          value="18.5%"
          trend="+2.4%"
          description="current record"
          icon={TrendingUp}
        />
        <KpiCard
          title="Certification Status"
          value="In Progress"
          description="50% criteria met"
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
                Active Round
              </Badge>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sparkline Area Chart */}
              <div className="p-2 border border-neutral-100 rounded-xl bg-neutral-50/50">
                <div className="flex justify-between items-center text-xs font-bold text-neutral-400 px-2 pb-2">
                  <span>ROI Trend Tracker</span>
                  <span className="text-neutral-900">Step 7 of 30</span>
                </div>
                <MetricSparkline data={sparklineData} height={70} color="#171717" />
              </div>

              {/* Progress Slider Display */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-neutral-500">
                  <span>Completed Steps</span>
                  <span className="text-neutral-900 font-bold">45% (13/30 Days)</span>
                </div>
                <Progress value={45} className="h-2" />
              </div>
            </CardContent>
          </div>
          <CardFooter className="pt-2">
            <Button className="w-full h-11 font-bold bg-neutral-950 text-white hover:bg-neutral-800 shadow-sm">
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
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Days Active</span>
                  <span className="text-lg font-black text-neutral-900 block">18 Days</span>
                </div>
                <div className="p-3 border border-neutral-100 rounded-xl bg-neutral-50/50">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Days Remaining</span>
                  <span className="text-lg font-black text-neutral-900 block">12 Days</span>
                </div>
              </div>
            </CardContent>
          </div>
          <CardFooter className="pt-2">
            <Button variant="outline" className="w-full h-11 font-bold border-neutral-200 hover:bg-neutral-50">
              Upgrade Subscription Plan
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
