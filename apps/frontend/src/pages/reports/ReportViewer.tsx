import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
} from "recharts"
import type { SimulationReport } from "@/stores/reportsStore"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  ArrowLeft,
  Printer,
  Share2,
  TrendingUp,
  Award,
  Users,
  Target,
  Sparkles,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react"

interface ReportViewerProps {
  report: SimulationReport
  onClose: () => void
  onExport: () => void
}

export function ReportViewer({ report, onClose, onExport }: ReportViewerProps) {
  const handlePrint = () => {
    window.print()
  }

  const handleShare = () => {
    const url = `${window.location.origin}/reports/${report.id}`
    navigator.clipboard.writeText(url)
    toast.success("Share link copied to clipboard!", {
      description: "Anyone in your organization can access this report link.",
    })
  }

  // ─── Render Report Sub-sections based on Type ──────────────────────────────

  const renderPerformanceReport = () => {
    const scoreData = [
      { round: "Round 1", Score: 68, Average: 65, Traffic: 1200 },
      { round: "Round 2", Score: 74, Average: 71, Traffic: 2400 },
      { round: "Round 3", Score: 83, Average: 76, Traffic: 4100 },
      { round: "Round 4", Score: 89, Average: 78, Traffic: 6500 },
    ]

    const channelData = [
      { name: "Organic SEO", Score: 85, Clicks: 3500 },
      { name: "Google Search Ads", Score: 92, Clicks: 4800 },
      { name: "Meta Social Ads", Score: 78, Clicks: 2900 },
    ]

    return (
      <div className="space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Overall Score", value: "89 / 100", change: "+15% vs R1", icon: Award, color: "text-indigo-600 bg-indigo-50" },
            { label: "Total ROAS", value: "2.8x Average", change: "+0.4x this round", icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
            { label: "Acquisition Cost", value: "$14.20 CPA", change: "-18% cost reduction", icon: Target, color: "text-amber-600 bg-amber-50" },
            { label: "Traffic Volume", value: "13,800 Visits", change: "+42% traffic surge", icon: Users, color: "text-blue-600 bg-blue-50" },
          ].map((card, i) => {
            const Icon = card.icon
            return (
              <div key={i} className="bg-white p-4 rounded-xl border border-neutral-200/60 shadow-sm flex items-center gap-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs text-neutral-400 font-bold block uppercase tracking-wider">{card.label}</span>
                  <span className="text-xl font-bold text-neutral-900 block mt-0.5">{card.value}</span>
                  <span className="text-[10px] text-emerald-600 font-semibold block">{card.change}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-neutral-200/60 shadow-sm">
            <span className="text-sm font-bold text-neutral-800 block mb-4">Round-by-Round Score Progression</span>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="round" tick={{ fontSize: 11, fill: "#888" }} />
                  <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: "#888" }} />
                  <ChartTooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Score" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Average" stroke="#9ca3af" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-neutral-200/60 shadow-sm">
            <span className="text-sm font-bold text-neutral-800 block mb-4">Channel Engagement & Competency Scores</span>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#888" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#888" }} />
                  <ChartTooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Score" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Narrative & Round Breakdown */}
        <div className="bg-gradient-to-r from-indigo-50/50 to-blue-50/50 p-5 rounded-xl border border-indigo-100 flex items-start gap-4">
          <Sparkles className="h-6 w-6 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-sm font-bold text-indigo-950 block">AI Executive Performance Assessment</span>
            <p className="text-xs text-indigo-900/90 leading-relaxed">
              Your overall campaign competency score has improved significantly, landing in the 90th percentile of the course roster.
              <strong> Google Ads Quality Scores </strong> peaked at 9/10 owing to a highly structured negative keyword list and exact keyword matching strategies.
              SEO remains steady with a 4% increase in organic backlinks. Social ads CPC fluctuates slightly, suggesting that refreshing Meta creatives is necessary for Round 5.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const renderComparisonReport = () => {
    const studentVsClass = [
      { metric: "SEO Backlinks", Student: 82, Average: 72 },
      { metric: "Google Ads CPA", Student: 90, Average: 75 },
      { metric: "Meta Ads ROAS", Student: 76, Average: 79 },
      { metric: "Budget Efficiency", Student: 94, Average: 80 },
      { metric: "Overall Score", Student: 89, Average: 80 },
    ]

    return (
      <div className="space-y-6">
        {/* KPI Score and Benchmark Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl border border-neutral-200/60 shadow-sm text-center relative overflow-hidden flex flex-col justify-center items-center">
            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-bold uppercase py-0.5 px-3 rounded-bl-lg">
              Benchmark
            </div>
            <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider block">Percentile Rank</span>
            <span className="text-4xl font-extrabold text-indigo-600 mt-2">88th</span>
            <p className="text-xs text-neutral-500 mt-2 max-w-[200px]">
              You scored higher than 88% of all registered student simulation attempts in this class.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-neutral-200/60 shadow-sm text-center flex flex-col justify-center items-center">
            <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider block">Deviation from Average</span>
            <span className="text-4xl font-extrabold text-emerald-600 mt-2">+9.0%</span>
            <p className="text-xs text-neutral-500 mt-2 max-w-[200px]">
              Current overall score is 89.0, whereas the active cohort class average sits at 80.0.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-neutral-200/60 shadow-sm text-center flex flex-col justify-center items-center">
            <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider block">Target Tier Eligibility</span>
            <span className="text-2xl font-bold text-amber-500 mt-3 flex items-center gap-1.5 justify-center">
              <Award className="h-6 w-6" /> Distinction
            </span>
            <p className="text-xs text-neutral-500 mt-2 max-w-[200px]">
              Eligible for the Distinction Certificate based on the instructor's active grading criteria.
            </p>
          </div>
        </div>

        {/* Double Bar Chart */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200/60 shadow-sm">
          <span className="text-sm font-bold text-neutral-800 block mb-4">Competency Radar Comparison</span>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studentVsClass} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "#888" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#888" }} />
                <ChartTooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Student" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Average" fill="#9ca3af" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tactical Recommendations */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200/60 shadow-sm space-y-3">
          <span className="text-sm font-bold text-neutral-800 block">Tactical Recommendations Checklist</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {[
              { text: "SEO Score is +10% above benchmark; maintain current backlink directories.", status: "positive" },
              { text: "Meta Ads ROAS sits slightly below class average (-3%); audit audience targeting.", status: "negative" },
              { text: "Google CPC efficiency is +15% better than average; keep negative keywords lists active.", status: "positive" },
              { text: "Budget utilization was 98.4%, meeting instructions guidelines perfectly.", status: "positive" },
            ].map((rec, i) => (
              <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border ${rec.status === "positive" ? "bg-emerald-50/40 border-emerald-100 text-emerald-950" : "bg-red-50/40 border-red-100 text-red-950"}`}>
                <CheckCircle className={`h-4 w-4 shrink-0 mt-0.5 ${rec.status === "positive" ? "text-emerald-600" : "text-red-500"}`} />
                <span>{rec.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderClassReport = () => {
    const classDistribution = [
      { scoreRange: "60-65", count: 2 },
      { scoreRange: "65-70", count: 4 },
      { scoreRange: "70-75", count: 6 },
      { scoreRange: "75-80", count: 9 },
      { scoreRange: "80-85", count: 7 },
      { scoreRange: "85-90", count: 4 },
      { scoreRange: "90-95", count: 2 },
      { scoreRange: "95-100", count: 1 },
    ]

    return (
      <div className="space-y-6">
        {/* Class Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Cohort Size", value: "35 Students", desc: "98% active now", icon: Users, color: "bg-blue-50 text-blue-600" },
            { label: "Average Score", value: "79.4 / 100", desc: "+2.4% last round", icon: Award, color: "bg-indigo-50 text-indigo-600" },
            { label: "Highest Score", value: "95.8 / 100", desc: "Achieved in Round 4", icon: TrendingUp, color: "bg-emerald-50 text-emerald-600" },
            { label: "Average ROAS", value: "2.14x", desc: "Across all active channels", icon: Target, color: "bg-amber-50 text-amber-600" },
          ].map((item, i) => {
            const Icon = item.icon
            return (
              <div key={i} className="bg-white p-4 rounded-xl border border-neutral-200/60 shadow-sm flex items-center gap-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${item.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs text-neutral-400 font-bold block uppercase tracking-wider">{item.label}</span>
                  <span className="text-xl font-bold text-neutral-900 block mt-0.5">{item.value}</span>
                  <span className="text-[10px] text-neutral-500 block">{item.desc}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Score Distribution Chart */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200/60 shadow-sm">
          <span className="text-sm font-bold text-neutral-800 block mb-4">Cohort Score Distribution Bell Curve</span>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={classDistribution} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="scoreRange" label={{ value: "Score Range", position: "insideBottom", offset: -2, fontSize: 11 }} tick={{ fontSize: 11 }} />
                <YAxis label={{ value: "Students Count", angle: -90, position: "insideLeft", offset: 5, fontSize: 11 }} tick={{ fontSize: 11 }} />
                <ChartTooltip />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" name="Students" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Instructor Summary Narrative */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 space-y-2">
          <span className="text-sm font-bold text-neutral-800 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-indigo-600" /> Cohort Performance Summary & Insights
          </span>
          <p className="text-xs text-neutral-600 leading-relaxed">
            The cohort demonstrates robust performance, with 75% of class members scoring in the 70–85 range.
            Average student Google Ads metrics (CTR: 3.4%) reflect healthy search copy strategies.
            The primary drag on class averages remains SEO page-speed configuration details and Meta social interest layering overlaps.
            Instructors are advised to allocate 10 minutes in the next lecture addressing the impact of landing page quality scores on organic crawlers.
          </p>
        </div>
      </div>
    )
  }

  const renderIndividualReport = () => {
    const activityLog = [
      { round: "Round 4", event: "Completed SEO Link-Building and Meta Ad sets", date: "2026-06-03 16:45", status: "submitted" },
      { round: "Round 3", event: "Google Ads Budget redistribution and Keyword adjustments", date: "2026-05-30 11:20", status: "submitted" },
      { round: "Round 2", event: "Activated landing pages and Google Ad campaigns", date: "2026-05-24 09:15", status: "submitted" },
      { round: "Round 1", event: "Simulation initialized and first decisions submitted", date: "2026-05-18 14:05", status: "submitted" },
    ]

    return (
      <div className="space-y-6">
        {/* Student Bio Card */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-xl">
              AW
            </div>
            <div>
              <h4 className="text-lg font-bold text-neutral-900">Alexander Wright</h4>
              <span className="text-xs text-neutral-400 block">Class: MKT 410 - section A</span>
              <span className="text-xs text-indigo-600 font-semibold mt-0.5 block">Student ID: std_10842</span>
            </div>
          </div>
          <div className="flex flex-col text-left md:text-right">
            <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider block">Student Overall Rank</span>
            <span className="text-2xl font-black text-neutral-900 mt-0.5">#4 <span className="text-xs text-neutral-500 font-normal">out of 35</span></span>
            <span className="text-xs text-emerald-600 font-semibold block">Top 12% in cohort</span>
          </div>
        </div>

        {/* Decision & Action Logs */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200/60 shadow-sm">
          <span className="text-sm font-bold text-neutral-800 block mb-4">Simulation Decision & Activity Timeline</span>
          <div className="relative border-l border-neutral-200 ml-3 pl-6 space-y-6">
            {activityLog.map((log, i) => (
              <div key={i} className="relative">
                <span className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-indigo-50 border-2 border-indigo-600 flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-800">{log.round} Submission</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-full font-bold">
                      {log.status}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">{log.event}</p>
                  <span className="text-[9px] text-neutral-400 block mt-0.5">{log.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Narrative Summary card */}
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 flex gap-4">
          <AlertCircle className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider block">Individual Progress Audit</span>
            <p className="text-xs text-indigo-900/90 leading-relaxed">
              Alexander shows strong engagement with a 100% submission rate.
              Performance is driven primarily by an outstanding understanding of CPC optimizations.
              In Round 4, Google Ads conversion rates reached 4.8% (benchmark average: 3.2%).
              He is on track to earn a Certificate of Excellence if overall score is maintained above 90.0 in the final round.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-neutral-50 min-h-screen rounded-xl border border-neutral-200 shadow-md flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Viewer Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">{report.name}</h2>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
              <span className="bg-neutral-100 px-2 py-0.5 rounded font-bold uppercase text-[9px] text-neutral-600">
                {report.type}
              </span>
              <span>•</span>
              <span>Generated on {report.createdAt}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex-1 md:flex-none flex items-center gap-2 rounded-lg font-semibold border-neutral-200"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="flex-1 md:flex-none flex items-center gap-2 rounded-lg font-semibold border-neutral-200"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share</span>
          </Button>
          <Button
            size="sm"
            onClick={onExport}
            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-2"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export Data</span>
          </Button>
        </div>
      </header>

      {/* Viewer Main Viewport */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl w-full mx-auto space-y-6">
        {/* Render correct template based on type */}
        {report.type === "performance" && renderPerformanceReport()}
        {report.type === "comparison" && renderComparisonReport()}
        {report.type === "class" && renderClassReport()}
        {report.type === "individual" && renderIndividualReport()}
      </div>
    </div>
  )
}
