import { useState, useEffect } from "react"
import { useInstructorPortalStore } from "@/stores/instructorPortalStore"
import { StudentProgressTracker } from "./StudentProgressTracker"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from "recharts"
import { ChevronLeft, Users, Award, Trash2, Clock, Search, Settings, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function ClassManager() {
  const {
    classes,
    students,
    selectedClassId,
    selectClass,
    removeStudent,
    archiveClass,
    updateClassDetails,
  } = useInstructorPortalStore()

  // Selected Class details
  const targetClass = classes.find((c) => c.id === selectedClassId)

  // Track selected student for progress tracker drilldown
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  // Tab control state
  const [activeTab, setActiveTab] = useState("overview")

  // Search inside roster
  const [rosterSearch, setRosterSearch] = useState("")

  // Edit Settings state
  const [editName, setEditName] = useState("")
  const [editDeadline, setEditDeadline] = useState("")
  const [editMaxStudents, setEditMaxStudents] = useState(25)

  // Sync edit fields when class changes
  useEffect(() => {
    if (targetClass) {
      setEditName(targetClass.name)
      setEditDeadline(targetClass.deadline)
      setEditMaxStudents(targetClass.maxStudents)
    }
  }, [selectedClassId, targetClass])

  if (!targetClass) {
    return (
      <Card className="border-neutral-200 bg-white p-8 text-center text-neutral-450 font-bold text-xs rounded-2xl">
        Class not found.
      </Card>
    )
  }

  // Enrolled students roster
  const classStudents = students.filter((s) => s.classId === targetClass.id)
  const filteredStudents = classStudents.filter((s) =>
    s.name.toLowerCase().includes(rosterSearch.toLowerCase())
  )

  // Calculations for Overview Tab
  const classAvg = classStudents.length
    ? parseFloat(
        (classStudents.reduce((sum, s) => sum + s.overallScore, 0) / classStudents.length).toFixed(1)
      )
    : 0

  // 1. Progress Chart Data (historical round progression averages)
  const roundProgressData = [
    { name: "Round 1", Average: Math.max(0, Math.round(classAvg - 12)) },
    { name: "Round 2", Average: Math.max(0, Math.round(classAvg - 7)) },
    { name: "Round 3", Average: Math.max(0, Math.round(classAvg - 3)) },
    { name: "Round 4", Average: Math.round(classAvg) },
  ]

  // 2. Score Distribution ranges count
  const distributionData = [
    { range: "< 60", count: classStudents.filter((s) => s.overallScore < 60).length },
    { range: "61-70", count: classStudents.filter((s) => s.overallScore >= 61 && s.overallScore <= 70).length },
    { range: "71-80", count: classStudents.filter((s) => s.overallScore >= 71 && s.overallScore <= 80).length },
    { range: "81-90", count: classStudents.filter((s) => s.overallScore >= 81 && s.overallScore <= 90).length },
    { range: "91-100", count: classStudents.filter((s) => s.overallScore >= 91 && s.overallScore <= 100).length },
  ]

  // 3. Deadline Countdown
  const getDaysRemaining = () => {
    const diffMs = new Date(targetClass.deadline).getTime() - new Date().getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }
  const daysRemaining = getDaysRemaining()

  // Action handlers
  const handleRemoveStudent = (studentId: string, studentName: string) => {
    if (confirm(`Are you sure you want to remove ${studentName} from this class?`)) {
      removeStudent(targetClass.id, studentId)
      toast.success(`Removed student ${studentName} from class.`)
    }
  }

  const handleArchiveClass = () => {
    if (confirm(`Are you sure you want to archive ${targetClass.name}? This will mark it as Completed.`)) {
      archiveClass(targetClass.id)
      toast.success(`Archived class: ${targetClass.name}`)
      selectClass(null)
    }
  }

  const handleUpdateSettings = (e: React.FormEvent) => {
    e.preventDefault()

    if (!editName.trim()) {
      toast.error("Please enter a class name")
      return
    }
    if (editMaxStudents <= 0) {
      toast.error("Max students must be at least 1")
      return
    }

    updateClassDetails(targetClass.id, {
      name: editName.trim(),
      deadline: editDeadline,
      maxStudents: editMaxStudents,
    })

    toast.success("Successfully updated course settings details.")
  }

  // If a student drill-down is selected, render StudentProgressTracker instead of tabs
  if (selectedStudentId) {
    return (
      <div className="space-y-4">
        <Button
          onClick={() => setSelectedStudentId(null)}
          variant="outline"
          size="sm"
          className="h-8 text-xs font-bold border-neutral-250 bg-white"
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" />
          Back to Roster
        </Button>
        <StudentProgressTracker
          studentId={selectedStudentId}
          classAverage={classAvg}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 text-left">
      {/* Back button & Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl border border-neutral-200 bg-white shadow-2xs">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => selectClass(null)}
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl border-neutral-250 bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-[8px] font-extrabold px-1.5 py-0 rounded-full border border-transparent shadow-none uppercase",
                  targetClass.status === "active" && "bg-emerald-50 text-emerald-700 border-emerald-100",
                  targetClass.status === "draft" && "bg-neutral-100 text-neutral-600 border-neutral-200/50",
                  targetClass.status === "completed" && "bg-blue-50 text-blue-700 border-blue-100"
                )}
              >
                {targetClass.status}
              </Badge>
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                Class Console
              </span>
            </div>
            <h1 className="text-lg font-black text-neutral-900 leading-tight">
              {targetClass.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-neutral-50 border border-neutral-150 rounded-2xl px-3.5 py-1.5 text-center shrink-0">
            <span className="text-[8px] text-neutral-450 uppercase font-black tracking-wider block">Avg Score</span>
            <span className="text-sm font-black text-neutral-850 block mt-0.5">{classAvg}%</span>
          </div>
          <div className="bg-neutral-50 border border-neutral-150 rounded-2xl px-3.5 py-1.5 text-center shrink-0">
            <span className="text-[8px] text-neutral-450 uppercase font-black tracking-wider block">Students</span>
            <span className="text-sm font-black text-neutral-850 block mt-0.5">
              {classStudents.length} / {targetClass.maxStudents}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs navigation panel */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-sm bg-neutral-100 p-1 rounded-2xl h-10 border border-neutral-200/80">
          <TabsTrigger value="overview" className="rounded-xl text-xs font-black tracking-wide">
            Overview
          </TabsTrigger>
          <TabsTrigger value="students" className="rounded-xl text-xs font-black tracking-wide">
            Students
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl text-xs font-black tracking-wide">
            Settings
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: OVERVIEW ─── */}
        <TabsContent value="overview" className="mt-0 space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Countdown clock (4 columns) */}
            <div className="lg:col-span-4 flex">
              <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl p-5 flex flex-col justify-between items-center text-center w-full min-h-[220px]">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-neutral-450 uppercase tracking-widest block">
                    Days Remaining
                  </span>
                  <p className="text-[11px] text-neutral-500 font-medium">
                    Countdown until simulation rounds lock.
                  </p>
                </div>

                {/* Pulsing countdown circle */}
                <div className="relative flex items-center justify-center h-28 w-28 shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      className="stroke-neutral-100 fill-none"
                      strokeWidth="5"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      className={cn(
                        "fill-none transition-all duration-500",
                        daysRemaining > 5 ? "stroke-emerald-500" : "stroke-rose-500"
                      )}
                      strokeWidth="5"
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={2 * Math.PI * 48 * (1 - Math.min(30, daysRemaining) / 30)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center leading-none">
                    <span className="text-3xl font-black text-neutral-900">{daysRemaining}</span>
                    <span className="text-[9px] font-black text-neutral-450 uppercase tracking-widest mt-1">
                      Days Left
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-450 bg-neutral-50 rounded-xl py-1 px-3 border border-neutral-100">
                  <Clock className="h-3 w-3 text-neutral-400" />
                  Target: {targetClass.deadline}
                </div>
              </Card>
            </div>

            {/* Class Average Progress Chart (8 columns) */}
            <div className="lg:col-span-8 flex">
              <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl overflow-hidden w-full">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
                    <Award className="h-4.5 w-4.5 text-neutral-900" />
                    Overall Class Progression
                  </CardTitle>
                  <CardDescription className="text-xs text-neutral-500">
                    Course average grade increments tracked round-by-round.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <div className="h-44 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={roundProgressData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
                          axisLine={{ stroke: "#e2e8f0" }}
                          tickLine={{ stroke: "#e2e8f0" }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
                          axisLine={{ stroke: "#e2e8f0" }}
                          tickLine={{ stroke: "#e2e8f0" }}
                        />
                        <ChartTooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderRadius: "8px",
                            border: "none",
                            color: "white",
                            fontSize: "11px",
                            fontWeight: "bold",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Average"
                          stroke="#0f172a"
                          strokeWidth={3}
                          dot={{ r: 4, stroke: "#0f172a", strokeWidth: 2, fill: "white" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Score Distribution Chart */}
          <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl overflow-hidden mt-6">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
                <Users className="h-4.5 w-4.5 text-neutral-900" />
                Student Score Distribution
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Number of roster students matching specific overall grade thresholds.
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
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderRadius: "8px",
                        border: "none",
                        color: "white",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    />
                    <Bar dataKey="count" name="Students" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 2: STUDENTS ROSTER ─── */}
        <TabsContent value="students" className="mt-0 space-y-4 animate-in fade-in duration-200">
          <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
                  <Users className="h-4.5 w-4.5 text-neutral-850" />
                  Roster students
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Track individual student progression scores and timeline logs.
                </CardDescription>
              </div>

              {/* Search input inside students list */}
              <div className="relative w-full sm:max-w-xs shrink-0">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-450" />
                <Input
                  type="text"
                  placeholder="Find student..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="pl-8 h-8 text-xs border-neutral-250 bg-white"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredStudents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-neutral-200 bg-neutral-50 hover:bg-neutral-50">
                      <TableHead className="font-bold text-xs text-neutral-500 py-3">Student Name</TableHead>
                      <TableHead className="font-bold text-xs text-neutral-500 py-3">Email Address</TableHead>
                      <TableHead className="font-bold text-xs text-neutral-500 py-3 text-center">Progress</TableHead>
                      <TableHead className="font-bold text-xs text-neutral-500 py-3 text-center">Last Active</TableHead>
                      <TableHead className="font-bold text-xs text-neutral-500 py-3 text-right pr-6">Overall Score</TableHead>
                      <TableHead className="font-bold text-xs text-neutral-500 py-3 text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((std) => (
                      <TableRow key={std.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                        <TableCell className="font-bold text-neutral-850 py-3.5">{std.name}</TableCell>
                        <TableCell className="text-neutral-500 font-medium py-3.5">{std.email}</TableCell>
                        <TableCell className="text-center py-3.5">
                          <div className="flex flex-col items-center gap-1 min-w-[80px]">
                            <span className="text-[10px] font-bold text-neutral-700">
                              Round {std.roundScores.length} ({std.completionRate}%)
                            </span>
                            <Progress value={std.completionRate} className="h-1 w-20" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-3.5 text-neutral-450 font-bold text-xs">
                          {std.lastActive}
                        </TableCell>
                        <TableCell className="text-right py-3.5 pr-6 font-black text-neutral-900">
                          {std.overallScore}%
                        </TableCell>
                        <TableCell className="text-center py-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              onClick={() => setSelectedStudentId(std.id)}
                              variant="ghost"
                              className="h-8 font-black text-xs text-slate-800 hover:bg-slate-50 flex items-center gap-1"
                            >
                              Track Progress
                            </Button>
                            <Button
                              onClick={() => handleRemoveStudent(std.id, std.name)}
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-neutral-400 hover:text-rose-650 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center p-8 text-xs font-bold text-neutral-450 bg-neutral-50/30">
                  No students match your criteria.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: SETTINGS ─── */}
        <TabsContent value="settings" className="mt-0 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Edit details form (7 columns) */}
            <div className="lg:col-span-8">
              <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl">
                <CardHeader className="p-5 pb-3 border-b border-neutral-100">
                  <CardTitle className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
                    <Settings className="h-4.5 w-4.5 text-neutral-950" />
                    Configure Course Details
                  </CardTitle>
                  <CardDescription className="text-xs text-neutral-500">
                    Modify active classroom limits, name tags, and target lock deadlines.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-4">
                  <form onSubmit={handleUpdateSettings} className="space-y-4">
                    {/* Class Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                        Class Label
                      </label>
                      <Input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-9 text-xs border-neutral-250 bg-white font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Max Students */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                          Maximum Seats
                        </label>
                        <Input
                          type="number"
                          value={editMaxStudents}
                          onChange={(e) => setEditMaxStudents(parseInt(e.target.value) || 0)}
                          className="h-9 text-xs border-neutral-250 bg-white font-bold"
                        />
                      </div>
                      {/* Deadline */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                          Simulation Deadline
                        </label>
                        <Input
                          type="date"
                          value={editDeadline}
                          onChange={(e) => setEditDeadline(e.target.value)}
                          className="h-9 text-xs border-neutral-250 bg-white font-bold"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-9 font-black bg-slate-900 text-white hover:bg-slate-950 text-xs rounded-xl shadow-xs"
                    >
                      Save Configuration Details
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Archive Class Pane (4 columns) */}
            <div className="lg:col-span-4">
              <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl p-5 space-y-4">
                <div className="flex gap-3.5 items-start">
                  <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 text-amber-600">
                    <ShieldAlert className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-1 text-xs">
                    <span className="font-black text-neutral-900 block leading-tight">Archive Classroom</span>
                    <p className="text-neutral-500 font-medium leading-relaxed">
                      Archiving freezes student rounds decision updates and sets status to Completed. This action can be undone.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleArchiveClass}
                  variant="outline"
                  className="w-full h-9 font-bold text-xs border-rose-200 hover:bg-rose-50 text-rose-650 bg-white rounded-xl shadow-3xs"
                >
                  Archive Class Course
                </Button>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ClassManager
