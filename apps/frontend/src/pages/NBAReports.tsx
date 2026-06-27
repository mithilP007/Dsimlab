import { useState, useEffect } from "react"
import { useSearchParams, Link } from "react-router"
import { useReportsStore } from "@/stores/reportsStore"
import { useInstructorPortalStore } from "@/stores/instructorPortalStore"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  FileSpreadsheet,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  Activity
} from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"

export function NBAReports() {
  const [searchParams] = useSearchParams()
  const classIdFromQuery = searchParams.get("classId") || ""
  
  const { classes, fetchClasses } = useInstructorPortalStore()
  const { fetchNBAReport, nbaData, isLoading } = useReportsStore()
  const [selectedClassId, setSelectedClassId] = useState<string>(classIdFromQuery)

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
      fetchNBAReport(selectedClassId)
    }
  }, [selectedClassId, fetchNBAReport])

  const currentClass = classes.find(c => c.id === selectedClassId)

  // CSV Exporter
  const handleExportCSV = () => {
    if (!nbaData || !nbaData.students) return
    
    const headers = ["Student ID", "Name", "Email", "CO1 (SEO)", "CO2 (Google Ads)", "CO3 (Meta Ads)", "CO4 (ROI)", "CO5 (Consistency)"]
    const rows = nbaData.students.map((s: any) => [
      s.studentId,
      s.studentName,
      s.studentEmail,
      s.co1,
      s.co2,
      s.co3,
      s.co4,
      s.co5
    ])

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `NBA_Accreditation_Report_${currentClass?.name.replace(/\s+/g, "_")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // JSON Exporter
  const handleExportJSON = () => {
    if (!nbaData) return
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(nbaData, null, 2))
    const link = document.createElement("a")
    link.setAttribute("href", dataStr)
    link.setAttribute("download", `NBA_Accreditation_Report_${currentClass?.name.replace(/\s+/g, "_")}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Print Override (PDF Export)
  const handlePrint = () => {
    window.print()
  }

  // Recharts Chart Data Formatting
  const chartData = nbaData ? [
    { name: "CO1 (SEO)", Average: nbaData.averages.co.co1, Attainment: nbaData.attainments.co.co1 },
    { name: "CO2 (Google)", Average: nbaData.averages.co.co2, Attainment: nbaData.attainments.co.co2 },
    { name: "CO3 (Meta)", Average: nbaData.averages.co.co3, Attainment: nbaData.attainments.co.co3 },
    { name: "CO4 (ROI)", Average: nbaData.averages.co.co4, Attainment: nbaData.attainments.co.co4 },
    { name: "CO5 (Consistency)", Average: nbaData.averages.co.co5, Attainment: nbaData.attainments.co.co5 },
  ] : []

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl animate-in fade-in duration-300 print:p-0 print:bg-white print:text-black">
      {/* Breadcrumbs / Back navigation */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-5 print:hidden">
        <div className="flex items-center gap-4">
          <Link to="/reports" className="p-2 hover:bg-neutral-50 rounded-lg border border-neutral-200 transition-colors">
            <ArrowLeft className="h-4 w-4 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              NBA Accreditation Report
            </h1>
            <p className="text-sm text-neutral-500 font-semibold">
              Generate course mapping summaries and program outcome statistics.
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
            onClick={handleExportJSON}
            variant="outline"
            className="border-neutral-200 text-neutral-700 font-semibold flex items-center gap-1.5 hover:bg-neutral-50"
          >
            <Download className="h-4 w-4" />
            JSON
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

      {/* Print-Only Header */}
      <div className="hidden print:block border-b-2 border-neutral-900 pb-4 mb-6">
        <h1 className="text-3xl font-black uppercase tracking-tight text-neutral-900">NBA Outcome Attainment Report</h1>
        <p className="text-sm font-bold text-neutral-600 mt-1">Classroom: {currentClass?.name} | Scenario: {currentClass?.scenario}</p>
        <p className="text-xs text-neutral-500">Generated on {new Date().toLocaleDateString()} via SimLab Accreditation Engine</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-neutral-500 font-semibold text-sm">
          <Activity className="h-5 w-5 animate-spin mr-2" />
          Analyzing classroom metrics...
        </div>
      ) : !nbaData ? (
        <Card>
          <CardContent className="py-12 text-center text-neutral-500 font-medium">
            Failed to retrieve classroom outcomes. Ensure students have completed rounds in this classroom.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Program Outcomes Grid */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-neutral-850 print:text-neutral-900">Program Outcomes (POs) Attainment</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {Object.entries(nbaData.attainments.po).map(([key, val]: any) => (
                <Card key={key} className="border-neutral-200/60 shadow-sm">
                  <CardContent className="p-4 space-y-2 text-center">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{key}</span>
                    <h4 className="text-2xl font-black text-neutral-850">{val}%</h4>
                    <Badge className={`${val >= 70 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'} border-none text-[9px] font-bold mx-auto`}>
                      {val >= 70 ? "Attained" : "Below Target"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Mapping Matrix & Chart Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-1">
            {/* Outcome Mapping Strength Matrix */}
            <Card className="border-neutral-200/60 shadow-sm print:border-none print:shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-bold">CO-PO Mapping Strength Matrix</CardTitle>
                <CardDescription>Indicates mapped outcome weights: 3 (Strong), 2 (Medium), 1 (Low).</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-semibold text-neutral-700">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50/50">
                      <th className="py-3 px-4 text-neutral-500">Course Outcome (CO)</th>
                      <th className="py-3 px-2 text-center text-neutral-500">PO1</th>
                      <th className="py-3 px-2 text-center text-neutral-500">PO2</th>
                      <th className="py-3 px-2 text-center text-neutral-500">PO3</th>
                      <th className="py-3 px-2 text-center text-neutral-500">PO4</th>
                      <th className="py-3 px-2 text-center text-neutral-500">PO5</th>
                      <th className="py-3 px-2 text-center text-neutral-500">PO6</th>
                      <th className="py-3 px-2 text-center text-neutral-500">PO7</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    <tr>
                      <td className="py-3 px-4 font-bold text-neutral-800">CO1: SEO organic search clicks</td>
                      <td className="py-3 px-2 text-center bg-neutral-50/20 text-neutral-900 font-bold">3</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                      <td className="py-3 px-2 text-center bg-neutral-50/20 text-neutral-900 font-bold">3</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                      <td className="py-3 px-2 text-center bg-neutral-50/20 text-neutral-900 font-bold">2</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-neutral-800">CO2: Google Ads pay-per-click</td>
                      <td className="py-3 px-2 text-center bg-neutral-50/20 text-neutral-900 font-bold">3</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                      <td className="py-3 px-2 text-center bg-neutral-50/20 text-neutral-900 font-bold">3</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                      <td className="py-3 px-2 text-center bg-neutral-50/20 text-neutral-900 font-bold">3</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-neutral-800">CO3: Meta Social campaign scaling</td>
                      <td className="py-3 px-2 text-center bg-neutral-50/20 text-neutral-900 font-bold">3</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                      <td className="py-3 px-2 text-center bg-neutral-50/20 text-neutral-900 font-bold">3</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                      <td className="py-3 px-2 text-center bg-neutral-50/20 text-neutral-900 font-bold">3</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-neutral-800">CO4: ROI efficiency & budget discipline</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                      <td className="py-3 px-2 text-center bg-neutral-50/20 text-neutral-900 font-bold">3</td>
                      <td className="py-3 px-2 text-center bg-neutral-50/20 text-neutral-900 font-bold">2</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-neutral-800">CO5: Adaptability under volatility</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                      <td className="py-3 px-2 text-center bg-neutral-50/20 text-neutral-900 font-bold">3</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                      <td className="py-3 px-2 text-center bg-neutral-50/20 text-neutral-900 font-bold">2</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                      <td className="py-3 px-2 text-center text-neutral-300">-</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Course Outcome Chart */}
            <Card className="border-neutral-200/60 shadow-sm print:border-none print:shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-bold">Outcome Attainment Levels</CardTitle>
                <CardDescription>Average performance vs target attainment percentage.</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={10} domain={[0, 100]} tickLine={false} />
                    <Tooltip cursor={{ fill: "#F5F5F5" }} />
                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                    <Bar dataKey="Average" fill="#909090" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="Attainment" fill="#171717" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Student Breakdown Table */}
          <Card className="border-neutral-200/60 shadow-sm print:border-none print:shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-bold">Student Attainment Audit Registry</CardTitle>
                <CardDescription>Performance levels mapped to NBA Course Outcomes (CO1 - CO5).</CardDescription>
              </div>
              <Badge className="bg-neutral-900 text-white font-bold text-xs px-2.5">
                {nbaData.totalStudents} Students
              </Badge>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-semibold text-neutral-700">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/50">
                    <th className="py-3.5 px-4 text-neutral-500 font-bold">Student</th>
                    <th className="py-3.5 px-2 text-center text-neutral-500">CO1 (SEO)</th>
                    <th className="py-3.5 px-2 text-center text-neutral-500">CO2 (Google)</th>
                    <th className="py-3.5 px-2 text-center text-neutral-500">CO3 (Meta)</th>
                    <th className="py-3.5 px-2 text-center text-neutral-500">CO4 (ROI)</th>
                    <th className="py-3.5 px-2 text-center text-neutral-500">CO5 (Consistency)</th>
                    <th className="py-3.5 px-4 text-center text-neutral-500">Accreditation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {nbaData.students.map((student: any) => {
                    const averageCO = (student.co1 + student.co2 + student.co3 + student.co4 + student.co5) / 5
                    const attainedCount = [student.co1, student.co2, student.co3, student.co4, student.co5].filter(c => c >= 70).length
                    const isAttained = averageCO >= 70
                    
                    return (
                      <tr key={student.studentId} className="hover:bg-neutral-50/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-neutral-850">{student.studentName}</p>
                          <p className="text-[10px] text-neutral-400 font-medium">{student.studentEmail}</p>
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded font-mono ${student.co1 >= 70 ? 'text-emerald-700 bg-emerald-50' : 'text-neutral-600'}`}>
                            {student.co1.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded font-mono ${student.co2 >= 70 ? 'text-emerald-700 bg-emerald-50' : 'text-neutral-600'}`}>
                            {student.co2.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded font-mono ${student.co3 >= 70 ? 'text-emerald-700 bg-emerald-50' : 'text-neutral-600'}`}>
                            {student.co3.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded font-mono ${student.co4 >= 70 ? 'text-emerald-700 bg-emerald-50' : 'text-neutral-600'}`}>
                            {student.co4.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded font-mono ${student.co5 >= 70 ? 'text-emerald-700 bg-emerald-50' : 'text-neutral-600'}`}>
                            {student.co5.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isAttained ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-none flex items-center gap-1 text-[10px] font-bold">
                                <CheckCircle className="h-3 w-3" />
                                Attained
                              </Badge>
                            ) : (
                              <Badge className="bg-neutral-100 text-neutral-650 border-none flex items-center gap-1 text-[10px] font-bold">
                                <XCircle className="h-3 w-3" />
                                Unattained
                              </Badge>
                            )}
                            <span className="text-[10px] text-neutral-400">({attainedCount}/5 COs)</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
