import { useState, useEffect } from "react"
import { useInstructorPortalStore } from "@/stores/instructorPortalStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from "recharts"
import { GraduationCap, MessageSquare, Save, Clock } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface StudentProgressTrackerProps {
  studentId: string
  classAverage: number
}

export function StudentProgressTracker({ studentId, classAverage }: StudentProgressTrackerProps) {
  const { students, updateStudentNotes } = useInstructorPortalStore()
  
  const student = students.find((s) => s.id === studentId)
  const [feedback, setFeedback] = useState("")

  useEffect(() => {
    if (student) {
      setFeedback(student.feedbackNotes)
    }
  }, [studentId, student])

  if (!student) {
    return (
      <Card className="border-neutral-200 bg-white p-8 text-center text-neutral-450 font-bold text-xs rounded-2xl">
        Student not found.
      </Card>
    )
  }

  const handleSaveNotes = () => {
    updateStudentNotes(student.id, feedback.trim())
    toast.success(`Saved feedback notes for ${student.name}`)
  }

  // 1. Chart Data: Scores per round compared to Class Average
  const timelineData = student.roundScores.map((score, idx) => ({
    name: `Round ${idx + 1}`,
    Student: score,
    Average: classAverage,
  }))

  const initials = student.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const getAvatarBg = (nameInitials: string) => {
    if (nameInitials === "U") return "bg-slate-900 text-white font-black"
    const hash = nameInitials.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const colors = [
      "bg-violet-100 text-violet-750",
      "bg-sky-100 text-sky-750",
      "bg-emerald-100 text-emerald-750",
      "bg-amber-100 text-amber-750",
      "bg-rose-100 text-rose-750",
      "bg-indigo-100 text-indigo-750",
    ]
    return colors[hash % colors.length]
  }

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      {/* ─── Profile Banner ─── */}
      <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative overflow-hidden">
        <div className="flex items-center gap-4 min-w-0">
          <div className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center font-black text-sm border border-neutral-100 shadow-2xs shrink-0",
            getAvatarBg(initials)
          )}>
            {initials}
          </div>
          <div className="space-y-0.5 min-w-0">
            <h3 className="text-base font-black text-neutral-900 leading-snug truncate">
              {student.name}
            </h3>
            <span className="text-xs text-neutral-500 font-bold block truncate">
              {student.email} • Joined: {student.joinedAt}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="bg-neutral-50 border border-neutral-150 rounded-xl px-3 py-1.5 text-center shrink-0">
            <span className="text-[8px] text-neutral-450 uppercase font-black tracking-wider block">Completed</span>
            <span className="text-sm font-black text-neutral-850 block mt-0.5">{student.completionRate}%</span>
          </div>
          <div className="bg-slate-900 rounded-xl px-4 py-1.5 text-white text-center shrink-0 shadow-md">
            <span className="text-[8px] text-slate-300 uppercase font-black tracking-wider block font-bold">Overall Score</span>
            <span className="text-sm font-black leading-none">{student.overallScore}%</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Charts & Channels (7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Round Score progression Chart */}
          <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl overflow-hidden">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
                <Clock className="h-4.5 w-4.5 text-neutral-900" />
                Score Timeline Progression
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Compare student scores across simulation cycles against the class average.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="h-56 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={{ stroke: "#e2e8f0" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={{ stroke: "#e2e8f0" }}
                    />
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderRadius: "8px",
                        border: "none",
                        color: "white",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Student"
                      name="Student Score"
                      stroke="#0f172a"
                      strokeWidth={3}
                      dot={{ r: 4, stroke: "#0f172a", strokeWidth: 2, fill: "white" }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Average"
                      name="Class Avg"
                      stroke="#3b82f6"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Channel breakdowns */}
          <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
                <GraduationCap className="h-4.5 w-4.5 text-neutral-900" />
                Marketing Channels Breakdown
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Student skill parameters compared side-by-side with class average.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              {/* Channel 1: SEO */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-neutral-800 font-bold">SEO Optimization</span>
                  <span className="text-neutral-500 text-[10px] font-bold">
                    Student: <strong className="text-neutral-950">{student.seoScore}%</strong> | Avg: {Math.round(classAverage * 0.95)}%
                  </span>
                </div>
                <Progress value={student.seoScore} className="h-1.5" />
              </div>

              {/* Channel 2: Google Ads */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-neutral-800 font-bold">Google Ads (CPC)</span>
                  <span className="text-neutral-500 text-[10px] font-bold">
                    Student: <strong className="text-neutral-950">{student.googleAdsScore}%</strong> | Avg: {Math.round(classAverage * 1.02)}%
                  </span>
                </div>
                <Progress value={student.googleAdsScore} className="h-1.5 text-blue-500" />
              </div>

              {/* Channel 3: Meta Ads */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-neutral-800 font-bold">Meta Ads (Social)</span>
                  <span className="text-neutral-500 text-[10px] font-bold">
                    Student: <strong className="text-neutral-950">{student.metaAdsScore}%</strong> | Avg: {Math.round(classAverage * 0.98)}%
                  </span>
                </div>
                <Progress value={student.metaAdsScore} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Notes & Feedback (5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-1.5 border-b border-neutral-100 pb-2.5">
              <MessageSquare className="h-4.5 w-4.5 text-neutral-900" />
              <span className="text-sm font-black text-neutral-900 block leading-none">
                Instructor Feedback
              </span>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                Evaluation Notes
              </label>
              <Textarea
                placeholder="Draft evaluation notes to guide the student's next optimization campaign round..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={5}
                className="text-xs border-neutral-250 bg-white resize-none font-medium leading-relaxed"
              />

              <Button
                onClick={handleSaveNotes}
                className="w-full h-9 font-black bg-slate-900 text-white hover:bg-slate-950 text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Save className="h-4 w-4" />
                Save Feedback Notes
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default StudentProgressTracker
