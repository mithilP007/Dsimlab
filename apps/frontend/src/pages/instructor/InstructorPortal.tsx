import { useState } from "react"
import { useInstructorPortalStore } from "@/stores/instructorPortalStore"
import { ClassManager } from "./ClassManager"
import { ScenarioBuilder } from "./ScenarioBuilder"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Link } from "react-router"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { School, Users, TrendingUp, Plus, Clock, ArrowRight, Activity, Calendar, Mail, Sparkles, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function InstructorPortal() {
  const {
    classes,
    scenarios,
    students,
    selectedClassId,
    analytics,
    createClass,
    inviteStudent,
    selectClass,
  } = useInstructorPortalStore()

  // Modals visibility state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isScenarioOpen, setIsScenarioOpen] = useState(false)

  // Create class form state
  const [newClassName, setNewClassName] = useState("")
  const [selectedScenarioId, setSelectedScenarioId] = useState("")
  const [maxStudents, setMaxStudents] = useState(25)
  const [deadline, setDeadline] = useState("2026-06-15")

  // Invite student form state
  const [inviteClassId, setInviteClassId] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")

  const handleCreateClass = () => {
    if (!newClassName.trim()) {
      toast.error("Please enter a class name")
      return
    }
    if (!selectedScenarioId) {
      toast.error("Please select a scenario briefing")
      return
    }
    if (maxStudents <= 0) {
      toast.error("Max students must be greater than 0")
      return
    }
    if (!deadline) {
      toast.error("Please specify a course deadline")
      return
    }

    createClass(newClassName.trim(), selectedScenarioId, maxStudents, deadline)
    toast.success(`Successfully launched course: ${newClassName}`)
    
    // Reset Form
    setNewClassName("")
    setSelectedScenarioId("")
    setMaxStudents(25)
    setDeadline("2026-06-15")
    setIsCreateOpen(false)
  }

  const handleInviteStudent = () => {
    if (!inviteClassId) {
      toast.error("Please select a class roster")
      return
    }
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      toast.error("Please enter a valid student email address")
      return
    }

    inviteStudent(inviteClassId, inviteEmail.trim())
    toast.success(`Sent invitation email to ${inviteEmail}`)
    
    setInviteEmail("")
    setIsInviteOpen(false)
  }

  // Active Classes Count
  const activeClassesCount = classes.filter((c) => c.status === "active").length

  // Generate activity log — uses store students if available, otherwise shows placeholder
  const recentActivities = students.length > 0
    ? students.slice(0, 5).map((s, i) => {
        const status = s.status as string
        return {
          student: s.name || `Student ${i + 1}`,
          action: status === 'completed' ? 'Completed simulation round'
            : status === 'in-progress' ? 'Submitted campaign decisions'
            : 'Joined class',
          time: 'Recently',
          class: classes.find(c => c.id === s.classId)?.name || 'Class'
        }
      })
    : [
        { student: "No students yet", action: "Invite students using Join Code or email", time: "—", class: "" },
      ]

  // If a class is selected, render ClassManager view instead
  if (selectedClassId) {
    return <ClassManager />
  }

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* ─── Top: Welcome Bar + Create Class button ─── */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        {/* Visual mesh backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-neutral-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="space-y-1 relative z-10">
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Welcome back, Professor Green</h2>
          <p className="text-xs text-neutral-500 font-bold max-w-lg uppercase tracking-wider">
            Academic portal console • Overview statistics
          </p>
        </div>

        {/* Create Class modal trigger */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 font-black bg-slate-900 text-white hover:bg-slate-950 text-xs shrink-0 rounded-2xl shadow-sm px-5">
              <Plus className="mr-1.5 h-4 w-4" />
              Create Class
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border border-neutral-200 rounded-2xl max-w-sm p-5 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-neutral-900 flex items-center gap-1.5">
                <School className="h-4.5 w-4.5" />
                Launch New Class
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3.5 pt-2">
              {/* Class Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">
                  Class Label
                </label>
                <Input
                  type="text"
                  placeholder="e.g. MKT 410: Growth Marketing"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="h-9 text-xs border-neutral-250 bg-white"
                />
              </div>

              {/* Scenario selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">
                  Briefing scenario
                </label>
                <Select value={selectedScenarioId} onValueChange={setSelectedScenarioId}>
                  <SelectTrigger className="w-full h-9 text-xs border-neutral-250 bg-white font-bold text-neutral-800">
                    <SelectValue placeholder="Select course briefcase" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-neutral-200 text-neutral-800">
                    {scenarios.map((sc) => (
                      <SelectItem key={sc.id} value={sc.id} className="font-bold text-xs">
                        {sc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Max Students & Deadline */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">
                    Max Students
                  </label>
                  <Input
                    type="number"
                    value={maxStudents}
                    onChange={(e) => setMaxStudents(parseInt(e.target.value) || 0)}
                    className="h-9 text-xs border-neutral-250 bg-white font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">
                    Deadline Date
                  </label>
                  <Input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="h-9 text-xs border-neutral-250 bg-white font-bold"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 flex gap-2">
              <Button
                variant="outline"
                className="h-9 font-bold text-xs border-neutral-250 bg-white"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="h-9 font-black bg-slate-900 text-white hover:bg-slate-950 text-xs"
                onClick={handleCreateClass}
              >
                Launch Course
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ─── Stats Row: Active Classes, Total Students, Avg Score, Active Now ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Classes */}
        <Card className="border-neutral-200 bg-white shadow-2xs rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
              Active Classes
            </span>
            <span className="text-2xl font-black text-neutral-900 block leading-none">
              {activeClassesCount}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
              Running simulation rounds
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0 text-violet-600">
            <School className="h-4.5 w-4.5" />
          </div>
        </Card>

        {/* KPI 2: Total Students */}
        <Card className="border-neutral-200 bg-white shadow-2xs rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
              Total Students
            </span>
            <span className="text-2xl font-black text-neutral-900 block leading-none">
              {analytics.totalStudents}
            </span>
            <span className="text-[10px] text-neutral-400 font-bold block mt-0.5">
              Enrolled roster members
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-sky-50 flex items-center justify-center shrink-0 text-sky-600">
            <Users className="h-4.5 w-4.5" />
          </div>
        </Card>

        {/* KPI 3: Avg Score */}
        <Card className="border-neutral-200 bg-white shadow-2xs rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
              Avg Class Score
            </span>
            <span className="text-2xl font-black text-neutral-900 block leading-none">
              {analytics.avgClassScore}%
            </span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
              +2.1% performance change
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
            <TrendingUp className="h-4.5 w-4.5" />
          </div>
        </Card>

        {/* KPI 4: Active Now */}
        <Card className="border-neutral-200 bg-white shadow-2xs rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
              Active Now
            </span>
            <span className="text-2xl font-black text-neutral-900 block leading-none flex items-center gap-1.5">
              {analytics.activeNow}
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            </span>
            <span className="text-[10px] text-neutral-400 font-bold block mt-0.5">
              Online simulation updates
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 text-amber-600">
            <Activity className="h-4.5 w-4.5" />
          </div>
        </Card>
      </div>

      {/* ─── Main View Content ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (65% width) - Class cards list */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center gap-2">
            <School className="h-4.5 w-4.5 text-neutral-850" />
            <h2 className="text-sm font-black text-neutral-900">Your Classroom Courses</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {classes.map((cls) => {
              const studentsInClassCount = students.filter((s) => s.classId === cls.id).length
              const enrollmentPercent = Math.round((studentsInClassCount / cls.maxStudents) * 100)

              return (
                <Card
                  key={cls.id}
                  onClick={() => selectClass(cls.id)}
                  className="border border-neutral-200 bg-white shadow-2xs rounded-2xl overflow-hidden hover:shadow-md cursor-pointer transition-all duration-300 relative group flex flex-col justify-between"
                >
                  <CardHeader className="p-4.5 pb-2">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[8px] font-extrabold px-1.5 py-0 rounded-full border border-transparent shadow-none uppercase",
                          cls.status === "active" && "bg-emerald-50 text-emerald-700 border-emerald-100",
                          cls.status === "draft" && "bg-neutral-100 text-neutral-600 border-neutral-200/50",
                          cls.status === "completed" && "bg-blue-50 text-blue-700 border-blue-100"
                        )}
                      >
                        {cls.status}
                      </Badge>
                      
                      <span className="text-[10px] text-neutral-400 font-bold flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {cls.deadline}
                      </span>
                    </div>

                    <span className="text-sm font-black text-neutral-950 block tracking-tight truncate">
                      {cls.name}
                    </span>
                    <span className="text-[10px] font-bold text-neutral-500 block truncate mt-0.5">
                      Campaign brief: {cls.scenario}
                    </span>
                  </CardHeader>

                  <CardContent className="p-4.5 pt-2 flex-1 flex flex-col justify-end gap-3.5 border-t border-neutral-50/50 mt-2 bg-neutral-50/10">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[9px] font-bold text-neutral-450 uppercase tracking-wide">
                        <span>Students</span>
                        <span className="font-extrabold text-neutral-800">
                          {studentsInClassCount} / {cls.maxStudents}
                        </span>
                      </div>
                      <Progress value={enrollmentPercent} className="h-1" />
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-neutral-50 border-dashed">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
                        Average score
                      </span>
                      <span className="font-black text-neutral-900 block text-sm">
                        {cls.avgScore}%
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-8 font-black text-xs text-slate-800 group-hover:bg-slate-50 flex items-center justify-center gap-1 mt-1 border border-neutral-200/50 rounded-xl"
                    >
                      Class details
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Right Column (35% width) - Quick actions & Activity */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Actions Panel */}
          <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl p-5 space-y-4">
            <span className="text-[10px] font-black text-neutral-450 uppercase tracking-widest block">
              Quick Actions
            </span>

            <div className="flex flex-col gap-2.5">
              {/* Governance Console Link */}
              <Link to="/instructor/governance">
                <Button
                  variant="outline"
                  className="w-full h-9 font-bold border-neutral-250 bg-white text-xs rounded-xl flex items-center justify-start gap-2 shadow-3xs"
                >
                  <ShieldCheck className="h-4 w-4 text-violet-600" />
                  Governance Console
                </Button>
              </Link>

              {/* Scenario Builder Trigger */}
              <Dialog open={isScenarioOpen} onOpenChange={setIsScenarioOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-9 font-bold border-neutral-250 bg-white text-xs rounded-xl flex items-center justify-start gap-2 shadow-3xs"
                  >
                    <Sparkles className="h-4 w-4 text-neutral-500" />
                    Scenario Builder Console
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border border-neutral-200 rounded-2xl max-w-4xl p-5 overflow-y-auto max-h-[85vh]">
                  <ScenarioBuilder />
                </DialogContent>
              </Dialog>

              {/* Invite Student Trigger */}
              <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-9 font-bold border-neutral-250 bg-white text-xs rounded-xl flex items-center justify-start gap-2 shadow-3xs"
                  >
                    <Mail className="h-4 w-4 text-neutral-500" />
                    Invite Students
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border border-neutral-200 rounded-2xl max-w-sm p-5 space-y-4">
                  <DialogHeader>
                    <DialogTitle className="text-base font-black text-neutral-900 flex items-center gap-1.5">
                      <Mail className="h-4.5 w-4.5" />
                      Send Student invite
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-3.5 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                        Roster course
                      </label>
                      <Select value={inviteClassId} onValueChange={setInviteClassId}>
                        <SelectTrigger className="w-full h-9 text-xs border-neutral-250 bg-white font-bold text-neutral-800">
                          <SelectValue placeholder="Select target classroom" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-neutral-200 text-neutral-800">
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id} className="font-bold text-xs">
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                        Student Email Address
                      </label>
                      <Input
                        type="email"
                        placeholder="e.g. lucy.brown@univ.edu"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="h-9 text-xs border-neutral-250 bg-white"
                      />
                    </div>
                  </div>

                  <DialogFooter className="pt-2 flex gap-2">
                    <Button
                      variant="outline"
                      className="h-9 font-bold text-xs border-neutral-250 bg-white"
                      onClick={() => setIsInviteOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="h-9 font-black bg-slate-900 text-white hover:bg-slate-950 text-xs"
                      onClick={handleInviteStudent}
                    >
                      Send Invite
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </Card>

          {/* Recent Submissions timeline */}
          <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl overflow-hidden flex flex-col justify-between">
            <div>
              <CardHeader className="p-5 pb-3 border-b border-neutral-100">
                <CardTitle className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
                  <Clock className="h-4.5 w-4.5 text-neutral-900" />
                  Recent Submissions
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Timeline of dynamic simulation upgrades.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-neutral-100">
                {recentActivities.map((feed, index) => (
                  <div key={index} className="p-4 flex items-start justify-between gap-3 text-left">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-neutral-850 truncate max-w-[120px]">
                          {feed.student}
                        </span>
                        <Badge variant="outline" className="text-[7px] font-black border-neutral-200 uppercase px-1 py-0 rounded">
                          {feed.class}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-medium leading-normal">
                        {feed.action}
                      </p>
                    </div>
                    <span className="text-[9px] text-neutral-450 font-bold shrink-0">
                      {feed.time}
                    </span>
                  </div>
                ))}
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default InstructorPortal
