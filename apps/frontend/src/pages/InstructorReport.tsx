import { useState, useEffect } from "react"
import { Link } from "react-router"
import { useReportsStore } from "@/stores/reportsStore"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Users,
  Activity,
  BookOpen,
  Calendar,
  Layers,
  FileText
} from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"

export function InstructorReport() {
  const { fetchInstructorComparisons, comparisonsData, isLoading } = useReportsStore()
  const [activeTab, setActiveTab] = useState<"class" | "semester" | "industry" | "scenario">("class")

  useEffect(() => {
    fetchInstructorComparisons()
  }, [fetchInstructorComparisons])

  const handlePrint = () => {
    window.print()
  }

  // ─── Client-side Aggregations ──────────────────────────────────────────────

  // 1. Class Data
  const classChartData = comparisonsData.map(c => ({
    name: c.className,
    "Average Score": c.averageScore,
    "Completion Rate (%)": c.completionRate
  }))

  // 2. Semester Aggregation
  const semesterMap: Record<string, { sum: number; count: number }> = {}
  comparisonsData.forEach(c => {
    semesterMap[c.semester] = semesterMap[c.semester] || { sum: 0, count: 0 }
    semesterMap[c.semester].sum += c.averageScore
    semesterMap[c.semester].count += 1
  })
  const semesterChartData = Object.entries(semesterMap).map(([name, val]) => ({
    name,
    "Average Score": parseFloat((val.sum / val.count).toFixed(1))
  }))

  // 3. Industry Aggregation
  const industryMap: Record<string, { sum: number; count: number }> = {}
  comparisonsData.forEach(c => {
    industryMap[c.industry] = industryMap[c.industry] || { sum: 0, count: 0 }
    industryMap[c.industry].sum += c.averageScore
    industryMap[c.industry].count += 1
  })
  const industryChartData = Object.entries(industryMap).map(([name, val]) => ({
    name,
    "Average Score": parseFloat((val.sum / val.count).toFixed(1))
  }))

  // 4. Scenario Aggregation
  const scenarioMap: Record<string, { sum: number; count: number }> = {}
  comparisonsData.forEach(c => {
    scenarioMap[c.scenario] = scenarioMap[c.scenario] || { sum: 0, count: 0 }
    scenarioMap[c.scenario].sum += c.averageScore
    scenarioMap[c.scenario].count += 1
  })
  const scenarioChartData = Object.entries(scenarioMap).map(([name, val]) => ({
    name,
    "Average Score": parseFloat((val.sum / val.count).toFixed(1))
  }))

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl animate-in fade-in duration-300 print:p-0 print:bg-white print:text-black">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-5 print:hidden">
        <div className="flex items-center gap-4">
          <Link to="/reports" className="p-2 hover:bg-neutral-50 rounded-lg border border-neutral-200 transition-colors">
            <ArrowLeft className="h-4 w-4 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              Classroom Comparative Analytics
            </h1>
            <p className="text-sm text-neutral-500 font-semibold">
              Cross-examine student completion rates, average scores, and scenario distributions.
            </p>
          </div>
        </div>

        <Button
          onClick={handlePrint}
          className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold flex items-center gap-1.5"
        >
          <FileText className="h-4 w-4" />
          Print Analysis (PDF)
        </Button>
      </div>

      {/* Print Header */}
      <div className="hidden print:block border-b-2 border-neutral-900 pb-4 mb-6">
        <h1 className="text-3xl font-black uppercase tracking-tight text-neutral-900">Institutional Cohort Comparative Audit</h1>
        <p className="text-sm font-bold text-neutral-600 mt-1">Cross-cohort analytics and scenario distributions</p>
        <p className="text-xs text-neutral-500">Generated on {new Date().toLocaleDateString()} | SimLab Academic Portals</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-neutral-500 font-semibold text-sm">
          <Activity className="h-5 w-5 animate-spin mr-2" />
          Collating comparisons ledger...
        </div>
      ) : comparisonsData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-neutral-500 font-medium">
            No comparative records available. Ensure you have created multiple classrooms to audit differences.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Tabs Menu */}
          <div className="flex border-b border-neutral-200 print:hidden">
            <button
              onClick={() => setActiveTab("class")}
              className={`py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === "class" ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-550 hover:text-neutral-900"
              }`}
            >
              <Users className="h-4 w-4" />
              Classrooms
            </button>
            <button
              onClick={() => setActiveTab("semester")}
              className={`py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === "semester" ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-550 hover:text-neutral-900"
              }`}
            >
              <Calendar className="h-4 w-4" />
              Semesters
            </button>
            <button
              onClick={() => setActiveTab("industry")}
              className={`py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === "industry" ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-550 hover:text-neutral-900"
              }`}
            >
              <Layers className="h-4 w-4" />
              Industries
            </button>
            <button
              onClick={() => setActiveTab("scenario")}
              className={`py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === "scenario" ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-550 hover:text-neutral-900"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Scenarios
            </button>
          </div>

          {/* Aggregate Visualisation Card */}
          <Card className="border-neutral-200/60 shadow-sm print:border-none print:shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-bold capitalize">
                {activeTab} Comparison Overview
              </CardTitle>
              <CardDescription>
                Visual distribution of average round indices for the selected tab vector.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[340px]">
              {activeTab === "class" && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                    <Tooltip cursor={{ fill: "#F5F5F5" }} />
                    <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }} />
                    <Bar dataKey="Average Score" fill="#171717" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="Completion Rate (%)" fill="#909090" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {activeTab === "semester" && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={semesterChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                    <Tooltip cursor={{ fill: "#F5F5F5" }} />
                    <Bar dataKey="Average Score" fill="#171717" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {activeTab === "industry" && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={industryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                    <Tooltip cursor={{ fill: "#F5F5F5" }} />
                    <Bar dataKey="Average Score" fill="#171717" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {activeTab === "scenario" && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scenarioChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                    <Tooltip cursor={{ fill: "#F5F5F5" }} />
                    <Bar dataKey="Average Score" fill="#171717" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Comparisons Table */}
          <Card className="border-neutral-200/60 shadow-sm print:border-none print:shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-bold">Class Comparison Ledger</CardTitle>
              <CardDescription>Tabular registry of classroom statistics.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-semibold text-neutral-700">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/50">
                    <th className="py-3 px-4 text-neutral-500 font-bold">Classroom</th>
                    <th className="py-3 px-2 text-neutral-500 font-bold">Scenario Template</th>
                    <th className="py-3 px-2 text-neutral-500 font-bold">Industry Sector</th>
                    <th className="py-3 px-2 text-neutral-500 font-bold">Semester</th>
                    <th className="py-3 px-2 text-center text-neutral-500 font-bold">Enrolled Students</th>
                    <th className="py-3 px-2 text-center text-neutral-500 font-bold">Average Score</th>
                    <th className="py-3 px-4 text-right text-neutral-500 font-bold">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {comparisonsData.map((row: any) => (
                    <tr key={row.classId} className="hover:bg-neutral-50/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-neutral-850">{row.className}</td>
                      <td className="py-3 px-2 text-neutral-600">{row.scenario}</td>
                      <td className="py-3 px-2 text-neutral-600">{row.industry}</td>
                      <td className="py-3 px-2 text-neutral-600">{row.semester}</td>
                      <td className="py-3 px-2 text-center font-mono">{row.studentsCount}</td>
                      <td className="py-3 px-2 text-center font-mono font-bold text-neutral-900">{row.averageScore.toFixed(1)}%</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900">{row.completionRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
