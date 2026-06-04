import { useState, useEffect } from "react"
import { useResultsStore } from "@/stores/resultsStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, Line, ResponsiveContainer } from "recharts"
import { Search, Target, Share2, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

export function ScoreBreakdown() {
  const { overallScore, previousScore, scoreChange, channelScores } = useResultsStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  // Overall Score Color classes
  const getOverallColorClass = (score: number) => {
    if (score >= 70) return "text-emerald-500 border-emerald-500"
    if (score >= 50) return "text-amber-500 border-amber-500"
    return "text-rose-500 border-rose-500"
  }

  const getOverallBgClass = (score: number) => {
    if (score >= 70) return "bg-emerald-50 text-emerald-700 border-emerald-200"
    if (score >= 50) return "bg-amber-50 text-amber-700 border-amber-200"
    return "bg-rose-50 text-rose-700 border-rose-200"
  }

  // Sparkline data mapping
  const seoSparkData = [
    { value: 60 },
    { value: 62 },
    { value: 63 },
    { value: 65 },
    { value: channelScores.seo.score },
  ]
  const googleSparkData = [
    { value: 62 },
    { value: 65 },
    { value: 65 },
    { value: channelScores.googleAds.score },
  ]
  const metaSparkData = [
    { value: 58 },
    { value: 60 },
    { value: 62 },
    { value: 65 },
    { value: channelScores.metaAds.score },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6 text-left">
        {/* Main circular gauge skeleton */}
        <Card className="border-neutral-200 bg-white shadow-xs p-6 flex flex-col items-center">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-28 w-28 rounded-full mb-4" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </Card>

        {/* 3 columns skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx} className="border-neutral-200 bg-white p-5 space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-8 w-full rounded" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const overallColor = getOverallColorClass(overallScore)
  const isScoreUp = scoreChange >= 0

  const channels = [
    {
      title: "SEO Score",
      score: channelScores.seo.score,
      prev: channelScores.seo.previous,
      change: channelScores.seo.score - channelScores.seo.previous,
      icon: Search,
      color: "text-violet-650 bg-violet-50",
      stroke: "#8b5cf6",
      spark: seoSparkData,
    },
    {
      title: "Google Ads Score",
      score: channelScores.googleAds.score,
      prev: channelScores.googleAds.previous,
      change: channelScores.googleAds.score - channelScores.googleAds.previous,
      icon: Target,
      color: "text-sky-650 bg-sky-50",
      stroke: "#0ea5e9",
      spark: googleSparkData,
    },
    {
      title: "Meta Ads Score",
      score: channelScores.metaAds.score,
      prev: channelScores.metaAds.previous,
      change: channelScores.metaAds.score - channelScores.metaAds.previous,
      icon: Share2,
      color: "text-amber-650 bg-amber-50",
      stroke: "#f59e0b",
      spark: metaSparkData,
    },
  ]

  return (
    <div className="space-y-6 text-left">
      {/* Overall Score Circle */}
      <Card className="border-neutral-200 bg-white shadow-xs overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black text-neutral-450 uppercase tracking-widest text-center">
            Overall Competency Score
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center p-6">
          <div className={cn(
            "relative flex items-center justify-center h-28 w-28 rounded-full border-4 transition-all duration-500",
            overallColor
          )}>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black leading-none">{overallScore}</span>
              <span className="text-[10px] font-bold text-neutral-400 mt-1">/ 100</span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Badge variant="outline" className={cn("font-bold text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1", getOverallBgClass(overallScore))}>
              {isScoreUp ? (
                <ArrowUp className="h-3 w-3 stroke-[3]" />
              ) : (
                <ArrowDown className="h-3 w-3 stroke-[3]" />
              )}
              {isScoreUp ? `+${scoreChange}` : scoreChange} change
            </Badge>
            <span className="text-xs text-neutral-500 font-medium">
              vs previous round score of {previousScore}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3 Channel Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {channels.map((chan) => {
          const Icon = chan.icon
          const up = chan.change >= 0
          return (
            <Card key={chan.title} className="border-neutral-200 bg-white shadow-xs rounded-2xl overflow-hidden">
              <CardHeader className="p-5 pb-3">
                <div className="flex justify-between items-center">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", chan.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <Badge variant="outline" className={cn(
                    "font-bold text-[10px] py-0.5 px-2 rounded-full flex items-center gap-0.5",
                    up ? "bg-emerald-50 text-emerald-700 border-emerald-150" : "bg-rose-50 text-rose-700 border-rose-150"
                  )}>
                    {up ? "+" : ""}
                    {chan.change}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-black text-neutral-900 mt-3 flex justify-between items-end">
                  <span>{chan.title}</span>
                  <span className="text-base font-black text-neutral-850">{chan.score}/100</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-4">
                <div className="space-y-1.5">
                  <Progress value={chan.score} className="h-1.5" />
                  <div className="flex justify-between text-[9px] text-neutral-450 font-bold uppercase tracking-wider">
                    <span>Target: 80+</span>
                    <span>Previous: {chan.prev}</span>
                  </div>
                </div>

                <Separator className="bg-neutral-100" />

                {/* Score Sparkline */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Score Trend</span>
                  <div className="h-8 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chan.spark}>
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={chan.stroke}
                          strokeWidth={2}
                          dot={{ r: 2, fill: chan.stroke }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default ScoreBreakdown
