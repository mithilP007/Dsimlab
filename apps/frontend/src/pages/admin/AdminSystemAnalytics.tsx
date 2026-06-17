import { useEffect } from "react"
import { useAdminStore } from "@/stores/adminStore"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts"
import { Activity, TrendingUp, Award, ArrowLeft } from "lucide-react"
import { Link } from "react-router"

export function AdminSystemAnalytics() {
  const { analyticsOverview, fetchAnalyticsOverview, isLoading } = useAdminStore()

  useEffect(() => {
    fetchAnalyticsOverview()
  }, [fetchAnalyticsOverview])

  const chartData = analyticsOverview?.growth || []

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-5">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-2 hover:bg-neutral-50 rounded-lg border border-neutral-200 transition-colors">
            <ArrowLeft className="h-4 w-4 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              System Analytics & Growth Metrics
            </h1>
            <p className="text-sm text-neutral-500 font-semibold">
              Deep dive into user registration curves, interactive simulation volumes, and certification velocities.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-neutral-500 font-semibold text-sm">
          <Activity className="h-5 w-5 animate-spin mr-2" />
          Aggregating time-series telemetry data...
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main overview charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* User Growth (Area Chart) */}
            <Card className="border-neutral-200/60 shadow-sm bg-white">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-neutral-900" />
                  <CardTitle className="text-base font-bold text-neutral-900">User Registrations Trend</CardTitle>
                </div>
                <CardDescription>Monthly sign-ups of new students and instructors over the last 6 months.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="userColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#000000" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#000000" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                      <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #E5E5E5",
                          borderRadius: "8px",
                          fontSize: "11px",
                          fontWeight: "650"
                        }}
                      />
                      <Area type="monotone" dataKey="users" stroke="#171717" strokeWidth={2} fillOpacity={1} fill="url(#userColor)" name="New Users" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Simulation rounds usage */}
            <Card className="border-neutral-200/60 shadow-sm bg-white">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-neutral-900" />
                  <CardTitle className="text-base font-bold text-neutral-900">Simulation Run Frequency</CardTitle>
                </div>
                <CardDescription>Total rounds advanced by participants across SEO, Google, and Meta Ads.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                      <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #E5E5E5",
                          borderRadius: "8px",
                          fontSize: "11px",
                          fontWeight: "650"
                        }}
                      />
                      <Bar dataKey="simulations" fill="#171717" name="Rounds Played" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Full growth metrics ledger */}
          <Card className="border-neutral-200/60 shadow-sm bg-white">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-neutral-900" />
                <CardTitle className="text-base font-bold text-neutral-900">Certificate Accruals & Velocity</CardTitle>
              </div>
              <CardDescription>Bronze, Silver, Gold, and Platinum certifications issued monthly.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="certColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D97706" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#D97706" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                    <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #E5E5E5",
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontWeight: "650"
                      }}
                    />
                    <Area type="monotone" dataKey="certificates" stroke="#D97706" strokeWidth={2} fillOpacity={1} fill="url(#certColor)" name="Certificates Issued" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
export default AdminSystemAnalytics
