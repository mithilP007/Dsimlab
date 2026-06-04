import { useState, useEffect } from "react"
import { useLeaderboardStore } from "@/stores/leaderboardStore"
import { StudentRankCard } from "./StudentRankCard"
import { ClassStats } from "./ClassStats"
import { AchievementWall } from "./AchievementWall"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy, Search, ChevronLeft, ChevronRight, RefreshCw, Crown, Award, Star, Flame, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export function LeaderboardPage() {
  const {
    students,
    className,
    instructorName,
    currentRound,
    totalRounds,
    currentUserId,
    topPerformers,
    refreshLeaderboard,
  } = useLeaderboardStore()

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [sortField, setSortField] = useState<"rank" | "name" | "overallScore" | "trend">("rank")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Refresh animation state
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [timeAgoText, setTimeAgoText] = useState("Just now")
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Update time-ago text every 1 minute
  useEffect(() => {
    const timer = setInterval(() => {
      const diffMs = new Date().getTime() - lastUpdated.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins === 0) {
        setTimeAgoText("Just now")
      } else if (diffMins === 1) {
        setTimeAgoText("1 min ago")
      } else {
        setTimeAgoText(`${diffMins} mins ago`)
      }
    }, 30000)

    return () => clearInterval(timer)
  }, [lastUpdated])

  const handleRefresh = () => {
    setIsRefreshing(true)
    refreshLeaderboard()
    setTimeout(() => {
      setIsRefreshing(false)
      setLastUpdated(new Date())
      setTimeAgoText("Just now")
    }, 600)
  }

  // Reset page number on filter changes to prevent out of bounds
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, activeTab, sortField, sortDirection])

  // ─── Filter & Search Logic ──────────────────────────────────────────────────
  const searchedStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  let filteredStudents = [...searchedStudents]
  if (activeTab === "top10") {
    filteredStudents = filteredStudents.filter((s) => s.rank <= 10)
  } else if (activeTab === "rising") {
    filteredStudents = filteredStudents.filter((s) => s.trend === "up")
  } else if (activeTab === "needs_help") {
    filteredStudents = filteredStudents.filter((s) => s.overallScore < 60)
  }

  // ─── Sorting Logic ─────────────────────────────────────────────────────────
  filteredStudents.sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]

    if (sortField === "name") {
      return sortDirection === "asc"
        ? aVal.toString().localeCompare(bVal.toString())
        : bVal.toString().localeCompare(aVal.toString())
    }

    if (sortField === "trend") {
      const weights = { up: 3, stable: 2, down: 1 }
      const aWeight = weights[a.trend]
      const bWeight = weights[b.trend]
      return sortDirection === "asc" ? aWeight - bWeight : bWeight - aWeight
    }

    const aNum = Number(aVal)
    const bNum = Number(bVal)
    if (sortField === "rank") {
      // Rank sorting: Rank 1 is top, Rank 25 is lowest, so ascending sorting
      return sortDirection === "asc" ? aNum - bNum : bNum - aNum
    }

    // Default numeric sort (overallScore) descending by default
    return sortDirection === "asc" ? aNum - bNum : bNum - aNum
  })

  // ─── Pagination Logic ──────────────────────────────────────────────────────
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentPageStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage)

  // Current user pinning logic: if current user is present in filtered list but not on the current page slice, pin them
  const currentUserObj = students.find((s) => s.id === currentUserId)
  const isCurrentUserInFiltered = filteredStudents.some((s) => s.id === currentUserId)
  const isCurrentUserInSlice = currentPageStudents.some((s) => s.id === currentUserId)
  const shouldPinCurrentUser = isCurrentUserInFiltered && !isCurrentUserInSlice && currentUserObj

  // Formatter for top performer statistics
  const formatPerformerValue = (category: string, value: number) => {
    switch (category) {
      case "SEO Master":
        return `${value}/100 SEO`
      case "Ads Wizard":
        return `${value} Combined Ads`
      case "Budget Genius":
        return `${value}% ROI`
      case "Rising Star":
        return `+${value} Ranks`
      default:
        return `${value}`
    }
  };

  // Get performer icon matching category
  const getPerformerIcon = (category: string) => {
    switch (category) {
      case "SEO Master":
        return Sparkles
      case "Ads Wizard":
        return Flame
      case "Budget Genius":
        return Star
      case "Rising Star":
      default:
        return Award
    }
  };

  const getAvatarBg = (initials: string) => {
    if (initials === "U") return "bg-slate-900 text-white font-black"
    const hash = initials.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const colors = [
      "bg-violet-100 text-violet-750",
      "bg-sky-100 text-sky-750",
      "bg-emerald-100 text-emerald-750",
      "bg-amber-100 text-amber-750",
      "bg-rose-100 text-rose-750",
      "bg-indigo-100 text-indigo-750",
    ]
    return colors[hash % colors.length]
  }

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* ─── Header Section ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border border-neutral-200 bg-neutral-950 text-white shadow-md relative overflow-hidden">
        {/* Subtle grid background accent */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-neutral-800/35 via-transparent to-transparent pointer-events-none" />

        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <Badge className="bg-neutral-800 text-neutral-300 border-neutral-700 font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full">
              Round standing
            </Badge>
            <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-450">
              <span className={cn("h-1.5 w-1.5 rounded-full bg-emerald-500", isRefreshing && "animate-ping")} />
              Last updated: {timeAgoText}
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Class Leaderboard</h1>
          <p className="text-xs text-neutral-400 font-medium max-w-lg">
            {className} • Directed by <strong className="text-white font-semibold">{instructorName}</strong>
          </p>
        </div>

        {/* Right side Info: Round status and Rank card */}
        <div className="flex items-center gap-4 shrink-0 relative z-10">
          {/* Round Indicator */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-2.5 text-center shrink-0">
            <span className="text-[9px] text-neutral-450 uppercase font-black tracking-wider block">Round</span>
            <span className="text-lg font-black text-white leading-none">
              {currentRound} <span className="text-neutral-550 text-xs font-bold">/ {totalRounds}</span>
            </span>
          </div>

          {/* Current User Rank Badge */}
          {currentUserObj && (
            <div className="bg-gradient-to-br from-violet-650 to-indigo-650 rounded-2xl px-4 py-2.5 text-center text-white shrink-0 shadow-lg shadow-indigo-650/15">
              <span className="text-[9px] text-indigo-100 uppercase font-black tracking-wider block">Your Rank</span>
              <span className="text-lg font-black leading-none">
                #{currentUserObj.rank} <span className="text-indigo-200 text-xs font-medium">of {students.length}</span>
              </span>
            </div>
          )}

          {/* Interactive Refresh Button */}
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-2xl bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* ─── 3-Column Dashboard Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Left Column (60% width) - Leaderboard list */}
        <div className="lg:col-span-3 space-y-5">
          {/* Search, Sort and Filter Card */}
          <Card className="border-neutral-200 bg-white shadow-2xs rounded-2xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search Bar */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                <Input
                  type="text"
                  placeholder="Find student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs border-neutral-250 bg-white"
                />
              </div>

              {/* Sorting triggers */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                <span className="text-xs font-bold text-neutral-450 whitespace-nowrap">Sort by:</span>
                <Select
                  value={sortField}
                  onValueChange={(val: "rank" | "name" | "overallScore" | "trend") => {
                    setSortField(val)
                    // Toggle default directions based on field
                    if (val === "rank") {
                      setSortDirection("asc")
                    } else {
                      setSortDirection("desc")
                    }
                  }}
                >
                  <SelectTrigger className="w-[120px] h-9 text-xs border-neutral-250 bg-white font-bold text-neutral-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-neutral-200 text-neutral-800">
                    <SelectItem value="rank" className="font-bold text-xs">Rank</SelectItem>
                    <SelectItem value="name" className="font-bold text-xs">Name</SelectItem>
                    <SelectItem value="overallScore" className="font-bold text-xs">Score</SelectItem>
                    <SelectItem value="trend" className="font-bold text-xs">Trend</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort Direction Toggle */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 border-neutral-250 bg-white"
                  onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                >
                  <Trophy className={cn("h-3.5 w-3.5 text-neutral-600 transition-transform duration-200", sortDirection === "desc" && "rotate-180")} />
                </Button>
              </div>
            </div>

            {/* Filter Tabs */}
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 w-full bg-neutral-100 p-1 rounded-xl h-10 border border-neutral-200">
                <TabsTrigger value="all" className="rounded-lg text-xs font-bold tracking-wide">
                  All
                </TabsTrigger>
                <TabsTrigger value="top10" className="rounded-lg text-xs font-bold tracking-wide">
                  Top 10
                </TabsTrigger>
                <TabsTrigger value="rising" className="rounded-lg text-xs font-bold tracking-wide">
                  Rising
                </TabsTrigger>
                <TabsTrigger value="needs_help" className="rounded-lg text-xs font-bold tracking-wide">
                  Needs Help
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </Card>

          {/* Student list grid */}
          <div className="space-y-3.5">
            {currentPageStudents.length > 0 ? (
              currentPageStudents.map((student) => (
                <StudentRankCard
                  key={student.id}
                  student={student}
                  isCurrentUser={student.id === currentUserId}
                />
              ))
            ) : (
              <Card className="border-neutral-200 bg-white p-8 text-center text-neutral-450 font-bold text-xs rounded-2xl shadow-3xs">
                No students match your active filters or search terms.
              </Card>
            )}

            {/* Current user sticky pinned row if not in the current page slice */}
            {shouldPinCurrentUser && currentUserObj && (
              <div className="space-y-3.5 mt-4">
                <div className="relative flex items-center justify-center my-4">
                  <Separator className="bg-dashed border-t border-neutral-200 absolute w-full" />
                  <span className="relative z-10 px-3 bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                    Your standing (Pinned)
                  </span>
                </div>
                <StudentRankCard student={currentUserObj} isCurrentUser={true} />
              </div>
            )}
          </div>

          {/* ─── Pagination Controls ─── */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-neutral-200">
              <span className="text-xs font-bold text-neutral-450">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-neutral-250 bg-white text-neutral-600"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-8 w-8 text-xs font-black shadow-3xs",
                      currentPage === page
                        ? "bg-slate-900 hover:bg-slate-950 text-white"
                        : "border-neutral-250 bg-white text-neutral-650"
                    )}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-neutral-250 bg-white text-neutral-600"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (40% width) - Cohort stats & feed */}
        <div className="lg:col-span-2 space-y-6">
          <ClassStats />
          <AchievementWall />
        </div>
      </div>

      {/* ─── Top Performers Section (Full Width, Below Grid) ─── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500 fill-amber-500/10" />
          <h2 className="text-base font-black text-neutral-900">Cohort Superlatives</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {topPerformers.map((performer) => {
            const Icon = getPerformerIcon(performer.category)
            const isCurrentUser = performer.studentId === currentUserId

            return (
              <Card
                key={performer.category}
                className={cn(
                  "border-neutral-200 bg-white shadow-2xs rounded-2xl overflow-hidden transition-all duration-300 relative group hover:shadow-md hover:-translate-y-0.5",
                  isCurrentUser && "border-indigo-200 bg-indigo-50/10"
                )}
              >
                {/* Crown watermark in card background */}
                <Crown className="h-20 w-20 text-neutral-50/80 dark:text-neutral-950/10 absolute -right-3 -bottom-3 rotate-12 pointer-events-none group-hover:rotate-6 transition-all duration-500" />

                <CardContent className="p-4 flex items-center gap-3.5 relative z-10">
                  {/* Left: Avatar with initials */}
                  <div
                    className={cn(
                      "h-11 w-11 rounded-full flex items-center justify-center font-black text-sm shrink-0 border border-neutral-100 shadow-2xs",
                      getAvatarBg(performer.avatar)
                    )}
                  >
                    {performer.avatar}
                  </div>

                  {/* Details */}
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] font-black text-neutral-450 uppercase tracking-widest block">
                      {performer.category}
                    </span>
                    <span className="text-sm font-black text-neutral-900 block truncate">
                      {performer.studentName}
                      {isCurrentUser && (
                        <span className="ml-1 text-[8px] bg-slate-900 text-white font-black px-1 py-0 rounded">
                          You
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-bold text-neutral-600 block">
                      {formatPerformerValue(performer.category, performer.value)}
                    </span>
                  </div>

                  {/* Right Accent Performer Badge */}
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ml-auto shadow-3xs",
                    performer.category === "SEO Master" && "bg-violet-50 text-violet-600",
                    performer.category === "Ads Wizard" && "bg-orange-50 text-orange-600",
                    performer.category === "Budget Genius" && "bg-amber-50 text-amber-600",
                    performer.category === "Rising Star" && "bg-emerald-50 text-emerald-600"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default LeaderboardPage
