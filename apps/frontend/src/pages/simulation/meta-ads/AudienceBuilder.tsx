import { useState } from "react"
import { useMetaAdsStore } from "@/stores/metaAdsStore"
import type { AudienceType } from "@/stores/metaAdsStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CFG: Record<AudienceType, { label: string; badge: string; dot: string; desc: string }> = {
  core:      { label: "Core",      badge: "bg-blue-50 text-blue-700",   dot: "bg-blue-500",   desc: "Interest & demographic-based audiences" },
  custom:    { label: "Custom",    badge: "bg-violet-50 text-violet-700", dot: "bg-violet-500", desc: "Uploaded customer data or pixel-based" },
  lookalike: { label: "Lookalike", badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", desc: "Similar to your best customers" },
}

const AUDIENCE_TYPES: AudienceType[] = ["core", "custom", "lookalike"]

function formatSize(millions: number) {
  return millions >= 1 ? `${millions.toFixed(1)}M` : `${Math.round(millions * 1000)}K`
}

// ─── Mini reach bar chart ─────────────────────────────────────────────────────

function ReachByType({ audiences }: { audiences: ReturnType<typeof useMetaAdsStore.getState>["audiences"] }) {
  const selected = audiences.filter((a) => a.selected)
  const totals = AUDIENCE_TYPES.map((t) => ({
    type: t,
    reach: selected.filter((a) => a.type === t).reduce((s, a) => s + a.size, 0),
  }))
  const maxReach = Math.max(...totals.map((t) => t.reach), 0.1)

  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
        <BarChart3 className="h-3 w-3" />Reach by Audience Type
      </p>
      {totals.map(({ type, reach }) => {
        const cfg = TYPE_CFG[type]
        return (
          <div key={type} className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-neutral-500 w-16 shrink-0 capitalize">{type}</span>
            <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", cfg.dot)}
                style={{ width: `${(reach / maxReach) * 100}%` }}
              />
            </div>
            <span className="text-[9px] font-bold text-neutral-600 w-10 text-right shrink-0">
              {reach > 0 ? formatSize(reach) : "—"}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Collapsible group ────────────────────────────────────────────────────────

function AudienceGroup({
  type,
  audiences,
  onToggle,
}: {
  type: AudienceType
  audiences: ReturnType<typeof useMetaAdsStore.getState>["audiences"]
  onToggle: (name: string) => void
}) {
  const [open, setOpen] = useState(true)
  const cfg = TYPE_CFG[type]
  const group = audiences.filter((a) => a.type === type)
  const selectedCount = group.filter((a) => a.selected).length
  const maxSize = Math.max(...group.map((a) => a.size), 0.1)

  return (
    <div className="rounded-xl border border-neutral-200 overflow-hidden">
      {/* Group header */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
          <span className="text-xs font-bold text-neutral-800">{cfg.label} Audiences</span>
          <span className="text-[9px] text-neutral-500 font-medium">{cfg.desc}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedCount > 0 && (
            <Badge className={cn("text-[9px] font-bold border-none", cfg.badge)}>
              {selectedCount} selected
            </Badge>
          )}
          {open ? <ChevronDown className="h-3.5 w-3.5 text-neutral-400" /> : <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />}
        </div>
      </button>

      {/* Audience cards */}
      {open && (
        <div className="divide-y divide-neutral-100">
          {group.map((audience) => {
            const sizePct = (audience.size / maxSize) * 100
            return (
              <div
                key={audience.name}
                className={cn(
                  "px-4 py-3 transition-all",
                  audience.selected ? "bg-white" : "bg-white hover:bg-neutral-50",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-neutral-800">{audience.name}</p>
                      <Badge className={cn("text-[9px] font-bold border-none", cfg.badge)}>{cfg.label}</Badge>
                    </div>
                    <p className="text-[10px] text-neutral-500">{audience.description}</p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="flex-1 h-1 rounded-full bg-neutral-100 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", cfg.dot)}
                          style={{ width: `${sizePct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-neutral-600 shrink-0">
                        {formatSize(audience.size)} users
                      </span>
                    </div>
                  </div>
                  <Switch
                    checked={audience.selected}
                    onCheckedChange={() => onToggle(audience.name)}
                    className="shrink-0 mt-0.5"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AudienceBuilder() {
  const { audiences, toggleAudience, estimatedReach } = useMetaAdsStore()
  const selectedCount = audiences.filter((a) => a.selected).length
  const totalSelectedSize = audiences
    .filter((a) => a.selected)
    .reduce((s, a) => s + a.size, 0)

  const reachPct = Math.min(100, (totalSelectedSize / 200) * 100) // cap at 200M for bar

  return (
    <Card className="border-neutral-200 shadow-sm bg-white text-left">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
          <Users className="h-4 w-4 text-neutral-500" />
          Audience Builder
        </CardTitle>
        <CardDescription>
          Select audience segments. Mix types for best results.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Reach estimator */}
        <div className="p-4 rounded-xl bg-neutral-950 text-white space-y-3">
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
              Total Estimated Reach
            </p>
            <p className="text-3xl font-black text-white leading-none">
              {estimatedReach >= 1_000_000
                ? `${(estimatedReach / 1_000_000).toFixed(1)}M`
                : `${Math.round(estimatedReach / 1_000)}K`}
            </p>
            <p className="text-[10px] text-neutral-400 mt-1">
              {selectedCount} audience segment{selectedCount !== 1 ? "s" : ""} · {formatSize(totalSelectedSize)} potential users
            </p>
          </div>
          <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
              style={{ width: `${reachPct}%` }}
            />
          </div>
          <ReachByType audiences={audiences} />
        </div>

        {/* Overlap warning */}
        {selectedCount > 3 && (
          <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[10px] text-amber-700 font-medium">
              <span className="font-bold">Audience Overlap Warning:</span> Selecting {selectedCount} segments may cause overlap and increase CPC. Consider narrowing to 2–3 targeted segments.
            </p>
          </div>
        )}

        {/* Grouped audience lists */}
        <div className="space-y-3">
          {AUDIENCE_TYPES.map((type) => (
            <AudienceGroup
              key={type}
              type={type}
              audiences={audiences}
              onToggle={toggleAudience}
            />
          ))}
        </div>

        {/* Active summary chips */}
        {selectedCount > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Active Segments</p>
            <div className="flex flex-wrap gap-1.5">
              {audiences.filter((a) => a.selected).map((a) => (
                <span key={a.name} className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", TYPE_CFG[a.type].badge)}>
                  {a.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AudienceBuilder
