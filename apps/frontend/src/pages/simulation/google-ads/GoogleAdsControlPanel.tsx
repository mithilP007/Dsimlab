import { useGoogleAdsStore } from "@/stores/googleAdsStore"
import type { CampaignStatus } from "@/stores/googleAdsStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { CampaignBuilder } from "./CampaignBuilder"
import { KeywordBidManager } from "./KeywordBidManager"
import { AdCopyCreator } from "./AdCopyCreator"
import { AudienceTargeter } from "./AudienceTargeter"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Save,
  CheckCircle2,
  MousePointerClick,
  TrendingUp,
  DollarSign,
  BarChart2,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string | number
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<CampaignStatus, string> = {
  draft:  "bg-neutral-100 text-neutral-600",
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-amber-50 text-amber-700",
}

const STATUS_DOT: Record<CampaignStatus, string> = {
  draft:  "bg-neutral-400",
  active: "bg-emerald-500 animate-pulse",
  paused: "bg-amber-400",
}

// ─── KPI Tile ─────────────────────────────────────────────────────────────────

function KpiTile({
  label, value, sub,
  icon: Icon, color, bg,
}: {
  label: string
  value: string | number
  sub: string
  icon: React.ElementType
  color: string
  bg: string
}) {
  return (
    <div className="space-y-1">
      <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", bg)}>
        <Icon className={cn("h-3.5 w-3.5", color)} />
      </div>
      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-black text-white leading-none">{value}</p>
      <p className="text-[10px] text-neutral-500 font-medium">{sub}</p>
    </div>
  )
}

// ─── Projected Chart ──────────────────────────────────────────────────────────

