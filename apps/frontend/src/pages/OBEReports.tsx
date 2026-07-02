import { useState, useEffect } from "react"
import { useSearchParams, Link } from "react-router"
import { useReportsStore } from "@/stores/reportsStore"
import { useInstructorPortalStore } from "@/stores/instructorPortalStore"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  Activity,
  FileText,
  FileSpreadsheet
} from "lucide-react"
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts"

export function OBEReports() {
  const [searchParams] = useSearchParams()
  const classIdFromQuery = searchParams.get("classId") || ""

  const { classes, fetchClasses } = useInstructorPortalStore()
  const { fetchOBEReport, obeData, isLoading } = useReportsStore()
  const [selectedClassId, setSelectedClassId] = useState<string>(classIdFromQuery)
  const [radarMode, setRadarMode] = useState<"co" | "po">("co")

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  // Select class from query or fallback to first class
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id)
    }
  }, [classes, selectedClassId])

  useEffect(() => {
    if (selectedClassId) {
      fetchOBEReport(selectedClassId)
    }
  }, [selectedClassId, fetchOBEReport])

  const currentClass = classes.find(c => c.id === selectedClassId)

  // CSV Exporter
  const handleExportCSV = () => {
    if (!obeData) return
    const headers = ["Outcome Category", "Attainment Rate (%)", "Accreditation Threshold (%)", "Gap (%)"]
    
    const rows: any[] = []
    Object.entries(obeData.attainments.co).forEach(([key, val]: any) => {
      rows.push([`Course Outcome ${key.toUpperCase()}`, val, 70, (val - 70).toFixed(1)])
    })
    Object.entries(obeData.attainments.po).forEach(([key, val]: any) => {
      rows.push([`Program Outcome ${key.toUpperCase()}`, val, 70, (val - 70).toFixed(1)])
    })
    Object.entries(obeData.attainments.pso).forEach(([key, val]: any) => {
      rows.push([`Program Specific Outcome ${key.toUpperCase()}`, val, 70, (val - 70).toFixed(1)])
    })

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `OBE_Accreditation_Report_${currentClass?.name.replace(/\s+/g, "_")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // PDF Export via window print
  const handlePrint = () => {
    window.print()
  }

  // Data formatting for Radar Chart
  const coRadarData = obeData ? [
    { subject: "CO1 (SEO)", attainment: obeData.attainments.co.co1, fullMark: 100 },
    { subject: "CO2 (Google Ads)", attainment: obeData.attainments.co.co2, fullMark: 100 },
    { subject: "CO3 (Meta Ads)", attainment: obeData.attainments.co.co3, fullMark: 100 },
    { subject: "CO4 (ROI Efficiency)", attainment: obeData.attainments.co.co4, fullMark: 100 },
    { subject: "CO5 (Consistency)", attainment: obeData.attainments.co.co5, fullMark: 100 },
  ] : []

  const poRadarData = obeData ? [
    { subject: "PO1 (Knowledge)", attainment: obeData.attainments.po.po1, fullMark: 100 },
    { subject: "PO2 (Problem Analysis)", attainment: obeData.attainments.po.po2, fullMark: 100 },
    { subject: "PO3 (Solution Design)", attainment: obeData.attainments.po.po3, fullMark: 100 },
    { subject: "PO4 (Investigation)", attainment: obeData.attainments.po.po4, fullMark: 100 },
    { subject: "PO5 (Modern Tools)", attainment: obeData.attainments.po.po5, fullMark: 100 },
    { subject: "PO6 (Ethics/Team)", attainment: obeData.attainments.po.po6, fullMark: 100 },
    { subject: "PO7 (Comm)", attainment: obeData.attainments.po.po7, fullMark: 100 },
  ] : []

  const activeRadarData = radarMode === "co" ? coRadarData : poRadarData

  // Distribution chart formatting
  const distributionData = obeData ? [
    { name: "Excellent (>=90)", Students: obeData.distribution.excellent },
    { name: "Very Good (80-89)", Students: obeData.distribution.veryGood },
    { name: "Good (70-79)", Students: obeData.distribution.good },
    { name: "Satisfactory (50-69)", Students: obeData.distribution.satisfactory },
    { name: "Unsatisfactory (<50)", Students: obeData.distribution.unsatisfactory },
  ] : []

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
              OBE Performance Reports
            </h1>
            <p className="text-sm text-neutral-500 font-semibold">
              Outcome-Based Education dashboard mapping student attainment indices and curriculum deficits.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="bg-white border border-neutral-200 text-neutral-800 text-sm font-semibold rounded-lg p-2.5 outline-none shadow-sm cursor-pointer"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="border-neutral-200 text-neutral-700 font-semibold flex items-center gap-1.5 hover:bg-neutral-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            CSV
          </Button>

          <Button
            onClick={handlePrint}
            className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold flex items-center gap-1.5"
          >
            <FileText className="h-4 w-4" />
            Export PDF (Print)
          </Button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block border-b-2 border-neutral-900 pb-4 mb-6">
        <h1 className="text-3xl font-black uppercase tracking-tight text-neutral-900">OBE Accreditation & Attainment Report</h1>
        <p className="text-sm font-bold text-neutral-600 mt-1">Classroom: {currentClass?.name} | Scenario: {currentClass?.scenario}</p>
        <p className="text-xs text-neutral-500">Generated on {new Date().toLocaleDateString()} via SimLab OBE Engine</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-neutral-500 font-semibold text-sm">
          <Activity className="h-5 w-5 animate-spin mr-2" />
          Mapping outcome attainments...
        </div>
      ) : !obeData ? (
        <Card>
          <CardContent className="py-12 text-center text-neutral-500 font-medium">
            Failed to load OBE reports. Ensure this class contains completed simulation rounds.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Main Analytics Block */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-1">
            {/* Visual Outcome Radar Chart */}
            <Card className="border-neutral-200/60 shadow-sm print:border-none print:shadow-none">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-bold">Skill Achievement Radar</CardTitle>
                  <CardDescription>Visual mapping of educational outcome levels.</CardDescription>
                </div>
                {/* Radar mode toggle */}
                <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/40 print:hidden">
                  <button
                    onClick={() => setRadarMode("co")}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      radarMode === "co" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    COs
                  </button>
                  <button
                    onClick={() => setRadarMode("po")}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      radarMode === "po" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    POs
                  </button>
                </div>
              </CardHeader>
              <CardContent className="h-[320px] flex items-center justify-center pt-2">
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={activeRadarData}>
                    <PolarGrid stroke="#E5E5E5" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#404040', fontSize: 10, fontWeight: 'semibold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#888888', fontSize: 9 }} />
                    <Radar name="Attainment %" dataKey="attainment" stroke="#171717" fill="#171717" fillOpacity={0.15} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
 
            {/* Assessment Distribution Bar Chart */}
            <Card className="border-neutral-200/60 shadow-sm print:border-none print:shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-bold">Assessment Distribution</CardTitle>
                <CardDescription>Number of students across performance grading bands.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px] pt-2">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                    <Tooltip cursor={{ fill: "#F5F5F5" }} />
                    <Bar dataKey="Students" fill="#171717" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Gap Analysis and Program Specific Outcomes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:grid-cols-1">
            {/* Gap Analysis */}
            <Card className="border-neutral-200/60 shadow-sm lg:col-span-2 print:border-none print:shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-bold">Accreditation Gap Analysis</CardTitle>
                <CardDescription>Identifies the delta between class outcomes and target accreditation threshold (70%).</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-semibold text-neutral-700">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50/50">
                      <th className="py-2.5 px-4 text-neutral-500">Outcome Parameter</th>
                      <th className="py-2.5 px-2 text-center text-neutral-500">Actual Level</th>
                      <th className="py-2.5 px-2 text-center text-neutral-500">Target Threshold</th>
                      <th className="py-2.5 px-4 text-center text-neutral-500">Variance Gap</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {/* Course Outcomes */}
                    {Object.entries(obeData.attainments.co).map(([key, val]: any) => {
                      const gap = val - 70
                      return (
                        <tr key={key} className="hover:bg-neutral-50/20 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-neutral-800">Course Outcome {key.toUpperCase()}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{val}%</td>
                          <td className="py-2.5 px-2 text-center text-neutral-400">70%</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              gap >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                            }`}>
                              {gap >= 0 ? `+${gap.toFixed(1)}%` : `${gap.toFixed(1)}%`}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                    {/* Program Specific Outcomes */}
                    {Object.entries(obeData.attainments.pso).map(([key, val]: any) => {
                      const gap = val - 70
                      return (
                        <tr key={key} className="hover:bg-neutral-50/20 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-neutral-800">Program Specific Outcome {key.toUpperCase()}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{val}%</td>
                          <td className="py-2.5 px-2 text-center text-neutral-400">70%</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              gap >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                            }`}>
                              {gap >= 0 ? `+${gap.toFixed(1)}%` : `${gap.toFixed(1)}%`}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Improvement Recommendations */}
            <Card className="border-neutral-200/60 shadow-sm print:border-none print:shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-1.5">
                  <Sparkles className="h-5 w-5 text-neutral-900" />
                  Curriculum Remediation
                </CardTitle>
                <CardDescription>Actions targeting deficit gaps.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {obeData.recommendations.map((rec: string, idx: number) => (
                  <div key={idx} className="p-3 bg-neutral-50 border border-neutral-150 rounded-lg flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-neutral-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-neutral-700 font-semibold leading-relaxed">{rec}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
