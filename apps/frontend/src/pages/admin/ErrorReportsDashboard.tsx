import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft, Search, Eye, Terminal, User, Link2, ShieldAlert } from "lucide-react"
import { Link } from "react-router"
import api from "@/lib/api"

interface ErrorReport {
  id: string
  timestamp: string
  errorMessage: string
  errorStack: string
  path: string
  userAgent: string
  userId: string
  correlationId: string
}

export function ErrorReportsDashboard() {
  const [reports, setReports] = useState<ErrorReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    setIsLoading(true)
    try {
      const res = await api.get<{ success: boolean; reports: ErrorReport[] }>("/api/v1/error-reports")
      if (res.data.success) {
        setReports(res.data.reports)
      }
    } catch (err) {
      console.error("Failed to load error telemetry data", err)
    } finally {
      setIsLoading(false)
    }
  };

  const filteredReports = reports.filter(r => 
    r.errorMessage.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.userId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-5">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-2 hover:bg-neutral-50 rounded-lg border border-neutral-200 transition-colors">
            <ArrowLeft className="h-4 w-4 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-rose-500 animate-pulse" />
              <span>UI Crash Telemetry Center</span>
            </h1>
            <p className="text-sm text-neutral-500 font-semibold">
              Live reviews of client-side React exceptions, runtime stack traces, and browser environment states.
            </p>
          </div>
        </div>
        <Button onClick={fetchReports} variant="outline" className="border-neutral-200">
          Sync Logs
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200/60">
        <Search className="h-4 w-4 text-neutral-400 shrink-0 ml-1" />
        <input
          type="text"
          placeholder="Filter by error message, user ID, or path..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent text-sm w-full outline-none placeholder:text-neutral-450 font-semibold text-neutral-800"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-neutral-500 font-semibold text-sm">
          <AlertCircle className="h-5 w-5 animate-spin mr-2 text-indigo-500" />
          Connecting to telemetry logger...
        </div>
      ) : filteredReports.length === 0 ? (
        <Card className="border-neutral-200/60 shadow-sm bg-white text-center py-16">
          <CardContent className="space-y-3">
            <AlertCircle className="h-10 w-10 text-neutral-350 mx-auto" />
            <h3 className="text-lg font-bold text-neutral-800">Clean Logs Record</h3>
            <p className="text-xs text-neutral-450 font-semibold max-w-sm mx-auto leading-relaxed">
              No client-side crashes have been reported. The platform is running smoothly with 0 exception events.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const isExpanded = expandedId === report.id;
            return (
              <Card key={report.id} className="border-neutral-200/60 shadow-sm bg-white overflow-hidden transition-all duration-200">
                <div 
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-neutral-50/50 transition-colors"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-rose-50 text-rose-700 border-none text-[8.5px] font-bold">
                        CRASH_EVENT
                      </Badge>
                      <span className="text-[11px] text-neutral-400 font-bold">
                        {new Date(report.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-neutral-800 line-clamp-2">
                      {report.errorMessage}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-450 font-bold">
                      <span className="flex items-center gap-1">
                        <Link2 className="h-3.5 w-3.5 text-neutral-400" />
                        <span>{report.path}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-neutral-400" />
                        <span>User: {report.userId}</span>
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="self-end md:self-center">
                    <Eye className="h-4 w-4 mr-1.5" />
                    <span>{isExpanded ? "Hide Details" : "View Stack"}</span>
                  </Button>
                </div>

                {isExpanded && (
                  <div className="border-t border-neutral-100 bg-neutral-50/30 p-6 space-y-6 animate-in slide-in-from-top-2 duration-250">
                    {/* Environmental Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                      <div className="bg-white p-3 border border-neutral-100 rounded-lg space-y-1">
                        <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Browser Agent</p>
                        <p className="text-neutral-800 break-all">{report.userAgent}</p>
                      </div>
                      <div className="bg-white p-3 border border-neutral-100 rounded-lg space-y-1">
                        <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Telemetry Context</p>
                        <p className="text-neutral-800 break-all font-mono">Correlation ID: {report.correlationId}</p>
                      </div>
                    </div>

                    {/* Stack Trace */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                        <Terminal className="h-4 w-4 text-indigo-500" />
                        <span>Stack Trace (V8 Runtime)</span>
                      </h4>
                      <pre className="bg-neutral-950 text-rose-400 p-4 rounded-xl border border-neutral-800 text-[11px] font-mono overflow-x-auto leading-relaxed max-h-[300px] select-all">
                        {report.errorStack}
                      </pre>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
export default ErrorReportsDashboard
