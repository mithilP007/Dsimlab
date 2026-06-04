import { useResultsStore } from "@/stores/resultsStore"
import type { InsightItem } from "@/stores/resultsStore"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertTriangle, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"

export function InsightCards() {
  const { insights } = useResultsStore()

  const getInsightConfig = (type: InsightItem["type"]) => {
    switch (type) {
      case "success":
        return {
          icon: CheckCircle,
          borderColor: "border-l-emerald-500 bg-emerald-50/20",
          iconColor: "text-emerald-500",
          badgeClass: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
          labelText: "Success",
          actionText: "View Details",
        }
      case "warning":
        return {
          icon: AlertTriangle,
          borderColor: "border-l-amber-500 bg-amber-50/20",
          iconColor: "text-amber-500",
          badgeClass: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200",
          labelText: "Warning",
          actionText: "Take Action",
        }
      case "tip":
      default:
        return {
          icon: Lightbulb,
          borderColor: "border-l-sky-500 bg-sky-50/20",
          iconColor: "text-sky-500",
          badgeClass: "bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200",
          labelText: "Optimization Tip",
          actionText: "Take Action",
        }
    }
  }

  return (
    <Card className="border-neutral-200 shadow-sm rounded-2xl overflow-hidden bg-white text-left">
      <div className="p-5 border-b border-neutral-100">
        <h2 className="text-base font-black text-neutral-900">Performance Insights</h2>
        <p className="text-xs text-neutral-500">
          Personalized analysis of your digital marketing choices in this round.
        </p>
      </div>
      <CardContent className="p-5 space-y-4">
        {insights.map((insight, idx) => {
          const config = getInsightConfig(insight.type)
          const Icon = config.icon

          return (
            <div
              key={idx}
              className={cn(
                "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-neutral-200 border-l-4 transition-all shadow-2xs hover:shadow-xs",
                config.borderColor
              )}
            >
              <div className="flex gap-3.5 items-start">
                <div className="shrink-0 mt-0.5">
                  <Icon className={cn("h-5 w-5", config.iconColor)} />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-neutral-900">
                      {insight.title}
                    </span>
                    <Badge variant="outline" className={cn("text-[8px] font-bold uppercase tracking-wider py-0 px-2 rounded-full", config.badgeClass)}>
                      {config.labelText}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-600 font-medium leading-relaxed max-w-2xl">
                    {insight.description}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-bold shrink-0 shadow-2xs border-neutral-250 bg-white hover:bg-neutral-50"
              >
                {config.actionText}
              </Button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export default InsightCards
