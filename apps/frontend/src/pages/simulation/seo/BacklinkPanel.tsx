import { useCampaignStore, BACKLINK_OPPORTUNITIES } from "@/stores/campaignStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Link2, Check, Star, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const TOTAL_BUDGET = 1000

type BacklinkType = "Guest Post" | "Directory" | "Editorial" | "Partnership"

const TYPE_COLORS: Record<BacklinkType, string> = {
  "Guest Post": "bg-violet-50 text-violet-700",
  "Directory": "bg-sky-50 text-sky-700",
  "Editorial": "bg-amber-50 text-amber-700",
  "Partnership": "bg-emerald-50 text-emerald-700",
}

function DomainAuthorityStars({ da }: { da: number }) {
  const stars = Math.round((da / 100) * 5)
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-2.5 w-2.5",
            i < stars ? "text-amber-400 fill-amber-400" : "text-neutral-200 fill-neutral-200",
          )}
        />
      ))}
      <span className="text-[9px] font-bold text-neutral-500 ml-1">DA {da}</span>
    </div>
  )
}

export function BacklinkPanel() {
  const { selectedBacklinks, budgetSpent, toggleBacklink } = useCampaignStore()

  const budgetPct = Math.min(100, (budgetSpent / TOTAL_BUDGET) * 100)
  const remaining = TOTAL_BUDGET - budgetSpent

  const budgetBarColor =
    budgetPct >= 90
      ? "bg-red-500"
      : budgetPct >= 60
        ? "bg-amber-500"
        : "bg-emerald-500"

  return (
    <Card className="border-neutral-200 shadow-sm bg-white text-left flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-neutral-500" />
          Backlink Opportunities
        </CardTitle>
        <CardDescription>
          Select backlink placements within your $1,000 outreach budget.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 flex-1">
        {/* Budget Tracker */}
        <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              Budget Used
            </p>
            <div className="flex items-center gap-1.5">
              {remaining < 100 && (
                <AlertCircle className="h-3 w-3 text-red-500" />
              )}
              <span className="text-xs font-black text-neutral-900">
                ${budgetSpent.toLocaleString()}
                <span className="font-medium text-neutral-400"> / ${TOTAL_BUDGET.toLocaleString()}</span>
              </span>
            </div>
          </div>
          <Progress
            value={budgetPct}
            className="h-2 bg-neutral-200"
            // @ts-expect-error custom indicator color
            indicatorClassName={budgetBarColor}
          />
          <div className="flex justify-between text-[9px] font-bold text-neutral-400">
            <span>${remaining.toLocaleString()} remaining</span>
            <span>{selectedBacklinks.length} link{selectedBacklinks.length !== 1 ? "s" : ""} selected</span>
          </div>
        </div>

        {/* Opportunity Cards */}
        <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-0.5">
          {BACKLINK_OPPORTUNITIES.map((opp) => {
            const isSelected = selectedBacklinks.includes(opp.id)
            const wouldExceed =
              !isSelected && budgetSpent + opp.cost > TOTAL_BUDGET
            const typeKey = opp.type as BacklinkType

            return (
              <div
                key={opp.id}
                onClick={() => !wouldExceed && toggleBacklink(opp.id)}
                className={cn(
                  "p-3 rounded-xl border transition-all",
                  isSelected
                    ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900 cursor-pointer"
                    : wouldExceed
                      ? "border-neutral-100 bg-neutral-50/30 cursor-not-allowed opacity-50"
                      : "border-neutral-200 bg-white hover:border-neutral-400 cursor-pointer",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-bold text-neutral-800 truncate">
                      {opp.sourceName}
                    </p>
                    <DomainAuthorityStars da={opp.domainAuthority} />
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        className={cn(
                          "text-[9px] font-bold border-none px-1.5 py-0",
                          TYPE_COLORS[typeKey],
                        )}
                      >
                        {opp.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-sm font-black text-neutral-900">
                      ${opp.cost}
                    </span>
                    <div
                      className={cn(
                        "h-5 w-5 rounded-full border flex items-center justify-center transition-all",
                        isSelected
                          ? "border-neutral-900 bg-neutral-900"
                          : "border-neutral-300 bg-white",
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white stroke-[3px]" />}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default BacklinkPanel
