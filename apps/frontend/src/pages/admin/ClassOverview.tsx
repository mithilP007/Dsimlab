import { useState } from "react"
import { useAdminStore } from "@/stores/adminStore"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card } from "@/components/ui/card"
import {
  School,
  Activity,
  CheckCircle,
  Users,
  Archive,
  Trash2,
  Eye,
  X,
  BookOpen,
  TrendingUp,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function ClassOverview() {
  const { classes, users, archiveClass, deleteClass, settings } = useAdminStore()

  // State: selected class for detail split-panel view
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)

  const selectedClass = classes.find((c) => c.id === selectedClassId)

  // Actions
  const handleArchive = (id: string, name: string) => {
    archiveClass(id)
    toast.success(`Archived class: ${name}`)
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete class "${name}"?`)) {
      deleteClass(id)
      if (selectedClassId === id) {
        setSelectedClassId(null)
      }
      toast.success(`Deleted class: ${name}`)
    }
  }

  // Calculate stats
  const totalActive = classes.filter((c) => c.status === "active").length
  const totalArchived = classes.filter((c) => c.status === "archived").length
  const avgStudents = Math.round(
    classes.reduce((acc, c) => acc + c.students, 0) / (classes.length || 1)
  )

  // Roster logic: filter students dynamically
  const studentsList = users.filter((u) => u.role === "student")
  const getRosterForClass = (classId: string) => {
    // Slice a subset of mock students based on class ID index
    const index = parseInt(classId.split("_")[1]) || 1
    const size = 4
    const start = ((index - 1) * size) % studentsList.length
    return studentsList.slice(start, start + size)
  }

  // Progress logic: mock rounds completed
  const getRoundsCompleted = (classId: string) => {
    const index = parseInt(classId.split("_")[1]) || 1
    // Completed rounds between 2 and max default rounds
    return Math.min(settings.defaultRounds, (index * 2) % (settings.defaultRounds + 1))
  }

  // Instructor notes mock data helper
  const getInstructorNotes = (classId: string) => {
    const notes = [
      "Students are focusing on Google Ads keyword matches. High performance observed on exact match terms.",
      "SEO landing page checks are underway. Average conversion value is steady at $45.",
      "Simulation session archived. Student metrics show a strong understanding of CPC ad budgeting.",
      "Lead generation scenario has been activated. Students need to prioritize CPA reduction.",
      "Reviewing social ad placement reports. Meta ads click-through rate is peaking around 2.4%.",
      "Analyzing classroom bounce rates. Focus is on technical speed optimizations.",
      "Individual project phase. Students are optimizing organic keyword tags.",
      "Initial briefing completed. Student sandboxes have been successfully provisioned.",
    ]
    const index = (parseInt(classId.split("_")[1]) || 1) - 1
    return notes[index % notes.length]
  }

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* Page Title Header */}
      <div>
        <h2 className="text-xl font-black text-neutral-900 flex items-center gap-2">
          <School className="h-5 w-5" />
          Classroom Cohorts Overview
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Monitor course enrollment limits, student scorecards, and timeline milestones.
        </p>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Labs */}
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
              Active Classes
            </span>
            <span className="text-2xl font-black text-neutral-900 block leading-none">
              {totalActive}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
              Simulations currently running
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
            <Activity className="h-4.5 w-4.5" />
          </div>
        </Card>

        {/* Archived Labs */}
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
              Archived Classes
            </span>
            <span className="text-2xl font-black text-neutral-900 block leading-none">
              {totalArchived}
            </span>
            <span className="text-[10px] text-neutral-400 font-bold block mt-0.5">
              Completed course archives
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 text-slate-650">
            <CheckCircle className="h-4.5 w-4.5" />
          </div>
        </Card>

        {/* Avg Students per Class */}
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
              Avg Students / Class
            </span>
            <span className="text-2xl font-black text-neutral-900 block leading-none">
              {avgStudents}
            </span>
            <span className="text-[10px] text-neutral-400 font-bold block mt-0.5">
              Registrants per sandbox cohort
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-600">
            <Users className="h-4.5 w-4.5" />
          </div>
        </Card>
      </div>

      {/* Main Split-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Class Table (collapses width when detail panel is active) */}
        <div className={cn("transition-all duration-300", selectedClass ? "lg:col-span-7" : "lg:col-span-12")}>
          <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-neutral-50/70 border-b border-neutral-100">
                  <TableRow>
                    <TableHead className="text-left font-black text-[10px] text-neutral-450 uppercase tracking-wider">Class Name</TableHead>
                    <TableHead className="text-left font-black text-[10px] text-neutral-450 uppercase tracking-wider">Instructor</TableHead>
                    <TableHead className="text-left font-black text-[10px] text-neutral-450 uppercase tracking-wider">Students</TableHead>
                    <TableHead className="text-left font-black text-[10px] text-neutral-450 uppercase tracking-wider">Avg Score</TableHead>
                    <TableHead className="text-left font-black text-[10px] text-neutral-450 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-right font-black text-[10px] text-neutral-450 uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-neutral-100">
                  {classes.map((cls) => {
                    const isSelected = selectedClassId === cls.id
                    return (
                      <TableRow
                        key={cls.id}
                        onClick={() => setSelectedClassId(cls.id)}
                        className={cn(
                          "hover:bg-neutral-50/50 transition-colors cursor-pointer",
                          isSelected && "bg-neutral-50"
                        )}
                      >
                        <TableCell className="py-3.5 text-left">
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-neutral-900 truncate">{cls.name}</span>
                            <span className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">
                              Created {cls.createdAt}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 text-xs text-neutral-600 font-semibold text-left">
                          {cls.instructor}
                        </TableCell>
                        <TableCell className="py-3.5 text-left">
                          <span className="text-xs font-bold text-neutral-850">
                            {cls.students} <span className="text-[10px] text-neutral-400 font-normal">/ {settings.maxStudentsPerClass}</span>
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 text-left">
                          <span className="text-xs font-black text-neutral-900">{cls.avgScore}%</span>
                        </TableCell>
                        <TableCell className="py-3.5 text-left">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border border-transparent shadow-none uppercase",
                              cls.status === "active" && "bg-emerald-50 text-emerald-700 border-emerald-100",
                              cls.status === "archived" && "bg-neutral-150 text-neutral-600 border-neutral-200"
                            )}
                          >
                            {cls.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedClassId(cls.id)}
                              className="h-8 w-8 text-neutral-500 hover:text-slate-900 hover:bg-neutral-100 rounded-lg"
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {cls.status === "active" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleArchive(cls.id, cls.name)}
                                className="h-8 w-8 text-neutral-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg"
                                title="Archive Class"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(cls.id, cls.name)}
                              className="h-8 w-8 text-neutral-400 hover:text-red-650 hover:bg-red-50 rounded-lg"
                              title="Delete Class"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Detailed Side Panel (renders on row select) */}
        {selectedClass && (
          <div className="lg:col-span-5 animate-in slide-in-from-right-3 duration-300">
            <Card className="border border-neutral-200 bg-white shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
              {/* Header */}
              <div className="p-4 border-b border-neutral-150 bg-neutral-50/40 flex items-center justify-between">
                <div className="flex items-center gap-2 text-left">
                  <BookOpen className="h-4.5 w-4.5 text-neutral-700" />
                  <div>
                    <h3 className="text-xs font-black text-neutral-900 uppercase tracking-widest leading-none">Class details</h3>
                    <span className="text-[10px] text-neutral-400 font-bold block mt-0.5">{selectedClass.id}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedClassId(null)}
                  className="h-7 w-7 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Roster & Metrics Content */}
              <div className="p-5 space-y-5">
                {/* Info Card Row */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="p-3 bg-neutral-50/50 rounded-xl border border-neutral-100">
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Course code</span>
                    <span className="text-xs font-bold text-neutral-850 mt-1 block truncate">
                      {selectedClass.name.split(":")[0]}
                    </span>
                  </div>
                  <div className="p-3 bg-neutral-50/50 rounded-xl border border-neutral-100">
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Cohort size</span>
                    <span className="text-xs font-bold text-neutral-850 mt-1 block">
                      {selectedClass.students} / {settings.maxStudentsPerClass} students
                    </span>
                  </div>
                </div>

                {/* Simulation progress bar */}
                <div className="space-y-1.5 p-3 rounded-xl border border-neutral-100 bg-neutral-50/20">
                  <div className="flex justify-between text-[9px] font-black text-neutral-400 uppercase tracking-wider">
                    <span>Simulation Progress</span>
                    <span className="font-extrabold text-neutral-800">
                      {getRoundsCompleted(selectedClass.id)} / {settings.defaultRounds} Rounds
                    </span>
                  </div>
                  <Progress
                    value={
                      (getRoundsCompleted(selectedClass.id) / settings.defaultRounds) * 100
                    }
                    className="h-1.5"
                  />
                </div>

                {/* Mini Student roster table */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-neutral-450 uppercase tracking-widest block text-left">
                    Roster Snapshot (Top students)
                  </span>
                  <div className="border border-neutral-150 rounded-xl overflow-hidden bg-white">
                    <Table>
                      <TableHeader className="bg-neutral-50/60 border-b border-neutral-100">
                        <TableRow>
                          <TableHead className="font-bold text-[9px] py-2 uppercase text-left">Student</TableHead>
                          <TableHead className="font-bold text-[9px] py-2 uppercase text-right">Avg Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-neutral-100">
                        {getRosterForClass(selectedClass.id).map((student) => (
                          <TableRow key={student.id} className="hover:bg-neutral-50/40">
                            <TableCell className="py-2 text-left">
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-neutral-900 truncate">{student.name}</span>
                                <span className="text-[9px] text-neutral-400 font-semibold truncate leading-none mt-0.5">{student.email}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-right text-xs font-black text-neutral-900">
                              {student.totalScore > 0 ? `${student.totalScore}%` : "84%"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Instructor Notes Section */}
                <div className="space-y-1.5 p-3 bg-indigo-50/20 rounded-xl border border-indigo-100 text-left">
                  <span className="text-[10px] font-black text-indigo-950 uppercase tracking-widest flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
                    Instructor Roster Notes
                  </span>
                  <p className="text-xs text-neutral-600 font-semibold leading-relaxed">
                    "{getInstructorNotes(selectedClass.id)}"
                  </p>
                </div>
              </div>

              {/* Footer details */}
              <div className="p-4 bg-neutral-50/50 border-t border-neutral-100 flex justify-between text-[10px] text-neutral-400 font-bold px-5">
                <span>Instructor: {selectedClass.instructor}</span>
                <span>Created: {selectedClass.createdAt}</span>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default ClassOverview
