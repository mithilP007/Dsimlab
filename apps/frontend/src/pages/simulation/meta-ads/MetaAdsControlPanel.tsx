import { useMetaAdsStore, OBJECTIVE_META } from "@/stores/metaAdsStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { CampaignSetup } from "./CampaignSetup"
import { CreativeStudio } from "./CreativeStudio"
import { AudienceBuilder } from "./AudienceBuilder"
import { PlacementManager } from "./PlacementManager"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  DollarSign,
  TrendingUp,
  Share2,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Tooltip type ─────────────────────────────────────────────────────────────

interface TooltipEntry {
  name: string
  value: number
  color: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
}

// ─── KPI Tile ─────────────────────────────────────────────────────────────────

function KpiTile({
  label, value, sub,
  icon: Icon, iconColor, iconBg,
}: {
  label: string
  value: string
  sub: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
}) {
  return (
    <div className="space-y-1">
      <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", iconBg)}>
        <Icon className={cn("h-3.5 w-3.5", iconColor)} />
      </div>
      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-black text-white leading-none">{value}</p>
      <p className="text-[10px] text-neutral-500 font-medium">{sub}</p>
    </div>
  )
}

// ─── 30-day area chart ────────────────────────────────────────────────────────

function ProjectionChart({ dailyReach, dailyClicks }: { dailyReach: number; dailyClicks: number }) {
  const data = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1
    const ramp = Math.min(1, day / 5)
    const noise = 1 + Math.sin(day * 1.3) * 0.06 + Math.cos(day * 0.9) * 0.04
    return {
      day,
      reach: Math.round(dailyReach * ramp * noise),
      clicks: Math.round(dailyClicks * ramp * noise),
    }
  })

  const ChartTooltip = ({ active, payload, label }: ChartTooltipProps) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-neutral-900 border border-neutral-700 text-white rounded-lg px-3 py-2 shadow-xl text-[10px] font-bold">
        <p className="text-neutral-400 mb-1">Day {label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value.toLocaleString()}</p>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">30-Day Projection</p>
        <div className="flex items-center gap-3 text-[9px] font-bold">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-400" />Reach</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-pink-400" />Clicks</span>
        </div>
      </div>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="mgReach" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#60a5fa" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="mgClick" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f472b6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fontSize: 8, fill: "#6b7280" }} tickLine={false} axisLine={false} interval={6} />
            <YAxis tick={{ fontSize: 8, fill: "#6b7280" }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="reach"  name="Reach"  stroke="#60a5fa" strokeWidth={2}   fill="url(#mgReach)" dot={false} />
            <Area type="monotone" dataKey="clicks" name="Clicks" stroke="#f472b6" strokeWidth={1.5} fill="url(#mgClick)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function MetaAdsControlPanel() {
  const {
    campaignName, objective,
    dailyBudget, totalBudget, budgetSpent,
    creatives, audiences, placements,
    estimatedReach, estimatedImpressions,
    estimatedCpc, estimatedCtr, estimatedConversions,
    decisionsMade, markDecisionsMade,
  } = useMetaAdsStore()

  const { currentDay, decisionsSaved, saveDecisions } = useSimulationStore()

  const selectedAudiences = audiences.filter((a) => a.selected).length
  const activePlacements = Object.values(placements).filter(Boolean).length

  const canSave =
    campaignName.trim().length > 0 &&
    creatives.length >= 1 &&
    selectedAudiences >= 1 &&
    activePlacements >= 1 &&
    !decisionsMade

  const handleSave = () => {
    if (!canSave) return
    markDecisionsMade()
    if (!decisionsSaved) saveDecisions()
    toast.success(`Meta Ads decisions saved for Day ${currentDay}!`, {
      description: `"${campaignName}" is now running across ${activePlacements} placements.`,
    })
  }

  const fmtReach = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : `${n}`

  const budgetPct = totalBudget > 0 ? Math.min(100, (budgetSpent / totalBudget) * 100) : 0

  // Validation message
  const validationMsg = [
    !campaignName.trim() && "Add a campaign name",
    creatives.length === 0 && "Add at least 1 creative",
    selectedAudiences === 0 && "Select at least 1 audience",
    activePlacements === 0 && "Enable at least 1 placement",
  ].filter(Boolean).join(" · ")

  return (
    <div className="space-y-5 pb-24">
      {/* ── Campaign Summary Bar ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-950 overflow-hidden shadow-sm">
        {/* Top identity strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-neutral-800">
          <div className="flex items-center gap-3 min-w-0">
            {/* Meta gradient icon */}
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 via-indigo-600 to-pink-600 flex items-center justify-center shrink-0">
              <Share2 className="h-3.5 w-3.5 text-white" />
            </div>
            <Badge className={cn(
              "text-[9px] font-black border-none capitalize",
              decisionsMade ? "bg-emerald-900/60 text-emerald-300" : "bg-neutral-800 text-neutral-300",
            )}>
              {decisionsMade ? (
                <><CheckCircle2 className="h-2.5 w-2.5 mr-1" />Saved</>
              ) : "Draft"}
            </Badge>
            <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 font-black text-[9px] uppercase tracking-wider py-0.5 px-2.5 rounded-full border">
              Real-Time Trend-Based Meta Ads Simulation
            </Badge>
            <p className="text-sm font-black text-white truncate">{campaignName || "Unnamed Campaign"}</p>
            <Badge className="text-[9px] font-bold border-none bg-blue-900/50 text-blue-300 capitalize">
              {OBJECTIVE_META[objective].label}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-neutral-400 font-semibold shrink-0">
            <span>{creatives.length} creative{creatives.length !== 1 ? "s" : ""}</span>
            <span>{selectedAudiences} audience{selectedAudiences !== 1 ? "s" : ""}</span>
            <span>{activePlacements} placement{activePlacements !== 1 ? "s" : ""}</span>
            {decisionsMade && <span className="text-emerald-400 font-bold">Day {currentDay}</span>}
          </div>
        </div>

        {/* KPI + chart */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] divide-y md:divide-y-0 md:divide-x divide-neutral-800">
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-5">
            <KpiTile
              label="Est. Reach/Day"
              value={fmtReach(estimatedReach)}
              sub={`${estimatedCtr.toFixed(2)}% CTR`}
              icon={Users}
              iconColor="text-blue-400"
              iconBg="bg-blue-900/40"
            />
            <KpiTile
              label="Impressions/Day"
              value={fmtReach(estimatedImpressions)}
              sub="per day"
              icon={Eye}
              iconColor="text-violet-400"
              iconBg="bg-violet-900/40"
            />
            <KpiTile
              label="Est. CPC"
              value={`$${estimatedCpc.toFixed(2)}`}
              sub="cost per click"
              icon={DollarSign}
              iconColor="text-amber-400"
              iconBg="bg-amber-900/40"
            />
            <KpiTile
              label="Est. Leads / Day"
              value={estimatedConversions.toLocaleString()}
              sub={`$${dailyBudget}/day`}
              icon={TrendingUp}
              iconColor="text-emerald-400"
              iconBg="bg-emerald-900/40"
            />
          </div>
          <div className="p-5 min-w-[280px]">
            <ProjectionChart
              dailyReach={estimatedReach}
              dailyClicks={Math.round(estimatedImpressions * (estimatedCtr / 100))}
            />
          </div>
        </div>

        {/* Budget bar */}
        <div className="px-5 pb-4 pt-1 space-y-1.5 border-t border-neutral-800">
          <div className="flex justify-between text-[10px] font-bold text-neutral-500">
            <span>Daily: <span className="text-white">${dailyBudget}</span></span>
            <span>Spent: <span className="text-white">${budgetSpent.toFixed(2)}</span></span>
            <span>Monthly: <span className="text-white">${totalBudget.toLocaleString()}</span></span>
          </div>
          <div className="h-1 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-pink-500 transition-all"
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Validation warning */}
      {!canSave && !decisionsMade && validationMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-xs font-semibold">{validationMsg}</p>
        </div>
      )}

      {/* ── 2-column grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          <CampaignSetup />
          
          {/* Auction Diagnostics Card */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4 text-left">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 animate-pulse" />
              Real-Time Auction Diagnostics
            </h3>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 border border-neutral-100 bg-neutral-50 rounded-xl space-y-1">
                <span className="text-[10px] text-neutral-450 font-bold block uppercase tracking-wider">Learning Phase</span>
                <Badge className={cn("text-[9px] font-black border-none", dailyBudget < 45 ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100")}>
                  {dailyBudget < 45 ? "Learning (50 conversions pending)" : "Active / Learning Complete"}
                </Badge>
              </div>

              <div className="p-3 border border-neutral-100 bg-neutral-50 rounded-xl space-y-1">
                <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Creative Fatigue</span>
                <Badge className={cn("text-[9px] font-black border-none", currentDay > 1 ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100")}>
                  {currentDay > 1 ? "High Fatigue (Same Copy)" : "Low Fatigue (Optimal)"}
                </Badge>
              </div>

              <div className="p-3 border border-neutral-100 bg-neutral-50 rounded-xl space-y-1">
                <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Audience Saturation</span>
                <span className="font-extrabold text-neutral-850 block">
                  {dailyBudget > 100 ? "14.5% (Moderate Saturation)" : "4.2% (Healthy Size)"}
                </span>
              </div>

              <div className="p-3 border border-neutral-100 bg-neutral-50 rounded-xl space-y-1">
                <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Frequency Risk</span>
                <Badge className={cn("text-[9px] font-black border-none", dailyBudget > 150 ? "bg-red-50 text-red-750 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100")}>
                  {dailyBudget > 150 ? "High Frequency Risk" : "Low Risk (< 1.5x)"}
                </Badge>
              </div>
            </div>
            
            <p className="text-[10px] text-neutral-450 leading-relaxed font-medium">
              * The Meta Ads algorithm uses budget size, placement selection, and creative relevance to determine CPC. High budget allocations to small audiences cause audience fatigue and inflate CPM costs.
            </p>
          </div>

          <CreativeStudio />
        </div>
        {/* Right column */}
        <div className="flex flex-col gap-5">
          <AudienceBuilder />
          <PlacementManager />
        </div>
      </div>

      {/* ── Sticky Save Bar ──────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white/95 backdrop-blur-sm shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-white shrink-0",
              decisionsMade ? "bg-emerald-500" : canSave ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-neutral-300",
            )}>
              {decisionsMade
                ? <CheckCircle2 className="h-4 w-4" />
                : <Save className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-900">
                {decisionsMade
                  ? "Meta Ads Decisions Saved"
                  : canSave
                    ? "Ready to save your Meta Ads decisions"
                    : "Complete required fields to save"}
              </p>
              <p className="text-[10px] text-neutral-500 font-medium">
                {decisionsMade
                  ? `Locked for Day ${currentDay} — advance simulation to update.`
                  : `Day ${currentDay} · ${creatives.length} creative${creatives.length !== 1 ? "s" : ""} · ${selectedAudiences} audience${selectedAudiences !== 1 ? "s" : ""} · ${activePlacements} placement${activePlacements !== 1 ? "s" : ""} · $${dailyBudget}/day`}
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
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                  : "bg-neutral-200 text-neutral-400 cursor-not-allowed",
            )}
          >
            {decisionsMade ? (
              <><CheckCircle2 className="mr-1.5 h-4 w-4" />Decisions Saved</>
            ) : (
              <><Save className="mr-1.5 h-4 w-4" />Save Meta Ads Decisions</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default MetaAdsControlPanel