function ProjectionChart({
  dailyClicks,
  dailyImpressions,
}: {
  dailyClicks: number
  dailyImpressions: number
}) {
  // Generate 30 days of projected data with realistic ramping
  const data = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1
    const ramp = Math.min(1, day / 7) // ramp over first 7 days
    const noise = 1 + (Math.sin(day * 1.3) * 0.08 + Math.cos(day * 0.9) * 0.05)
    return {
      day,
      clicks: Math.round(dailyClicks * ramp * noise),
      impressions: Math.round(dailyImpressions * ramp * noise),
    }
  })

  const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-neutral-900 text-white rounded-lg px-3 py-2 text-[10px] font-bold shadow-xl border border-neutral-700">
        <p className="text-neutral-400 mb-1">Day {label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {p.value.toLocaleString()}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
          <BarChart2 className="h-3 w-3" />
          30-Day Projection
        </p>
        <div className="flex items-center gap-3 text-[9px] font-bold">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-sky-400" />Clicks</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-violet-400" />Impressions</span>
        </div>
      </div>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 8, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              interval={6}
            />
            <YAxis
              tick={{ fontSize: 8, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="clicks"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
              name="Clicks"
            />
            <Line
              type="monotone"
              dataKey="impressions"
              stroke="#a78bfa"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
              name="Impressions"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function GoogleAdsControlPanel() {
  const {
    campaignName,
    dailyBudget, totalBudget, budgetSpent,
    selectedKeywords, adCopies,
    campaignStatus,
    estimatedCpc, estimatedImpressions,
    estimatedClicks, estimatedCtr,
    estimatedConversions,
    decisionsMade, markDecisionsMade,
  } = useGoogleAdsStore()

  const { currentDay, decisionsSaved, saveDecisions } = useSimulationStore()

  const canSave =
    campaignName.trim().length > 0 &&
    selectedKeywords.length >= 1 &&
    adCopies.length >= 1 &&
    !decisionsMade

  const handleSave = () => {
    if (!canSave) {
      toast.error("Add a campaign name, at least 1 keyword, and 1 ad copy to save.")
      return
    }
    markDecisionsMade()
    if (!decisionsSaved) saveDecisions()
    toast.success(`Google Ads decisions saved for Day ${currentDay}!`, {
      description: `Campaign "${campaignName}" is now active.`,
    })
  }

  const budgetPct = Math.min(100, (budgetSpent / totalBudget) * 100)

  const kpiTiles = [
    {
      label: "Est. CPC",
      value: `$${estimatedCpc.toFixed(2)}`,
      sub: "avg cost per click",
      icon: DollarSign,
      color: "text-amber-400",
      bg: "bg-amber-900/40",
    },
    {
      label: "Est. Clicks / Day",
      value: estimatedClicks.toLocaleString(),
      sub: `${estimatedCtr.toFixed(2)}% CTR`,
      icon: MousePointerClick,
      color: "text-sky-400",
      bg: "bg-sky-900/40",
    },
    {
      label: "Est. Leads / Day",
      value: estimatedConversions.toLocaleString(),
      sub: "conversions",
      icon: CheckCircle2,
      color: "text-violet-400",
      bg: "bg-violet-900/40",
    },
    {
      label: "Daily Budget",
      value: `$${dailyBudget}`,
      sub: `$${budgetSpent.toFixed(2)} spent`,
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-900/40",
    },
  ]

  return (
    <div className="space-y-5 pb-24">
      {/* ── Campaign Summary Bar ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-950 overflow-hidden shadow-sm">
        {/* Top meta strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-neutral-800">
          <div className="flex items-center gap-3 min-w-0">
            <Badge className={cn("text-[9px] font-black border-none capitalize flex items-center gap-1", STATUS_BADGE[campaignStatus])}>
              <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[campaignStatus])} />
              {campaignStatus}
            </Badge>
            <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 font-black text-[9px] uppercase tracking-wider py-0.5 px-2.5 rounded-full border">
              Real-Time Trend-Based Google Ads Simulation
            </Badge>
            <p className="text-sm font-black text-white truncate">
              {campaignName || "Unnamed Campaign"}
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-neutral-400 font-semibold shrink-0">
            <span>{selectedKeywords.length} keyword{selectedKeywords.length !== 1 ? "s" : ""}</span>
            <span>{adCopies.length} ad cop{adCopies.length !== 1 ? "ies" : "y"}</span>
            {decisionsMade && (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Day {currentDay} saved
              </span>
            )}
          </div>
        </div>

        {/* KPI Grid + Chart */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] divide-y md:divide-y-0 md:divide-x divide-neutral-800">
          {/* KPI tiles */}
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-5">
            {kpiTiles.map((tile) => (
              <KpiTile key={tile.label} {...tile} />
            ))}
          </div>

          {/* Projection Chart */}
          <div className="p-5 min-w-[280px]">
            <ProjectionChart
              dailyClicks={estimatedClicks}
              dailyImpressions={estimatedImpressions}
            />
          </div>
        </div>

        {/* Budget bar */}
        <div className="px-5 pb-4 pt-1 space-y-1.5 border-t border-neutral-800">
          <div className="flex justify-between text-[10px] font-bold text-neutral-500">
            <span>Budget Spent: <span className="text-white">${budgetSpent.toFixed(2)}</span></span>
            <span>Monthly Total: <span className="text-white">${totalBudget.toLocaleString()}</span></span>
          </div>
          <div className="h-1 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                budgetPct >= 90 ? "bg-red-500" :
                budgetPct >= 60 ? "bg-amber-500" : "bg-emerald-500",
              )}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Warning banner */}
      {!canSave && !decisionsMade && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-xs font-semibold">
            {!campaignName.trim() ? "Add a campaign name. " : ""}
            {selectedKeywords.length === 0 ? "Add at least 1 keyword. " : ""}
            {adCopies.length === 0 ? "Add at least 1 ad copy." : ""}
          </p>
        </div>
      )}

      {/* ── 2-column grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Left */}
        <div className="flex flex-col gap-5">
          <CampaignBuilder />
          <AudienceTargeter />
        </div>
        {/* Right */}
        <div className="flex flex-col gap-5">
          <KeywordBidManager />
          <AdCopyCreator />
        </div>
      </div>

      {/* ── Sticky Save Bar ──────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white/95 backdrop-blur-sm shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-white shrink-0",
                decisionsMade ? "bg-emerald-500" : canSave ? "bg-neutral-900" : "bg-neutral-300",
              )}
            >
              {decisionsMade
                ? <CheckCircle2 className="h-4 w-4" />
                : <Save className="h-4 w-4" />
              }
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-900">
                {decisionsMade
                  ? "Google Ads Decisions Saved"
                  : canSave
                    ? "Ready to save your Google Ads decisions"
                    : "Complete all required fields to save"}
              </p>
              <p className="text-[10px] text-neutral-500 font-medium">
                {decisionsMade
                  ? `Locked for Day ${currentDay} — advance simulation to update.`
                  : `Day ${currentDay} · ${selectedKeywords.length} keywords · ${adCopies.length} ad copies · $${dailyBudget}/day`}
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
              <><CheckCircle2 className="mr-1.5 h-4 w-4" />Decisions Saved</>
            ) : (
              <><Save className="mr-1.5 h-4 w-4" />Save Google Ads Decisions</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default GoogleAdsControlPanel
