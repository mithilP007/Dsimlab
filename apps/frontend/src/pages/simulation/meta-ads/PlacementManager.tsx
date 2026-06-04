import { useMetaAdsStore, PLACEMENT_META } from "@/stores/metaAdsStore"
import type { PlacementKey } from "@/stores/metaAdsStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Layout,
  BookOpen,
  Play,
  ShoppingBag,
  Monitor,
  Globe,
  MessageCircle,
  AlertTriangle,
  Zap,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Icon map ─────────────────────────────────────────────────────────────────

const PLACEMENT_ICON: Record<PlacementKey, React.ElementType> = {
  feed:            Layout,
  stories:         BookOpen,
  reels:           Play,
  marketplace:     ShoppingBag,
  rightColumn:     Monitor,
  audienceNetwork: Globe,
  messenger:       MessageCircle,
}

const PLACEMENT_COLOR: Record<PlacementKey, string> = {
  feed:            "text-blue-600 bg-blue-50",
  stories:         "text-pink-600 bg-pink-50",
  reels:           "text-rose-600 bg-rose-50",
  marketplace:     "text-amber-600 bg-amber-50",
  rightColumn:     "text-sky-600 bg-sky-50",
  audienceNetwork: "text-emerald-600 bg-emerald-50",
  messenger:       "text-violet-600 bg-violet-50",
}

const PLACEMENT_ORDER: PlacementKey[] = [
  "feed", "stories", "reels", "marketplace",
  "rightColumn", "audienceNetwork", "messenger",
]

// ─── Impressions by placement mini bar ───────────────────────────────────────

function ImpressionsPreview({
  placements,
  estimatedImpressions,
}: {
  placements: ReturnType<typeof useMetaAdsStore.getState>["placements"]
  estimatedImpressions: number
}) {
  const active = PLACEMENT_ORDER.filter((k) => placements[k])
  if (active.length === 0 || estimatedImpressions === 0) return null

  // Weighted by inverse CPM (lower CPM = more impressions per $)
  const totalInvCpm = active.reduce((s, k) => s + 1 / PLACEMENT_META[k].estimatedCpm, 0)
  const placements_ = active.map((k) => ({
    key: k,
    label: PLACEMENT_META[k].label,
    pct: totalInvCpm > 0 ? ((1 / PLACEMENT_META[k].estimatedCpm) / totalInvCpm) * 100 : 0,
    impressions: totalInvCpm > 0 ? Math.round(estimatedImpressions * ((1 / PLACEMENT_META[k].estimatedCpm) / totalInvCpm)) : 0,
  }))
  const maxImpressions = Math.max(...placements_.map((p) => p.impressions), 1)

  return (
    <div className="space-y-2 p-3 rounded-xl border border-neutral-100 bg-neutral-50/50">
      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
        <BarChart3 className="h-3 w-3" />Est. Impressions by Placement
      </p>
      <div className="space-y-1.5">
        {placements_.map((p) => {
          const colorCls = PLACEMENT_COLOR[p.key]
          const iconColor = colorCls.split(" ")[0]
          return (
            <div key={p.key} className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-neutral-600 w-24 shrink-0 truncate">{p.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", iconColor.replace("text-", "bg-"))}
                  style={{ width: `${(p.impressions / maxImpressions) * 100}%` }}
                />
              </div>
              <span className="text-[9px] font-bold text-neutral-500 w-10 text-right shrink-0">
                {p.impressions >= 1000 ? `${(p.impressions / 1000).toFixed(0)}K` : p.impressions}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PlacementManager() {
  const { placements, togglePlacement, estimatedImpressions } = useMetaAdsStore()

  const activeCount = Object.values(placements).filter(Boolean).length

  return (
    <Card className="border-neutral-200 shadow-sm bg-white text-left">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-neutral-900 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layout className="h-4 w-4 text-neutral-500" />
            Placement Manager
          </span>
          <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">
            {activeCount}/{PLACEMENT_ORDER.length} active
          </span>
        </CardTitle>
        <CardDescription>
          Choose where your ads appear. At least 1 placement must be active.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Impression preview */}
        <ImpressionsPreview placements={placements} estimatedImpressions={estimatedImpressions} />

        {/* Single-placement warning */}
        {activeCount === 1 && (
          <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[10px] text-amber-700 font-medium">
              <span className="font-bold">Consider multiple placements</span> for better reach and lower CPM. Meta's algorithm works best with 3+ placements.
            </p>
          </div>
        )}

        {/* Placement grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PLACEMENT_ORDER.map((key) => {
            const Icon = PLACEMENT_ICON[key]
            const meta = PLACEMENT_META[key]
            const colorCls = PLACEMENT_COLOR[key]
            const [iconColor, bgColor] = colorCls.split(" ")
            const isActive = placements[key]
            const isLastActive = isActive && activeCount === 1

            return (
              <div
                key={key}
                className={cn(
                  "p-3.5 rounded-xl border transition-all",
                  isActive
                    ? "border-neutral-900 bg-white shadow-sm ring-1 ring-neutral-900"
                    : "border-neutral-200 bg-neutral-50/50",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", bgColor)}>
                    <Icon className={cn("h-4 w-4", iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-neutral-800">{meta.label}</p>
                        <p className="text-[9px] text-neutral-500 leading-snug">{meta.description}</p>
                      </div>
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => !isLastActive && togglePlacement(key)}
                        className="shrink-0"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <Badge className="text-[8px] font-bold border-none bg-neutral-100 text-neutral-600 px-1.5 py-0">
                        {meta.platforms}
                      </Badge>
                      <span className="text-[9px] text-neutral-400 font-bold">CPM ${meta.estimatedCpm.toFixed(2)}</span>
                      {isActive && (
                        <span className="text-[9px] text-emerald-600 font-bold ml-auto">● Active</span>
                      )}
                    </div>
                    {/* CPM bar */}
                    <Progress value={(meta.estimatedCpm / 12) * 100} className={cn("h-1", !isActive && "opacity-30")} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tip */}
        <div className="flex items-start gap-2 p-3 rounded-xl border border-violet-100 bg-violet-50/60">
          <Zap className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
          <p className="text-[10px] text-violet-700 font-medium leading-relaxed">
            <span className="font-bold">Advantage+ Tip:</span> Enabling Reels and Stories alongside Feed lets Meta's algorithm find cheapest impressions across all surfaces automatically.
          </p>
        </div>

        {/* Active placement badges */}
        {activeCount > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {PLACEMENT_ORDER.filter((k) => placements[k]).map((k) => {
              const colorCls = PLACEMENT_COLOR[k]
              const [iconColor, bgColor] = colorCls.split(" ")
              return (
                <Badge key={k} className={cn("text-[9px] font-bold border-none", bgColor, iconColor)}>
                  {PLACEMENT_META[k].label}
                </Badge>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PlacementManager
