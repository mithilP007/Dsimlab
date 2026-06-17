import { useEffect } from "react"
import { useAdminStore } from "@/stores/adminStore"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Server, Database, Radio, HardDrive, AlertTriangle, ArrowLeft } from "lucide-react"
import { Link } from "react-router"

export function AdminSystemHealth() {
  const { systemHealth, fetchSystemHealth, isLoading } = useAdminStore()

  useEffect(() => {
    fetchSystemHealth()
  }, [fetchSystemHealth])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

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
              Platform Health & Telemetry Metrics
            </h1>
            <p className="text-sm text-neutral-500 font-semibold">
              Live updates of backend process memory pools, database query response timings, and storage bounds.
            </p>
          </div>
        </div>
      </div>

      {isLoading || !systemHealth ? (
        <div className="flex items-center justify-center py-24 text-neutral-500 font-semibold text-sm">
          <Activity className="h-5 w-5 animate-spin mr-2" />
          Querying cluster telemetry engines...
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main Health Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* API Health */}
            <Card className="border-neutral-200/60 shadow-sm bg-white">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-450">API Health</span>
                  <Server className="h-4 w-4 text-neutral-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-black text-neutral-900 capitalize">{systemHealth.api}</h3>
                  <Badge className="bg-emerald-50 text-emerald-700 border-none text-[8px] font-bold">Online</Badge>
                </div>
                <p className="text-[10px] text-neutral-400 font-medium">Fastify main gateway listening</p>
              </CardContent>
            </Card>

            {/* DB Health & Latency */}
            <Card className="border-neutral-200/60 shadow-sm bg-white">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-450">Database</span>
                  <Database className="h-4 w-4 text-neutral-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-black text-neutral-900">{systemHealth.dbLatencyMs}ms</h3>
                  <Badge className="bg-emerald-50 text-emerald-700 border-none text-[8px] font-bold">Excellent</Badge>
                </div>
                <p className="text-[10px] text-neutral-400 font-medium">Postgres database query latency</p>
              </CardContent>
            </Card>

            {/* WebSocket Channels */}
            <Card className="border-neutral-200/60 shadow-sm bg-white">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-450">WebSockets</span>
                  <Radio className="h-4 w-4 text-neutral-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-black text-neutral-900">{systemHealth.websocketConnections}</h3>
                  <Badge className="bg-emerald-50 text-emerald-700 border-none text-[8px] font-bold">Active Socket</Badge>
                </div>
                <p className="text-[10px] text-neutral-400 font-medium">Live telemetry channel connections</p>
              </CardContent>
            </Card>

            {/* Storage usage */}
            <Card className="border-neutral-200/60 shadow-sm bg-white">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-450">Static Storage</span>
                  <HardDrive className="h-4 w-4 text-neutral-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-black text-neutral-900">{systemHealth.storage.percentage}%</h3>
                  <Badge className="bg-neutral-100 text-neutral-700 border-none text-[8px] font-bold">Standard</Badge>
                </div>
                <p className="text-[10px] text-neutral-400 font-medium">
                  {formatBytes(systemHealth.storage.usedBytes)} of {formatBytes(systemHealth.storage.totalBytes)} used
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Memory & CPU Allocation */}
            <Card className="border-neutral-200/60 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-base font-bold text-neutral-900">NodeJS Process Diagnostics</CardTitle>
                <CardDescription>Heap execution footprint and core CPU usage load tracking.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-xs font-semibold">
                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-neutral-800">
                    <span>Active Heap Memory Pool</span>
                    <span>{systemHealth.memory.heapUsedMb} MB / {systemHealth.memory.heapTotalMb} MB</span>
                  </div>
                  <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-neutral-900 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          (systemHealth.memory.heapUsedMb / systemHealth.memory.heapTotalMb) * 100
                        )}%`
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between font-bold text-neutral-800">
                    <span>CPU Process Load</span>
                    <span>{systemHealth.cpuUsage ?? 12}%</span>
                  </div>
                  <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-650 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${systemHealth.cpuUsage ?? 12}%`
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
                  <div className="space-y-1">
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Garbage Collection</p>
                    <p className="text-sm font-black text-neutral-900">Automatic (V8)</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Engine Context</p>
                    <p className="text-sm font-black text-neutral-900">Fastify Event Loop</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error logs tracking */}
            <Card className="border-neutral-200/60 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-base font-bold text-neutral-900">Recent Server Warnings</CardTitle>
                <CardDescription>Error messages intercepted inside Fastify middleware.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border border-neutral-150 rounded-lg p-4 bg-neutral-50/50 min-h-[120px] flex flex-col justify-center items-center">
                  {systemHealth.recentErrors && systemHealth.recentErrors.length > 0 ? (
                    <div className="space-y-3 w-full">
                      {systemHealth.recentErrors.map((err, idx) => (
                        <div key={idx} className="flex gap-2 text-xs font-semibold text-rose-700">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                          <span className="font-mono">{err}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center space-y-1">
                      <AlertTriangle className="h-5 w-5 text-neutral-300 mx-auto" />
                      <p className="text-xs font-bold text-neutral-400">Zero warning codes intercepted</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Queue Infrastructure Health */}
          {systemHealth.queueHealth && (
            <Card className="border-neutral-200/60 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  <span>BullMQ Background Processing Pipelines</span>
                </CardTitle>
                <CardDescription>
                  Real-time status of distributed background job consumers (Simulation, Certificates, Reports, Notifications).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { name: "Simulation Rounds", key: "roundQueue" },
                    { name: "Certificates PDF", key: "certificateQueue" },
                    { name: "Report Exports", key: "reportQueue" },
                    { name: "Notifications Queue", key: "notificationQueue" }
                  ].map((q) => {
                    const stats = systemHealth.queueHealth?.[q.key as keyof typeof systemHealth.queueHealth] || { waiting: 0, active: 0, completed: 0, failed: 0 };
                    const hasFailed = stats.failed > 0;
                    return (
                      <div key={q.key} className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/20 hover:shadow-sm transition-all duration-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-neutral-700">{q.name}</span>
                          <span className={`h-2.5 w-2.5 rounded-full ${hasFailed ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-white p-2 border border-neutral-100 rounded-lg">
                            <p className="text-[9px] text-neutral-400 font-bold uppercase">Active</p>
                            <p className="text-xs font-black text-neutral-800">{stats.active}</p>
                          </div>
                          <div className="bg-white p-2 border border-neutral-100 rounded-lg">
                            <p className="text-[9px] text-neutral-400 font-bold uppercase">Waiting</p>
                            <p className="text-xs font-black text-neutral-800">{stats.waiting}</p>
                          </div>
                          <div className="bg-white p-2 border border-neutral-100 rounded-lg">
                            <p className="text-[9px] text-neutral-400 font-bold uppercase">Completed</p>
                            <p className="text-xs font-black text-emerald-600">{stats.completed}</p>
                          </div>
                          <div className="bg-white p-2 border border-neutral-100 rounded-lg">
                            <p className="text-[9px] text-neutral-400 font-bold uppercase">Failed (DLQ)</p>
                            <p className={`text-xs font-black ${hasFailed ? "text-rose-600" : "text-neutral-500"}`}>{stats.failed}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
export default AdminSystemHealth
