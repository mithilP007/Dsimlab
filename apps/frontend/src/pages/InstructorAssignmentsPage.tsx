import { useState, useEffect } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import api from "@/lib/api"
import {
  ArrowLeft,
  Sparkles,
  Settings2,
  Calendar,
  Plus,
  Users,
  Search,
  BookOpen,
  Trophy,
  AlertTriangle,
  Play,
  XCircle
} from "lucide-react"

export function InstructorAssignmentsPage() {
  const navigate = useNavigate()

  // Data States
  const [assignments, setAssignments] = useState<any[]>([])
  const [scenarios, setScenarios] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [classStudents, setClassStudents] = useState<any[]>([])
  
  // Selection/Detail States
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null)
  const [assignmentReport, setAssignmentReport] = useState<any | null>(null)
  const [assignmentLeaderboard, setAssignmentLeaderboard] = useState<any[]>([])
  const [assignmentStudents, setAssignmentStudents] = useState<any[]>([])

  // Form Mode States
  const [isCreating, setIsCreating] = useState(false)

  // Loading States
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // Form Inputs
  const [assignmentName, setAssignmentName] = useState("")
  const [selectedScenarioId, setSelectedScenarioId] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [targetType, setTargetType] = useState<"CLASS" | "GROUP" | "STUDENT">("CLASS")
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [durationDays, setDurationDays] = useState<15 | 30>(30)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [dailyProcessingTime, setDailyProcessingTime] = useState("09:00")
  const [dailyBudgetCap, setDailyBudgetCap] = useState(100)
  const [difficulty, setDifficulty] = useState("medium")
  const [autoStart, setAutoStart] = useState(false)

  // Search filter
  const [studentSearchQuery, setStudentSearchQuery] = useState("")

  // Fetch initial configs
  useEffect(() => {
    fetchAssignments()
    fetchScenarios()
    fetchClasses()
  }, [])

  // Calculate endDate automatically when duration/startDate changes
  useEffect(() => {
    if (startDate) {
      const start = new Date(startDate)
      const end = new Date(start.getTime() + durationDays * 24 * 3600 * 1000)
      const year = end.getFullYear()
      const month = String(end.getMonth() + 1).padStart(2, '0')
      const day = String(end.getDate()).padStart(2, '0')
      const hours = String(end.getHours()).padStart(2, '0')
      const minutes = String(end.getMinutes()).padStart(2, '0')
      setEndDate(`${year}-${month}-${day}T${hours}:${minutes}`)
    }
  }, [startDate, durationDays])

  // Fetch students when classId changes in form
  useEffect(() => {
    if (selectedClassId) {
      fetchClassStudents(selectedClassId)
    } else {
      setClassStudents([])
    }
  }, [selectedClassId])

  const fetchAssignments = async () => {
    try {
      const res = await api.get("/api/v1/assignments")
      setAssignments(res.data.assignments || [])
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to load assignments.")
    }
  }

  const fetchScenarios = async () => {
    try {
      const res = await api.get("/api/v1/scenario")
      setScenarios(res.data.scenarios || [])
    } catch (err) {
      console.error(err)
    }
  }

  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/v1/class")
      setClasses(res.data.classes || [])
    } catch (err) {
      console.error(err)
    }
  }

  const fetchClassStudents = async (classId: string) => {
    try {
      const res = await api.get(`/api/v1/class/${classId}`)
      setClassStudents(res.data.class?.students || [])
    } catch (err) {
      console.error(err)
      toast.error("Failed to load class students.")
    }
  }

  const handleSelectAssignment = async (id: string) => {
    setSelectedAssignmentId(id)
    setIsLoadingDetails(true)
    try {
      const [detailsRes, reportRes, leaderboardRes, studentsRes] = await Promise.all([
        api.get(`/api/v1/assignments/${id}`),
        api.get(`/api/v1/assignments/${id}/report`),
        api.get(`/api/v1/assignments/${id}/leaderboard`),
        api.get(`/api/v1/assignments/${id}/students`)
      ])

      setSelectedAssignment(detailsRes.data.assignment)
      setAssignmentReport(reportRes.data.report)
      setAssignmentLeaderboard(leaderboardRes.data.leaderboard || [])
      setAssignmentStudents(studentsRes.data.students || [])
    } catch (err) {
      console.error(err)
      toast.error("Failed to load assignment details.")
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignmentName.trim()) {
      toast.error("Assignment name is required.")
      return
    }
    if (!selectedClassId) {
      toast.error("Class selection is required.")
      return
    }
    if (!selectedScenarioId) {
      toast.error("Scenario template is required.")
      return
    }
    if (!startDate) {
      toast.error("Start date is required.")
      return
    }
    if (targetType !== "CLASS" && selectedStudentIds.length === 0) {
      toast.error("Please select at least one student.")
      return
    }

    if (!confirm("Are you sure you want to create and deploy this scenario assignment?")) {
      return
    }

    setIsLoading(true)
    const tid = toast.loading("Deploying scenario assignment...")

    try {
      const payload = {
        assignmentName: assignmentName.trim(),
        classId: selectedClassId,
        scenarioId: selectedScenarioId,
        targetType,
        targetStudentIds: targetType === "CLASS" ? [] : selectedStudentIds,
        durationDays,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        dailyProcessingTime,
        dailyBudgetCap: Number(dailyBudgetCap),
        difficulty,
        autoStart,
      }

      await api.post("/api/v1/assignments", payload)
      toast.success("Scenario assignment successfully deployed!", { id: tid })
      setIsCreating(false)
      resetForm()
      fetchAssignments()
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.error || err.message || "Failed to create assignment.", { id: tid })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartAssignment = async (id: string) => {
    if (!confirm("Are you sure you want to force-start this assignment? Daily campaign runs will be initialized immediately for all assigned students.")) return
    setIsLoading(true)
    const tid = toast.loading("Starting assignment...")
    try {
      await api.post(`/api/v1/assignments/${id}/start`)
      toast.success("Assignment started successfully!", { id: tid })
      handleSelectAssignment(id)
      fetchAssignments()
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.error || err.message || "Failed to start assignment.", { id: tid })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePublishAssignment = async (id: string) => {
    if (!confirm("Are you sure you want to publish this assignment? Once published, students will see it in their dashboard.")) return
    setIsLoading(true)
    const tid = toast.loading("Publishing assignment...")
    try {
      await api.post(`/api/v1/assignments/${id}/publish`)
      toast.success("Assignment successfully published!", { id: tid })
      handleSelectAssignment(id)
      fetchAssignments()
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.error || err.message || "Failed to publish assignment.", { id: tid })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelAssignment = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this assignment? All active student campaign runs will be completed immediately.")) return
    setIsLoading(true)
    const tid = toast.loading("Cancelling assignment...")
    try {
      await api.post(`/api/v1/assignments/${id}/cancel`)
      toast.success("Assignment cancelled.", { id: tid })
      handleSelectAssignment(id)
      fetchAssignments()
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.error || err.message || "Failed to cancel assignment.", { id: tid })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setAssignmentName("")
    setSelectedScenarioId("")
    setSelectedClassId("")
    setTargetType("CLASS")
    setSelectedStudentIds([])
    setDurationDays(30)
    setStartDate("")
    setEndDate("")
    setDailyProcessingTime("09:00")
    setDailyBudgetCap(100)
    setDifficulty("medium")
    setAutoStart(false)
  }

  const handleStudentCheckboxChange = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const filteredClassStudents = classStudents.filter(student => 
    student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(studentSearchQuery.toLowerCase())
  )

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      case "SCHEDULED":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
      case "DRAFT":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20"
      case "COMPLETED":
        return "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
      case "CANCELLED":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20"
      default:
        return "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-neutral-100 bg-neutral-950 min-h-screen">
      
      {/* 1. Header Navigation */}
      <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
        <Button
          onClick={() => navigate("/instructor")}
          variant="ghost"
          className="text-xs font-semibold text-neutral-400 hover:text-neutral-200 flex items-center gap-1.5 h-8 p-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Portal Dashboard
        </Button>
        <span className="text-xs text-neutral-500 font-semibold">
          Instructor Assignments Panel
        </span>
      </div>

      {/* 2. Banner Title */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-900 via-indigo-950 to-neutral-950 p-6 md:p-8 text-white shadow-lg text-left">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">Cohort Controller</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Scenario Assignment Manager
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-xl font-medium leading-relaxed">
              Create, publish, and schedule flexible custom scenario assignments. Control budget envelopes, processing times, and duration parameters for the entire class, a target student group, or an individual.
            </p>
          </div>
          <Button
            onClick={() => { resetForm(); setIsCreating(true); setSelectedAssignmentId(null); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-4 rounded-xl flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Create Assignment
          </Button>
        </div>
      </div>

      {/* 3. Main Split Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Pane: List of Assignments */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border border-neutral-800 bg-neutral-900 shadow-sm text-left">
            <CardHeader className="border-b border-neutral-800 p-5">
              <CardTitle className="text-sm font-black text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="h-4.5 w-4.5 text-indigo-500" />
                Deployed Assignments ({assignments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 divide-y divide-neutral-800">
              {assignments.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 font-semibold text-xs">
                  No assignments created. Click "Create Assignment" above.
                </div>
              ) : (
                assignments.map((assignment) => (
                  <button
                    key={assignment.id}
                    data-testid="assignment-item"
                    data-status={assignment.status}
                    onClick={() => handleSelectAssignment(assignment.id)}
                    className={`w-full text-left p-4 rounded-xl transition-all flex flex-col gap-2 mt-2 first:mt-0 ${
                      selectedAssignmentId === assignment.id
                        ? "bg-neutral-800 border border-neutral-700"
                        : "hover:bg-neutral-800/40 border border-transparent"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-neutral-200 truncate max-w-[70%]">{assignment.assignmentName}</span>
                      <Badge className={`text-[9px] font-black tracking-wider uppercase border ${getStatusBadgeClass(assignment.status)}`}>
                        {assignment.status}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-neutral-400 space-y-1 font-semibold">
                      <p>Class: {assignment.class?.name}</p>
                      <p>Scenario: {assignment.scenario?.name}</p>
                      <p>Duration: {assignment.durationDays} Days ({assignment.targetType})</p>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Pane: Creation Form OR Active View Details */}
        <div className="lg:col-span-8">
          
          {/* A. Create Assignment Mode */}
          {isCreating && (
            <Card className="border border-neutral-800 bg-neutral-900 text-left animate-in fade-in slide-in-from-right-3 duration-300">
              <CardHeader className="border-b border-neutral-800 p-5 flex justify-between items-center flex-row">
                <div>
                  <CardTitle className="text-sm font-black text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Settings2 className="h-4.5 w-4.5 text-indigo-400" />
                    Configure Assignment
                  </CardTitle>
                  <CardDescription className="text-[11px] font-semibold text-neutral-500">
                    Define scenario target, cohort timing details, budget limits, and processing routines.
                  </CardDescription>
                </div>
                <Button variant="ghost" className="text-xs text-neutral-400" onClick={() => setIsCreating(false)}>Cancel</Button>
              </CardHeader>
              <CardContent className="p-5">
                <form onSubmit={handleCreateAssignment} className="space-y-6">
                  
                  {/* Name and Scenario Template */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Assignment Name</label>
                      <Input
                        type="text"
                        placeholder="e.g. Midterm Simulation Challenge"
                        value={assignmentName}
                        onChange={(e) => setAssignmentName(e.target.value)}
                        className="text-xs border-neutral-700 bg-neutral-950 h-10 text-neutral-200 focus-visible:ring-indigo-500"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Scenario Template</label>
                      <select
                        value={selectedScenarioId}
                        onChange={(e) => setSelectedScenarioId(e.target.value)}
                        className="w-full h-10 px-3 border border-neutral-700 rounded-lg text-xs bg-neutral-950 font-semibold text-neutral-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      >
                        <option value="">Select a scenario...</option>
                        {scenarios.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.industry})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Class and Target Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Class Cohort</label>
                      <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full h-10 px-3 border border-neutral-700 rounded-lg text-xs bg-neutral-950 font-semibold text-neutral-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      >
                        <option value="">Select a class...</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Target Assignment Type</label>
                      <select
                        value={targetType}
                        onChange={(e) => {
                          setTargetType(e.target.value as any)
                          setSelectedStudentIds([])
                        }}
                        className="w-full h-10 px-3 border border-neutral-700 rounded-lg text-xs bg-neutral-950 font-semibold text-neutral-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      >
                        <option value="CLASS">Entire Classroom</option>
                        <option value="GROUP">Selected Student Group</option>
                        <option value="STUDENT">Individual Student</option>
                      </select>
                    </div>
                  </div>

                  {/* Target Students Picker List */}
                  {selectedClassId && targetType !== "CLASS" && (
                    <div className="space-y-2 border border-neutral-800 rounded-xl p-4 bg-neutral-950 text-left animate-in fade-in duration-200">
                      <div className="flex justify-between items-center gap-4">
                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Select Target Students ({selectedStudentIds.length} selected)</label>
                        <div className="relative max-w-[200px] h-8 flex items-center">
                          <Search className="absolute left-2.5 h-3 w-3 text-neutral-500" />
                          <Input
                            type="text"
                            placeholder="Search student..."
                            value={studentSearchQuery}
                            onChange={(e) => setStudentSearchQuery(e.target.value)}
                            className="pl-8 text-[11px] h-8 bg-neutral-900 border-neutral-800"
                          />
                        </div>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-2 pt-2 divide-y divide-neutral-900">
                        {filteredClassStudents.length === 0 ? (
                          <span className="text-neutral-500 text-xs block py-2">No students found.</span>
                        ) : (
                          filteredClassStudents.map(student => (
                            <label key={student.id} className="flex items-center gap-3 py-2 cursor-pointer text-xs font-semibold hover:bg-neutral-900/50 px-2 rounded-lg">
                              <input
                                type="checkbox"
                                checked={selectedStudentIds.includes(student.id)}
                                onChange={() => handleStudentCheckboxChange(student.id)}
                                className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div>
                                <span className="text-neutral-200 block">{student.name}</span>
                                <span className="text-[10px] text-neutral-500 block">{student.email}</span>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Configuration Parameters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-neutral-800 pt-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Campaign Duration</label>
                      <select
                        value={durationDays}
                        onChange={(e) => setDurationDays(Number(e.target.value) as any)}
                        className="w-full h-10 px-3 border border-neutral-700 rounded-lg text-xs bg-neutral-950 font-semibold text-neutral-300 focus:outline-none"
                      >
                        <option value="15">15 Days</option>
                        <option value="30">30 Days</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Daily Processing Time (UTC)</label>
                      <Input
                        type="text"
                        placeholder="HH:MM (e.g. 09:00)"
                        value={dailyProcessingTime}
                        onChange={(e) => setDailyProcessingTime(e.target.value)}
                        className="text-xs border-neutral-700 bg-neutral-950 h-10 text-neutral-200 focus-visible:ring-indigo-500"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Difficulty</label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full h-10 px-3 border border-neutral-700 rounded-lg text-xs bg-neutral-950 font-semibold text-neutral-300 focus:outline-none"
                      >
                        <option value="easy">Easy (High Baseline)</option>
                        <option value="medium">Medium (Standard)</option>
                        <option value="hard">Hard (High Volatility)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Daily Budget Cap ($)</label>
                      <Input
                        type="number"
                        min="1"
                        value={dailyBudgetCap}
                        onChange={(e) => setDailyBudgetCap(Number(e.target.value))}
                        className="text-xs border-neutral-700 bg-neutral-950 h-10 text-neutral-200 focus-visible:ring-indigo-500"
                        required
                      />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Start Date</label>
                      <Input
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="text-xs border-neutral-700 bg-neutral-950 h-10 text-neutral-200 focus-visible:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
                    <div className="space-y-0.5 text-left">
                      <span className="text-xs font-bold text-neutral-300 block">Auto-Start Campaigns</span>
                      <span className="text-[10px] text-neutral-500 block leading-tight">Start student campaign runs automatically when Start Date is reached without student clicking Manual Start.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoStart}
                      onChange={(e) => setAutoStart(e.target.checked)}
                      className="h-4.5 w-4.5 rounded border-neutral-700 bg-neutral-950 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black h-11 rounded-xl transition-all shadow-md"
                    >
                      {isLoading ? "Deploying..." : "Launch Assignment"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreating(false)}
                      disabled={isLoading}
                      className="flex-1 border-neutral-800 text-neutral-400 hover:bg-neutral-800 text-xs font-bold h-11 rounded-xl"
                    >
                      Cancel
                    </Button>
                  </div>

                </form>
              </CardContent>
            </Card>
          )}

          {/* B. Loading Details Mode */}
          {isLoadingDetails && (
            <div className="p-12 text-center text-neutral-500 font-semibold text-xs animate-pulse">
              Loading assignment metrics and logs...
            </div>
          )}

          {/* C. View Assignment Details Mode */}
          {!isCreating && selectedAssignmentId && selectedAssignment && !isLoadingDetails && (
            <div className="space-y-8 animate-in fade-in duration-350">
              
              {/* Detailed View Header */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-left flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-md">
                <div className="space-y-1">
                  <Badge className={`text-[10px] font-black uppercase tracking-wider mb-2 border ${getStatusBadgeClass(selectedAssignment.status)}`}>
                    {selectedAssignment.status}
                  </Badge>
                  <h2 className="text-xl font-extrabold text-neutral-100">{selectedAssignment.assignmentName}</h2>
                  <p className="text-xs text-neutral-400 font-medium leading-relaxed">
                    Class: {selectedAssignment.class?.name} • Target Type: {selectedAssignment.targetType}
                  </p>
                </div>
                
                {/* Control Action Buttons depending on status */}
                <div className="flex flex-wrap gap-2">
                  {selectedAssignment.status === "DRAFT" && (
                    <Button
                      onClick={() => handlePublishAssignment(selectedAssignment.id)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-9 px-3 rounded-lg flex items-center gap-1.5"
                    >
                      <Sparkles className="h-4 w-4" />
                      Publish
                    </Button>
                  )}
                  {(selectedAssignment.status === "DRAFT" || selectedAssignment.status === "SCHEDULED") && (
                    <Button
                      onClick={() => handleStartAssignment(selectedAssignment.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-3 rounded-lg flex items-center gap-1.5"
                    >
                      <Play className="h-4 w-4" />
                      Start Now
                    </Button>
                  )}
                  {selectedAssignment.status === "ACTIVE" && (
                    <Button
                      onClick={() => handleCancelAssignment(selectedAssignment.id)}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-9 px-3 rounded-lg flex items-center gap-1.5"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              {/* Assignment Analytics Stats Dashboard */}
              {assignmentReport && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left">
                  <Card className="border border-neutral-800 bg-neutral-900 p-5 flex flex-col justify-between shadow-sm">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block">Average Score</span>
                    <span className="text-2xl font-black text-indigo-400 mt-2 block">{assignmentReport.averageScore}%</span>
                  </Card>
                  <Card className="border border-neutral-800 bg-neutral-900 p-5 flex flex-col justify-between shadow-sm">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block">Campaigns Active</span>
                    <span className="text-2xl font-black text-emerald-400 mt-2 block">
                      {assignmentReport.campaignsStarted} / {assignmentReport.totalAssigned}
                    </span>
                  </Card>
                  <Card className="border border-neutral-800 bg-neutral-900 p-5 flex flex-col justify-between shadow-sm">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block">Total conversions</span>
                    <span className="text-2xl font-black text-amber-400 mt-2 block">{assignmentReport.totalConversions.toLocaleString()}</span>
                  </Card>
                  <Card className="border border-neutral-800 bg-neutral-900 p-5 flex flex-col justify-between shadow-sm">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block">Missed Days</span>
                    <span className="text-2xl font-black text-rose-500 mt-2 block">{assignmentReport.missedSubmissions} Days</span>
                  </Card>
                </div>
              )}

              {/* Leaderboard and Student list Tabs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                
                {/* 1. Leaderboard */}
                <Card className="border border-neutral-800 bg-neutral-900 shadow-sm p-5 flex flex-col">
                  <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5 border-b border-neutral-800 pb-3 mb-3">
                    <Trophy className="h-4.5 w-4.5 text-indigo-500" />
                    Assignment Leaderboard
                  </h3>
                  <div className="divide-y divide-neutral-800 flex-1 max-h-72 overflow-y-auto pr-1">
                    {assignmentLeaderboard.length === 0 ? (
                      <div className="py-8 text-center text-neutral-500 font-semibold text-xs">No active runs recorded yet.</div>
                    ) : (
                      assignmentLeaderboard.map((student, idx) => (
                        <div key={student.userId} className="py-2.5 flex justify-between items-center text-xs font-semibold text-neutral-400">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-neutral-600">#{idx + 1}</span>
                            <span className="font-bold text-neutral-200">{student.studentName}</span>
                          </div>
                          <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">{student.averageScore}% score</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                {/* 2. Top Performers and At Risk Summary */}
                {assignmentReport && (
                  <Card className="border border-neutral-800 bg-neutral-900 shadow-sm p-5 flex flex-col">
                    <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider border-b border-neutral-800 pb-3 mb-3">
                      Overview Diagnostics
                    </h3>
                    <div className="space-y-4 text-xs font-semibold text-neutral-400 leading-relaxed">
                      <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950 space-y-1">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block flex items-center gap-1"><Trophy className="h-3 w-3" /> Top Performers</span>
                        <p>{assignmentReport.topPerformers.length > 0 ? `${assignmentReport.topPerformers.length} students scoring above 80%` : "No student currently above 80% score."}</p>
                      </div>
                      <div className="p-3.5 rounded-xl border border-rose-950 bg-rose-950/20 text-rose-300 space-y-1">
                        <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> At Risk Watchlist</span>
                        <p>{assignmentReport.atRiskStudents.length > 0 ? `${assignmentReport.atRiskStudents.length} students scoring below 60%` : "All active student campaigns are healthy."}</p>
                      </div>
                    </div>
                  </Card>
                )}

              </div>

              {/* Detailed Student Progress List */}
              <Card className="border border-neutral-800 bg-neutral-900 shadow-sm text-left">
                <CardHeader className="border-b border-neutral-800 p-5">
                  <CardTitle className="text-sm font-black text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="h-4.5 w-4.5 text-neutral-500" />
                    Assigned Student Campaigns ({assignmentStudents.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {assignmentStudents.length === 0 ? (
                    <div className="p-12 text-center text-neutral-500 font-semibold text-xs">
                      No students assigned to this campaign.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs font-semibold text-neutral-400">
                      <thead className="bg-neutral-950/60 uppercase text-[9px] font-black tracking-widest text-neutral-500 border-b border-neutral-800">
                        <tr>
                          <th className="py-3 px-4">Student Name</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Current Day</th>
                          <th className="py-3 px-4 text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800">
                        {assignmentStudents.map((rel) => {
                          const run = rel.campaignRun
                          const avgScore = run?.results.length
                            ? run.results.reduce((sum: number, r: any) => sum + r.compositeScore, 0) / run.results.length
                            : 0

                          return (
                            <tr key={rel.id} className="hover:bg-neutral-800/20">
                              <td className="py-3 px-4 font-bold text-neutral-200">{rel.student.name}</td>
                              <td className="py-3 px-4 text-neutral-400">{rel.student.email}</td>
                              <td className="py-3 px-4">
                                <Badge className={`text-[9px] font-bold py-0.5 px-2 border ${getStatusBadgeClass(rel.status)}`}>
                                  {rel.status}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                {run ? `Day ${run.currentDay} / ${run.durationDays}` : "Not Started"}
                              </td>
                              <td className="py-3 px-4 text-right font-black text-neutral-200">
                                {run && run.results.length > 0 ? `${avgScore.toFixed(1)}%` : "—"}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

            </div>
          )}

          {/* D. Welcome/No Selection Mode */}
          {!isCreating && !selectedAssignmentId && (
            <Card className="border border-neutral-800 bg-neutral-900 shadow-sm border-2 border-dashed border-neutral-800 rounded-2xl min-h-[350px] flex items-center justify-center">
              <div className="text-center space-y-3 p-6 text-left max-w-sm">
                <Calendar className="mx-auto h-12 w-12 text-neutral-700 animate-bounce" />
                <h3 className="font-extrabold text-sm text-neutral-200 text-center">Assignments Administration Panel</h3>
                <p className="text-xs text-neutral-500 leading-relaxed font-semibold text-center">
                  Select an active scenario assignment on the left, or create a new assignment mapping for your students.
                </p>
              </div>
            </Card>
          )}

        </div>

      </div>

    </div>
  )
}
