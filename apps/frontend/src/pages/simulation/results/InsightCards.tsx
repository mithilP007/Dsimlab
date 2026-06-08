import { useResultsStore } from "@/stores/resultsStore"
import type { InsightItem } from "@/stores/resultsStore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertTriangle, Lightbulb, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function InsightCards() {
  const { insights, channelScores, currentRound, overallScore, previousScore } = useResultsStore()

  const isFirstRound = currentRound === 1

  // Compute performance deltas
  const googleScoreDiff = channelScores.googleAds.score - channelScores.googleAds.previous
  const metaScoreDiff = channelScores.metaAds.score - channelScores.metaAds.previous
  const seoScoreDiff = channelScores.seo.score - channelScores.seo.previous
  const overallDiff = overallScore - previousScore

  const improvements: string[] = []
  const deteriorations: string[] = []

  if (!isFirstRound) {
    if (googleScoreDiff > 0) improvements.push(`Google Ads optimization score increased by ${googleScoreDiff.toFixed(0)} points due to improved keyword relevance.`)
    else if (googleScoreDiff < 0) deteriorations.push(`Google Ads score dropped by ${Math.abs(googleScoreDiff).toFixed(0)} points. Check competitor bidding pressure.`)

    if (metaScoreDiff > 0) improvements.push(`Meta Ads delivery score grew by ${metaScoreDiff.toFixed(0)} points with higher creative relevance.`)
    else if (metaScoreDiff < 0) deteriorations.push(`Meta Ads score fell by ${Math.abs(metaScoreDiff).toFixed(0)} points due to creative fatigue.`)

    if (seoScoreDiff > 0) improvements.push(`Organic search visibility score increased by ${seoScoreDiff.toFixed(0)} points.`)
    else if (seoScoreDiff < 0) deteriorations.push(`SEO search ranking visibility score dropped by ${Math.abs(seoScoreDiff).toFixed(0)} points.`)
  } else {
    improvements.push("Starting baseline established. Google and Meta social campaigns are active.")
  }

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
    <div className="space-y-6 text-left">
      {/* ── Round-over-Round Campaign Differential ───────────────────────── */}
      <Card className="border-neutral-200 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="pb-3 border-b border-neutral-100">
          <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
            <RefreshCw className="h-4.5 w-4.5 text-neutral-600 animate-spin-slow" />
            <span>Round-over-Round Performance Review</span>
          </CardTitle>
          <CardDescription>
            Comparison of Day {currentRound} choices against previous strategies.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {/* Summary KPI Diff */}
          {!isFirstRound && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 text-white shadow-xs">
              <BarChart2 className="h-5 w-5 text-indigo-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Overall Composite Index Change</span>
                <span className="text-sm font-black flex items-center gap-1">
                  {overallScore} pts
                  <span className={cn("text-xs font-bold flex items-center", overallDiff >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {overallDiff >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 inline" /> : <ArrowDownRight className="h-3.5 w-3.5 inline" />}
                    {overallDiff >= 0 ? "+" : ""}{overallDiff} pts vs Last Round
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* What Changed */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-extrabold text-neutral-800 uppercase tracking-wide">What You Changed This Round</h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-neutral-600 bg-neutral-550/10 p-3 rounded-xl border border-neutral-150">
              <div>• SEO Backlink Budget: <span className="text-neutral-900 font-bold">${channelScores.seo.backlinks}</span></div>
              <div>• Google Ads Budget: <span className="text-neutral-900 font-bold">${channelScores.googleAds.spend > 0 ? `$${channelScores.googleAds.spend.toFixed(0)}` : "None"}</span></div>
              <div>• Meta Social Budget: <span className="text-neutral-900 font-bold">${channelScores.metaAds.spend > 0 ? `$${channelScores.metaAds.spend.toFixed(0)}` : "None"}</span></div>
              <div>• Google Ads CPC: <span className="text-neutral-900 font-bold">${channelScores.googleAds.cpc.toFixed(2)}</span></div>
            </div>
          </div>

          {/* Improvements */}
          {improvements.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4 text-emerald-600" /> What Improved
              </h4>
              <ul className="text-xs space-y-1 text-neutral-600 font-medium">
                {improvements.map((imp, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Deteriorations */}
          {!isFirstRound && deteriorations.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-extrabold text-rose-800 uppercase tracking-wide flex items-center gap-1">
                <ArrowDownRight className="h-4 w-4 text-rose-600" /> What Went Worse
              </h4>
              <ul className="text-xs space-y-1 text-neutral-600 font-medium">
                {deteriorations.map((det, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-rose-500 font-bold">•</span>
                    <span>{det}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          <div className="space-y-1.5 border-t border-neutral-100 pt-3">
            <h4 className="text-xs font-extrabold text-neutral-800 uppercase tracking-wide flex items-center gap-1">
              <Lightbulb className="h-4 w-4 text-indigo-500" /> Recommended Action Plan for Day {currentRound + 1}
            </h4>
            <div className="text-xs text-neutral-600 font-medium space-y-2 leading-relaxed">
              {channelScores.googleAds.score < 75 && (
                <p>
                  <strong>Google Ads Tip:</strong> Your Google campaigns are lagging. Add specific transactional search keywords (e.g. "Buy running shoes online") and set exact match types to boost quality score and expected CTR. Avoid bidding too high above sugerested CPC ranges.
                </p>
              )}
              {channelScores.metaAds.score < 75 && (
                <p>
                  <strong>Meta Ads Tip:</strong> Change your creatives copy and headlines to prevent creative fatigue warnings. Broaden targeted audience segments if you experience high CPM bidding pressure.
                </p>
              )}
              {channelScores.seo.score < 75 && (
                <p>
                  <strong>SEO Tip:</strong> High competitor domain authority is blocking your visibility. Allocate more budget to SEO backlinks to build domain authority, and choose targeted long-tail keywords.
                </p>
              )}
              {channelScores.googleAds.score >= 75 && channelScores.metaAds.score >= 75 && (
                <p>
                  <strong>Scaling Tip:</strong> Great alignment! Keep monitoring real-time market signals for news spikes, and scale budgets up on platforms experiencing high demand.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Performance Insights list ────────────────────────────────────── */}
      <Card className="border-neutral-200 shadow-sm rounded-2xl overflow-hidden bg-white">
        <div className="p-5 border-b border-neutral-100">
          <h2 className="text-base font-black text-neutral-900">AI Marketing Recommendations</h2>
          <p className="text-xs text-neutral-500">
            Personalized intelligence highlights from your sandbox agent advisor.
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
    </div>
  )
}

export default InsightCards
