import { useState, useEffect } from "react"
import api from "@/lib/api"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TrendingUp,
  Activity,
  DollarSign,
  Users,
  Compass,
  FileText,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from "lucide-react"

interface MarketSignalsPanelProps {
  simulationId?: string
  roundNumber: number
}

interface TrendSignal {
  keyword: string
  industry: string
  location: string
  trendScore: number
  competitionScore: number
  seasonalScore: number
  newsImpactScore: number
  audienceIntent: "LOW" | "MEDIUM" | "HIGH"
  suggestedCpcRange: { min: number; max: number }
  suggestedCpmRange: { min: number; max: number }
  confidence: number
  sources: Array<{ name: string; url?: string; fetchedAt: string }>
}

interface MarketCondition {
  roundNumber: number
  demandIndex: number
  competitionIndex: number
  cpcPressure: number
  cpmPressure: number
  conversionIntent: number
  seasonalImpact: number
  newsImpact: number
  platformModifiers: { SEO: number; GOOGLE_ADS: number; META_ADS: number }
}

export function MarketSignalsPanel({ simulationId, roundNumber }: MarketSignalsPanelProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trends, setTrends] = useState<TrendSignal[]>([])
  const [marketCondition, setMarketCondition] = useState<MarketCondition | null>(null)

  useEffect(() => {
    if (!simulationId) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [trendsRes, mcRes] = await Promise.all([
          api.get<{ success: boolean; trends: any[] }>(`/api/simulations/${simulationId}/trends`),
          api.get<{ success: boolean; marketConditions: any[] }>(`/api/simulations/${simulationId}/market-conditions`)
        ])

        if (trendsRes.data?.success && mcRes.data?.success) {
          // Find data matching current round
          const roundTrends = trendsRes.data.trends.find(t => t.roundNumber === roundNumber)
          const roundMC = mcRes.data.marketConditions.find(mc => mc.roundNumber === roundNumber)

          if (roundTrends) {
            setTrends(roundTrends.signals || [])
          }
          if (roundMC) {
            setMarketCondition(roundMC)
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch market signals:", err)
        setError("Could not retrieve real-time trends for this round. Check server connectivity.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [simulationId, roundNumber])

  if (loading) {
    return (
      <Card className="border-neutral-200 shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 shadow-sm rounded-2xl bg-red-50/50 overflow-hidden">
        <CardContent className="p-6 flex items-start gap-3 text-red-800 text-xs">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-sm">Failed to Load Market Signals</span>
            <p className="mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!marketCondition && trends.length === 0) {
    return (
      <Card className="border-neutral-200 shadow-sm rounded-2xl bg-neutral-50/50 overflow-hidden">
        <CardContent className="p-6 flex items-start gap-3 text-neutral-500 text-xs">
          <AlertCircle className="h-5 w-5 text-neutral-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-sm">No Market Signals Logged</span>
            <p className="mt-1">
              There are no trend snapshots recorded for Round {roundNumber}. Advance or refresh trends to capture real-time market data.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get unique source URLs used in this round
  const allSources = trends.flatMap(t => t.sources || [])
  const uniqueSources = allSources.filter((source, index, self) =>
    self.findIndex(s => s.name === source.name) === index
  ).slice(0, 5)

  return (
    <Card className="border-neutral-200 shadow-sm rounded-2xl overflow-hidden bg-white text-left">
      <CardHeader className="pb-3 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base font-black text-neutral-900 flex items-center gap-2">
            <Compass className="h-5 w-5 text-indigo-600 animate-spin-slow" />
            <span>Market Signals & Real-Time Trend Snapshot</span>
          </CardTitle>
          <CardDescription>
            Deterministic auction modifiers built from live Google News feeds and RSS search indexes.
          </CardDescription>
        </div>
        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-[9px] uppercase tracking-wider py-0.5 px-2.5">
          Real-Time Trend Simulation
        </Badge>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Market Condition Multipliers Grid */}
        {marketCondition && (
          <div>
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 block">Resolved Auction Multipliers</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[
                { label: "Search Demand", val: marketCondition.demandIndex, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
                { label: "Competition Index", val: marketCondition.competitionIndex, icon: Users, color: "text-amber-600 bg-amber-50" },
                { label: "CPC Pressure Multiplier", val: marketCondition.cpcPressure, icon: DollarSign, color: "text-indigo-600 bg-indigo-50" },
                { label: "CPM Pressure Multiplier", val: marketCondition.cpmPressure, icon: DollarSign, color: "text-purple-600 bg-purple-50" },
                { label: "Conversion Intent", val: marketCondition.conversionIntent, icon: CheckCircle, color: "text-sky-600 bg-sky-50" },
                { label: "Seasonal Multiplier", val: marketCondition.seasonalImpact, icon: Activity, color: "text-pink-600 bg-pink-50" },
                { label: "News Sentiment Shift", val: marketCondition.newsImpact, icon: FileText, color: "text-blue-600 bg-blue-50" },
              ].map((item, idx) => {
                const Icon = item.icon
                return (
                  <div key={idx} className="p-3 border border-neutral-100 rounded-xl bg-neutral-50/50 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide truncate pr-2">{item.label}</span>
                      <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <div>
                      <span className="text-lg font-black text-neutral-900">{item.val}x</span>
                      <span className="text-[9px] text-neutral-500 block leading-tight mt-0.5">
                        {item.val > 1.0 ? "Increased baseline pressure" : item.val < 1.0 ? "Decreased baseline pressure" : "Baseline average"}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Keywords Table */}
        {trends.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 block">Keyword Interest Analysis</h3>
            <div className="overflow-x-auto border border-neutral-150 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-150">
                  <tr>
                    <th className="py-2.5 px-4 font-extrabold">Keyword</th>
                    <th className="py-2.5 px-4 font-extrabold text-center">Trend Index</th>
                    <th className="py-2.5 px-4 font-extrabold text-center">Audience Intent</th>
                    <th className="py-2.5 px-4 font-extrabold text-right">Est. CPC Range</th>
                    <th className="py-2.5 px-4 font-extrabold text-right">Est. CPM Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {trends.map((signal, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3 px-4 text-neutral-900 font-bold">{signal.keyword}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-bold text-neutral-800">{signal.trendScore}/100</span>
                          <Progress value={signal.trendScore} className="h-1.5 w-12" />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="outline"
                          className={`font-bold text-[9px] py-0 px-2 rounded-full uppercase ${
                            signal.audienceIntent === "HIGH"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : signal.audienceIntent === "MEDIUM"
                              ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                              : "bg-neutral-100 text-neutral-500 border-neutral-200"
                          }`}
                        >
                          {signal.audienceIntent}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right text-neutral-700">
                        ${signal.suggestedCpcRange.min.toFixed(2)} - ${signal.suggestedCpcRange.max.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-neutral-700">
                        ${signal.suggestedCpmRange.min.toFixed(2)} - ${signal.suggestedCpmRange.max.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Live RSS Sources Used */}
        {uniqueSources.length > 0 && (
          <div className="pt-4 border-t border-neutral-100">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 block">Audit log: Real-Time Verification Feeds</h3>
            <div className="space-y-2">
              {uniqueSources.map((source, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg border border-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-colors text-xs">
                  <div className="flex items-center gap-2 truncate pr-4">
                    <span className="h-4.5 w-4.5 rounded bg-neutral-200 text-[8px] font-black text-neutral-600 flex items-center justify-center shrink-0 uppercase">
                      RSS
                    </span>
                    <span className="font-semibold text-neutral-800 truncate">{source.name}</span>
                  </div>
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 hover:underline shrink-0"
                    >
                      <span>Verify Source</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-[10px] text-neutral-400 font-semibold shrink-0">Captured Live Snapshot</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
