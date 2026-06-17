import { useEffect } from "react"
import { useAdminStore } from "@/stores/adminStore"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Activity,
  DollarSign,
  TrendingUp,
  ShieldAlert,
  Server,
  ArrowRight
} from "lucide-react"
import { useNavigate } from "react-router"

export function AdminDashboard() {
  const navigate = useNavigate()
  const {
    fetchDashboardStats,
    systemStats,
    recentActivity,
    isLoading
  } = useAdminStore()

  useEffect(() => {
    fetchDashboardStats()
  }, [fetchDashboardStats])

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-neutral-900" />
            Super Admin Command Center
          </h1>
          <p className="text-neutral-500 font-medium">
            Monitor platform usage, audit logins, track institutional KPIs, and dispatch announcements.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-neutral-500 font-semibold text-sm">
          <Activity className="h-5 w-5 animate-spin mr-2" />
          Synchronizing system state...
        </div>
      ) : (
        <>
          {/* Quick Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Users */}
            <Card className="border-neutral-200/60 shadow-sm relative overflow-hidden bg-neutral-900 text-white">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Total Users</span>
                  <Users className="h-4 w-4 text-neutral-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tight">{systemStats.totalUsers}</h3>
                  <p className="text-xs text-neutral-300 font-medium">
                    {systemStats.activeUsers} Active user sessions
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Students & Instructors */}
            <Card className="border-neutral-200/60 shadow-sm bg-white">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Distribution</span>
                  <TrendingUp className="h-4 w-4 text-neutral-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tight text-neutral-900">
                    {systemStats.students} / {systemStats.instructors}
                  </h3>
                  <p className="text-xs text-neutral-500 font-medium">Students vs Instructors</p>
                </div>
              </CardContent>
            </Card>

            {/* Active Simulations */}
            <Card className="border-neutral-200/60 shadow-sm bg-white">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Active Labs</span>
                  <Activity className="h-4 w-4 text-neutral-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tight text-neutral-900">
                    {systemStats.activeSimulations}
                  </h3>
                  <p className="text-xs text-neutral-500 font-medium">Running active sandbox rounds</p>
                </div>
              </CardContent>
            </Card>

            {/* Total Revenue */}
            <Card className="border-neutral-200/60 shadow-sm bg-white">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Revenue (USD)</span>
                  <DollarSign className="h-4 w-4 text-neutral-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tight text-neutral-900">
                    ${systemStats.totalRevenue.toLocaleString()}
                  </h3>
                  <p className="text-xs text-neutral-500 font-medium">Aggregate subscription sales</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-neutral-200/60 shadow-sm bg-white">
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Colleges Tracked</span>
                  <h4 className="text-2xl font-black text-neutral-850 mt-1">{systemStats.colleges} Institutions</h4>
                </div>
                <Badge className="bg-neutral-50 text-neutral-800 border-neutral-200">Colleges</Badge>
              </CardContent>
            </Card>

            <Card className="border-neutral-200/60 shadow-sm bg-white">
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Certificates Issued</span>
                  <h4 className="text-2xl font-black text-neutral-850 mt-1">{systemStats.certificatesIssued} Badges</h4>
                </div>
                <Badge className="bg-neutral-50 text-neutral-800 border-neutral-200">Accredited</Badge>
              </CardContent>
            </Card>

            <Card className="border-neutral-200/60 shadow-sm bg-white">
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">System Status</span>
                  <h4 className="text-2xl font-black text-neutral-850 mt-1">Operational</h4>
                </div>
                <Badge className="bg-emerald-55 text-emerald-700 border-emerald-200 bg-emerald-50">Online</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Activity Logs & Health Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Recent Activity Feed */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-neutral-200/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Audit Action Ledger Feed</CardTitle>
                  <CardDescription>Live streaming of verified security, role transitions, and credentials.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="divide-y divide-neutral-100 max-h-[360px] overflow-y-auto border border-neutral-150 rounded-lg bg-white">
                    {recentActivity.length > 0 ? (
                      recentActivity.map((log) => (
                        <div key={log.id} className="p-3.5 hover:bg-neutral-50/50 transition-colors flex items-start justify-between text-xs font-semibold">
                          <div className="space-y-1 min-w-0 pr-4">
                            <p className="text-neutral-850 font-bold">
                              {log.actorName} <span className="text-neutral-400 font-semibold">({log.actorEmail})</span>
                            </p>
                            <p className="text-neutral-600 font-medium leading-relaxed">{log.details}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge className="bg-neutral-900 text-white font-bold text-[9px] uppercase tracking-wider">
                              {log.action.replace('BULK_', '')}
                            </Badge>
                            <p className="text-[10px] text-neutral-400 font-medium mt-1">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-neutral-400 font-medium">
                        No audit actions recorded yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Platform shortcuts & Quick health check */}
            <div className="space-y-6">
              {/* Telemetry quick status */}
              <Card className="border-neutral-200/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-1.5">
                    <Server className="h-5 w-5 text-neutral-900" />
                    Telemetry Pulse
                  </CardTitle>
                  <CardDescription>Uptime checks and latency indicators.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs font-semibold text-neutral-700">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                    <span>API Server Status</span>
                    <Badge className="bg-emerald-50 text-emerald-700 border-none text-[10px] font-bold">Healthy</Badge>
                  </div>
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                    <span>Database Connection</span>
                    <Badge className="bg-emerald-50 text-emerald-700 border-none text-[10px] font-bold">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                    <span>WebSocket Channels</span>
                    <Badge className="bg-emerald-50 text-emerald-700 border-none text-[10px] font-bold">Online</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Storage Cluster</span>
                    <Badge className="bg-neutral-100 text-neutral-800 border-none text-[10px] font-bold">30.8% Used</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Administrative Shortcuts */}
              <Card className="border-neutral-200/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Administrative Console Hub</CardTitle>
                  <CardDescription>Quick links to platform control cards.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <button
                    onClick={() => navigate("/admin/users")}
                    className="w-full justify-between bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50 hover:text-black font-semibold h-10 px-4 rounded-lg flex items-center text-xs transition-colors"
                  >
                    <span>User Management</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => navigate("/admin/institutions")}
                    className="w-full justify-between bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50 hover:text-black font-semibold h-10 px-4 rounded-lg flex items-center text-xs transition-colors"
                  >
                    <span>Colleges Tracking</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => navigate("/admin/notifications")}
                    className="w-full justify-between bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50 hover:text-black font-semibold h-10 px-4 rounded-lg flex items-center text-xs transition-colors"
                  >
                    <span>Alert Broadcasts</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
export default AdminDashboard
