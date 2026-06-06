import { useNavigate, Link } from "react-router"
import { useAdminStore } from "@/stores/adminStore"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Users,
  Activity,
  School,
  Sparkles,
  TrendingUp,
  Plus,
  Settings,
  BarChart3,
  Mail,
} from "lucide-react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { cn } from "@/lib/utils"

export function AdminDashboard() {
  const navigate = useNavigate()
  const { users, classes, systemStats } = useAdminStore()

  // 1. User growth timeline mock data (30 days scale)
  const userGrowthData = [
    { name: "Day 1", count: 18 },
    { name: "Day 5", count: 20 },
    { name: "Day 10", count: 21 },
    { name: "Day 15", count: 24 },
    { name: "Day 20", count: 25 },
    { name: "Day 25", count: 27 },
    { name: "Day 30", count: 30 },
  ]

  // 2. Compute Role Distribution dynamically
  const studentCount = users.filter((u) => u.role === "student").length
  const instructorCount = users.filter((u) => u.role === "instructor").length
  const adminCount = users.filter((u) => u.role === "admin").length

  const roleDistributionData = [
    { name: "Students", value: studentCount, color: "#6366f1" }, // Indigo
    { name: "Instructors", value: instructorCount, color: "#f59e0b" }, // Amber
    { name: "Admins", value: adminCount, color: "#ec4899" }, // Pink
  ]

  // 3. Compute Class Activity (Active classes with enrollments)
  const classActivityData = classes
    .filter((c) => c.status === "active")
    .map((c) => ({
      name: c.name.split(":")[0], // Extract course code like 'MKT 410'
      students: c.students,
      avgScore: Math.round(c.avgScore),
    }))

  // 4. Sort and filter the 5 most recent signups
  const recentSignups = [...users]
    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* Welcome & Role Header */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-neutral-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Admin Dashboard</h2>
            <Badge className="bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-50 text-[10px] font-extrabold uppercase py-0.5 rounded-full">
              System Admin
            </Badge>
          </div>
          <p className="text-xs text-neutral-500 font-bold max-w-lg uppercase tracking-wider">
            DM SimLab Control Panel • Core Platform Statistics
          </p>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Users */}
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
              Total Users
            </span>
            <span className="text-2xl font-black text-neutral-900 block leading-none">
              {systemStats.totalUsers}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
              +{systemStats.newUsersThisWeek} this week
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 text-slate-650">
            <Users className="h-4.5 w-4.5" />
          </div>
        </Card>

        {/* KPI 2: Active Users */}
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
              Active Today
            </span>
            <span className="text-2xl font-black text-neutral-900 block leading-none">
              {systemStats.activeUsers}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
              {Math.round((systemStats.activeUsers / (systemStats.totalUsers || 1)) * 100)}% active rate
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
            <Activity className="h-4.5 w-4.5" />
          </div>
        </Card>

        {/* KPI 3: Total Classes */}
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
              Total Classes
            </span>
            <span className="text-2xl font-black text-neutral-900 block leading-none">
              {systemStats.totalClasses}
            </span>
            <span className="text-[10px] text-neutral-400 font-bold block mt-0.5">
              Active & archived labs
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-600">
            <School className="h-4.5 w-4.5" />
          </div>
        </Card>

        {/* KPI 4: Simulations Run */}
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
              Simulations Run
            </span>
            <span className="text-2xl font-black text-neutral-900 block leading-none">
              {systemStats.simulationsRun}
            </span>
            <span className="text-[10px] text-neutral-400 font-bold block mt-0.5">
              Cumulative sandboxes
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 text-amber-600">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
        </Card>

        {/* KPI 5: Avg Platform Score */}
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
              Avg Platform Score
            </span>
            <span className="text-2xl font-black text-neutral-900 block leading-none">
              {systemStats.avgPlatformScore}%
            </span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
              +1.4% improvement
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0 text-violet-600">
            <TrendingUp className="h-4.5 w-4.5" />
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* User Growth Line Chart (6 cols) */}
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl p-5 lg:col-span-6 flex flex-col justify-between">
          <div>
            <CardTitle className="text-sm font-black text-neutral-900">User Growth Trend</CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Registered learner curves over the last 30 simulation days.
            </CardDescription>
          </div>
          <div className="h-60 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} />
                <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#0f172a" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Role Distribution Pie Chart (3 cols) */}
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl p-5 lg:col-span-3 flex flex-col justify-between">
          <div>
            <CardTitle className="text-sm font-black text-neutral-900">Role Composition</CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Breakdown of system accounts.
            </CardDescription>
          </div>
          <div className="h-48 mt-4 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {roleDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Summary Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-7">
              <span className="text-xs font-black text-neutral-400 uppercase tracking-widest leading-none">Total</span>
              <span className="text-xl font-black text-neutral-900 block leading-none mt-1">{systemStats.totalUsers}</span>
            </div>
          </div>
          {/* Legend Items */}
          <div className="flex justify-center gap-4 text-xs font-semibold text-neutral-600 mt-2">
            {roleDistributionData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Class Activity Bar Chart (3 cols) */}
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl p-5 lg:col-span-3 flex flex-col justify-between">
          <div>
            <CardTitle className="text-sm font-black text-neutral-900">Class Enrollment</CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Students count per active classroom.
            </CardDescription>
          </div>
          <div className="h-48 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classActivityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#888" }} />
                <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                <Tooltip />
                <Bar dataKey="students" fill="#0f172a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-neutral-450 font-bold text-center mt-2 uppercase tracking-wide">
            Active Classroom Registrants
          </div>
        </Card>
      </div>

      {/* Lower Grid: Recent Signups (8 cols) & Quick Actions (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Signups Table (8 cols) */}
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl overflow-hidden lg:col-span-8">
          <CardHeader className="p-5 pb-3 border-b border-neutral-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black text-neutral-900">Recent Signups</CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Newly registered simulator accounts.
              </CardDescription>
            </div>
            <Link to="/admin/users">
              <Button variant="ghost" size="sm" className="h-8 font-black text-xs text-slate-800 border border-neutral-200/50 rounded-xl px-3 hover:bg-neutral-50">
                View Directory
              </Button>
            </Link>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-neutral-50/70 border-b border-neutral-100">
                <TableRow>
                  <TableHead className="font-black text-[10px] text-neutral-450 uppercase tracking-wider text-left">Learner</TableHead>
                  <TableHead className="font-black text-[10px] text-neutral-450 uppercase tracking-wider text-left">Role</TableHead>
                  <TableHead className="font-black text-[10px] text-neutral-450 uppercase tracking-wider text-left">Joined Date</TableHead>
                  <TableHead className="font-black text-[10px] text-neutral-450 uppercase tracking-wider text-left">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-neutral-100">
                {recentSignups.map((user) => (
                  <TableRow key={user.id} className="hover:bg-neutral-50/50 transition-colors">
                    <TableCell className="py-3 text-left">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px] font-black shrink-0">
                          {user.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-neutral-900 truncate">{user.name}</span>
                          <span className="text-[9px] text-neutral-400 font-semibold truncate flex items-center gap-1">
                            <Mail className="h-2.5 w-2.5" />
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-left">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border border-transparent shadow-none uppercase",
                          user.role === "admin" && "bg-pink-50 text-pink-700 border-pink-100",
                          user.role === "instructor" && "bg-amber-50 text-amber-700 border-amber-100",
                          user.role === "student" && "bg-indigo-50 text-indigo-700 border-indigo-100"
                        )}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-neutral-500 font-semibold text-left">
                      {user.joinedAt}
                    </TableCell>
                    <TableCell className="py-3 text-left">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border border-transparent shadow-none uppercase",
                          user.status === "active" && "bg-emerald-50 text-emerald-700 border-emerald-100",
                          user.status === "suspended" && "bg-neutral-150 text-neutral-600 border-neutral-200",
                          user.status === "pending" && "bg-sky-50 text-sky-700 border-sky-100"
                        )}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Quick Actions Panel (4 cols) */}
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl p-5 space-y-4 lg:col-span-4">
          <span className="text-[10px] font-black text-neutral-450 uppercase tracking-widest block text-left">
            Quick Actions
          </span>
          <div className="flex flex-col gap-2.5">
            {/* Quick Action: Add User */}
            <Button
              onClick={() => navigate("/admin/users?add=true")}
              className="w-full h-10 font-bold bg-slate-900 text-white hover:bg-slate-950 text-xs rounded-xl flex items-center justify-start gap-2 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Provision New User
            </Button>

            {/* Quick Action: System Settings */}
            <Button
              variant="outline"
              onClick={() => navigate("/admin/settings")}
              className="w-full h-10 font-bold border-neutral-250 bg-white text-xs rounded-xl flex items-center justify-start gap-2 shadow-3xs"
            >
              <Settings className="h-4 w-4 text-neutral-500" />
              Configure System Settings
            </Button>

            {/* Quick Action: View Reports */}
            <Button
              variant="outline"
              onClick={() => navigate("/reports")}
              className="w-full h-10 font-bold border-neutral-250 bg-white text-xs rounded-xl flex items-center justify-start gap-2 shadow-3xs"
            >
              <BarChart3 className="h-4 w-4 text-neutral-500" />
              View Simulation Reports
            </Button>
          </div>
          <div className="p-3 bg-neutral-50/50 rounded-xl border border-neutral-100 text-left">
            <span className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
              System Uptime
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span className="text-xs font-bold text-neutral-850">99.98% (Healthy)</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboard
