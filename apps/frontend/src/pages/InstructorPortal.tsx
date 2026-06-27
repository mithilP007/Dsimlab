import { useState, useEffect } from "react"
import { useAuthStore } from "@/stores/authStore"
import { useInstructorPortalStore } from "@/stores/instructorPortalStore"
import { useCertificationStore } from "@/stores/certificationStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  GraduationCap,
  Users,
  Plus,
  Activity,
  Award,
  Sparkles,
  Search,
  Target,
  Share2,
  ArrowRight,
  Copy,
  Check,
  Trash2,
  ArrowLeft,
  Edit,
  Bell,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Trophy,
  HelpCircle,
  Download,
  ExternalLink,
  FileText,
  Clock
} from "lucide-react"
import { Link } from "react-router"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import api from "@/lib/api"

// Click-to-copy clipboard button helper
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded transition-all flex items-center justify-center shrink-0 border ${
        copied 
          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
          : "hover:bg-neutral-100 text-neutral-400 hover:text-neutral-750 border-neutral-200/50 bg-white"
      }`}
      title="Copy Invite Code"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

export function InstructorPortal() {
  const { user } = useAuthStore()
  
  // Store actions
  const {
    classes,
    students,
    selectedClassId,
    analytics,
    fetchClasses,
    fetchClassDetails,
    deleteClass,
    inviteStudent,
    removeStudent,
    resetStudentSimulation,
    selectClass,
    pendingRequests,
    fetchPendingRequests,
    approveJoinRequest,
    rejectJoinRequest,
  } = useInstructorPortalStore()

  // UI Local States
  const [activeTab, setActiveTab] = useState<"classrooms" | "students" | "simulation">("classrooms")
  const [classSubTab, setClassSubTab] = useState<"progress" | "certifications" | "accreditation">("progress")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [facultyEvaluation, setFacultyEvaluation] = useState<any | null>(null)
  const [loadingEvaluation, setLoadingEvaluation] = useState(false)
  const [issuingStudentId, setIssuingStudentId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({})

  // Certifications store actions
  const {
    classCertifications,
    fetchClassCertifications,
    issueCertificate,
    downloadCertificate,
    isLoading: certStoreLoading,
  } = useCertificationStore()

  // Fetch class certifications when a class is selected
  useEffect(() => {
    if (selectedClassId) {
      fetchClassCertifications(selectedClassId).catch(err =>
        console.error("Failed to fetch class certifications:", err)
      )
    }
  }, [selectedClassId, fetchClassCertifications])

  // Fetch faculty evaluation details when accreditation subtab is active
  useEffect(() => {
    if (selectedClassId && classSubTab === "accreditation") {
      setLoadingEvaluation(true)
      api.get(`/api/v1/report/class/${selectedClassId}/faculty-evaluation`)
        .then(res => {
          setFacultyEvaluation(res.data?.evaluation || null)
        })
        .catch(err => {
          console.error("Failed to fetch faculty evaluation:", err)
        })
        .finally(() => {
          setLoadingEvaluation(false)
        })
    }
  }, [selectedClassId, classSubTab])

  // Fetch Classrooms on Mount
  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  // Fetch pending count on initial load (for badge)
  useEffect(() => {
    if (classes.length > 0) {
      fetchPendingRequests()
    }
  }, [classes.length]) // eslint-disable-line

  useEffect(() => {
    if (selectedClassId) {
      fetchPendingRequests()
    }
  }, [selectedClassId, fetchPendingRequests])

  // Classroom Management Actions
  const handleManageClass = async (classId: string) => {
    selectClass(classId)
    await fetchClassDetails(classId)
  }

  const handleDeleteClass = async (classId: string) => {
    if (confirm("Are you sure you want to delete this classroom? All student links will be destroyed.")) {
      try {
        await deleteClass(classId)
      } catch (err) {
        console.error(err)
      }
    }
  }

  const handleResetSim = async (studentId: string) => {
    if (confirm("Are you sure you want to reset this student's simulation progress? They will restart from Round 1.")) {
      try {
        await resetStudentSimulation(studentId)
      } catch (err) {
        console.error(err)
      }
    }
  }

  const handleRemoveStudent = async (studentId: string) => {
    if (confirm("This will revoke the student’s access to this class and simulation. Continue?")) {
      const reason = prompt("Enter removal reason (optional):")
      if (reason !== null) {
        try {
          await removeStudent(selectedClassId!, studentId, reason)
        } catch (err) {
          console.error(err)
        }
      }
    }
  }

  const handleCopyLink = (verId: string) => {
    const link = `${window.location.origin}/verify/${verId}`
    navigator.clipboard.writeText(link)
    setCopiedId(verId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleIssueCertificate = async (studentName: string, band: string, simulationId: string) => {
    setIssuingStudentId(simulationId)
    try {
      await issueCertificate(studentName, band, simulationId)
      if (selectedClassId) {
        await fetchClassCertifications(selectedClassId)
      }
    } catch (err) {
      console.error("Failed to issue certificate:", err)
    } finally {
      setIssuingStudentId(null)
    }
  }

  const handleExportJSON = async () => {
    if (!selectedClassId) return
    setIsExporting(true)
    try {
      const res = await api.get(`/api/v1/report/class/${selectedClassId}/credentials`)
      const data = res.data
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`
      const downloadAnchor = document.createElement("a")
      downloadAnchor.setAttribute("href", jsonString)
      downloadAnchor.setAttribute("download", `class_${selectedClassId}_credentials.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
    } catch (err) {
      console.error("Failed to export credentials JSON:", err)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportCSV = async () => {
    if (!selectedClassId) return
    setIsExporting(true)
    try {
      const res = await api.get(`/api/v1/report/class/${selectedClassId}/credentials`)
      const reportData = res.data?.report || []
      
      const headers = ["Student Name", "Student Email", "Verification ID", "Band", "Issue Date", "Composite Score"]
      const rows = reportData.map((r: any) => [
        `"${r.studentName}"`,
        `"${r.studentEmail}"`,
        `"${r.verificationId}"`,
        `"${r.band}"`,
        `"${new Date(r.issueDate).toLocaleDateString()}"`,
        r.compositeScore
      ])
      
      const csvContent = [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const downloadAnchor = document.createElement("a")
      downloadAnchor.setAttribute("href", url)
      downloadAnchor.setAttribute("download", `class_${selectedClassId}_credentials.csv`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
    } catch (err) {
      console.error("Failed to export credentials CSV:", err)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportGradesCSV = async () => {
    if (!selectedClassId) return
    setIsExporting(true)
    try {
      const res = await api.get(`/api/v1/report/class/${selectedClassId}/grades/export`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `grades_export_${selectedClassId}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error("Failed to export grades CSV:", err)
    } finally {
      setIsExporting(false)
    }
  }

  const getBadgeStyle = (band: string) => {
    const b = band.toUpperCase();
    if (b === 'PLATINUM') return "text-indigo-650 bg-indigo-50 border-indigo-200 border";
    if (b === 'GOLD' || b === 'ADVANCED') return "text-amber-500 bg-amber-50 border-amber-250 border";
    if (b === 'SILVER' || b === 'PROFICIENT') return "text-slate-500 bg-slate-50 border-slate-200 border";
    return "text-amber-700 bg-amber-50 border-amber-200 border"; // BRONZE
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
      
      {/* 1. WELCOME HEADER */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-950 p-6 md:p-8 text-white shadow-lg">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 text-left">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">Instructor Management Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              Instructor Portal: {user?.name || "Professor"}
            </h1>
            <p className="text-sm md:text-base text-neutral-300 max-w-xl font-medium leading-relaxed">
              Create classrooms, generate invite codes, monitor student submissions, and test simulated marketing algorithms.
            </p>
          </div>
          <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1 px-2.5 shrink-0 self-start md:self-auto">
            {user?.institution || "Institution Portal"}
          </Badge>
        </div>
      </div>

      {/* PORTAL STATS HORIZONTAL CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* Total Students Card */}
        <div className="p-5 rounded-2xl border border-neutral-200/80 bg-white shadow-sm flex items-center gap-4 text-left hover:shadow-md transition-shadow">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-inner">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Total Students</span>
            <span className="text-xl font-extrabold text-neutral-900 block mt-0.5">
              {analytics.totalStudents} Students
            </span>
          </div>
        </div>

        {/* Active Students Card */}
        <div className="p-5 rounded-2xl border border-neutral-200/80 bg-white shadow-sm flex items-center gap-4 text-left hover:shadow-md transition-shadow">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Active Students</span>
            <span className="text-xl font-extrabold text-neutral-900 block mt-0.5 flex items-center gap-2">
              {analytics.activeNow} Active Now
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </span>
          </div>
        </div>

        {/* Average Score Card */}
        <div className="p-5 rounded-2xl border border-neutral-200/80 bg-white shadow-sm flex items-center gap-4 text-left hover:shadow-md transition-shadow">
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-inner">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Average Score</span>
            <span className="text-xl font-extrabold text-neutral-900 block mt-0.5">
              {analytics.avgClassScore > 0 ? `${analytics.avgClassScore}% Avg Score` : "0% Avg Score"}
            </span>
          </div>
        </div>

      </div>

      {/* 2. TABS & QUICK CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-200 pb-4">
        <div className="flex flex-wrap items-center gap-2 bg-neutral-100 p-1.5 rounded-xl border border-neutral-200/50">
          <button
            onClick={() => { setActiveTab("classrooms"); selectClass(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "classrooms"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            Classrooms
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "students"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            Students
          </button>
          <button
            onClick={() => setActiveTab("simulation")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "simulation"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            Simulation Panel
          </button>
          <Link
            to="/instructor/assignments"
            className="px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
          >
            <Clock className="h-3.5 w-3.5" />
            Assignments
          </Link>
          <Link
            to="/notifications"
            className="relative px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
          >
            <Bell className="h-3.5 w-3.5" />
            Requests
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                {pendingRequests.length > 9 ? "9+" : pendingRequests.length}
              </span>
            )}
          </Link>
        </div>

        <Link to="/instructor/create-class">
          <Button 
            className="bg-slate-900 text-white hover:bg-slate-950 font-black text-xs h-10 px-4 rounded-xl flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Create New Class
          </Button>
        </Link>
      </div>

      {/* 3. DYNAMIC CONTENT AREA */}
      <div className="w-full space-y-6">
          
          {/* A. FACULTY SIMULATION LAUNCHPAD TAB */}
          {activeTab === "simulation" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              <div className="text-left space-y-1">
                <h2 className="text-lg font-black text-neutral-900">Sandbox Simulation Suite</h2>
                <p className="text-xs font-semibold text-neutral-400">
                  Select and run one of our individual algorithmic sandboxes to experience how simulated search engines, bid options, and media placement algorithms evaluate student inputs.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5">
                
                {/* SEO Card */}
                <Card className="border border-neutral-200/80 shadow-md hover:shadow-lg transition-all overflow-hidden text-left bg-gradient-to-br from-white to-neutral-50/50">
                  <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="space-y-2.5 max-w-md">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        <Search className="h-3 w-3" /> SEO Sandbox
                      </span>
                      <h3 className="text-base font-black text-neutral-900">Search Engine Optimization Simulator</h3>
                      <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                        Tweak domain indexing scores, keyword densities, and monthly backlink budgets. Project organic search traffic waves and evaluate organic domain authority scores.
                      </p>
                    </div>
                    <Link to="/instructor/simulation/seo" className="shrink-0 w-full sm:w-auto">
                      <Button className="w-full bg-slate-900 hover:bg-slate-950 text-white font-black text-xs px-4 h-10 rounded-xl flex items-center justify-center gap-1.5">
                        Launch Simulator
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Google Ads Card */}
                <Card className="border border-neutral-200/80 shadow-md hover:shadow-lg transition-all overflow-hidden text-left bg-gradient-to-br from-white to-neutral-50/50">
                  <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="space-y-2.5 max-w-md">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        <Target className="h-3 w-3" /> Search Ads
                      </span>
                      <h3 className="text-base font-black text-neutral-900">Google Pay-Per-Click Sandbox</h3>
                      <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                        Configure target CPC maximum bidding limits, strategy goals, and PPC marketing budgets. Simulates bid auctions, click-through rates (CTR), and lead conversions.
                      </p>
                    </div>
                    <Link to="/instructor/simulation/google-ads" className="shrink-0 w-full sm:w-auto">
                      <Button className="w-full bg-slate-900 hover:bg-slate-950 text-white font-black text-xs px-4 h-10 rounded-xl flex items-center justify-center gap-1.5">
                        Launch Simulator
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Meta Ads Card */}
                <Card className="border border-neutral-200/80 shadow-md hover:shadow-lg transition-all overflow-hidden text-left bg-gradient-to-br from-white to-neutral-50/50">
                  <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="space-y-2.5 max-w-md">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        <Share2 className="h-3 w-3" /> Paid Social
                      </span>
                      <h3 className="text-base font-black text-neutral-900">Meta Paid Social Sandbox</h3>
                      <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                        Configure ad placements (Instagram Stories, Facebook Feed), target demographic interests, and media creative quality metrics. Predict CPA outcomes and ROI multipliers.
                      </p>
                    </div>
                    <Link to="/instructor/simulation/meta-ads" className="shrink-0 w-full sm:w-auto">
                      <Button className="w-full bg-slate-900 hover:bg-slate-950 text-white font-black text-xs px-4 h-10 rounded-xl flex items-center justify-center gap-1.5">
                        Launch Simulator
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

              </div>

            </div>
          )}

          {/* B. CLASSROOMS MANAGEMENT LIST TAB */}
          {activeTab === "classrooms" && !selectedClassId && (
            <div className="space-y-6">
              
              {classes.length === 0 ? (
                <Card className="border-neutral-200/80 shadow-md text-left">
                  <CardHeader>
                    <CardTitle className="text-lg font-extrabold text-neutral-900">Active Classrooms</CardTitle>
                    <CardDescription className="text-xs font-semibold text-neutral-400">
                      Manage classroom invite codes and scenario mappings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="min-h-[250px] flex items-center justify-center border-2 border-dashed border-neutral-200 rounded-xl m-6 mt-0 bg-neutral-50/30">
                    <div className="text-center space-y-2 p-6">
                      <GraduationCap className="mx-auto h-10 w-10 text-neutral-300" />
                      <h3 className="font-extrabold text-sm text-neutral-800">No Classroom Records</h3>
                      <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed font-semibold">
                         Create a new classroom mapping at the top right to start tracking student groups.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
                  {classes.map((c) => (
                    <Card key={c.id} className="border border-neutral-200/80 shadow-sm hover:shadow-md transition-shadow relative bg-white">
                      <CardContent className="p-5 flex flex-col justify-between h-full min-h-[170px] space-y-4">
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <h3 className="text-base font-black text-neutral-900 truncate max-w-[70%]">{c.name}</h3>
                            <Badge className={`${
                              c.status === "active" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-neutral-105 text-neutral-500"
                            } border-none font-bold text-[9px] uppercase shrink-0`}>
                              {c.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-neutral-400 font-semibold truncate">Scenario: {c.scenario}</p>
                        </div>

                        {/* Invite code block */}
                        <div className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-100 bg-neutral-50/70">
                          <div className="text-left">
                            <span className="text-[9px] font-black text-neutral-450 uppercase tracking-wider block">Invite Code</span>
                            <code className="text-xs font-mono font-bold text-neutral-800 block mt-0.5">{c.inviteCode || "N/A"}</code>
                          </div>
                          {c.inviteCode && (
                            <CopyButton code={c.inviteCode} />
                          )}
                        </div>

                        <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                          <span className="text-xs font-bold text-neutral-500">{c.studentsCount} Students Enrolled</span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              onClick={() => handleManageClass(c.id)}
                              className="bg-slate-900 hover:bg-slate-950 text-white text-[11px] font-black h-8 px-3 rounded-lg"
                            >
                              Manage
                            </Button>
                            <Link
                              to={`/instructor/edit-class/${c.id}`}
                              className="inline-flex items-center gap-1 text-[11px] font-black h-8 px-3 rounded-lg border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
                              title="Edit Class & Scenario Config"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDeleteClass(c.id)}
                              className="text-neutral-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                              title="Delete Class"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CLASS DETAILS / STUDENT MANAGEMENT TAB VIEW */}
          {activeTab === "classrooms" && selectedClassId && (
            <div className="space-y-6 text-left animate-in fade-in duration-300">
              
              {/* Back Link & Header */}
              {(() => {
                const currentClass = classes.find(c => c.id === selectedClassId)
                return (
                  <div className="space-y-4">
                    <button
                      onClick={() => selectClass(null)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Classrooms List
                    </button>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900 text-white rounded-2xl p-6 border border-neutral-800 shadow-md relative overflow-hidden">
                      <div className="absolute right-0 top-0 -mt-8 -mr-8 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl" />
                      <div className="space-y-1 text-left relative z-10 w-full">
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Classroom Management Console</span>
                        <div className="flex items-center gap-2 mt-1">
                          <h2 className="text-xl sm:text-2xl font-black">{currentClass?.name || "Classroom Details"}</h2>
                        </div>
                        <p className="text-xs text-neutral-450 font-semibold mt-1">
                          Scenario Target: <span className="text-white font-bold">{currentClass?.scenario}</span>
                        </p>
                      </div>

                      <div className="bg-white/10 backdrop-blur-sm border border-white/10 p-3.5 rounded-xl shrink-0 flex items-center justify-between gap-6 z-10 text-left">
                        <div>
                          <span className="text-[9px] font-black text-neutral-300 uppercase tracking-wider block">Student Join Code</span>
                          <code className="text-sm font-mono font-bold text-white block mt-0.5">{currentClass?.inviteCode || "N/A"}</code>
                        </div>
                        {currentClass?.inviteCode && (
                          <CopyButton code={currentClass.inviteCode} />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Sub tabs: Progress vs Certifications vs Accreditation */}
              <div className="flex border-b border-neutral-200 pb-px">
                <button
                  onClick={() => setClassSubTab("progress")}
                  className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
                    classSubTab === "progress"
                      ? "border-indigo-650 text-indigo-650 font-black"
                      : "border-transparent text-neutral-450 hover:text-neutral-700"
                  }`}
                >
                  Simulation Progress
                </button>
                <button
                  onClick={() => setClassSubTab("certifications")}
                  className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
                    classSubTab === "certifications"
                      ? "border-indigo-650 text-indigo-650 font-black"
                      : "border-transparent text-neutral-450 hover:text-neutral-700"
                  }`}
                >
                  Certifications Portal
                </button>
                <button
                  onClick={() => setClassSubTab("accreditation")}
                  className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
                    classSubTab === "accreditation"
                      ? "border-indigo-650 text-indigo-650 font-black"
                      : "border-transparent text-neutral-450 hover:text-neutral-700"
                  }`}
                >
                  Accreditation Centre
                </button>
              </div>

              {classSubTab === "progress" && (
                <>
                  {/* Classroom Analytics & Risk Status Panel */}
                  {students.length > 0 && (() => {
                    const totalCohortStudents = students.length
                    const cohortScores = students.map(s => s.overallScore)
                    const cohortAvg = totalCohortStudents > 0 ? Math.round(cohortScores.reduce((a, b) => a + b, 0) / totalCohortStudents) : 0
                    
                    const sortedCohortScores = [...cohortScores].sort((a, b) => b - a)
                    const top10PercentCount = Math.max(1, Math.ceil(totalCohortStudents * 0.1))
                    const bottom10PercentCount = Math.max(1, Math.ceil(totalCohortStudents * 0.1))
                    
                    const top10Avg = totalCohortStudents > 0 
                      ? Math.round(sortedCohortScores.slice(0, top10PercentCount).reduce((a, b) => a + b, 0) / top10PercentCount)
                      : 0
                    const bottom10Avg = totalCohortStudents > 0 
                      ? Math.round(sortedCohortScores.slice(-bottom10PercentCount).reduce((a, b) => a + b, 0) / bottom10PercentCount)
                      : 0
                    
                    const atRiskStudents = students.filter(s => s.overallScore < 60 || s.completionRate < 30)
                    const top3Students = [...students].sort((a, b) => b.overallScore - a.overallScore).slice(0, 3)
                    
                    const distributionBands = [
                      { range: "Under 50", count: students.filter(s => s.overallScore < 50).length },
                      { range: "50-69", count: students.filter(s => s.overallScore >= 50 && s.overallScore < 70).length },
                      { range: "70-79", count: students.filter(s => s.overallScore >= 70 && s.overallScore < 80).length },
                      { range: "80-89", count: students.filter(s => s.overallScore >= 80 && s.overallScore < 90).length },
                      { range: "90+", count: students.filter(s => s.overallScore >= 90).length }
                    ]

                    return (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                          <Card className="border border-neutral-200/80 shadow-md bg-white p-6 text-left flex items-center justify-between">
                            <div className="space-y-1">
                              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Cohort Class Average</span>
                              <span className="text-3xl font-black text-indigo-600 block">{cohortAvg}%</span>
                            </div>
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                              <TrendingUp className="h-5.5 w-5.5" />
                            </div>
                          </Card>
                          <Card className="border border-neutral-200/80 shadow-md bg-white p-6 text-left flex items-center justify-between">
                            <div className="space-y-1">
                              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Top 10% Avg Score</span>
                              <span className="text-3xl font-black text-emerald-600 block">{top10Avg}%</span>
                            </div>
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                              <CheckCircle className="h-5.5 w-5.5" />
                            </div>
                          </Card>
                          <Card className="border border-neutral-200/80 shadow-md bg-white p-6 text-left flex items-center justify-between">
                            <div className="space-y-1">
                              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Bottom 10% Avg Score</span>
                              <span className="text-3xl font-black text-neutral-550 block">{bottom10Avg}%</span>
                            </div>
                            <div className="p-3 bg-neutral-100 text-neutral-500 rounded-xl shrink-0">
                              <HelpCircle className="h-5.5 w-5.5" />
                            </div>
                          </Card>
                          <Card className="border border-neutral-200/80 shadow-md bg-white p-6 text-left flex items-center justify-between">
                            <div className="space-y-1">
                              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">At-Risk Watchlist</span>
                              <span className="text-3xl font-black text-rose-500 block">{atRiskStudents.length} Students</span>
                            </div>
                            <div className="p-3 bg-rose-50 text-rose-500 rounded-xl shrink-0">
                              <AlertTriangle className="h-5.5 w-5.5" />
                            </div>
                          </Card>
                        </div>

                        {/* Top Students and At-Risk Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card className="border border-neutral-200/80 shadow-md bg-white p-6 text-left flex flex-col justify-between">
                            <div>
                              <h3 className="text-xs font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1.5 border-b border-neutral-100 pb-3">
                                <Trophy className="h-4.5 w-4.5 text-indigo-500" />
                                Top Performing Students
                              </h3>
                              <div className="divide-y divide-neutral-100 mt-2">
                                {top3Students.map((s, idx) => (
                                  <div key={s.id} className="py-2.5 flex justify-between items-center text-xs font-semibold text-neutral-600">
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-neutral-450">#{idx+1}</span>
                                      <span className="font-bold text-neutral-800">{s.name}</span>
                                    </div>
                                    <Badge className="bg-indigo-50 text-indigo-700 border-none font-bold">{s.overallScore}% score</Badge>
                                  </div>
                                ))}
                                {top3Students.length === 0 && (
                                  <div className="py-6 text-center text-neutral-400 font-semibold">No students enrolled yet.</div>
                                )}
                              </div>
                            </div>
                          </Card>

                          <Card className="border border-neutral-200/80 shadow-md bg-white p-6 text-left flex flex-col justify-between">
                            <div>
                              <h3 className="text-xs font-black uppercase text-rose-600 tracking-wider flex items-center gap-1.5 border-b border-neutral-100 pb-3">
                                <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
                                At-Risk Watchlist
                              </h3>
                              <div className="divide-y divide-neutral-100 mt-2">
                                {atRiskStudents.map((s) => (
                                  <div key={s.id} className="py-2.5 flex justify-between items-center text-xs font-semibold text-neutral-600">
                                    <div>
                                      <span className="font-bold text-neutral-800 block">{s.name}</span>
                                      <span className="text-[10px] text-neutral-450 block mt-0.5">{s.completionRate}% complete • score {s.overallScore}%</span>
                                    </div>
                                    <Badge className="bg-rose-50 text-rose-700 border-none font-bold">Needs attention</Badge>
                                  </div>
                                ))}
                                {atRiskStudents.length === 0 && (
                                  <div className="py-6 text-center text-emerald-600 font-bold">All students performing well!</div>
                                )}
                              </div>
                            </div>
                          </Card>
                        </div>

                        {/* Distribution Chart */}
                        <Card className="border border-neutral-200/80 shadow-md bg-white p-6 text-left">
                          <h3 className="text-xs font-black uppercase text-neutral-450 tracking-wider border-b border-neutral-100 pb-3">
                            Cohort Score Distribution
                          </h3>
                          <div className="h-48 w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%" minHeight={180}>
                              <BarChart data={distributionBands} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="range" stroke="#888888" fontSize={10} fontWeight={700} />
                                <YAxis stroke="#888888" fontSize={10} fontWeight={700} allowDecimals={false} />
                                <Tooltip 
                                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e5e5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px' }}
                                  labelClassName="font-extrabold text-neutral-900"
                                />
                                <Bar dataKey="count" name="Students" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </Card>
                      </div>
                    )
                  })()}

                  {/* Student Access Requests */}
                  {(() => {
                    const classPendingRequests = pendingRequests.filter((r) => r.classId === selectedClassId)
                    if (classPendingRequests.length === 0) return null
                    return (
                      <Card className="border border-neutral-200/80 shadow-md bg-white mb-6">
                        <CardHeader className="border-b border-neutral-100 p-5">
                          <div className="text-left">
                            <CardTitle className="text-sm font-black text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                              <Clock className="h-4.5 w-4.5" />
                              Student Access Requests
                            </CardTitle>
                            <CardDescription className="text-xs font-semibold text-neutral-400 mt-0.5">
                              Approve or reject students requesting to join this classroom.
                            </CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto text-left">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-wider border-b border-neutral-100">
                              <tr>
                                <th className="px-5 py-3.5">Name / Email</th>
                                <th className="px-5 py-3.5">Requested Date</th>
                                <th className="px-5 py-3.5">Status</th>
                                <th className="px-5 py-3.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-700">
                              {classPendingRequests.map((req) => (
                                <tr key={req.id} className="hover:bg-neutral-50/40 transition-colors">
                                  <td className="px-5 py-3.5">
                                    <div className="font-bold text-neutral-800">{req.name}</div>
                                    <div className="text-[10px] text-neutral-400 font-semibold mt-0.5">{req.email}</div>
                                  </td>
                                  <td className="px-5 py-3.5 text-neutral-500">
                                    {req.requestedAt ? new Date(req.requestedAt).toLocaleDateString() : "Pending"}
                                  </td>
                                  <td className="px-5 py-3.5">
                                    <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-none font-bold text-[9px] uppercase">
                                      PENDING APPROVAL
                                    </Badge>
                                  </td>
                                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-2">
                                      <Input
                                        placeholder="Rejection reason (optional)..."
                                        value={rejectionReasons[req.id] || ""}
                                        onChange={(e) =>
                                          setRejectionReasons((prev) => ({ ...prev, [req.id]: e.target.value }))
                                        }
                                        className="text-xs border-neutral-250 h-8 font-semibold max-w-[180px] inline-block mr-2"
                                      />
                                      <Button
                                        onClick={async () => {
                                          try {
                                            await approveJoinRequest(selectedClassId!, req.id)
                                            toast.success("Student access request approved!")
                                          } catch (err) {
                                            toast.error("Failed to approve request.")
                                          }
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold h-8 px-3 rounded-lg"
                                      >
                                        Accept
                                      </Button>
                                      <Button
                                        onClick={async () => {
                                          try {
                                            await rejectJoinRequest(selectedClassId!, req.id, rejectionReasons[req.id])
                                            toast.success("Student access request rejected.")
                                          } catch (err) {
                                            toast.error("Failed to reject request.")
                                          }
                                        }}
                                        variant="outline"
                                        className="text-[10px] font-bold border-neutral-250 text-rose-600 hover:bg-rose-50 h-8 px-3 rounded-lg"
                                      >
                                        Reject
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    )
                  })()}

                  {/* Enrolled Students Table */}
                  <Card className="border border-neutral-200/80 shadow-md bg-white">
                    <CardHeader className="border-b border-neutral-100 p-5">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="text-left">
                          <CardTitle className="text-sm font-black text-neutral-850 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="h-4.5 w-4.5 text-neutral-500" />
                            Enrolled Students
                          </CardTitle>
                          <CardDescription className="text-xs font-semibold text-neutral-400 mt-0.5">
                            Moderate students and review simulation progress metrics.
                          </CardDescription>
                        </div>
                        
                        {/* Add/Invite Student input inline */}
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Input
                            type="email"
                            placeholder="student@university.edu"
                            id="inviteEmailInput"
                            className="text-xs border-neutral-250 h-9 font-semibold max-w-[200px]"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = e.currentTarget.value.trim()
                                if (val) {
                                  inviteStudent(selectedClassId, val)
                                  e.currentTarget.value = ""
                                }
                              }
                            }}
                          />
                          <Button
                            onClick={() => {
                              const input = document.getElementById("inviteEmailInput") as HTMLInputElement
                              const val = input?.value?.trim()
                              if (val) {
                                inviteStudent(selectedClassId, val)
                                input.value = ""
                              }
                            }}
                            className="bg-slate-900 text-white hover:bg-slate-950 font-black text-xs h-9 px-3 rounded-lg"
                          >
                            Add Student
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                      {students.length === 0 ? (
                        <div className="p-12 text-center text-neutral-450 font-semibold text-xs space-y-2">
                          <Users className="mx-auto h-8 w-8 text-neutral-300" />
                          <p>No students have enrolled in this class yet.</p>
                          <p className="text-[10px] text-neutral-400 font-normal">Share the unique Student Join Code above with your students to populate this console.</p>
                        </div>
                      ) : (
                        <table className="w-full text-xs text-left">
                          <thead className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-wider border-b border-neutral-100">
                            <tr>
                              <th className="px-5 py-3.5">Name / Email</th>
                              <th className="px-5 py-3.5">Enrolled Date</th>
                              <th className="px-5 py-3.5">Last Active</th>
                              <th className="px-5 py-3.5">Simulation Completion</th>
                              <th className="px-5 py-3.5">Overall Score</th>
                              <th className="px-5 py-3.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-700">
                            {students.map((student) => (
                              <tr key={student.id} className="hover:bg-neutral-50/40 transition-colors">
                                <td className="px-5 py-3.5">
                                  <div className="font-bold text-neutral-800">{student.name}</div>
                                  <div className="text-[10px] text-neutral-400 font-semibold mt-0.5">{student.email}</div>
                                </td>
                                <td className="px-5 py-3.5 text-neutral-500">{student.joinedAt}</td>
                                <td className="px-5 py-3.5 text-neutral-500">{student.lastActive}</td>
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-2 max-w-[120px]">
                                    <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden border border-neutral-200/50">
                                      <div 
                                        className="bg-indigo-600 h-full rounded-full" 
                                        style={{ width: `${student.completionRate}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-neutral-500 whitespace-nowrap">{student.completionRate}%</span>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5">
                                  <span className={`text-xs font-bold ${
                                    student.overallScore >= 80 ? "text-emerald-600" : student.overallScore >= 50 ? "text-amber-500" : "text-neutral-500"
                                  }`}>
                                    {student.overallScore}%
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => handleResetSim(student.id)}
                                      className="text-[10px] font-bold border-neutral-250 text-neutral-600 hover:bg-neutral-55 h-7 px-2.5 rounded-md"
                                    >
                                      Reset Progress
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => handleRemoveStudent(student.id)}
                                      className="text-[10px] font-bold border-neutral-250 text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-7 px-2.5 rounded-md"
                                    >
                                      Kick
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
              {classSubTab === "certifications" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {certStoreLoading && !classCertifications ? (
                    <div className="flex flex-col items-center justify-center py-16 text-neutral-450 font-semibold text-xs space-y-2">
                      <Activity className="h-8 w-8 text-indigo-500 animate-spin" />
                      <p>Loading classroom certifications statistics...</p>
                    </div>
                  ) : !classCertifications ? (
                    <div className="py-12 text-center text-neutral-450 font-semibold text-xs space-y-2 border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50/30">
                      <Award className="mx-auto h-8 w-8 text-neutral-300" />
                      <p>Failed to load certifications data.</p>
                    </div>
                  ) : (
                    <>
                      {/* 1. Metrics Cards Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <Card className="border border-neutral-200/80 shadow-md bg-white p-6 text-left flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Certification Success Rate</span>
                            <span className="text-3xl font-black text-indigo-600 block">{classCertifications.successRate}%</span>
                          </div>
                          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                            <TrendingUp className="h-5.5 w-5.5" />
                          </div>
                        </Card>

                        <Card className="border border-neutral-200/80 shadow-md bg-white p-6 text-left flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Total Certified Students</span>
                            <span className="text-3xl font-black text-emerald-600 block">
                              {classCertifications.certifiedCount} / {classCertifications.totalStudents}
                            </span>
                          </div>
                          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                            <Trophy className="h-5.5 w-5.5" />
                          </div>
                        </Card>

                        <Card className="border border-neutral-200/80 shadow-md bg-white p-6 text-left flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Eligible to Claim</span>
                            <span className="text-3xl font-black text-amber-500 block">
                              {classCertifications.eligibleStudents.length} Students
                            </span>
                          </div>
                          <div className="p-3 bg-amber-50 text-amber-500 rounded-xl shrink-0">
                            <CheckCircle className="h-5.5 w-5.5" />
                          </div>
                        </Card>
                      </div>

                      {/* 2. Charts and Export Center */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Distribution Chart */}
                        <Card className="border border-neutral-200/80 shadow-md bg-white p-6 text-left">
                          <h3 className="text-xs font-black uppercase text-neutral-450 tracking-wider border-b border-neutral-100 pb-3">
                            Cohort Certificate Distribution
                          </h3>
                          <div className="h-48 w-full mt-4">
                            {classCertifications.certifiedCount === 0 ? (
                              <div className="h-full flex items-center justify-center text-xs font-semibold text-neutral-400">
                                No certificates issued yet.
                              </div>
                            ) : (
                              <ResponsiveContainer width="100%" height="100%" minHeight={180}>
                                <BarChart
                                  data={[
                                    { name: "Bronze", count: classCertifications.distribution?.BRONZE || 0 },
                                    { name: "Silver", count: classCertifications.distribution?.SILVER || 0 },
                                    { name: "Gold", count: classCertifications.distribution?.GOLD || 0 },
                                    { name: "Platinum", count: classCertifications.distribution?.PLATINUM || 0 },
                                  ]}
                                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                  <XAxis dataKey="name" stroke="#888888" fontSize={10} fontWeight={700} />
                                  <YAxis stroke="#888888" fontSize={10} fontWeight={700} allowDecimals={false} />
                                  <Tooltip
                                    contentStyle={{
                                      borderRadius: "12px",
                                      border: "1px solid #e5e5e5",
                                      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                                      fontSize: "11px",
                                    }}
                                    labelClassName="font-extrabold text-neutral-900"
                                  />
                                  <Bar dataKey="count" name="Certificates" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                              </ResponsiveContainer>
                            )}
                          </div>
                        </Card>

                        {/* Export Panel */}
                        <Card className="border border-neutral-200/80 shadow-md bg-white p-6 text-left flex flex-col justify-between">
                          <div className="space-y-2">
                            <h3 className="text-xs font-black uppercase text-neutral-450 tracking-wider border-b border-neutral-100 pb-3 flex items-center gap-1.5">
                              <FileText className="h-4.5 w-4.5 text-neutral-450" />
                              Credentials Export Center
                            </h3>
                            <p className="text-xs text-neutral-500 font-medium leading-relaxed pt-2">
                              Download full classroom credentials logs, verification tokens, and performance scores for institutional reports or LMS integrations.
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mt-6">
                            <Button
                              onClick={handleExportCSV}
                              disabled={isExporting}
                              className="bg-indigo-650 hover:bg-indigo-700 text-white font-black text-xs h-10 px-4 rounded-xl shadow flex items-center justify-center gap-1.5"
                            >
                              <Download className="h-4 w-4" />
                              Export to CSV
                            </Button>
                            <Button
                              onClick={handleExportJSON}
                              disabled={isExporting}
                              className="bg-slate-900 hover:bg-slate-950 text-white font-black text-xs h-10 px-4 rounded-xl shadow flex items-center justify-center gap-1.5"
                            >
                              <Download className="h-4 w-4" />
                              Export to JSON
                            </Button>
                          </div>
                        </Card>
                      </div>

                      {/* 3. Eligible Students */}
                      <Card className="border border-neutral-200/80 shadow-md bg-white">
                        <CardHeader className="border-b border-neutral-100 p-5">
                          <CardTitle className="text-sm font-black text-neutral-850 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle className="h-4.5 w-4.5 text-amber-500" />
                            Eligible Students
                          </CardTitle>
                          <CardDescription className="text-xs font-semibold text-neutral-400 mt-0.5">
                            These students have passed the simulation criteria but do not have a certificate issued yet.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                          {classCertifications.eligibleStudents.length === 0 ? (
                            <div className="p-10 text-center text-neutral-450 font-semibold text-xs space-y-1">
                              <CheckCircle className="mx-auto h-8 w-8 text-emerald-500" />
                              <p>No eligible pending students.</p>
                              <p className="text-[10px] text-neutral-400 font-normal">All qualifying students have been certified.</p>
                            </div>
                          ) : (
                            <table className="w-full text-xs text-left">
                              <thead className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-wider border-b border-neutral-100">
                                <tr>
                                  <th className="px-5 py-3.5">Student Name / Email</th>
                                  <th className="px-5 py-3.5">Composite Score</th>
                                  <th className="px-5 py-3.5">Consistency</th>
                                  <th className="px-5 py-3.5">Eligible Level</th>
                                  <th className="px-5 py-3.5 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-700">
                                {classCertifications.eligibleStudents.map((student: any) => (
                                  <tr key={student.simulationId} className="hover:bg-neutral-50/40 transition-colors">
                                    <td className="px-5 py-3.5">
                                      <div className="font-bold text-neutral-800">{student.studentName}</div>
                                      <div className="text-[10px] text-neutral-400 font-semibold mt-0.5">{student.studentEmail}</div>
                                    </td>
                                    <td className="px-5 py-3.5 text-neutral-700">{student.compositeScore}%</td>
                                    <td className="px-5 py-3.5 text-neutral-700">{student.strategicConsistency}%</td>
                                    <td className="px-5 py-3.5">
                                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${getBadgeStyle(student.eligibleBand)}`}>
                                        {student.eligibleBand}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                      <Button
                                        onClick={() => handleIssueCertificate(student.studentName, student.eligibleBand, student.simulationId)}
                                        disabled={issuingStudentId === student.simulationId}
                                        className="bg-indigo-650 hover:bg-indigo-700 text-white text-[11px] font-black h-8 px-3 rounded-lg flex items-center justify-center gap-1.5 ml-auto shadow-sm"
                                      >
                                        {issuingStudentId === student.simulationId ? (
                                          <Activity className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Award className="h-3.5 w-3.5" />
                                        )}
                                        Issue Certificate
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </CardContent>
                      </Card>

                      {/* 4. Certified Students List */}
                      <Card className="border border-neutral-200/80 shadow-md bg-white">
                        <CardHeader className="border-b border-neutral-100 p-5">
                          <CardTitle className="text-sm font-black text-neutral-850 uppercase tracking-wider flex items-center gap-1.5">
                            <Trophy className="h-4.5 w-4.5 text-emerald-500" />
                            Certified Students Registry
                          </CardTitle>
                          <CardDescription className="text-xs font-semibold text-neutral-400 mt-0.5">
                            Official registry of students who have claimed or been issued cryptographic certificates.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                          {classCertifications.certificates.length === 0 ? (
                            <div className="p-12 text-center text-neutral-450 font-semibold text-xs space-y-2">
                              <Award className="mx-auto h-8 w-8 text-neutral-300" />
                              <p>No certified students yet.</p>
                              <p className="text-[10px] text-neutral-400 font-normal">Generate certificates for eligible students above to populate this registry.</p>
                            </div>
                          ) : (
                            <table className="w-full text-xs text-left">
                              <thead className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-wider border-b border-neutral-100">
                                <tr>
                                  <th className="px-5 py-3.5">Recipient Name</th>
                                  <th className="px-5 py-3.5">Issue Date</th>
                                  <th className="px-5 py-3.5">Level</th>
                                  <th className="px-5 py-3.5">Composite Score</th>
                                  <th className="px-5 py-3.5">Verification ID</th>
                                  <th className="px-5 py-3.5 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-700">
                                {classCertifications.certificates.map((cert: any) => (
                                  <tr key={cert.id} className="hover:bg-neutral-50/40 transition-colors">
                                    <td className="px-5 py-3.5">
                                      <div className="font-bold text-neutral-800">{cert.recipientName}</div>
                                    </td>
                                    <td className="px-5 py-3.5 text-neutral-550">
                                      {new Date(cert.issueDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-5 py-3.5">
                                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${getBadgeStyle(cert.band)}`}>
                                        {cert.band}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-neutral-700">{cert.compositeScore}%</td>
                                    <td className="px-5 py-3.5 font-mono text-[10px] text-neutral-450">
                                      {cert.verificationId}
                                    </td>
                                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                      <div className="flex items-center justify-end gap-2">
                                        <Link
                                          to={`/verify/${cert.verificationId}`}
                                          target="_blank"
                                          className="inline-flex items-center gap-1 text-[11px] font-black h-8 px-2.5 rounded-lg border border-neutral-200 text-neutral-600 bg-white hover:bg-neutral-50 transition-colors"
                                          title="Open Verification Page"
                                        >
                                          <ExternalLink className="h-3.5 w-3.5" />
                                          Verify
                                        </Link>
                                        <button
                                          onClick={() => handleCopyLink(cert.verificationId)}
                                          className="p-1.5 border border-neutral-200 hover:bg-neutral-55 text-neutral-500 rounded-lg transition-colors flex items-center justify-center h-8 w-8"
                                          title="Copy Verification Link"
                                        >
                                          {copiedId === cert.verificationId ? (
                                            <Check className="h-4 w-4 text-emerald-600" />
                                          ) : (
                                            <Copy className="h-4 w-4" />
                                          )}
                                        </button>
                                        <Button
                                          onClick={() => downloadCertificate(cert.id || cert.verificationId)}
                                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] h-8 px-3 rounded-lg flex items-center gap-1 shadow-sm"
                                        >
                                          <Download className="h-3.5 w-3.5" />
                                          PDF
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              )}

              {classSubTab === "accreditation" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Accreditation & Grades Export Panel */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    <Card className="border border-neutral-200/80 shadow-md bg-white p-6 flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          Accreditation Reports
                        </span>
                        <h3 className="text-base font-black text-neutral-900 mt-2">Accreditation & Assessment Centre</h3>
                        <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
                          Access comprehensive curriculum maps, Outcome-Based Education (OBE) dashboards, and National Board of Accreditation (NBA) attainment grids configured for this class cohort.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-6">
                        <Link
                          to={`/reports/nba?classId=${selectedClassId}`}
                          className="inline-flex items-center gap-1.5 text-xs font-black h-9 px-4 rounded-xl border border-indigo-200 text-indigo-750 bg-indigo-50 hover:bg-indigo-100 transition-all shadow-sm"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View NBA Attainment Report
                        </Link>
                        <Link
                          to={`/reports/obe?classId=${selectedClassId}`}
                          className="inline-flex items-center gap-1.5 text-xs font-black h-9 px-4 rounded-xl border border-slate-200 text-slate-750 bg-slate-50 hover:bg-slate-100 transition-all shadow-sm"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View OBE Dashboard
                        </Link>
                      </div>
                    </Card>

                    <Card className="border border-neutral-200/80 shadow-md bg-white p-6 flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          Student Scores CSV
                        </span>
                        <h3 className="text-base font-black text-neutral-900 mt-2">OBE Class Grades Export</h3>
                        <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
                          Download a detailed spreadsheet containing student name registries, current rounds, simulation completions, final composite indexes, strategic alignment scores, ROI efficiency, and earned certificate levels.
                        </p>
                      </div>
                      <div className="mt-6">
                        <Button
                          onClick={handleExportGradesCSV}
                          disabled={isExporting}
                          className="bg-emerald-650 hover:bg-emerald-700 text-white font-black text-xs h-10 px-4 rounded-xl shadow flex items-center justify-center gap-1.5 w-full sm:w-auto"
                        >
                          <Download className="h-4 w-4" />
                          {isExporting ? "Exporting Grades..." : "Export OBE CSV Grades"}
                        </Button>
                      </div>
                    </Card>
                  </div>

                  {/* Faculty Evaluation Reflection analysis */}
                  <Card className="border border-neutral-200/80 shadow-md bg-white text-left">
                    <CardHeader className="border-b border-neutral-100 p-5">
                      <CardTitle className="text-sm font-black text-neutral-850 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
                        Faculty Evaluation & Reflection Analysis
                      </CardTitle>
                      <CardDescription className="text-xs font-semibold text-neutral-400 mt-0.5">
                        Outcome assessment and diagnostic evaluation for teaching improvement.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      {loadingEvaluation ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2 text-xs font-bold text-neutral-450">
                          <Activity className="h-6 w-6 text-indigo-650 animate-spin" />
                          <span>Generating faculty reflection analytics...</span>
                        </div>
                      ) : facultyEvaluation ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50/50">
                              <span className="text-[9px] font-black text-neutral-450 uppercase tracking-wider block">Average Class Score</span>
                              <span className="text-xl font-extrabold text-indigo-650 block mt-1">{facultyEvaluation.averageScore}%</span>
                            </div>
                            <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50/50">
                              <span className="text-[9px] font-black text-neutral-450 uppercase tracking-wider block">Highest Individual Score</span>
                              <span className="text-xl font-extrabold text-emerald-600 block mt-1">{facultyEvaluation.highestScore}%</span>
                            </div>
                            <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50/50">
                              <span className="text-[9px] font-black text-neutral-450 uppercase tracking-wider block">Simulation Completion Rate</span>
                              <span className="text-xl font-extrabold text-neutral-800 block mt-1">{facultyEvaluation.completionRate}%</span>
                            </div>
                            <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50/50">
                              <span className="text-[9px] font-black text-neutral-450 uppercase tracking-wider block">Instruction Rating</span>
                              <span className="text-xl font-extrabold text-amber-600 block mt-1">{facultyEvaluation.teachingPerformanceRating}</span>
                            </div>
                          </div>

                          <div className="space-y-2 border-t border-neutral-100 pt-4">
                            <h4 className="text-xs font-extrabold text-neutral-800">Self-Reflection Executive Summary</h4>
                            <p className="text-xs text-neutral-600 font-medium leading-relaxed bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                              {facultyEvaluation.selfReflectionSummary}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div className="space-y-1.5">
                              <h5 className="text-xs font-extrabold text-neutral-800">Accreditation Standard Inspected</h5>
                              <span className="inline-block text-xs font-bold text-indigo-650 bg-indigo-50 border border-indigo-200/50 px-3 py-1.5 rounded-lg">
                                {facultyEvaluation.accreditationStandard}
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              <h5 className="text-xs font-extrabold text-neutral-800">Recommending Instructional Action</h5>
                              <p className="text-xs font-bold text-neutral-700 bg-neutral-50 p-3 rounded-lg border border-neutral-150">
                                {facultyEvaluation.recommendingAction}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs font-semibold text-neutral-400">
                          No evaluation details available. Enroll students to populate performance reflections.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

            </div>
          )}

          {/* C. GENERAL STUDENTS SUBMISSIONS TAB */}
          {activeTab === "students" && (
            <Card className="border-neutral-200/80 shadow-md text-left">
              <CardHeader>
                <CardTitle className="text-lg font-extrabold text-neutral-900">Student Submissions</CardTitle>
                <CardDescription className="text-xs font-semibold text-neutral-400">
                  Monitor individual student simulation attempts and feedback.
                </CardDescription>
              </CardHeader>
              <CardContent className="min-h-[250px] flex items-center justify-center border-2 border-dashed border-neutral-200 rounded-xl m-6 mt-0 bg-neutral-50/30">
                <div className="text-center space-y-2 p-6">
                  <Users className="mx-auto h-10 w-10 text-neutral-300" />
                  <h3 className="font-extrabold text-sm text-neutral-800">No Student Activity Logs</h3>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed font-semibold">
                    Select an active classroom under the Classrooms tab and click 'Manage' to track specific student progress logs.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}



        </div>





    </div>
  )
}
export default InstructorPortal
