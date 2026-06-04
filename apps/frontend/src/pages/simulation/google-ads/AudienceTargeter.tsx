import { useGoogleAdsStore } from "@/stores/googleAdsStore"
import type { AudienceType } from "@/stores/googleAdsStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import { cn } from "@/lib/utils"

const TYPE_STYLE: Record<AudienceType, { badge: string; ring: string; dot: string }> = {
  "In-Market":     { badge: "bg-sky-50 text-sky-700",     ring: "border-sky-200",    dot: "bg-sky-500"    },
  "Affinity":      { badge: "bg-violet-50 text-violet-700", ring: "border-violet-200", dot: "bg-violet-500" },
  "Custom Intent": { badge: "bg-orange-50 text-orange-700", ring: "border-orange-200", dot: "bg-orange-500" },
  "Remarketing":   { badge: "bg-emerald-50 text-emerald-700", ring: "border-emerald-200", dot: "bg-emerald-500" },
}

function formatReach(millions: number): string {
  return millions >= 1
    ? `${millions.toFixed(1)}M users`
    : `${Math.round(millions * 1000)}K users`
}

export function AudienceTargeter() {
  const { audiences, toggleAudience } = useGoogleAdsStore()

  const selectedAudiences = audiences.filter((a) => a.selected)
  const totalReach = selectedAudiences.reduce((sum, a) => sum + a.reach, 0)

  return (
    <Card className="border-neutral-200 shadow-sm bg-white text-left">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
          <Users className="h-4 w-4 text-neutral-500" />
          Audience Targeter
        </CardTitle>
        <CardDescription>
          Select audience segments to refine who sees your ads.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Total Reach Estimator */}
        <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-950 text-white">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
            Total Estimated Reach
          </p>
          <p className="text-3xl font-black text-white leading-none">
            {totalReach >= 1
              ? `${totalReach.toFixed(1)}M`
              : `${Math.round(totalReach * 1000)}K`}
          </p>
          <p className="text-[10px] text-neutral-400 mt-1.5 font-medium">
            {selectedAudiences.length} segment{selectedAudiences.length !== 1 ? "s" : ""} active
          </p>

          {/* Type legend */}
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-neutral-800">
            {(Object.keys(TYPE_STYLE) as AudienceType[]).map((type) => (
              <span key={type} className="flex items-center gap-1 text-[9px] font-bold text-neutral-400">
                <span className={cn("h-1.5 w-1.5 rounded-full", TYPE_STYLE[type].dot)} />
                {type}
              </span>
            ))}
          </div>
        </div>

        {/* Audience Cards */}
        <div className="space-y-2">
          {audiences.map((audience) => {
            const style = TYPE_STYLE[audience.type]
            return (
              <div
                key={audience.name}
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-xl border transition-all",
                  audience.selected
                    ? `${style.ring} bg-white shadow-sm ring-1 ${style.ring}`
                    : "border-neutral-200 bg-white hover:border-neutral-300",
                )}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className={cn("h-2 w-2 rounded-full mt-1 shrink-0", style.dot)} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-800 truncate">{audience.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className={cn("text-[9px] font-bold border-none px-1.5 py-0", style.badge)}>
                        {audience.type}
                      </Badge>
                      <span className="text-[10px] text-neutral-400 font-semibold">
                        {formatReach(audience.reach)}
                      </span>
                    </div>
                  </div>
                </div>
                <Switch
                  checked={audience.selected}
                  onCheckedChange={() => toggleAudience(audience.name)}
                  className="shrink-0"
                />
              </div>
            )
          })}
        </div>

        {/* Selected summary */}
        {selectedAudiences.length > 0 && (
          <div className="p-3 rounded-xl border border-neutral-100 bg-neutral-50/50 space-y-1.5">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Active Segments
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedAudiences.map((a) => (
                <span
                  key={a.name}
                  className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", TYPE_STYLE[a.type].badge)}
                >
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

export default AudienceTargeter
