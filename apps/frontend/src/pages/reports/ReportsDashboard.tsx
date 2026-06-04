import { useState } from "react"
import { useReportsStore } from "@/stores/reportsStore"
import type { SimulationReport, ReportFilters, ScheduledReport } from "@/stores/reportsStore"
import { ReportViewer } from "./ReportViewer"
import { ExportPanel } from "./ExportPanel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  BarChart3,
  Clock,
  Download,
  Eye,
  Plus,
  Search,
  Trash2,
  AlertTriangle,
  FolderOpen,
  HardDrive,
} from "lucide-react"

export function ReportsDashboard() {
  const {
    reports,
    currentReport,
    scheduledReports,
    generateReport,
    deleteReport,
    scheduleReport,
    cancelScheduledReport,
    selectReport,
  } = useReportsStore()

  // Selection states
  const [filterType, setFilterType] = useState<string>("all")
  const [filterClass, setFilterClass] = useState<string>("all")
  const [filterDate, setFilterDate] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Dialog open states
  const [isGenerateOpen, setIsGenerateOpen] = useState(false)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [exportTarget, setExportTarget] = useState<SimulationReport | null>(null)

  // Form states for Generate Report
  const [genName, setGenName] = useState("")
  const [genType, setGenType] = useState<SimulationReport["type"]>("performance")
  const [genDateRange, setGenDateRange] = useState("Last 30 Days")
  const [genClassId, setGenClassId] = useState("c_1")
  const genStudentId = "all"
  const [genChannels, setGenChannels] = useState({
    seo: true,
    google: true,
    meta: true,
  })

  // Form states for Schedule Report
  const [schName, setSchName] = useState("")
  const [schFrequency, setSchFrequency] = useState<ScheduledReport["frequency"]>("weekly")
  const [schDateRange, setSchDateRange] = useState("Last 7 Days")
  const [schClassId, setSchClassId] = useState("c_1")
  const schStudentId = "all"
  const [schChannels, setSchChannels] = useState({
    seo: true,
    google: true,
    meta: true,
  })

  // Handlers
  const handleCreateReportSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const activeChannels = Object.entries(genChannels)
      .filter(([_, checked]) => checked)
      .map(([channel]) => channel)

    const filters: ReportFilters = {
      dateRange: genDateRange,
      classId: genClassId,
      studentId: genStudentId,
      channels: activeChannels,
    }

    generateReport(genName, genType, filters)
    setIsGenerateOpen(false)
    // Clear form
    setGenName("")
  }

  const handleCreateScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const activeChannels = Object.entries(schChannels)
      .filter(([_, checked]) => checked)
      .map(([channel]) => channel)

    const filters: ReportFilters = {
      dateRange: schDateRange,
      classId: schClassId,
      studentId: schStudentId,
      channels: activeChannels,
    }

    scheduleReport(schName || `${schFrequency.charAt(0).toUpperCase() + schFrequency.slice(1)} Schedule Report`, schFrequency, filters)
    setIsScheduleOpen(false)
    // Clear form
    setSchName("")
  }

  // Filter reports list based on criteria
  const filteredReports = reports.filter((report) => {
    const matchesType = filterType === "all" || report.type === filterType
    const matchesClass = filterClass === "all" || report.filters.classId === filterClass
    const matchesDate = filterDate === "all" || report.filters.dateRange === filterDate
    const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesClass && matchesDate && matchesSearch
  })

  // If a report is actively selected, show the Viewer component
  if (currentReport) {
    return (
      <ReportViewer
        report={currentReport}
        onClose={() => selectReport(null)}
        onExport={() => setExportTarget(currentReport)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Title & Top Action bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Reports & Analytics</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Build, schedule, and review historical performance reports for digital advertising and SEO rounds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsScheduleOpen(true)}
            className="rounded-lg font-semibold border-neutral-200"
          >
            <Clock className="h-4 w-4 mr-2 text-neutral-500" />
            <span>Schedule Run</span>
          </Button>
          <Button
            onClick={() => setIsGenerateOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 font-semibold flex items-center shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span>Generate Report</span>
          </Button>
        </div>
      </div>

      {/* KPI Indicators Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Reports", value: reports.length, desc: "Ready for download", icon: FolderOpen, color: "text-indigo-600 bg-indigo-50" },
          { label: "Scheduled Syncs", value: scheduledReports.length, desc: "Active recurring runs", icon: Clock, color: "text-blue-600 bg-blue-50" },
          { label: "Last Generated", value: "Today, 19:15", desc: "Meta CTR Forecast", icon: BarChart3, color: "text-emerald-600 bg-emerald-50" },
          { label: "Storage Utilized", value: "12.4 MB", desc: "Of 100 MB quota (12%)", icon: HardDrive, color: "text-amber-600 bg-amber-50" },
        ].map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className="bg-white p-4 rounded-xl border border-neutral-200/60 shadow-sm flex items-center gap-4">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${stat.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">{stat.label}</span>
                <span className="text-xl font-bold text-neutral-900 block mt-0.5">{stat.value}</span>
                <span className="text-[10px] text-neutral-500 block leading-tight mt-0.5">{stat.desc}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Search and Filters Segment */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200/60 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search report names..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 rounded-lg bg-neutral-50 border-neutral-200 focus-visible:ring-indigo-500"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Type</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 font-semibold text-neutral-700 outline-none hover:border-neutral-300 focus:border-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="performance">Performance</option>
              <option value="comparison">Comparison</option>
              <option value="class">Class</option>
              <option value="individual">Individual</option>
            </select>
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Class</span>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 font-semibold text-neutral-700 outline-none hover:border-neutral-300 focus:border-indigo-500"
            >
              <option value="all">All Classes</option>
              <option value="c_1">MKT 410 - Sec A</option>
              <option value="c_2">MKT 410 - Sec B</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Timeline</span>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 font-semibold text-neutral-700 outline-none hover:border-neutral-300 focus:border-indigo-500"
            >
              <option value="all">All Dates</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="Custom">Custom Range</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Logs Table */}
      <div className="bg-white rounded-xl border border-neutral-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex justify-between items-center bg-white">
          <span className="text-sm font-bold text-neutral-800">Generated Reports Archive</span>
          <span className="text-xs text-neutral-400 font-bold">{filteredReports.length} results</span>
        </div>
        
        {filteredReports.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-neutral-300 mb-2" />
            <span className="text-sm font-bold text-neutral-800 block">No reports found</span>
            <p className="text-xs text-neutral-400 mt-1 max-w-[320px]">
              No generated reports match your selected filters. Try broadening your criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Report Name</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">Date Created</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-neutral-900">
                      {report.name}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-neutral-100 text-neutral-700 capitalize">
                        {report.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-xs text-neutral-400 font-semibold">
                      {report.createdAt}
                    </td>
                    <td className="py-3.5 px-5">
                      {report.status === "ready" ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                          Generating
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-1.5">
                      {report.status === "ready" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => selectReport(report.id)}
                          className="h-8 text-neutral-600 hover:text-indigo-600 font-semibold inline-flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled
                          className="h-8 text-neutral-400 font-semibold"
                        >
                          Wait...
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={report.status !== "ready"}
                        onClick={() => setExportTarget(report)}
                        className="h-8 text-neutral-600 hover:text-indigo-600 font-semibold inline-flex items-center gap-1"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Export</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteReport(report.id)}
                        className="h-8 text-neutral-400 hover:text-red-600 hover:bg-red-50/50 font-semibold"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Scheduled Reports List Segment */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Active Automated Reports Schedules</h3>
        
        {scheduledReports.length === 0 ? (
          <div className="bg-white border border-dashed border-neutral-200 rounded-xl p-6 text-center text-xs text-neutral-400">
            No active schedules configured. Use "Schedule Run" to automate weekly audits.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scheduledReports.map((sch) => (
              <div
                key={sch.id}
                className="bg-white p-4 rounded-xl border border-neutral-200/60 shadow-sm flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <span className="font-bold text-neutral-900 text-sm block">{sch.name}</span>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-1 font-bold">
                      <span className="uppercase bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                        {sch.frequency}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        Next Run: <span className="text-neutral-600">{sch.nextRun}</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelScheduledReport(sch.id)}
                  className="rounded-lg text-xs font-semibold text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 shrink-0"
                >
                  Cancel
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── MODAL: Generate Report ─────────────────────────────────────────── */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-xl shadow-2xl p-6 border border-neutral-100">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-lg font-bold text-neutral-950 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              <span>Generate Audit Report</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Configure parameters to generate a live, downloadable simulation audit report.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateReportSubmit} className="space-y-4">
            {/* Title Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Report Title</label>
              <Input
                placeholder="e.g. Round 4 SEO & ROAS Recap"
                value={genName}
                onChange={(e) => setGenName(e.target.value)}
                required
                className="rounded-lg bg-neutral-50 border-neutral-200"
              />
            </div>

            {/* Type grid */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Report Category</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "performance", label: "Performance", desc: "Channels & ROI curves" },
                  { id: "comparison", label: "Comparison", desc: "Student vs average benchmarks" },
                  { id: "class", label: "Class Cohort", desc: "Participation distribution" },
                  { id: "individual", label: "Individual", desc: "Decisions & timeline checks" },
                ].map((t) => {
                  const isSelected = genType === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setGenType(t.id as any)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600"
                          : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                      }`}
                    >
                      <span className="text-xs font-bold block text-neutral-800 leading-none">{t.label}</span>
                      <span className="text-[9px] text-neutral-400 block mt-0.5 leading-none">{t.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selection scope grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Class Cohort</label>
                <select
                  value={genClassId}
                  onChange={(e) => setGenClassId(e.target.value)}
                  className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-lg p-2 font-semibold text-neutral-700 outline-none hover:border-neutral-300 focus:border-indigo-500"
                >
                  <option value="c_1">MKT 410 - Section A</option>
                  <option value="c_2">MKT 410 - Section B</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Date Range</label>
                <select
                  value={genDateRange}
                  onChange={(e) => setGenDateRange(e.target.value)}
                  className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-lg p-2 font-semibold text-neutral-700 outline-none hover:border-neutral-300 focus:border-indigo-500"
                >
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
            </div>

            {/* Channels checklist */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Include Channels</label>
              <div className="flex gap-4 p-2 bg-neutral-50 border border-neutral-200/50 rounded-lg">
                {[
                  { key: "seo", label: "SEO" },
                  { key: "google", label: "Google Ads" },
                  { key: "meta", label: "Meta Ads" },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-neutral-700">
                    <input
                      type="checkbox"
                      checked={genChannels[item.key as keyof typeof genChannels]}
                      onChange={() =>
                        setGenChannels((p) => ({ ...p, [item.key]: !p[item.key as keyof typeof genChannels] }))
                      }
                      className="rounded text-indigo-600 focus:ring-indigo-500 border-neutral-300 h-3.5 w-3.5"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2.5 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsGenerateOpen(false)}
                className="rounded-lg font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 font-semibold"
              >
                Launch Audit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Schedule Report ─────────────────────────────────────────── */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-xl shadow-2xl p-6 border border-neutral-100">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-lg font-bold text-neutral-950 flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              <span>Automate Scheduler Task</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Configure a recurring daemon schedule to generate and archive reports.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateScheduleSubmit} className="space-y-4">
            {/* Title Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Schedule Job Name</label>
              <Input
                placeholder="e.g. Weekly Student Rank Export Sync"
                value={schName}
                onChange={(e) => setSchName(e.target.value)}
                required
                className="rounded-lg bg-neutral-50 border-neutral-200"
              />
            </div>

            {/* Frequency Selection */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Automation Frequency</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "daily", label: "Daily Sync", desc: "Runs every night at 00:00" },
                  { id: "weekly", label: "Weekly Digest", desc: "Runs every Monday at 08:00" },
                ].map((freq) => {
                  const isSelected = schFrequency === freq.id
                  return (
                    <button
                      key={freq.id}
                      type="button"
                      onClick={() => setSchFrequency(freq.id as any)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600"
                          : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                      }`}
                    >
                      <span className="text-xs font-bold block text-neutral-800 leading-none">{freq.label}</span>
                      <span className="text-[9px] text-neutral-400 block mt-1 leading-none">{freq.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Filters scope selection */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Class Cohort</label>
                <select
                  value={schClassId}
                  onChange={(e) => setSchClassId(e.target.value)}
                  className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-lg p-2 font-semibold text-neutral-700 outline-none hover:border-neutral-300 focus:border-indigo-500"
                >
                  <option value="c_1">MKT 410 - Section A</option>
                  <option value="c_2">MKT 410 - Section B</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Data Scope</label>
                <select
                  value={schDateRange}
                  onChange={(e) => setSchDateRange(e.target.value)}
                  className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-lg p-2 font-semibold text-neutral-700 outline-none hover:border-neutral-300 focus:border-indigo-500"
                >
                  <option value="Last 24 Hours">Last 24 Hours</option>
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                </select>
              </div>
            </div>

            {/* Channels checklist */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Active Channels</label>
              <div className="flex gap-4 p-2 bg-neutral-50 border border-neutral-200/50 rounded-lg">
                {[
                  { key: "seo", label: "SEO" },
                  { key: "google", label: "Google Ads" },
                  { key: "meta", label: "Meta Ads" },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-neutral-700">
                    <input
                      type="checkbox"
                      checked={schChannels[item.key as keyof typeof schChannels]}
                      onChange={() =>
                        setSchChannels((p) => ({ ...p, [item.key]: !p[item.key as keyof typeof schChannels] }))
                      }
                      className="rounded text-indigo-600 focus:ring-indigo-500 border-neutral-300 h-3.5 w-3.5"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2.5 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsScheduleOpen(false)}
                className="rounded-lg font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 font-semibold"
              >
                Activate Job
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Export Panel Sheet ───────────────────────────────────────── */}
      <ExportPanel
        report={exportTarget}
        isOpen={exportTarget !== null}
        onClose={() => setExportTarget(null)}
      />
    </div>
  )
}
export default ReportsDashboard
