import { KpiCard } from "@/components/simulation/KpiCard"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  School,
  Users,
  TrendingUp,
  BarChart3,
  Plus,
  BookOpen,
  Calendar,
  Clock,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface ClassRow {
  id: string
  name: string
  students: number
  scenario: string
  deadline: string
  status: "Active" | "Draft" | "Completed"
}

interface SubmissionFeedItem {
  id: string
  studentName: string
  action: string
  timeAgo: string
}

const recentClasses: ClassRow[] = [
  {
    id: "1",
    name: "MKT 410: Advanced Digital Marketing",
    students: 24,
    scenario: "E-Commerce Launch Sprint",
    deadline: "2026-06-15",
    status: "Active",
  },
  {
    id: "2",
    name: "MKT 420: Social Media Strategy",
    students: 18,
    scenario: "Meta Ads Optimization",
    deadline: "2026-06-20",
    status: "Draft",
  },
  {
    id: "3",
    name: "MKT 310: Intro to Advertising",
    students: 30,
    scenario: "Google Search Ads Launch",
    deadline: "2026-05-30",
    status: "Completed",
  },
]

const recentSubmissions: SubmissionFeedItem[] = [
  { id: "1", studentName: "John", action: "Submitted Round 4", timeAgo: "10 mins ago" },
  { id: "2", studentName: "Aisha", action: "Updated Campaign", timeAgo: "25 mins ago" },
  { id: "3", studentName: "David", action: "Completed SEO Quiz", timeAgo: "1 hour ago" },
  { id: "4", studentName: "Emily", action: "Set Bid Strategy", timeAgo: "2 hours ago" },
  { id: "5", studentName: "Michael", action: "Requested Certification", timeAgo: "4 hours ago" },
]

