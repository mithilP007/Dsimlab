import { useState } from "react"
import { useInstructorStore } from "@/stores/instructorStore"
import { KpiCard } from "@/components/simulation/KpiCard"
import { RadarChart } from "@/components/charts/RadarChart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  GraduationCap,
  Calendar,
  Trophy,
  TrendingUp,
  BarChart3,
  MessageSquare,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  School,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

type SortField = "rank" | "name" | "seoScore" | "adsScore" | "totalScore"
type SortOrder = "asc" | "desc"

export function CollegeStudentDashboard() {
  const { classInfo, leaderboard, studentPerformance, feedbackCount } = useInstructorStore()

  // Sorting state for leaderboard table
  const [sortField, setSortField] = useState<SortField>("rank")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-neutral-400 shrink-0" />
    }
    return sortOrder === "asc" ? (
      <ChevronUp className="ml-1 h-3.5 w-3.5 text-neutral-900 shrink-0" />
    ) : (
      <ChevronDown className="ml-1 h-3.5 w-3.5 text-neutral-900 shrink-0" />
    )
  }

  // Sort leaderboard dataset
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    const valA = a[sortField]
    const valB = b[sortField]

    if (typeof valA === "string" && typeof valB === "string") {
      return sortOrder === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA)
    }

    return sortOrder === "asc"
      ? (valA as number) - (valB as number)
      : (valB as number) - (valA as number)
  })

  // Mock score statistics derived from performance data
  const overallAvg = Math.round(
    studentPerformance.reduce((acc, curr) => acc + curr.average, 0) / studentPerformance.length
  )
  const studentAvg = Math.round(
    studentPerformance.reduce((acc, curr) => acc + curr.student, 0) / studentPerformance.length
  )
  const diffPct = studentAvg - overallAvg
  const diffSign = diffPct >= 0 ? "+" : ""

  return (
    <div className="space-y-6 text-left">
      {/* TOP BANNER */}
      <Card className="border-neutral-200/90 shadow-sm overflow-hidden bg-white">
        <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-sm">
                <School className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">
                  {classInfo?.className ?? "Loading class info…"}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-neutral-500 font-semibold uppercase tracking-wider">
                    <GraduationCap className="h-3.5 w-3.5 text-neutral-400" />
                    Instructor: {classInfo?.instructorName ?? "—"}
                  </span>
                  <Badge variant="outline" className="text-[10px] py-0 px-2 font-bold text-neutral-500 border-neutral-250">
                    College Student Console
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 p-2.5 px-4 rounded-xl bg-red-50/70 border border-red-100 text-red-700 text-xs font-bold shadow-sm">
              <Calendar className="h-4 w-4 text-red-500 shrink-0" />
              <span>{classInfo?.daysRemaining ?? "—"} days remaining</span>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Class Rank"
          value="3rd"
          trend="Top 15%"
          description="out of 24 students"
          icon={Trophy}
        />
        <KpiCard
          title="Performance vs Avg"
          value={`${diffSign}${diffPct}%`}
          trend={`${diffSign}${diffPct}% above class`}
          description="mean simulation score"
          icon={TrendingUp}
        />
        <KpiCard
          title="Simulation Progress"
          value="65%"
          trend="Active Round"
          description="19 of 30 steps done"
          icon={BarChart3}
        />
        <KpiCard
          title="Feedback Count"
          value={feedbackCount}
          trend={`${feedbackCount} messages`}
          description="from Dr. Rachel Green"
          icon={MessageSquare}
        />
      </div>

      {/* MAIN CONTENT */}
      <Tabs defaultValue="my-performance" className="space-y-6">
        <TabsList className="bg-neutral-100/80 p-1 border border-neutral-200/50 rounded-lg">
          <TabsTrigger value="my-performance" className="font-bold py-1.5 px-4 text-xs">
            My Performance
          </TabsTrigger>
          <TabsTrigger value="class-leaderboard" className="font-bold py-1.5 px-4 text-xs">
            Class Leaderboard
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: MY PERFORMANCE */}
        <TabsContent value="my-performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Radar Chart Container */}
            <Card className="border-neutral-200 shadow-sm lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-neutral-600" />
                  <span>Skill Competency Analytics</span>
                </CardTitle>
                <CardDescription>
                  Comparison of your metrics against the class average.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center p-4">
                <RadarChart data={studentPerformance} />
              </CardContent>
            </Card>

            {/* Score List Container */}
            <Card className="border-neutral-200 shadow-sm lg:col-span-2 flex flex-col justify-between">
              <div>
                <CardHeader>
                  <CardTitle className="text-base font-bold text-neutral-900">Scorecard Breakdown</CardTitle>
                  <CardDescription>
                    Multi-dimensional view of your target competencies.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {studentPerformance.map((item) => (
                    <div key={item.subject} className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-neutral-700">{item.subject}</span>
                        <span className="text-neutral-950">
                          You: <span className="text-sm font-black">{item.student}</span> / Avg: {item.average}
                        </span>
                      </div>
                      <div className="relative w-full h-3">
                        {/* SVG rendered progress bar to completely avoid standard style={{}} attributes */}
                        <svg className="w-full h-full rounded-full bg-slate-100 overflow-hidden">
                          {/* Student score fill */}
                          <rect
                            x="0"
                            y="0"
                            width={`${item.student}%`}
                            height="100%"
                            fill="#0f172a"
                            rx="6"
                          />
                          {/* Class average marker indicator */}
                          <rect
                            x={`${item.average}%`}
                            y="0"
                            width="3"
                            height="100%"
                            fill="#94a3b8"
                          />
                        </svg>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </div>
              <div className="p-6 border-t border-neutral-100 bg-neutral-50/40 rounded-b-xl">
                <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
                  * Vertical lines represent the class average. Tweak your marketing bids and SEO keywords to improve dimensions lagging behind class standings.
                </p>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: CLASS LEADERBOARD */}
        <TabsContent value="class-leaderboard">
          <Card className="border-neutral-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-neutral-900">Classroom Rankings</CardTitle>
              <CardDescription>
                Standings updated dynamically at the end of each simulation step round.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {/* DESKTOP TABLE VIEW */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-neutral-200">
                      <TableHead
                        className="cursor-pointer select-none font-bold text-neutral-600 hover:text-neutral-950 py-3"
                        onClick={() => handleSort("rank")}
                      >
                        <div className="flex items-center">
                          Rank {renderSortIcon("rank")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none font-bold text-neutral-600 hover:text-neutral-950 py-3"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center">
                          Student Name {renderSortIcon("name")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none font-bold text-neutral-600 hover:text-neutral-950 text-right py-3"
                        onClick={() => handleSort("seoScore")}
                      >
                        <div className="flex items-center justify-end">
                          SEO Score {renderSortIcon("seoScore")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none font-bold text-neutral-600 hover:text-neutral-950 text-right py-3"
                        onClick={() => handleSort("adsScore")}
                      >
                        <div className="flex items-center justify-end">
                          Ads Score {renderSortIcon("adsScore")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none font-bold text-neutral-600 hover:text-neutral-950 text-right py-3"
                        onClick={() => handleSort("totalScore")}
                      >
                        <div className="flex items-center justify-end">
                          Total Score {renderSortIcon("totalScore")}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedLeaderboard.map((student) => (
                      <TableRow
                        key={student.name}
                        className={cn(
                          "border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors",
                          student.isCurrentUser && "bg-slate-50/80 border-l-2 border-l-slate-900 font-bold hover:bg-slate-100/80"
                        )}
                      >
                        <TableCell className="font-semibold">{student.rank}</TableCell>
                        <TableCell className="flex items-center gap-2 py-3.5">
                          <span>{student.name}</span>
                          {student.isCurrentUser && (
                            <Badge className="text-[9px] bg-slate-900 text-white font-bold py-0.5 px-2">
                              You
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">{student.seoScore}</TableCell>
                        <TableCell className="text-right font-medium">{student.adsScore}</TableCell>
                        <TableCell className="text-right font-black text-slate-900">
                          {student.totalScore}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* MOBILE CARD LIST VIEW */}
              <div className="block md:hidden p-4 space-y-3 bg-neutral-50/30 rounded-b-xl border-t border-neutral-100">
                {sortedLeaderboard.map((student) => (
                  <Card
                    key={student.name}
                    className={cn(
                      "border shadow-none",
                      student.isCurrentUser
                        ? "border-slate-950 bg-slate-50/60 border-l-4 border-l-slate-900"
                        : "border-neutral-200 bg-white"
                    )}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-bold text-[10px]",
                              student.rank === 1 && "bg-amber-100 text-amber-800 border-amber-200",
                              student.rank === 2 && "bg-slate-100 text-slate-800 border-slate-200",
                              student.rank === 3 && "bg-amber-700/10 text-amber-900 border-amber-900/20",
                              student.rank > 3 && "bg-neutral-100 text-neutral-850 border-neutral-200"
                            )}
                          >
                            Rank #{student.rank}
                          </Badge>
                          <span className={cn("text-xs font-bold text-neutral-800", student.isCurrentUser && "text-slate-950")}>
                            {student.name}
                          </span>
                        </div>
                        {student.isCurrentUser && (
                          <Badge className="text-[9px] bg-slate-950 text-white font-bold py-0.5 px-2">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 bg-neutral-50/70 rounded-lg border border-neutral-100/50">
                          <span className="text-[9px] font-bold text-neutral-400 block uppercase tracking-wide">SEO</span>
                          <span className="font-bold text-neutral-800">{student.seoScore}</span>
                        </div>
                        <div className="p-2 bg-neutral-50/70 rounded-lg border border-neutral-100/50">
                          <span className="text-[9px] font-bold text-neutral-400 block uppercase tracking-wide">Ads</span>
                          <span className="font-bold text-neutral-800">{student.adsScore}</span>
                        </div>
                        <div className="p-2 bg-neutral-50/70 rounded-lg border border-neutral-100/50">
                          <span className="text-[9px] font-bold text-neutral-400 block uppercase tracking-wide">Total</span>
                          <span className="font-black text-neutral-950">{student.totalScore}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CollegeStudentDashboard
