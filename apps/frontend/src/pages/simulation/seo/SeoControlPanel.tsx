import { useCampaignStore } from "@/stores/campaignStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { KeywordSelector } from "./KeywordSelector"
import { OnPageEditor } from "./OnPageEditor"
import { TechnicalSeoPanel } from "./TechnicalSeoPanel"
import { BacklinkPanel } from "./BacklinkPanel"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Save,
  TrendingUp,
  DollarSign,
  CheckSquare,
  Target,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Mini Score Gauge ────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 75
      ? "text-emerald-500"
      : score >= 50
        ? "text-sky-500"
        : score >= 25
          ? "text-amber-500"
          : "text-neutral-400"

  const label =
    score >= 75 ? "Excellent" : score >= 50 ? "Good" : score >= 25 ? "Fair" : "Poor"

  return (
    <div className="flex flex-col items-center justify-center">
      <span className={cn("text-5xl font-black leading-none", color)}>{score}</span>
      <span className="text-[10px] font-bold text-neutral-400 mt-1 uppercase tracking-widest">
        / 100
      </span>
      <span
        className={cn(
          "mt-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
          score >= 75 && "bg-emerald-50 text-emerald-600",
          score >= 50 && score < 75 && "bg-sky-50 text-sky-600",
          score >= 25 && score < 50 && "bg-amber-50 text-amber-600",
          score < 25 && "bg-neutral-100 text-neutral-500",
        )}
      >
        {label}
      </span>
    </div>
  )
}

// ─── Top Dashboard ────────────────────────────────────────────────────────────

function SeoDashboardHeader() {
  const { totalSeoScore, onPageScore, technicalScore, backlinkScore, budgetSpent, decisionsMade } =
    useCampaignStore()

  const stats = [
    {
      label: "On-Page Score",
      value: onPageScore,
      icon: Target,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Technical Score",
      value: technicalScore,
      icon: TrendingUp,
      color: "text-sky-600",
      bg: "bg-sky-50",
    },
    {
      label: "Backlink Score",
      value: backlinkScore,
      icon: DollarSign,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ]

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] divide-y sm:divide-y-0 sm:divide-x divide-neutral-100">
        {/* Total Score */}
        <div className="flex flex-col items-center justify-center p-6 bg-neutral-950 text-white">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">
            Total SEO Score
          </p>
          <ScoreRing score={totalSeoScore} />
          <div className="mt-4 w-full space-y-1.5">
            <Progress value={totalSeoScore} className="h-1.5 bg-neutral-800" />
            <div className="flex justify-between text-[9px] text-neutral-500 font-semibold">
              <span>Weights: 40% On-Page</span>
              <span>35% Technical</span>
              <span>25% Backlinks</span>
            </div>
          </div>
        </div>

        {/* Sub-scores + status */}
        <div className="p-5 flex flex-col justify-between gap-4">
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="space-y-1.5">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", stat.bg)}>
                    <Icon className={cn("h-4 w-4", stat.color)} />
                  </div>
                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-black text-neutral-900 leading-none">
                    {stat.value}
                  </p>
                  <Progress
                    value={stat.value}
                    className="h-1 bg-neutral-100"
                  />
                </div>
              )
            })}
          </div>

          {/* Budget & Status row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-neutral-400" />
              <div>
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                  Budget Used
                </p>
                <p className="text-sm font-black text-neutral-900">
                  ${budgetSpent.toLocaleString()}{" "}
                  <span className="text-xs font-medium text-neutral-400">/ $1,000</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {decisionsMade ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                      Decisions
                    </p>
                    <p className="text-sm font-black text-emerald-600">Saved ✓</p>
                  </div>
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4 text-neutral-400" />
                  <div>
                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                      Decisions
                    </p>
                    <p className="text-sm font-black text-neutral-500">Pending</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function SeoControlPanel() {
  const { selectedKeywords, onPageScore, technicalScore, decisionsMade, markDecisionsMade } =
    useCampaignStore()
  const { currentDay, decisionsSaved, saveDecisions } = useSimulationStore()

  // Enable save when at least 1 keyword + some progress on each section
  const canSave =
    selectedKeywords.length > 0 &&
    onPageScore > 0 &&
    technicalScore > 0 &&
    !decisionsMade

  const handleSave = () => {
    if (!canSave) {
      toast.error("Complete at least Keywords, On-Page, and Technical sections before saving.")
      return
    }
    markDecisionsMade()
    if (!decisionsSaved) saveDecisions()
    toast.success(`SEO decisions saved for Day ${currentDay}!`, {
      description: "Your SEO campaign configuration has been locked for this round.",
    })
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Top Mini Dashboard */}
      <SeoDashboardHeader />

      {/* Warning if no input yet */}
      {selectedKeywords.length === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-xs font-semibold">
            Select at least 1 keyword to enable saving decisions.
          </p>
        </div>
      )}

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Left Column */}
        <div className="flex flex-col gap-5">
          <KeywordSelector />
          <OnPageEditor />
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-5">
          <TechnicalSeoPanel />
          <BacklinkPanel />
        </div>
      </div>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white/95 backdrop-blur-sm shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-white shrink-0",
                decisionsMade ? "bg-emerald-500" : canSave ? "bg-neutral-900" : "bg-neutral-300",
              )}
            >
              {decisionsMade ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-900">
                {decisionsMade
                  ? "SEO Decisions Saved"
                  : canSave
                    ? "Ready to save your SEO decisions"
                    : "Complete all sections to save"}
              </p>
              <p className="text-[10px] text-neutral-500 font-medium">
                {decisionsMade
                  ? `Locked for Day ${currentDay} — advance the simulation to update.`
                  : `Day ${currentDay} · Keywords: ${selectedKeywords.length} · On-Page: ${onPageScore} · Technical: ${technicalScore}`}
              </p>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!canSave || decisionsMade}
            className={cn(
              "h-10 px-6 font-bold text-xs shrink-0 transition-all",
              decisionsMade
                ? "bg-emerald-500 text-white cursor-default"
                : canSave
                  ? "bg-neutral-900 text-white hover:bg-neutral-700"
                  : "bg-neutral-200 text-neutral-400 cursor-not-allowed",
            )}
          >
            {decisionsMade ? (
              <>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Decisions Saved
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-4 w-4" />
                Save SEO Decisions
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SeoControlPanel
