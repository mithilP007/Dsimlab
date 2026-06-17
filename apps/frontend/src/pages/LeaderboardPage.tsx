import { useState, useEffect } from "react"
import { useLeaderboardStore } from "@/stores/leaderboardStore"
import { useAuthStore } from "@/stores/authStore"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Trophy, Search, ArrowUp, ArrowDown, Minus, 
  Award, Users, Globe, RefreshCw, Sparkles, Activity
} from "lucide-react"

export function LeaderboardPage() {
  const { user } = useAuthStore()
  const {
    className,
    instructorName,
    classRank,
    globalRank,
    students,
    classStats,
    topPerformers,
    recentAchievements,
    isLoading,
    fetchLeaderboard,
    sortBy,
    filterByName
  } = useLeaderboardStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<"rank" | "name" | "overallScore" | "trend">("rank")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    filterByName(query)
  }

  const handleSort = (field: "rank" | "name" | "overallScore" | "trend") => {
    const direction = sortField === field && sortDirection === "asc" ? "desc" : "asc"
    setSortField(field)
    setSortDirection(direction)
    sortBy(field, direction)
  }

  const getRankTrendIcon = (trend: "up" | "down" | "stable", movement: number) => {
    switch (trend) {
      case "up":
        return (
          <span className="flex items-center text-emerald-600 font-bold text-xs gap-0.5 animate-bounce">
            <ArrowUp className="h-3 w-3 stroke-[3px]" />
            {movement > 0 ? movement : ""}
          </span>
        )
      case "down":
        return (
          <span className="flex items-center text-rose-500 font-bold text-xs gap-0.5">
            <ArrowDown className="h-3 w-3 stroke-[3px]" />
            {movement > 0 ? movement : ""}
          </span>
        )
      default:
        return (
          <span className="flex items-center text-neutral-400 font-bold text-xs">
            <Minus className="h-3 w-3" />
          </span>
        )
    }
  }

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case "Platinum":
        return "bg-slate-100 text-slate-800 border-slate-300 font-extrabold shadow-sm"
      case "Gold":
        return "bg-amber-100 text-amber-800 border-amber-300 font-extrabold shadow-sm"
      case "Silver":
        return "bg-zinc-100 text-zinc-700 border-zinc-300 font-bold shadow-sm"
      case "Bronze":
        return "bg-orange-100 text-orange-850 border-orange-250 font-bold shadow-sm"
      default:
        return "bg-neutral-50 text-neutral-450 border-neutral-200"
    }
  }

  // Segment podium vs general table
  const podiumStudents = students.slice(0, 3)

  // Map top performers
  const top1 = podiumStudents[0]
  const top2 = podiumStudents[1]
  const top3 = podiumStudents[2]

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-950 p-6 md:p-8 text-white shadow-lg text-left">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-indigo-500/15 blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-indigo-300">Cohort Standings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Leaderboard: {className}</h1>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-xl font-medium">
              Instructor: <span className="font-bold text-white">{instructorName}</span> • View your rank relative to peers in real time.
            </p>
          </div>
          <Button 
            onClick={() => fetchLeaderboard()} 
            disabled={isLoading}
            variant="outline" 
            className="border-neutral-700 bg-neutral-900/50 hover:bg-neutral-800 text-white font-bold h-10 px-4 self-start sm:self-auto rounded-xl shrink-0"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Ranks
          </Button>
        </div>
      </div>

      {/* Ranks Snapshot Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Class Rank Card */}
        <Card className="border-neutral-200/80 shadow-md bg-white p-6 text-left flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Class Cohort Rank</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-neutral-900">#{classRank || "--"}</span>
              <span className="text-xs font-semibold text-neutral-500">of {students.length}</span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600">
            <Users className="h-6 w-6" />
          </div>
        </Card>

        {/* Global Rank Card */}
        <Card className="border-neutral-200/80 shadow-md bg-white p-6 text-left flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Global Standings Rank</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-indigo-600">#{globalRank || "--"}</span>
              <span className="text-xs font-semibold text-neutral-500">overall</span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600">
            <Globe className="h-6 w-6" />
          </div>
        </Card>

        {/* Class Average Score */}
        <Card className="border-neutral-200/80 shadow-md bg-white p-6 text-left flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Class Average Score</span>
            <span className="text-3xl font-black text-neutral-900 block">{classStats.averageScore || "--"}%</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600">
            <Activity className="h-6 w-6" />
          </div>
        </Card>

        {/* Top Score */}
        <Card className="border-neutral-200/80 shadow-md bg-white p-6 text-left flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Highest Cohort Score</span>
            <span className="text-3xl font-black text-amber-600 block">{classStats.highestScore || "--"}%</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600">
            <Trophy className="h-6 w-6" />
          </div>
        </Card>

      </div>

      {/* Podium Showcase Section */}
      {students.length > 0 && (
        <div className="flex flex-col items-center justify-center py-6 px-4 bg-gradient-to-b from-neutral-50 to-white border border-neutral-200/80 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full mb-8 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Top Performer Podium
          </span>
          
          <div className="flex flex-col sm:flex-row items-end justify-center gap-6 sm:gap-12 w-full max-w-2xl mt-4">
            
            {/* 2nd Place */}
            {top2 && (
              <div className="flex flex-col items-center order-2 sm:order-1">
                <div className="relative group">
                  <div className="h-16 w-16 rounded-full border-2 border-zinc-300 bg-neutral-100 flex items-center justify-center font-black text-neutral-800 text-lg shadow-md">
                    {top2.avatar}
                  </div>
                  <span className="absolute -top-3 -right-2 h-7 w-7 rounded-full bg-zinc-300 text-neutral-800 border-2 border-white flex items-center justify-center text-[10px] font-black shadow">2</span>
                </div>
                <span className="text-sm font-black text-neutral-800 mt-3">{top2.name}</span>
                <span className="text-xs font-bold text-neutral-500 mt-0.5">{top2.overallScore}%</span>
                <div className="h-16 w-28 bg-neutral-100 border-t-2 border-zinc-300 rounded-t-lg mt-3 flex items-center justify-center text-xs font-black text-neutral-400">
                  Silver
                </div>
              </div>
            )}

            {/* 1st Place */}
            {top1 && (
              <div className="flex flex-col items-center order-1 sm:order-2">
                <div className="relative group scale-110">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-400 drop-shadow-md">
                    <Trophy className="h-6 w-6 fill-amber-400 animate-bounce" />
                  </div>
                  <div className="h-20 w-20 rounded-full border-4 border-amber-400 bg-amber-50 flex items-center justify-center font-black text-amber-900 text-2xl shadow-lg">
                    {top1.avatar}
                  </div>
                  <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-amber-400 text-white border-2 border-white flex items-center justify-center text-[10px] font-black shadow">1</span>
                </div>
                <span className="text-base font-black text-neutral-900 mt-4">{top1.name}</span>
                <span className="text-xs font-black text-indigo-600 mt-0.5">{top1.overallScore}%</span>
                <div className="h-24 w-32 bg-amber-500/10 border-t-4 border-amber-400 rounded-t-xl mt-3 flex items-center justify-center text-xs font-black text-amber-700 shadow-[0_-4px_16px_rgba(245,158,11,0.05)]">
                  Gold Champion
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3 && (
              <div className="flex flex-col items-center order-3">
                <div className="relative group">
                  <div className="h-16 w-16 rounded-full border-2 border-orange-300 bg-neutral-100 flex items-center justify-center font-black text-neutral-800 text-lg shadow-md">
                    {top3.avatar}
                  </div>
                  <span className="absolute -top-3 -right-2 h-7 w-7 rounded-full bg-orange-300 text-orange-900 border-2 border-white flex items-center justify-center text-[10px] font-black shadow">3</span>
                </div>
                <span className="text-sm font-black text-neutral-800 mt-3">{top3.name}</span>
                <span className="text-xs font-bold text-neutral-500 mt-0.5">{top3.overallScore}%</span>
                <div className="h-12 w-28 bg-neutral-100 border-t-2 border-orange-300 rounded-t-lg mt-3 flex items-center justify-center text-xs font-black text-neutral-400">
                  Bronze
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Main Content: Standings Table + Sidebar Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Class Standings List (Left 2 Columns) */}
        <Card className="lg:col-span-2 border-neutral-200/80 shadow-md bg-white overflow-hidden text-left">
          <CardHeader className="border-b border-neutral-100 bg-white py-5">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg font-black text-neutral-900">Class Standings</CardTitle>
                <CardDescription className="text-xs font-medium">Rankings calculated based on cumulative simulation score index.</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search classmate..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="pl-10 text-xs h-9 rounded-xl border-neutral-200 w-full font-semibold"
                />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50/50 border-b border-neutral-100 text-neutral-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="py-3 px-4 text-center cursor-pointer select-none hover:text-neutral-700" onClick={() => handleSort("rank")}>
                      Rank {sortField === "rank" && (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="py-3 px-4 text-left cursor-pointer select-none hover:text-neutral-700" onClick={() => handleSort("name")}>
                      Student Name {sortField === "name" && (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="py-3 px-4 text-center cursor-pointer select-none hover:text-neutral-700" onClick={() => handleSort("overallScore")}>
                      Overall Score {sortField === "overallScore" && (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="py-3 px-4 text-center">SEO</th>
                    <th className="py-3 px-4 text-center">Ads</th>
                    <th className="py-3 px-4 text-center">ROI</th>
                    <th className="py-3 px-4 text-center">Badge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {students.map((student) => {
                    const isSelf = student.studentId === user?.id
                    return (
                      <tr 
                        key={student.id} 
                        className={`hover:bg-neutral-50/50 transition-colors ${isSelf ? "bg-indigo-50/30 font-semibold" : ""}`}
                      >
                        {/* Rank */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <span className="font-black text-neutral-900 text-sm">#{student.rank}</span>
                            {getRankTrendIcon(student.trend, student.movement)}
                          </div>
                        </td>

                        {/* Student Name */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSelf ? "bg-indigo-600 text-white font-black" : "bg-neutral-100 text-neutral-600"
                            }`}>
                              {student.avatar}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-neutral-800">{student.name}</span>
                              <span className="text-[10px] text-neutral-450 font-medium">
                                {student.roundsCompleted} rounds completed
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Overall Score */}
                        <td className="py-4 px-4 text-center font-black text-neutral-900">
                          {student.overallScore}%
                        </td>

                        {/* SEO */}
                        <td className="py-4 px-4 text-center font-semibold text-neutral-600 text-xs">
                          {student.seoScore}%
                        </td>

                        {/* Ads */}
                        <td className="py-4 px-4 text-center font-semibold text-neutral-600 text-xs">
                          {Math.round((student.googleAdsScore + student.metaAdsScore) / 2)}%
                        </td>

                        {/* ROI */}
                        <td className="py-4 px-4 text-center font-semibold text-neutral-600 text-xs">
                          {student.roiScore}%
                        </td>

                        {/* Badge */}
                        <td className="py-4 px-4 text-center">
                          {student.performanceBadge !== "None" ? (
                            <Badge variant="outline" className={getBadgeColor(student.performanceBadge)}>
                              {student.performanceBadge}
                            </Badge>
                          ) : (
                            <span className="text-neutral-300 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-400 font-bold text-xs">
                        No students found matching search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Classroom Achievements (Right Column) */}
        <div className="space-y-6">
          
          {/* Top Performers Categories */}
          <Card className="border-neutral-200/80 shadow-md bg-white text-left p-6">
            <h3 className="text-sm font-black text-neutral-900 border-b border-neutral-100 pb-3 flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-500" />
              Category Leaders
            </h3>
            
            <div className="divide-y divide-neutral-100 mt-2">
              {topPerformers.map((tp, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs font-semibold">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-black uppercase block tracking-wider">{tp.category}</span>
                    <span className="text-neutral-800 font-bold mt-0.5 block">{tp.studentName}</span>
                  </div>
                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 font-black py-0.5 px-2">
                    {tp.value} {tp.category === "Budget Genius" ? "%" : tp.category === "Rising Star" ? "Ranks" : "%"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Classroom Activity Logs (Real Achievements feed) */}
          <Card className="border-neutral-200/80 shadow-md bg-white text-left p-6">
            <h3 className="text-sm font-black text-neutral-900 border-b border-neutral-100 pb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Recent Achievements
            </h3>
            
            <div className="space-y-4 mt-4 overflow-y-auto max-h-[350px] pr-1">
              {recentAchievements.map((ach, idx) => {
                let colorClass = "bg-neutral-100 text-neutral-600"
                if (ach.type === "perfect") colorClass = "bg-emerald-50 text-emerald-700 border border-emerald-100"
                if (ach.type === "streak") colorClass = "bg-indigo-50 text-indigo-700 border border-indigo-100"
                if (ach.type === "comeback") colorClass = "bg-amber-50 text-amber-700 border border-amber-100"
                if (ach.type === "first") colorClass = "bg-rose-50 text-rose-700 border border-rose-100"
                
                return (
                  <div key={idx} className="flex gap-3 items-start text-xs text-neutral-600 leading-snug">
                    <div className="h-7 w-7 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-[10px] shrink-0 text-neutral-700">
                      {ach.avatar}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex justify-between items-baseline gap-1.5">
                        <span className="font-bold text-neutral-900">{ach.studentName}</span>
                        <span className="text-[9px] text-neutral-400 font-medium shrink-0">{ach.timeAgo}</span>
                      </div>
                      <Badge className={`py-0 px-1.5 text-[9px] font-black uppercase ${colorClass}`}>
                        {ach.achievement}
                      </Badge>
                      <p className="text-[11px] text-neutral-500 font-semibold">{ach.description}</p>
                    </div>
                  </div>
                )
              })}

              {recentAchievements.length === 0 && (
                <div className="text-center text-neutral-400 py-6 font-semibold">
                  No cohort achievements unlocked yet.
                </div>
              )}
            </div>
          </Card>

        </div>

      </div>

    </div>
  )
}
export default LeaderboardPage;
