import { useSimulationStore } from "@/stores/simulationStore"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Clock, RotateCcw, Save } from "lucide-react"
import { useState, useEffect } from "react"

export function TimeControlBar() {
  const {
    currentDay,
    totalDays,
    status,
    decisionsSaved,
    saveDecisions,
    advanceSimulation,
    resetSimulation,
    activeSimulation,
    fetchLatestState,
  } = useSimulationStore()

  const [isSaving, setIsSaving] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    let interval: any
    if (status === "LOCKED" && activeSimulation?.id) {
      const fetchCountdown = async () => {
        try {
          const res = await (await import("@/lib/api")).default.get(`/api/simulations/${activeSimulation.id}/countdown`)
          if (res.data?.success) {
            setCountdown(res.data.remainingSeconds)
          }
        } catch (e) {
          console.error(e)
        }
      }
      fetchCountdown()
      interval = setInterval(async () => {
        try {
          const res = await (await import("@/lib/api")).default.get(`/api/simulations/${activeSimulation.id}/countdown`)
          if (res.data?.success) {
            const secs = res.data.remainingSeconds
            setCountdown(secs)
            if (secs === 0) {
              clearInterval(interval)
              await fetchLatestState()
            }
          }
        } catch (e) {
          // ignore
        }
      }, 5000)
    } else {
      setCountdown(null)
    }
    return () => clearInterval(interval)
  }, [status, activeSimulation?.id, fetchLatestState])

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const handleAdvance = async () => {
    setIsAdvancing(true)
    try {
      await advanceSimulation()
      toast.success("Simulation round advanced successfully!")
    } catch (err) {
      console.error(err)
    } finally {
      setIsAdvancing(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await saveDecisions()
      toast.success("Decisions saved! You can now advance the simulation.")
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    resetSimulation()
    toast.info("Simulation state reset.")
  }

  // Status indicator config
  const renderStatus = () => {
    switch (status) {
      case "DECISION_OPEN":
        return (
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-600">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Decisions Open</span>
          </div>
        )
      case "PROCESSING":
        return (
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>Processing...</span>
          </div>
        )
      case "LOCKED":
        return (
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-500">
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-400 shrink-0" />
              <span>Decisions Locked</span>
            </div>
            {countdown !== null && countdown > 0 && (
              <span className="text-[10px] text-amber-600 font-bold mt-0.5 animate-pulse">
                Results available after 24 hours (Countdown: {formatTime(countdown)})
              </span>
            )}
          </div>
        )
      case "RESULTS_READY":
        return (
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
            <span>Results Ready</span>
          </div>
        )
      case "SCORE_LOCKED":
      case "COMPLETED":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-250 font-black text-[10px] uppercase py-0.5 px-2.5">
            Simulation Completed
          </Badge>
        )
      default:
        return (
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-600">
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 shrink-0" />
            <span>{status}</span>
          </div>
        )
    }
  }

  const isCompleted = status === "COMPLETED" || status === "SCORE_LOCKED"
  const isProcessing = status === "PROCESSING" || status === "LOCKED" || isAdvancing

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
              Round {currentDay} <span className="text-neutral-400 font-normal">of {totalDays}</span>
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
            max={totalDays}
            value={currentDay}
            readOnly
            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-not-allowed accent-slate-900"
          />
          <div className="flex justify-between text-[10px] font-bold text-neutral-450 px-1">
            <span>Round 1</span>
            <span>Round {Math.round(totalDays / 2)}</span>
            <span>Round {totalDays}</span>
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
          {status === "DECISION_OPEN" && !decisionsSaved && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="h-9 text-xs font-bold border-neutral-200 hover:bg-neutral-50"
              variant="outline"
            >
              <Save className="mr-1.5 h-4 w-4 text-neutral-600" />
              {isSaving ? "Saving..." : "Save Decisions"}
            </Button>
          )}

          {status === "DECISION_OPEN" && decisionsSaved && (
            <Badge variant="outline" className="h-9 bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs flex items-center justify-center px-3">
              Decisions Saved ✓
            </Badge>
          )}

          {/* Primary Action Button */}
          <Button
            onClick={handleAdvance}
            disabled={
              (status === "DECISION_OPEN" && !decisionsSaved) ||
              isProcessing ||
              isCompleted
            }
            className="h-9 text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800"
          >
            {isProcessing && (
              <Clock className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            {isCompleted ? "Simulation Completed" : isProcessing ? "Processing Round..." : "Advance Simulation"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TimeControlBar
