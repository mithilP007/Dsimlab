import { useEffect } from "react"
import { useParams, Link } from "react-router"
import { useReportsStore } from "@/stores/reportsStore"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Award,
  Sparkles,
  FileText,
  BookmarkCheck,
  Zap,
  Activity,
  Download
} from "lucide-react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area
} from "recharts"

export function StudentReport() {
  const { studentId } = useParams<{ studentId: string }>()
  const { fetchStudentReport, studentData, isLoading } = useReportsStore()

  useEffect(() => {
    if (studentId) {
      fetchStudentReport(studentId)
    }
  }, [studentId, fetchStudentReport])

  const handlePrint = () => {
    window.print()
  }

  const handleExportJSON = () => {
    if (!studentData) return
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(studentData, null, 2))
    const link = document.createElement("a")
    link.setAttribute("href", dataStr)
    link.setAttribute("download", `Student_Report_${studentData.studentName.replace(/\s+/g, "_")}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Format Recharts data
  const historyData = studentData?.history || []

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl animate-in fade-in duration-300 print:p-0 print:bg-white print:text-black">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-5 print:hidden">
        <div className="flex items-center gap-4">
          <Link to="/reports" className="p-2 hover:bg-neutral-50 rounded-lg border border-neutral-200 transition-colors">
            <ArrowLeft className="h-4 w-4 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              Student Performance Audit
            </h1>
            <p className="text-sm text-neutral-500 font-semibold">
              Review round-by-round channel statistics, marketing growth curves, and accreditation status.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
            Print Report (PDF)
          </Button>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block border-b-2 border-neutral-900 pb-4 mb-6">
        <h1 className="text-3xl font-black uppercase tracking-tight text-neutral-900">Student Simulation Audit Record</h1>
        <p className="text-sm font-bold text-neutral-600 mt-1">
          Student: {studentData?.studentName} ({studentData?.studentEmail})
        </p>
        <p className="text-xs text-neutral-500">Generated on {new Date().toLocaleDateString()} | SimLab Academic Audits</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-neutral-500 font-semibold text-sm">
          <Activity className="h-5 w-5 animate-spin mr-2" />
          Aggregating student ledger...
        </div>
      ) : !studentData ? (
        <Card>
          <CardContent className="py-12 text-center text-neutral-500 font-medium">
            Failed to retrieve student profile. Verify that student exists and is assigned to your classroom.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Quick Demographics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-neutral-200/60 shadow-sm">
              <CardContent className="pt-6 space-y-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Student Profile</span>
                <div>
                  <h3 className="font-bold text-neutral-800 text-lg leading-tight">{studentData.studentName}</h3>
                  <p className="text-xs text-neutral-500 font-medium mt-0.5">{studentData.studentEmail}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-neutral-200/60 shadow-sm">
              <CardContent className="pt-6 space-y-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Completed Duration</span>
                <div>
                  <h3 className="font-bold text-neutral-800 text-lg leading-tight">{studentData.roundsCount} Rounds</h3>
                  <p className="text-xs text-neutral-500 font-medium mt-0.5">Active Sandbox Simulation State</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-neutral-200/60 shadow-sm">
              <CardContent className="pt-6 space-y-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Certification Levels</span>
                <div className="flex items-center gap-2">
                  {studentData.certificate ? (
                    <>
                      <Badge className="bg-neutral-900 text-white font-bold text-xs px-2.5 py-0.5 flex items-center gap-1">
                        <Award className="h-3.5 w-3.5" />
                        {studentData.certificate.band} Level
                      </Badge>
                      <Link to={`/verify/${studentData.certificate.verificationId}`} target="_blank" className="text-[10px] font-bold text-neutral-500 hover:text-black">
                        Verify Badge &rarr;
                      </Link>
                    </>
                  ) : (
                    <span className="text-sm font-semibold text-neutral-450 italic">Ineligible (Active round progression)</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scores Trend Curve */}
          <Card className="border-neutral-200/60 shadow-sm print:border-none print:shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-bold">Marketing Score Curves</CardTitle>
              <CardDescription>Visual progression of channel scores across completed rounds.</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                  <XAxis dataKey="round" tickFormatter={(r) => `Round ${r}`} stroke="#888888" fontSize={10} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={10} domain={[0, 100]} tickLine={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  <Line type="monotone" dataKey="seoScore" name="SEO" stroke="#888888" strokeWidth={2} activeDot={{ r: 5 }} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="googleAdsScore" name="Google Ads" stroke="#404040" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="metaAdsScore" name="Meta Ads" stroke="#B0B0B0" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="compositeScore" name="Composite Index" stroke="#171717" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Traffic and Revenue Curves */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-1">
            {/* Traffic Growth */}
            <Card className="border-neutral-200/60 shadow-sm print:border-none print:shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-bold">Traffic Growth Timeline</CardTitle>
                <CardDescription>Organic + Paid Click volumes acquired round-by-round.</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px] pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#171717" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#171717" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                    <XAxis dataKey="round" tickFormatter={(r) => `Round ${r}`} stroke="#888888" fontSize={10} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="clicks" name="Total Clicks" stroke="#171717" strokeWidth={2.5} fillOpacity={1} fill="url(#colorClicks)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Growth */}
            <Card className="border-neutral-200/60 shadow-sm print:border-none print:shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-bold">Revenue Growth Timeline</CardTitle>
                <CardDescription>Aggregated conversion revenue generated round-by-round.</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px] pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#888888" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#888888" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                    <XAxis dataKey="round" tickFormatter={(r) => `Round ${r}`} stroke="#888888" fontSize={10} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" name="Revenue ($)" stroke="#888888" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Round History Table */}
          <Card className="border-neutral-200/60 shadow-sm print:border-none print:shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-bold">Round Ledger Details</CardTitle>
              <CardDescription>Chronological simulation ledger metrics.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-semibold text-neutral-700">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/50">
                    <th className="py-3 px-4 text-neutral-500 font-bold">Round Number</th>
                    <th className="py-3 px-2 text-center text-neutral-500 font-bold">SEO Score</th>
                    <th className="py-3 px-2 text-center text-neutral-500 font-bold">Google PPC Score</th>
                    <th className="py-3 px-2 text-center text-neutral-500 font-bold">Meta Social Score</th>
                    <th className="py-3 px-2 text-center text-neutral-500 font-bold">Composite Index</th>
                    <th className="py-3 px-2 text-center text-neutral-500 font-bold">Acquired Clicks</th>
                    <th className="py-3 px-4 text-right text-neutral-500 font-bold">Generated Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {historyData.map((row: any) => (
                    <tr key={row.round} className="hover:bg-neutral-50/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-neutral-900">Round {row.round}</td>
                      <td className="py-3 px-2 text-center font-mono">{row.seoScore.toFixed(1)}%</td>
                      <td className="py-3 px-2 text-center font-mono">{row.googleAdsScore.toFixed(1)}%</td>
                      <td className="py-3 px-2 text-center font-mono">{row.metaAdsScore.toFixed(1)}%</td>
                      <td className="py-3 px-2 text-center font-mono font-bold text-neutral-900">{row.compositeScore.toFixed(1)}%</td>
                      <td className="py-3 px-2 text-center font-mono">{row.clicks.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-850">${row.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Coaching & Milestones Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-1">
            {/* Coaching recommendations */}
            <Card className="border-neutral-200/60 shadow-sm print:border-none print:shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-1.5">
                  <Sparkles className="h-5 w-5 text-neutral-900" />
                  AI Coaching Suggestions
                </CardTitle>
                <CardDescription>Dynamic guidance based on individual score splits.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {studentData.recommendations.map((rec: string, idx: number) => (
                  <div key={idx} className="p-3 bg-neutral-50 border border-neutral-150 rounded-lg flex items-start gap-2.5">
                    <Zap className="h-4 w-4 text-neutral-500 shrink-0 mt-0.5 animate-pulse" />
                    <p className="text-xs text-neutral-700 font-semibold leading-relaxed">{rec}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

             {/* Achievements */}
            <Card className="border-neutral-200/60 shadow-sm print:border-none print:shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-bold">Simulation Achievements Unlocked</CardTitle>
                <CardDescription>Badges earned for target round score thresholds.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2.5">
                {studentData.achievements.length > 0 ? (
                  studentData.achievements.map((ach: string, idx: number) => (
                    <Badge
                      key={idx}
                      className="bg-neutral-50 text-neutral-800 border-neutral-250/70 hover:bg-neutral-100 font-bold px-3 py-1.5 text-xs flex items-center gap-1.5"
                    >
                      <BookmarkCheck className="h-3.5 w-3.5 text-neutral-600" />
                      {ach}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-neutral-450 italic">No achievements unlocked yet. Continue completing rounds to earn badges.</span>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Checkpoint Justifications */}
          <Card className="border-neutral-200/60 shadow-sm print:border-none print:shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-1.5">
                <FileText className="h-5 w-5 text-neutral-900" />
                Student Checkpoint Justifications
              </CardTitle>
              <CardDescription>Round-by-round strategy justifications submitted by the student.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {studentData.checkpoints && studentData.checkpoints.length > 0 ? (
                studentData.checkpoints.map((cp: any) => (
                  <div key={cp.id} className="p-4 bg-neutral-50 border border-neutral-150 rounded-xl space-y-2 text-left">
                    <div className="flex justify-between items-center border-b border-neutral-200/60 pb-2">
                      <span className="font-bold text-neutral-800 text-xs">Round {cp.roundNumber} Reflection</span>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-neutral-900 text-white font-bold text-[10px] px-2 py-0.5 border-none">
                          Quality: {cp.reflectionQualityScore}%
                        </Badge>
                        <span className="text-[10px] text-neutral-400 font-semibold">
                          {new Date(cp.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-600 font-medium leading-relaxed italic">
                      "{cp.justificationText}"
                    </p>
                    {cp.instructorComment && (
                      <div className="pt-2 text-[11px] font-semibold text-indigo-700 flex items-start gap-1">
                        <span className="font-black">Instructor Comment:</span>
                        <span className="text-neutral-600 italic">"{cp.instructorComment}"</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-neutral-450 italic">
                  No checkpoint justifications submitted yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
