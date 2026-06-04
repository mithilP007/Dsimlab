import { useSimulationStore } from "@/stores/simulationStore"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Clock, Play, RotateCcw, Save } from "lucide-react"

export function TimeControlBar() {
  const {
    currentDay,
    totalDays,
    status,
    decisionsSaved,
    saveDecisions,
    setStatus,
    advanceDay,
    resetSimulation,
  } = useSimulationStore()

  const handleAdvance = () => {
    if (status === "decision-open") {
      setStatus("processing")
      toast.info(`Processing campaign outcomes for Day ${currentDay}...`)

      setTimeout(() => {
        setStatus("results-ready")
        toast.success(`Day ${currentDay} processing complete! Results are ready.`)
      }, 2000)
    } else if (status === "results-ready") {
      advanceDay()
      const next = currentDay + 1
      if (next <= totalDays) {
        toast.success(`Started Day ${next}! Decisions are now open.`)
      } else {
        toast.success("Simulation finished successfully!")
      }
    }
  }

  const handleSave = () => {
    saveDecisions()
    toast.success("Decisions saved! You can now advance the simulation.")
  }

  const handleReset = () => {
    resetSimulation()
    toast.info("Simulation state reset to Day 1.")
  }

  // Status indicator config
  const renderStatus = () => {
    switch (status) {
      case "decision-open":
        return (
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-600">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Decisions Open</span>
          </div>
        )
      case "processing":
        return (
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>Processing...</span>
          </div>
        )
      case "results-ready":
        return (
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
            <span>Results Ready</span>
          </div>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-250 font-black text-[10px] uppercase py-0.5 px-2.5">
            Simulation Completed
          </Badge>
        )
      case "locked":
        return (
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-500">
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-400 shrink-0" />
            <span>Decisions Locked</span>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="w-full bg-white border-b border-neutral-200 sticky top-0 left-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* LEFT: Progress */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Timeline</span>
              {renderStatus()}
            </div>
            <span className="text-base font-black text-neutral-900 block">
              Day {currentDay} <span className="text-neutral-400 font-normal">of {totalDays}</span>
            </span>
            <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
              <svg className="h-full w-full">
                <rect
                  x="0"
                  y="0"
                  width={`${(currentDay / totalDays) * 100}%`}
                  height="100%"
                  fill="#0f172a"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* CENTER: Slider (Read-only representation) */}
        <div className="flex-1 max-w-lg space-y-1">
          <input
            type="range"
            min="1"
            max="30"
            value={currentDay}
            readOnly
            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-not-allowed accent-slate-900"
          />
          <div className="flex justify-between text-[10px] font-bold text-neutral-450 px-1">
            <span>Day 1</span>
            <span>Day 7</span>
            <span>Day 14</span>
            <span>Day 21</span>
            <span>Day 28</span>
            <span>Day 30</span>
          </div>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Reset for testing */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleReset}
            title="Reset Simulation"
            className="h-9 w-9 text-neutral-500 hover:text-neutral-950 hover:bg-neutral-50"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          {/* Save decisions trigger to enable advancing */}
          {status === "decision-open" && !decisionsSaved && (
            <Button
              onClick={handleSave}
              className="h-9 text-xs font-bold border-neutral-200 hover:bg-neutral-50"
              variant="outline"
            >
              <Save className="mr-1.5 h-4 w-4 text-neutral-600" />
              Save Decisions
            </Button>
          )}

          {/* Primary Action Button */}
          <Button
            onClick={handleAdvance}
            disabled={
              (status === "decision-open" && !decisionsSaved) ||
              status === "processing" ||
              status === "completed"
            }
            className="h-9 text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800"
          >
            {status === "processing" && (
              <Clock className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            {status === "results-ready" ? (
              <>
                Advance to Next Day
                <Play className="ml-1.5 h-3.5 w-3.5 fill-white" />
              </>
            ) : status === "completed" ? (
              "Completed"
            ) : (
              "Advance Simulation"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TimeControlBar
