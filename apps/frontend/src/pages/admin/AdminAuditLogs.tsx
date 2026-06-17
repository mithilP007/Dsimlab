import { useState, useEffect } from "react"
import { useAdminStore } from "@/stores/adminStore"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Activity, ArrowLeft, Download } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function AdminAuditLogs() {
  const { auditLogs, fetchAuditLogs, isLoading } = useAdminStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState("all")

  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error("No audit logs to export")
      return
    }
    const headers = ["timestamp", "actorName", "actorEmail", "action", "target", "status"]
    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.actorName,
      log.actorEmail,
      log.action,
      log.target,
      log.status
    ])
    const csvContent = [headers.join(","), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `audit_export_${Date.now()}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("CSV export downloaded")
  }

  const handleExportJSON = () => {
    if (filteredLogs.length === 0) {
      toast.error("No audit logs to export")
      return
    }
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: "application/json;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `audit_export_${Date.now()}.json`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("JSON export downloaded")
  }

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actorEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesAction =
      actionFilter === "all" || log.action.toUpperCase().includes(actionFilter.toUpperCase())

    return matchesSearch && matchesAction
  })

  // Get unique actions for filter options
  const uniqueActions = Array.from(new Set(auditLogs.map((l) => l.action.split("_")[0])))

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
              Security & Action Audit Ledger
            </h1>
            <p className="text-sm text-neutral-500 font-semibold">
              Immutable logs tracking role adjustments, password resets, notification broadcasts, and cohort changes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="border-neutral-200 text-neutral-700 font-semibold flex items-center gap-1.5 text-xs h-9 px-3"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            onClick={handleExportJSON}
            variant="outline"
            className="border-neutral-200 text-neutral-700 font-semibold flex items-center gap-1.5 text-xs h-9 px-3"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border border-neutral-200/60 rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search actors, targets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-neutral-50 focus:bg-white text-xs border-neutral-250/70"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-white border border-neutral-200 text-neutral-800 text-xs font-bold rounded-lg p-2.5 outline-none shadow-sm cursor-pointer"
          >
            <option value="all">All Action Groups</option>
            {uniqueActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-neutral-500 font-semibold text-sm">
          <Activity className="h-5 w-5 animate-spin mr-2" />
          Retrieving audit ledger...
        </div>
      ) : (
        <Card className="border-neutral-200/60 shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold text-neutral-700">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/50">
                  <th className="py-3 px-4 text-neutral-500 font-bold">Timestamp</th>
                  <th className="py-3 px-4 text-neutral-500 font-bold">Actor</th>
                  <th className="py-3 px-2 text-neutral-500 font-bold">Action Event</th>
                  <th className="py-3 px-2 text-neutral-500 font-bold">Target Summary</th>
                  <th className="py-3 px-4 text-center text-neutral-500 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50/40 transition-colors">
                      <td className="py-3.5 px-4 text-neutral-500 font-mono text-[10px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-neutral-850">{log.actorName}</p>
                        <p className="text-[10px] text-neutral-400 font-medium">{log.actorEmail}</p>
                      </td>
                      <td className="py-3.5 px-2">
                        <Badge className="bg-neutral-900 text-white font-bold text-[9px] uppercase tracking-wider border-none">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-2 text-neutral-600 max-w-md break-words">
                        {log.target}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge className={`border-none text-[9px] font-bold ${
                          log.status === "success"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}>
                          {log.status.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-400 font-medium">
                      No security audits recorded matching query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
export default AdminAuditLogs
