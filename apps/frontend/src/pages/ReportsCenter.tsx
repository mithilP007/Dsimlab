import { useState, useEffect } from "react"
import { useInstructorPortalStore } from "@/stores/instructorPortalStore"
import { useReportsStore } from "@/stores/reportsStore"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  FileText,
  TrendingUp,
  Sparkles,
  Users,
  Search,
  ArrowRight,
  ShieldCheck,
  Percent,
  BookmarkCheck,
  AlertCircle,
  FileSpreadsheet
} from "lucide-react"
import { Link, useNavigate } from "react-router"

export function ReportsCenter() {
  const navigate = useNavigate()
  const { classes, students, fetchClasses, fetchClassDetails } = useInstructorPortalStore()
  const {
    fetchAccreditationReport,
    fetchPerformanceReport,
    fetchAiInsights,
    accreditationData,
    performanceData,
    aiInsightsData,
    isLoading
  } = useReportsStore()

  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [studentSearch, setStudentSearch] = useState<string>("")

  // Fetch classes on mount
  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  // Select first class if available
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id)
    }
  }, [classes, selectedClassId])

  // Load class data when selected class changes
  useEffect(() => {
    if (selectedClassId) {
      fetchClassDetails(selectedClassId)
      fetchAccreditationReport(selectedClassId)
      fetchPerformanceReport(selectedClassId)
      fetchAiInsights(selectedClassId)
    }
  }, [selectedClassId, fetchClassDetails, fetchAccreditationReport, fetchPerformanceReport, fetchAiInsights])

  const currentClass = classes.find(c => c.id === selectedClassId)

  // Filter students based on search query
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase())
  )

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-neutral-900" />
            Accreditation & Reports Center
          </h1>
          <p className="text-neutral-500 font-medium">
            Monitor educational outcomes, program mapping matrices, student attainments, and AI curriculum improvements.
          </p>
        </div>

        {/* Classroom Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Active Classroom:</span>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="bg-white border border-neutral-200 text-neutral-800 text-sm font-semibold rounded-lg focus:ring-black focus:border-black p-2.5 outline-none shadow-sm cursor-pointer"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedClassId ? (
        <Card className="border-neutral-200/60 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-neutral-50 flex items-center justify-center border border-neutral-100">
              <Users className="h-6 w-6 text-neutral-400" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-neutral-800 text-lg">No Classrooms Available</h3>
              <p className="text-neutral-500 text-sm max-w-md">
                You need to create a classroom and enroll students before generating outcome-based accreditation reports.
              </p>
            </div>
            <Link to="/instructor/create-class">
              <Button className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold">
                Create Classroom
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Quick Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* NBA Readiness */}
            <Card className="border-neutral-200/60 shadow-sm relative overflow-hidden bg-neutral-900 text-white">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">NBA Readiness</span>
                  <Badge className="bg-white/20 text-white border-none text-[10px] font-bold">Target &ge; 70%</Badge>
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tight">
                    {isLoading ? "..." : `${accreditationData?.nbaReadiness || 0}%`}
                  </h3>
                  <p className="text-xs text-neutral-300 font-medium">Average PO Attainment Rate</p>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-white h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${accreditationData?.nbaReadiness || 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* OBE Course Outcomes */}
            <Card className="border-neutral-200/60 shadow-sm bg-white">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">OBE Attainment</span>
                  <Percent className="h-4 w-4 text-neutral-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tight text-neutral-900">
                    {isLoading ? "..." : `${accreditationData?.obeReadiness || 0}%`}
                  </h3>
                  <p className="text-xs text-neutral-500 font-medium">Average CO Attainment Rate</p>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-neutral-900 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${accreditationData?.obeReadiness || 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Class Average */}
            <Card className="border-neutral-200/60 shadow-sm bg-white">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Class Average</span>
                  <TrendingUp className="h-4 w-4 text-neutral-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tight text-neutral-900">
                    {isLoading ? "..." : `${performanceData?.stats?.average || 0}%`}
                  </h3>
                  <p className="text-xs text-neutral-500 font-medium">Composite Round Index</p>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-neutral-950 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${performanceData?.stats?.average || 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Certification Rate */}
            <Card className="border-neutral-200/60 shadow-sm bg-white">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Certifications</span>
                  <BookmarkCheck className="h-4 w-4 text-neutral-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tight text-neutral-900">
                    {isLoading ? "..." : `${performanceData?.stats?.certificationRate || 0}%`}
                  </h3>
                  <p className="text-xs text-neutral-500 font-medium">Pass &amp; Certificate Issued</p>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-neutral-900 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${performanceData?.stats?.certificationRate || 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Classroom Overview & AI Suggestions */}
            <div className="lg:col-span-2 space-y-8">
              {/* Classroom Overview */}
              <Card className="border-neutral-200/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg font-bold">Classroom Overview</CardTitle>
                    <CardDescription>Demographics and target baseline variables.</CardDescription>
                  </div>
                  <Badge className="bg-neutral-50 text-neutral-800 border-neutral-200 text-xs font-semibold px-2.5 py-1">
                    {currentClass?.status?.toUpperCase()}
                  </Badge>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Students Enrolled</span>
                    <p className="font-bold text-neutral-800 text-lg">{currentClass?.studentsCount || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Scenario Template</span>
                    <p className="font-bold text-neutral-800 text-lg truncate" title={currentClass?.scenario}>
                      {currentClass?.scenario || "Standard B2B"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Invite Code</span>
                    <p className="font-mono font-bold text-neutral-800 text-lg">{currentClass?.inviteCode || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Class Pass Rate</span>
                    <p className="font-bold text-neutral-800 text-lg">{performanceData?.stats?.passRate || 0}%</p>
                  </div>
                </CardContent>
              </Card>

              {/* AI Cohort Diagnostics */}
              <Card className="border-neutral-200/60 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 h-24 w-24 bg-neutral-900/5 rounded-bl-full pointer-events-none" />
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-neutral-900 animate-pulse" />
                    AI Cohort Insights & Suggestions
                  </CardTitle>
                  <CardDescription>Dynamic diagnostic recommendations mapped to class scoring vectors.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Strengths */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600">Cohort Strengths</h4>
                    <ul className="space-y-2.5">
                      {aiInsightsData?.strengths?.map((str: string, idx: number) => (
                        <li key={idx} className="text-sm font-medium text-neutral-700 flex items-start gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                          <span>{str}</span>
                        </li>
                      )) || <li className="text-sm text-neutral-400 italic">No strengths identified yet.</li>}
                    </ul>
                  </div>

                  {/* Weaknesses */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600">Accreditation Gaps</h4>
                    <ul className="space-y-2.5">
                      {aiInsightsData?.weaknesses?.map((weak: string, idx: number) => (
                        <li key={idx} className="text-sm font-medium text-neutral-700 flex items-start gap-2">
                          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                          <span>{weak}</span>
                        </li>
                      )) || <li className="text-sm text-neutral-400 italic">No accreditation gaps identified yet.</li>}
                    </ul>
                  </div>

                  {/* Risk Indicators */}
                  <div className="pt-4 border-t border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center shrink-0">
                        <AlertCircle className="h-5 w-5 text-neutral-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-neutral-850">At-Risk Students Indicator</h4>
                        <p className="text-xs text-neutral-500 font-medium">Students scoring below 60% cumulative average.</p>
                      </div>
                    </div>
                    <Badge className={`${aiInsightsData?.atRiskCount > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'} text-xs font-bold px-3 py-1`}>
                      {aiInsightsData?.atRiskCount || 0} Students At-Risk
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Navigation Hub & Student Report Finder */}
            <div className="space-y-8">
              {/* Navigation Hub */}
              <Card className="border-neutral-200/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Accreditation Hub</CardTitle>
                  <CardDescription>Outcome-based matrices and dashboards.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => navigate(`/reports/nba?classId=${selectedClassId}`)}
                    className="w-full justify-between bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50 hover:text-black font-semibold h-11"
                  >
                    <span className="flex items-center gap-2.5">
                      <FileSpreadsheet className="h-4.5 w-4.5 text-neutral-500" />
                      NBA Outcome Mapping
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  <Button
                    onClick={() => navigate(`/reports/obe?classId=${selectedClassId}`)}
                    className="w-full justify-between bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50 hover:text-black font-semibold h-11"
                  >
                    <span className="flex items-center gap-2.5">
                      <FileText className="h-4.5 w-4.5 text-neutral-500" />
                      OBE Achievements & Radar
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  <Button
                    onClick={() => navigate(`/reports/instructor`)}
                    className="w-full justify-between bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50 hover:text-black font-semibold h-11"
                  >
                    <span className="flex items-center gap-2.5">
                      <Users className="h-4.5 w-4.5 text-neutral-500" />
                      Classroom Comparisons
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Student Report Finder */}
              <Card className="border-neutral-200/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Student Reports Finder</CardTitle>
                  <CardDescription>Audit individual performance timelines.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                    <Input
                      placeholder="Search student email or name..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-9 bg-neutral-50 border-neutral-200/80 focus:bg-white text-sm"
                    />
                  </div>

                  <div className="max-h-[220px] overflow-y-auto divide-y divide-neutral-100 border border-neutral-150 rounded-lg bg-white">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map(student => (
                        <div
                          key={student.id}
                          onClick={() => navigate(`/reports/student/${student.id}`)}
                          className="p-3 hover:bg-neutral-50 transition-colors flex items-center justify-between cursor-pointer group"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-neutral-850 truncate group-hover:text-black">
                              {student.name}
                            </p>
                            <p className="text-[10px] text-neutral-400 font-semibold truncate">
                              {student.email}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-neutral-400 group-hover:text-neutral-900 flex items-center gap-0.5 ml-2">
                            Audit <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-neutral-400 font-medium">
                        No students found.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