export function InstructorDashboard() {
  // Calculated Aggregate Stats
  const activeClassesCount = recentClasses.filter((c) => c.status === "Active").length
  const totalStudentsCount = recentClasses.reduce((sum, c) => sum + c.students, 0)

  const handleAction = (message: string) => {
    toast.success(message)
  }

  return (
    <div className="space-y-6 text-left">
      {/* HEADER TITLE */}
      <div className="bg-white p-6 rounded-xl border border-neutral-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
            <School className="h-5.5 w-5.5 text-neutral-700" />
            <span>Instructor Dashboard</span>
          </h2>
          <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
            Overview Console • Academic Management Portal
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="px-3 py-1 text-xs border-neutral-200 font-bold bg-neutral-50 text-neutral-700">
            Instructor Mode
          </Badge>
        </div>
      </div>

      {/* TOP KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Active Classes"
          value={activeClassesCount}
          trend="+1"
          description="since last term"
          icon={School}
        />
        <KpiCard
          title="Total Students"
          value={totalStudentsCount}
          trend="+12%"
          description="vs last semester"
          icon={Users}
        />
        <KpiCard
          title="Average Class ROI %"
          value="18.5%"
          trend="+2.4%"
          description="overall conversion"
          icon={TrendingUp}
        />
        <KpiCard
          title="Completion Rate %"
          value="92%"
          trend="+5%"
          description="submission average"
          icon={BarChart3}
        />
      </div>

      {/* QUICK ACTIONS */}
      <Card className="border-neutral-200 shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Administrative Panel</span>
            <span className="text-sm font-bold text-neutral-900">Quick Operations & Reports</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleAction("Initializing Create Class workflow...")}
              className="h-9 font-bold bg-neutral-900 text-white hover:bg-neutral-800 text-xs"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Create New Class
            </Button>
            <Button
              onClick={() => handleAction("Initializing Create Scenario builder...")}
              className="h-9 font-bold bg-neutral-950 text-white hover:bg-neutral-800 text-xs"
            >
              <BookOpen className="mr-1.5 h-4 w-4" />
              Create Scenario
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction("Opening Class Performance Reports...")}
              className="h-9 font-bold border-neutral-200 hover:bg-neutral-50 text-xs"
            >
              <BarChart3 className="mr-1.5 h-4 w-4 text-neutral-500" />
              View Reports
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* MAIN VIEWGRID (Desktop: Classes left, submissions right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RECENT CLASSES (2/3 width on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-neutral-200 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-neutral-900">Recent Classrooms</CardTitle>
              <CardDescription>
                Overview of current active and draft courses.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 md:p-0">
              {/* DESKTOP TABLE VIEW */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-neutral-200">
                      <TableHead className="font-bold text-neutral-600 py-3">Class Name</TableHead>
                      <TableHead className="font-bold text-neutral-600 py-3 text-center">Students</TableHead>
                      <TableHead className="font-bold text-neutral-600 py-3">Scenario</TableHead>
                      <TableHead className="font-bold text-neutral-600 py-3">Deadline</TableHead>
                      <TableHead className="font-bold text-neutral-600 py-3 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentClasses.map((cls) => (
                      <TableRow key={cls.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                        <TableCell className="font-bold text-neutral-850 py-3.5">{cls.name}</TableCell>
                        <TableCell className="text-center font-medium">{cls.students}</TableCell>
                        <TableCell className="text-neutral-500 font-semibold">{cls.scenario}</TableCell>
                        <TableCell className="text-neutral-500 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                            {cls.deadline}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={cn(
                              "text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border border-transparent shadow-none",
                              cls.status === "Active" && "bg-emerald-50 text-emerald-700 border-emerald-200/60",
                              cls.status === "Draft" && "bg-neutral-100 text-neutral-700 border-neutral-200/50",
                              cls.status === "Completed" && "bg-blue-50 text-blue-700 border-blue-200/60"
                            )}
                          >
                            {cls.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* MOBILE CARD LIST VIEW */}
              <div className="block md:hidden p-4 space-y-3 bg-neutral-50/30 border-t border-neutral-100">
                {recentClasses.map((cls) => (
                  <Card key={cls.id} className="border border-neutral-200 bg-white shadow-none">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 truncate max-w-[200px]">{cls.name}</span>
                        <Badge
                          className={cn(
                            "text-[8px] font-extrabold px-2 py-0.5 rounded-full border border-transparent shadow-none shrink-0",
                            cls.status === "Active" && "bg-emerald-50 text-emerald-700 border-emerald-200/60",
                            cls.status === "Draft" && "bg-neutral-100 text-neutral-700 border-neutral-200/50",
                            cls.status === "Completed" && "bg-blue-50 text-blue-700 border-blue-200/60"
                          )}
                        >
                          {cls.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs border-t border-neutral-50 pt-2.5 text-neutral-500">
                        <div>
                          <span className="text-[9px] font-bold text-neutral-400 block uppercase">Scenario</span>
                          <span className="font-semibold text-neutral-800">{cls.scenario}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-neutral-400 block uppercase">Deadline</span>
                          <span className="font-semibold text-neutral-800 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                            {cls.deadline}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center justify-between pt-1 border-t border-neutral-50/50">
                          <span className="text-[10px] font-semibold">Registered Students</span>
                          <span className="font-bold text-neutral-900 flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-neutral-400" />
                            {cls.students} Learners
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SUBMISSION FEED PANEL (1/3 width on desktop) */}
        <div className="lg:col-span-1">
          <Card className="border-neutral-200 shadow-sm bg-white h-full flex flex-col justify-between">
            <div>
              <CardHeader className="pb-3 border-b border-neutral-100">
                <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-neutral-550 shrink-0" />
                  <span>Recent Submissions</span>
                </CardTitle>
                <CardDescription>
                  Activity timeline of dynamic student simulation rounds.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-neutral-100">
                {recentSubmissions.map((feed) => (
                  <div key={feed.id} className="p-4 flex items-start justify-between gap-3 text-left">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-neutral-900">{feed.studentName}</span>
                        <Badge variant="outline" className="text-[8px] font-black text-neutral-400 border-neutral-200 px-1 py-0 uppercase">
                          Simulation
                        </Badge>
                      </div>
                      <p className="text-xs text-neutral-550 leading-normal">{feed.action}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-neutral-400 shrink-0 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {feed.timeAgo}
                    </span>
                  </div>
                ))}
              </CardContent>
            </div>
            <div className="p-4 border-t border-neutral-150 bg-neutral-50/50 rounded-b-xl">
              <Button
                variant="ghost"
                onClick={() => handleAction("Loading complete classroom audit logs...")}
                className="w-full text-xs font-bold text-neutral-600 hover:text-neutral-950 flex items-center justify-center gap-1.5 h-8 hover:bg-neutral-100"
              >
                <span>Audit Submission Logs</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default InstructorDashboard
