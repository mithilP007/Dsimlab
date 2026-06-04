import { useLeaderboardStore } from "@/stores/leaderboardStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { TrendingUp, TrendingDown, Users, Star, Award, BarChart3 } from "lucide-react"

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
  }>
  label?: string | number
}

// Colors for the ranges showing a red-to-green gradient
const RANGE_COLORS: Record<string, string> = {
  "0-20": "hsl(0, 84%, 60%)",     // Red
  "21-40": "hsl(24, 95%, 60%)",    // Orange
  "41-60": "hsl(38, 92%, 58%)",    // Amber
  "61-70": "hsl(48, 96%, 53%)",    // Yellow
  "71-80": "hsl(82, 84%, 52%)",    // Lime
  "81-100": "hsl(142, 72%, 45%)",  // Green
}

export function ClassStats() {
  const { students, classStats, currentUserId } = useLeaderboardStore()

  // Define score ranges
  const ranges = [
    { range: "0-20", min: 0, max: 20 },
    { range: "21-40", min: 21, max: 40 },
    { range: "41-60", min: 41, max: 60 },
    { range: "61-70", min: 61, max: 70 },
    { range: "71-80", min: 71, max: 80 },
    { range: "81-100", min: 81, max: 100 },
  ]

  // Calculate score distribution dynamically from active student scores
  const distributionData = ranges.map((r) => {
    const count = students.filter(
      (s) => s.overallScore >= r.min && s.overallScore <= r.max
    ).length
    return {
      range: r.range,
      count,
    }
  })

  // Find the student details for the highest score
  const highestStudent = students.find((s) => s.overallScore === classStats.highestScore)
  const highestStudentName = highestStudent ? highestStudent.name : "Alexander Wright"

  // Calculate average score difference from previous rounds
  const previousAverage = parseFloat(
    (students.reduce((acc, s) => acc + s.previousScore, 0) / students.length).toFixed(1)
  )
  const currentAverage = classStats.averageScore
  const averageDiff = parseFloat((currentAverage - previousAverage).toFixed(1))

  // Find the current user's score range
  const currentUser = students.find((s) => s.id === currentUserId)
  const userScore = currentUser ? currentUser.overallScore : 0
  const userRange = ranges.find((r) => userScore >= r.min && userScore <= r.max)?.range || ""

  // Circular progress ring parameters for Participation
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (classStats.participationRate / 100) * circumference

  return (
    <div className="space-y-6 text-left">
      {/* 4 Metric cards - 2x2 on tablet, stacked on mobile, 4 in a row on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Average Score */}
        <Card className="border-neutral-200 bg-white shadow-2xs rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
              Average Score
            </span>
            <span className="text-2xl font-black text-neutral-900 block leading-none">
              {currentAverage}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              {averageDiff > 0 ? (
                <div className="flex items-center text-emerald-600 text-[10px] font-bold">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  +{averageDiff} this round
                </div>
              ) : averageDiff < 0 ? (
                <div className="flex items-center text-rose-600 text-[10px] font-bold">
                  <TrendingDown className="h-3 w-3 mr-0.5" />
                  {averageDiff} this round
                </div>
              ) : (
                <span className="text-neutral-400 text-[10px] font-bold">Stable</span>
              )}
            </div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0 text-violet-600">
            <Award className="h-4.5 w-4.5" />
          </div>
        </Card>

        {/* Metric 2: Highest Score */}
        <Card className="border-neutral-200 bg-white shadow-2xs rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1 overflow-hidden">
            <span className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
              Highest Score
            </span>
            <span className="text-2xl font-black text-neutral-900 block leading-none">
              {classStats.highestScore}
            </span>
            <span className="text-[10px] text-neutral-500 font-bold block truncate max-w-[140px] mt-0.5">
              {highestStudentName}
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 text-amber-600">
            <Star className="h-4.5 w-4.5 fill-amber-500/10" />
          </div>
        </Card>

        {/* Metric 3: Participation */}
        <Card className="border-neutral-200 bg-white shadow-2xs rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
              Participation
            </span>
            <span className="text-2xl font-black text-neutral-900 block leading-none">
              {classStats.participationRate}%
            </span>
            <span className="text-[10px] text-neutral-400 font-bold block mt-0.5">
              Active simulation
            </span>
          </div>
          {/* SVG Progress Ring */}
          <div className="relative flex items-center justify-center shrink-0 h-10 w-10">
            <svg className="w-10 h-10 transform -rotate-90">
              <circle
                cx="20"
                cy="20"
                r={radius}
                className="stroke-neutral-100 fill-none"
                strokeWidth="3.5"
              />
              <circle
                cx="20"
                cy="20"
                r={radius}
                className="stroke-emerald-500 fill-none transition-all duration-500"
                strokeWidth="3.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[8px] font-black text-neutral-700">
              {classStats.participationRate}%
            </span>
          </div>
        </Card>

        {/* Metric 4: Median Score */}
        <Card className="border-neutral-200 bg-white shadow-2xs rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
              Median Score
            </span>
            <span className="text-2xl font-black text-neutral-900 block leading-none">
              {classStats.medianScore}
            </span>
            <span className="text-[10px] text-neutral-400 font-bold block mt-0.5">
              Middle threshold
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-sky-50 flex items-center justify-center shrink-0 text-sky-600">
            <Users className="h-4.5 w-4.5" />
          </div>
        </Card>
      </div>

      {/* Distribution Chart Card */}
      <Card className="border-neutral-200 bg-white shadow-2xs rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-2">
          <CardTitle className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
            <BarChart3 className="h-4.5 w-4.5 text-neutral-900" />
            Class Performance
          </CardTitle>
          <CardDescription className="text-xs text-neutral-500">
            Cohort grade curve and score ranges distribution density.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="h-56 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="range"
                  tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={{ stroke: "#e2e8f0" }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.01)" }}
                  content={(props: CustomTooltipProps) => {
                    const { active, payload, label } = props
                    if (active && payload && payload.length) {
                      const isUserRange = label === userRange
                      return (
                        <div className="bg-neutral-950 text-white font-black text-[11px] px-2.5 py-1.5 rounded-lg shadow-md border border-neutral-800">
                          <div>Range: {label}</div>
                          <div>Students: {payload[0].value}</div>
                          {isUserRange && (
                            <div className="text-sky-400 mt-0.5 text-[10px] font-black uppercase tracking-wider">
                              Your Range
                            </div>
                          )}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={45}>
                  {distributionData.map((entry, index) => {
                    const isHighlighted = entry.range === userRange
                    const baseColor = RANGE_COLORS[entry.range] || "hsl(200, 80%, 50%)"
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={baseColor}
                        opacity={userRange ? (isHighlighted ? 1.0 : 0.45) : 1.0}
                        stroke={isHighlighted ? "#0f172a" : "none"}
                        strokeWidth={isHighlighted ? 2 : 0}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {userRange && (
            <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] font-bold text-neutral-500 bg-neutral-50 border border-neutral-100 rounded-xl py-1.5 px-3 max-w-max mx-auto">
              <span className="h-2 w-2 rounded-full bg-slate-900 animate-pulse" />
              Your score ({userScore}%) lies in the <strong className="text-neutral-900 font-extrabold">{userRange}</strong> range.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ClassStats
