import { useState, useEffect } from "react"
import { useResultsStore } from "@/stores/resultsStore"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { BarChart3, Users, Compass, Globe, Share2, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color?: string
  }>
  label?: string | number
}

interface MiniTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
  }>
}

export function TrafficAnalytics() {
  const { dailyTraffic } = useResultsStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6 text-left">
        {/* Main Chart Card Skeleton */}
        <Card className="border-neutral-200 bg-white shadow-xs p-6 space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-72 w-full rounded" />
        </Card>

        {/* 4 Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Card key={idx} className="border-neutral-200 bg-white p-5 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-full rounded" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Pre-calculate sums for the monthly totals
  // The user prompt specifies exact numbers:
  // - Total Visitors: 12,450 (+15%)
  // - Organic Traffic: 5,230 (+22%)
  // - Paid Traffic: 4,180 (+8%)
  // - Social Traffic: 3,040 (+12%)
  const metrics = [
    {
      title: "Total Visitors",
      value: "12,450",
      change: 15,
      icon: Users,
      color: "text-neutral-600 bg-neutral-100",
      barColor: "#64748b",
      dataKey: "total",
    },
    {
      title: "Organic Traffic",
      value: "5,230",
      change: 22,
      icon: Compass,
      color: "text-emerald-650 bg-emerald-50",
      barColor: "#22c55e",
      dataKey: "organic",
    },
    {
      title: "Paid Traffic",
      value: "4,180",
      change: 8,
      icon: Globe,
      color: "text-sky-650 bg-sky-50",
      barColor: "#3b82f6",
      dataKey: "paid",
    },
    {
      title: "Social Traffic",
      value: "3,040",
      change: 12,
      icon: Share2,
      color: "text-violet-650 bg-violet-50",
      barColor: "#a855f7",
      dataKey: "social",
    },
  ]

  // Map 30-day traffic data for the main AreaChart
  const mainChartData = dailyTraffic.map((d) => ({
    day: `Day ${d.day}`,
    Organic: d.organic,
    "Paid Search": d.paid,
    Social: d.social,
    Total: d.total,
  }))

  return (
    <div className="space-y-6 text-left">
      {/* Main 30-Day Area Chart */}
      <Card className="border-neutral-200 bg-white shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-2">
          <CardTitle className="text-base font-black text-neutral-900 flex items-center gap-2">
            <BarChart3 className="h-4.5 w-4.5 text-neutral-900" />
            30-Day Traffic Acquisition Trend
          </CardTitle>
          <CardDescription className="text-xs text-neutral-500">
            Performance comparison of organic SEO traffic, paid search ad keywords, and social ad placements.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          <div className="h-80 min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mainChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={{ stroke: "#e2e8f0" }}
                />
                <Tooltip
                  content={(props: CustomTooltipProps) => {
                    const { active, payload, label } = props
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 rounded-lg border border-neutral-200 shadow-sm text-xs space-y-1">
                          <p className="font-bold text-neutral-800">{label}</p>
                          {payload.map((p) => (
                            <p key={p.name} className="flex items-center justify-between gap-5">
                              <span className="text-neutral-500 font-medium">{p.name}:</span>
                              <span className="font-black text-neutral-900">
                                {p.value.toLocaleString()}
                              </span>
                            </p>
                          ))}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                <Area
                  type="monotone"
                  dataKey="Organic"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  fillOpacity={0.06}
                  fill="#22c55e"
                />
                <Area
                  type="monotone"
                  dataKey="Paid Search"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={0.06}
                  fill="#3b82f6"
                />
                <Area
                  type="monotone"
                  dataKey="Social"
                  stroke="#a855f7"
                  strokeWidth={2.5}
                  fillOpacity={0.06}
                  fill="#a855f7"
                />
                <Area
                  type="monotone"
                  dataKey="Total"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fillOpacity={0}
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 4 Metric cards below chart */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((m) => {
          const Icon = m.icon
          const up = m.change >= 0
          return (
            <Card key={m.title} className="border-neutral-200 bg-white shadow-xs rounded-2xl overflow-hidden">
              <CardContent className="p-5 space-y-3.5">
                <div className="flex justify-between items-center">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", m.color)}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <Badge variant="outline" className={cn(
                    "font-bold text-[10px] py-0.5 px-2 rounded-full flex items-center gap-0.5",
                    up ? "bg-emerald-50 text-emerald-700 border-emerald-150" : "bg-rose-50 text-rose-700 border-rose-150"
                  )}>
                    {up ? (
                      <ArrowUp className="h-3 w-3 stroke-[3.5]" />
                    ) : (
                      <ArrowDown className="h-3 w-3 stroke-[3.5]" />
                    )}
                    {m.change}%
                  </Badge>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    {m.title}
                  </span>
                  <span className="text-2xl font-black text-neutral-900 leading-none">
                    {m.value}
                  </span>
                </div>

                {/* Daily Mini Spark-Bar Chart */}
                <div className="h-8 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyTraffic}>
                      <Tooltip
                        cursor={{ fill: "transparent" }}
                        content={(props: MiniTooltipProps) => {
                          const { active, payload } = props
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-neutral-950 text-white font-black text-[9px] px-1.5 py-0.5 rounded">
                                {payload[0].value}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey={m.dataKey} fill={m.barColor} radius={[1, 1, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default TrafficAnalytics
