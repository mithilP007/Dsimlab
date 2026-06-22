import { useState, useEffect } from "react"
import { useInstructorPortalStore } from "@/stores/instructorPortalStore"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import api from "@/lib/api"
import {
  Shield,
  Cpu,
  LineChart,
  BookOpen,
  ClipboardList,
  Network,
  Database,
  Lock,
  RefreshCw,
  Search,
  CheckCircle,
  Activity,
  ArrowRight,
  AlertTriangle,
  User,
  Clock,
  Target,
  Users
} from "lucide-react"

export function InstructorGovernance() {
  const {
    classes,
    students,
    selectedClassId,
    fetchClasses,
    fetchClassDetails,
    resetStudentSimulation,
    selectClass
  } = useInstructorPortalStore()

  // Tab State
  const [activeTab, setActiveTab] = useState<"engine" | "scoring" | "scenarios" | "audit" | "states" | "models" | "locks">("engine")
  
  // Custom Scenario States
  const [scenarios, setScenarios] = useState<any[]>([])
  const [scenariosLoading, setScenariosLoading] = useState(false)

  // Audit State
  const [selectedStudentId, setSelectedStudentId] = useState<string>("")
  const [studentLogs, setStudentLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Reset states
  const [resettingClass, setResettingClass] = useState(false)
  const [resettingStudent, setResettingStudent] = useState<string | null>(null)

  // Fetch initial classes and scenarios
  useEffect(() => {
    fetchClasses()
    fetchScenarios()
  }, [])

  // Auto-select class details if class is selected
  useEffect(() => {
    if (selectedClassId) {
      fetchClassDetails(selectedClassId)
    }
  }, [selectedClassId])

  async function fetchScenarios() {
    setScenariosLoading(true)
    try {
      const res = await api.get<{ success: boolean; scenarios: any[] }>("/api/v1/scenario")
      if (res.data?.success) {
        setScenarios(res.data.scenarios)
      }
    } catch (err) {
      console.error("Failed to load scenarios:", err)
    } finally {
      setScenariosLoading(false)
    }
  }

  // Fetch student logs when selection changes
  useEffect(() => {
    if (selectedStudentId) {
      fetchAuditLogs(selectedStudentId)
    } else {
      setStudentLogs([])
    }
  }, [selectedStudentId])

  async function fetchAuditLogs(studentId: string) {
    setLogsLoading(true)
    try {
      const res = await api.get<{ success: boolean; logs: any[] }>(`/api/v1/audit?studentId=${studentId}`)
      if (res.data?.success) {
        setStudentLogs(res.data.logs)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to load decision audit logs.")
    } finally {
      setLogsLoading(false)
    }
  }

  // Reset individual simulation
  const handleResetIndividual = async (studentId: string, studentName: string) => {
    if (confirm(`Are you sure you want to reset simulation progress for ${studentName}? This will reset them back to Round 1.`)) {
      setResettingStudent(studentId)
      try {
        await resetStudentSimulation(studentId)
        toast.success(`Simulation reset successfully for ${studentName}`)
        if (selectedClassId) {
          fetchClassDetails(selectedClassId)
        }
      } catch (err: any) {
        toast.error(err.response?.data?.error || "Reset failed.")
      } finally {
        setResettingStudent(null)
      }
    }
  }

  // Reset entire class cohort
  const handleResetClass = async () => {
    if (!selectedClassId) return
    const activeClass = classes.find(c => c.id === selectedClassId)
    if (confirm(`WARNING: Are you sure you want to reset ALL simulations in the class "${activeClass?.name}"? All students will restart from Round 1. This action is irreversible.`)) {
      setResettingClass(true)
      try {
        await api.post(`/api/classes/${selectedClassId}/reset`)
        toast.success(`Successfully reset all student simulation states for ${activeClass?.name}`)
        fetchClassDetails(selectedClassId)
      } catch (err: any) {
        toast.error(err.response?.data?.error || "Cohort reset failed.")
      } finally {
        setResettingClass(false)
      }
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
      
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-950 p-6 md:p-8 text-white shadow-lg">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-400 animate-pulse" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">Academic Administration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              Simulation Governance Center
            </h1>
            <p className="text-sm md:text-base text-neutral-300 max-w-xl font-medium leading-relaxed">
              Audit student decision trails, examine mathematical models, and override simulation states or reset cohort milestones.
            </p>
          </div>
          <Badge className="bg-indigo-650 text-white font-bold text-xs py-1 px-3 shrink-0 self-start md:self-auto uppercase tracking-wide">
            Faculty Shield Active
          </Badge>
        </div>
      </div>

      {/* TABS SELECTOR CONTAINER */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-4 justify-start">
        <button
          onClick={() => setActiveTab("engine")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all border ${
            activeTab === "engine" ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-neutral-50 text-neutral-500 hover:text-neutral-800 border-neutral-200"
          }`}
        >
          <Cpu className="h-4 w-4" />
          Simulation Engine
        </button>
        <button
          onClick={() => setActiveTab("scoring")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all border ${
            activeTab === "scoring" ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-neutral-50 text-neutral-500 hover:text-neutral-800 border-neutral-200"
          }`}
        >
          <LineChart className="h-4 w-4" />
          Scoring Framework
        </button>
        <button
          onClick={() => setActiveTab("scenarios")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all border ${
            activeTab === "scenarios" ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-neutral-50 text-neutral-500 hover:text-neutral-800 border-neutral-200"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Scenario Templates
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all border ${
            activeTab === "audit" ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-neutral-50 text-neutral-500 hover:text-neutral-800 border-neutral-200"
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Decision Audit Trail
        </button>
        <button
          onClick={() => setActiveTab("states")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all border ${
            activeTab === "states" ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-neutral-50 text-neutral-500 hover:text-neutral-800 border-neutral-200"
          }`}
        >
          <Network className="h-4 w-4" />
          Simulation States
        </button>
        <button
          onClick={() => setActiveTab("models")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all border ${
            activeTab === "models" ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-neutral-50 text-neutral-500 hover:text-neutral-800 border-neutral-200"
          }`}
        >
          <Database className="h-4 w-4" />
          Data Models
        </button>
        <button
          onClick={() => setActiveTab("locks")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all border ${
            activeTab === "locks" ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-neutral-50 text-neutral-500 hover:text-neutral-800 border-neutral-200"
          }`}
        >
          <Lock className="h-4 w-4" />
          Evaluation Locks
        </button>
      </div>

      {/* DYNAMIC TAB BODY */}
      <div className="w-full">

        {/* 1. SIMULATION ENGINE */}
        {activeTab === "engine" && (
          <div className="space-y-6 animate-in fade-in duration-200 text-left">
            <Card className="border-neutral-200 shadow-md">
              <CardHeader>
                <CardTitle className="text-base font-black text-neutral-900 uppercase tracking-wide flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-indigo-600" />
                  Core Math & Simulation Cycle
                </CardTitle>
                <CardDescription className="text-xs font-semibold">
                  How daily SEO, Google Ads, and Meta Ads metrics are processed by the simulation queue.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-neutral-600 text-xs font-medium leading-relaxed">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50 space-y-3">
                    <h4 className="font-extrabold text-neutral-905 flex items-center gap-1">
                      <Search className="h-4 w-4 text-emerald-600" />
                      1. SEO Impressions & Click Flow
                    </h4>
                    <p>
                      SEO traffic is simulated based on domain age authority, keyword weight configurations, and backlink budgets. 
                      Impressions scale organically, adjusted by search engine algorithm variance.
                    </p>
                    <div className="bg-white p-3 rounded-lg border border-neutral-200/50 font-mono text-[10px] text-neutral-800 space-y-1">
                      <span className="font-black text-indigo-700 block">Impression Multiplier Formula:</span>
                      <code>SEO_Imp = BaselineVolume * (ContentQuality * 0.15 + (BacklinkBudget / 500) * 0.2)</code>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50 space-y-3">
                    <h4 className="font-extrabold text-neutral-905 flex items-center gap-1 text-indigo-650">
                      <Target className="h-4 w-4" />
                      2. PPC Bid Auction Engine
                    </h4>
                    <p>
                      Paid campaigns are run through simulated auctions. Bids are ranked against classmate keywords. 
                      Higher Quality scores and CPC ceilings secure higher impression shares and lower final CPC averages.
                    </p>
                    <div className="bg-white p-3 rounded-lg border border-neutral-200/50 font-mono text-[10px] text-neutral-800 space-y-1">
                      <span className="font-black text-indigo-700 block">Daily Click Probability:</span>
                      <code>CTR = Base_CTR * (AdRelevanceMultiplier * 0.6 + BidWeight * 0.4)</code>
                    </div>
                  </div>
                </div>

                <div className="p-5 border border-indigo-100 bg-indigo-50/20 rounded-2xl space-y-2">
                  <h4 className="font-extrabold text-indigo-950 flex items-center gap-1">
                    <CheckCircle className="h-4.5 w-4.5 text-indigo-600" />
                    Daily Processing Execution
                  </h4>
                  <p>
                    The queue processor advances student campaigns over a 30-day timeline.
                    Every simulation round calculates metrics daily, applying market events (algorithm updates, competitor pricing adjustments) dynamically on Day 7, 14, and 21.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 2. SCORING FRAMEWORK */}
        {activeTab === "scoring" && (
          <div className="space-y-6 animate-in fade-in duration-200 text-left">
            <Card className="border-neutral-200 shadow-md">
              <CardHeader>
                <CardTitle className="text-base font-black text-neutral-900 uppercase tracking-wide flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-indigo-600" />
                  Strategic Scoring Index Weights
                </CardTitle>
                <CardDescription className="text-xs font-semibold">
                  Parameters used to compute composite student marks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-neutral-500 text-xs font-semibold leading-relaxed">
                  Composite performance marks are scored based on strategic consistency and spending discipline, rather than absolute revenue alone.
                </p>
                
                <div className="space-y-4">
                  {[
                    { name: "Strategic Alignment (Ad Objective Match)", weight: "20%", color: "bg-indigo-605" },
                    { name: "Budget Discipline (No Overspending/Underspending)", weight: "10%", color: "bg-emerald-500" },
                    { name: "Campaign Optimization Intensity", weight: "20%", color: "bg-amber-500" },
                    { name: "Keyword & Audience Relevance", weight: "20%", color: "bg-blue-500" },
                    { name: "Creative Headline & Asset Quality", weight: "15%", color: "bg-pink-500" },
                    { name: "Return on Advertising Spend (ROI/ROAS Index)", weight: "15%", color: "bg-purple-650" }
                  ].map((w, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-neutral-750">
                        <span>{w.name}</span>
                        <span>{w.weight}</span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                        <div className={`${w.color} h-full`} style={{ width: w.weight }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 font-mono text-[10px] text-neutral-800 space-y-1">
                  <span className="font-extrabold text-indigo-750 block">Composite Performance Formula:</span>
                  <code>Composite_Score = (Alignment * 0.20) + (BudgetDiscipline * 0.10) + (Optimization * 0.20) + (KeywordAudience * 0.20) + (Creative * 0.15) + (ROI * 0.15)</code>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 3. SCENARIO TEMPLATES */}
        {activeTab === "scenarios" && (
          <div className="space-y-6 animate-in fade-in duration-200 text-left">
            <div className="text-left space-y-1">
              <h3 className="text-base font-black text-neutral-900">Standard Course Scenarios</h3>
              <p className="text-xs text-neutral-455 font-semibold">Active simulation templates registered in database.</p>
            </div>

            {scenariosLoading ? (
              <div className="py-12 flex items-center justify-center text-xs font-semibold text-neutral-400">
                <Activity className="h-6 w-6 animate-spin text-indigo-650 mr-2" />
                Loading scenario records...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {scenarios.map((s, idx) => (
                  <Card key={idx} className="border border-neutral-200/80 shadow-sm hover:shadow-md transition-shadow relative bg-white flex flex-col justify-between">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline" className="text-[9px] font-extrabold uppercase border-neutral-200 text-neutral-500">
                          {s.industry || "Marketing"}
                        </Badge>
                        <Badge className={`${s.difficulty === 'hard' ? 'bg-red-500' : 'bg-emerald-600'} text-white text-[9px] uppercase border-none font-bold`}>
                          {s.difficulty || "Medium"}
                        </Badge>
                      </div>
                      <CardTitle className="text-sm font-black text-neutral-900 mt-2 truncate">{s.name}</CardTitle>
                      <CardDescription className="text-[11px] font-medium leading-relaxed text-neutral-500 h-16 overflow-y-auto mt-1">
                        {s.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="border-t border-neutral-50 pt-3 mt-2 space-y-2 text-xs text-neutral-600 font-semibold">
                      <div className="flex justify-between">
                        <span>Max Rounds:</span>
                        <span className="text-neutral-800 font-bold">{s.maxRounds} Rounds</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Round Budget Cap:</span>
                        <span className="text-neutral-800 font-bold">₹{s.budgetPerRound}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Baseline Traffic:</span>
                        <span className="text-neutral-800 font-bold">{s.baselineOrganicTraffic} monthly</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Target KPI:</span>
                        <span className="text-indigo-600 font-extrabold capitalize">{s.targetKPI}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. DECISION AUDIT TRAIL */}
        {activeTab === "audit" && (
          <div className="space-y-6 animate-in fade-in duration-200 text-left">
            <Card className="border-neutral-200 shadow-md">
              <CardHeader className="border-b border-neutral-100">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-black text-neutral-900 uppercase tracking-wide flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-indigo-650" />
                      Student Decision Audit Timeline
                    </CardTitle>
                    <CardDescription className="text-xs font-semibold">
                      Review chronological submissions, budget changes, and target keywords logs.
                    </CardDescription>
                  </div>
                  
                  {/* Student selector */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-neutral-500">Student:</span>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="border border-neutral-250 bg-white rounded-lg p-1.5 text-xs font-bold text-neutral-700 outline-none max-w-[200px]"
                    >
                      <option value="">-- Choose Student --</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                {!selectedStudentId ? (
                  <div className="p-12 text-center text-neutral-450 font-bold text-xs space-y-2">
                    <User className="h-8 w-8 text-neutral-300 mx-auto" />
                    <p>Select a student from the dropdown above to render audit logs.</p>
                  </div>
                ) : logsLoading ? (
                  <div className="p-12 text-center text-neutral-450 font-bold text-xs">
                    <Activity className="h-6 w-6 animate-spin text-indigo-655 mx-auto mb-2" />
                    Fetching student audit trails...
                  </div>
                ) : studentLogs.length === 0 ? (
                  <div className="p-10 text-center text-neutral-450 font-bold text-xs space-y-1">
                    <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto" />
                    <p>No activity logs found for this student.</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-indigo-100 pl-6 ml-4 space-y-6">
                    {studentLogs.map((log, idx) => (
                      <div key={idx} className="relative space-y-1">
                        {/* Dot marker */}
                        <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-indigo-650 bg-white z-10 shadow-sm" />
                        
                        <div className="flex justify-between items-start text-xs">
                          <span className="font-extrabold text-neutral-850 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded uppercase">
                            {log.action}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-semibold flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 font-semibold leading-relaxed pt-1">
                          {log.details}
                        </p>
                        {log.ipAddress && (
                          <span className="text-[9px] font-mono text-neutral-400 font-medium block">IP: {log.ipAddress}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 5. SIMULATION STATES */}
        {activeTab === "states" && (
          <div className="space-y-6 animate-in fade-in duration-200 text-left">
            <Card className="border-neutral-200 shadow-md">
              <CardHeader>
                <CardTitle className="text-base font-black text-neutral-900 uppercase tracking-wide flex items-center gap-2">
                  <Network className="h-5 w-5 text-indigo-650" />
                  Simulation Round State Machine
                </CardTitle>
                <CardDescription className="text-xs font-semibold">
                  Lifecycle transitions of a student round.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                
                {/* Horizontal state diagram */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2">
                  {[
                    { id: "INITIALIZED", desc: "Database state ready." },
                    { id: "DECISION_OPEN", desc: "Editing allowed." },
                    { id: "LOCKED", desc: "Decisions locked." },
                    { id: "PROCESSING", desc: "Scoring runs." },
                    { id: "RESULTS_READY", desc: "Charts ready." },
                    { id: "COMPLETED", desc: "Simulation final." }
                  ].map((s, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
                      <div className="p-3 border border-neutral-200 bg-white rounded-xl shadow-sm text-center md:text-left min-w-[130px] flex flex-col justify-center">
                        <span className="text-[10px] font-black text-indigo-655 block uppercase tracking-wider">{s.id}</span>
                        <span className="text-[9px] text-neutral-400 font-semibold block mt-0.5">{s.desc}</span>
                      </div>
                      {idx < 5 && (
                        <ArrowRight className="h-5 w-5 text-neutral-300 transform rotate-90 md:rotate-0" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-4 border border-neutral-100 bg-neutral-50 rounded-xl space-y-3 text-xs text-neutral-600">
                  <h4 className="font-extrabold text-neutral-900">Key Constraints:</h4>
                  <ul className="list-disc list-inside space-y-1.5 font-semibold">
                    <li>Students can ONLY edit decisions when in <code className="text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded">DECISION_OPEN</code> state.</li>
                    <li>Locked decisions cannot be unlocked by the student.</li>
                    <li>Instructors can reset student progress back to <code className="text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded">DECISION_OPEN</code> Round 1.</li>
                  </ul>
                </div>

              </CardContent>
            </Card>
          </div>
        )}

        {/* 6. DATA MODELS */}
        {activeTab === "models" && (
          <div className="space-y-6 animate-in fade-in duration-200 text-left">
            <Card className="border-neutral-200 shadow-md">
              <CardHeader>
                <CardTitle className="text-base font-black text-neutral-900 uppercase tracking-wide flex items-center gap-2">
                  <Database className="h-5 w-5 text-indigo-655" />
                  Decision Schema Parameters
                </CardTitle>
                <CardDescription className="text-xs font-semibold">
                  Specification of values accepted by the simulation database schema.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* SEO schema */}
                  <div className="p-4 border border-neutral-100 bg-neutral-50 rounded-xl space-y-3 text-xs">
                    <h4 className="font-extrabold text-emerald-650 block border-b border-neutral-200 pb-1.5 uppercase">SEO Decisions Schema</h4>
                    <ul className="space-y-2 font-mono text-[10px] text-neutral-800">
                      <li>
                        <span className="text-indigo-700 block font-sans font-bold">seoTargetKeywords:</span>
                        <code>string[] (e.g. ["crm tool", "collaboration CRM"])</code>
                      </li>
                      <li>
                        <span className="text-indigo-700 block font-sans font-bold">seoContentQuality:</span>
                        <code>float (Value range: 1.0 to 10.0)</code>
                      </li>
                      <li>
                        <span className="text-indigo-700 block font-sans font-bold">seoBacklinkBudget:</span>
                        <code>float (Maximum ₹5,000 budget cap)</code>
                      </li>
                    </ul>
                  </div>

                  {/* Google Ads schema */}
                  <div className="p-4 border border-neutral-100 bg-neutral-50 rounded-xl space-y-3 text-xs">
                    <h4 className="font-extrabold text-indigo-650 block border-b border-neutral-200 pb-1.5 uppercase">Google Ads Schema</h4>
                    <ul className="space-y-2 font-mono text-[10px] text-neutral-800">
                      <li>
                        <span className="text-indigo-700 block font-sans font-bold">campaigns:</span>
                        <code>{`[{ name, budget, biddingStrategy, keywords: [{ word, bid }] }]`}</code>
                      </li>
                      <li>
                        <span className="text-indigo-700 block font-sans font-bold">biddingStrategy:</span>
                        <code>string (Manual CPC, Max Clicks)</code>
                      </li>
                      <li>
                        <span className="text-indigo-700 block font-sans font-bold">negativeKeywords:</span>
                        <code>string[]</code>
                      </li>
                    </ul>
                  </div>

                  {/* Meta Ads schema */}
                  <div className="p-4 border border-neutral-100 bg-neutral-50 rounded-xl space-y-3 text-xs">
                    <h4 className="font-extrabold text-pink-650 block border-b border-neutral-200 pb-1.5 uppercase">Meta Ads Schema</h4>
                    <ul className="space-y-2 font-mono text-[10px] text-neutral-800">
                      <li>
                        <span className="text-indigo-700 block font-sans font-bold">campaigns:</span>
                        <code>{`[{ name, budget, audienceInterest, placement, bidType, bidAmount, creativeQuality }]`}</code>
                      </li>
                      <li>
                        <span className="text-indigo-700 block font-sans font-bold">placement:</span>
                        <code>string (auto, facebook, instagram)</code>
                      </li>
                      <li>
                        <span className="text-indigo-700 block font-sans font-bold">audienceInterest:</span>
                        <code>string (business-owners, tech-enthusiasts)</code>
                      </li>
                    </ul>
                  </div>

                </div>

              </CardContent>
            </Card>
          </div>
        )}

        {/* 7. EVALUATION LOCKS */}
        {activeTab === "locks" && (
          <div className="space-y-6 animate-in fade-in duration-200 text-left">
            <Card className="border-neutral-200 shadow-md">
              <CardHeader className="border-b border-neutral-100">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-black text-neutral-900 uppercase tracking-wide flex items-center gap-2">
                      <Lock className="h-5 w-5 text-indigo-650" />
                      Cohort Resets & Override Control
                    </CardTitle>
                    <CardDescription className="text-xs font-semibold">
                      Control student campaign locks, unlock states, or wipe active cohort simulation progress.
                    </CardDescription>
                  </div>
                  
                  {/* Classroom Selector */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-neutral-550">Cohort Class:</span>
                    <select
                      value={selectedClassId || ""}
                      onChange={(e) => selectClass(e.target.value || null)}
                      className="border border-neutral-250 bg-white rounded-lg p-1.5 text-xs font-bold text-neutral-700 outline-none max-w-[200px]"
                    >
                      <option value="">-- Select Class --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-0 overflow-x-auto">
                {!selectedClassId ? (
                  <div className="p-12 text-center text-neutral-450 font-bold text-xs space-y-2">
                    <Users className="h-8 w-8 text-neutral-300 mx-auto" />
                    <p>Select a cohort class above to manage locks and resets.</p>
                  </div>
                ) : (
                  <div className="p-6 space-y-6">
                    {/* Class actions */}
                    <div className="flex justify-between items-center bg-rose-50 border border-rose-200 p-4 rounded-xl text-xs">
                      <div className="space-y-1 text-left">
                        <h4 className="font-extrabold text-rose-905 flex items-center gap-1">
                          <AlertTriangle className="h-4.5 w-4.5 text-rose-650" />
                          Emergency Cohort Reset
                        </h4>
                        <p className="text-rose-700 font-semibold">
                          Wipe progress for all students in this class. They will restart at Round 1 immediately.
                        </p>
                      </div>
                      
                      <Button
                        onClick={handleResetClass}
                        disabled={resettingClass}
                        className="bg-rose-600 hover:bg-rose-750 text-white font-black text-xs h-9 px-4 rounded-xl shadow-sm shrink-0 flex items-center gap-1.5"
                      >
                        {resettingClass ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Reset Cohort
                      </Button>
                    </div>

                    {/* Student Lock Grid */}
                    <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-wider border-b border-neutral-100">
                          <tr>
                            <th className="px-5 py-3.5">Student Name / Email</th>
                            <th className="px-5 py-3.5">Simulation State</th>
                            <th className="px-5 py-3.5">Round</th>
                            <th className="px-5 py-3.5">Strategic Score</th>
                            <th className="px-5 py-3.5 text-right">Emergency Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-700">
                          {students.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-neutral-450 font-bold">No students enrolled.</td>
                            </tr>
                          ) : (
                            students.map(s => (
                              <tr key={s.id} className="hover:bg-neutral-50/40 transition-colors">
                                <td className="px-5 py-3.5">
                                  <div className="font-bold text-neutral-850">{s.name}</div>
                                  <div className="text-[10px] text-neutral-455 font-semibold mt-0.5">{s.email}</div>
                                </td>
                                <td className="px-5 py-3.5">
                                  <Badge className="bg-slate-100 text-slate-700 border-none font-bold text-[9px] uppercase">
                                    Active
                                  </Badge>
                                </td>
                                <td className="px-5 py-3.5 text-neutral-550 font-bold">Round {s.roundScores?.length || 1}</td>
                                <td className="px-5 py-3.5">
                                  <span className="text-indigo-650 font-extrabold">{s.overallScore}%</span>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <Button
                                    variant="outline"
                                    onClick={() => handleResetIndividual(s.id, s.name)}
                                    disabled={resettingStudent === s.id}
                                    className="text-[10px] font-bold border-rose-200 text-rose-600 hover:bg-rose-50 h-8 px-3 rounded-lg"
                                  >
                                    {resettingStudent === s.id ? (
                                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                    )}
                                    Reset Simulation
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </div>

    </div>
  )
}
export default InstructorGovernance
