import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  exportToCSV,
  exportToJSON,
  generatePDF,
  generateExcel,
} from "@/lib/exportUtils"
import type { SimulationReport } from "@/stores/reportsStore"
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  FileCode,
  CheckCircle2,
  Clock,
  Download,
  History,
} from "lucide-react"

interface ExportPanelProps {
  report: SimulationReport | null
  isOpen: boolean
  onClose: () => void
}

interface RecentExport {
  id: string
  reportName: string
  format: "pdf" | "csv" | "excel" | "json"
  timestamp: string
  status: "completed" | "processing"
  size: string
}

export function ExportPanel({ report, isOpen, onClose }: ExportPanelProps) {
  const [format, setFormat] = useState<"pdf" | "csv" | "excel" | "json">("csv")
  const [scope, setScope] = useState<"current" | "all" | "date_range">("current")
  const [include, setInclude] = useState({
    scores: true,
    traffic: true,
    rankings: true,
    decisions: false,
    insights: true,
  })
  const [isExporting, setIsExporting] = useState(false)
  const [recentExports, setRecentExports] = useState<RecentExport[]>([
    {
      id: "exp_1",
      reportName: "Q2 Overall Performance Audit",
      format: "pdf",
      timestamp: "2026-06-04 10:15",
      status: "completed",
      size: "2.4 MB",
    },
    {
      id: "exp_2",
      reportName: "Class Comparison Roster Analysis",
      format: "csv",
      timestamp: "2026-06-04 11:42",
      status: "completed",
      size: "84 KB",
    },
  ])

  if (!report) return null

  // Calculate dynamic rows estimate
  const getEstimatedRows = () => {
    let base = 120
    if (scope === "all") base = 650
    if (scope === "date_range") base = 320

    // Multiply based on checked fields
    const checkedCount = Object.values(include).filter(Boolean).length
    return Math.round(base * (checkedCount / 5 + 0.4))
  }

  const handleExport = async () => {
    setIsExporting(true)
    const exportName = `${report.name.replace(/\s+/g, "_")}_export_${Date.now()}`

    // Construct mock data payload
    const payload = [
      {
        reportId: report.id,
        reportName: report.name,
        type: report.type,
        createdAt: report.createdAt,
        filters: report.filters,
        exportMeta: { scope, format, include },
      },
    ]

    // Fill mock rows based on selection for CSV/Excel/JSON
    const rowCount = getEstimatedRows()
    const mockDataRows = Array.from({ length: rowCount }, (_, i) => ({
      Index: i + 1,
      Round: Math.floor(i / 10) + 1,
      Metric: `Simulation Metric ${i + 1}`,
      Score: Math.round(70 + ((i * 17) % 26)), // deterministic 70 to 95
      Traffic: Math.round(1000 + ((i * 123) % 9001)), // deterministic 1000 to 10000
      Conversions: Math.round(50 + ((i * 7) % 451)), // deterministic 50 to 500
      Channel: ["SEO", "Google Ads", "Meta Ads"][i % 3],
      Timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    }))

    let success = false
    if (format === "csv") {
      success = await exportToCSV(mockDataRows, exportName)
    } else if (format === "json") {
      success = await exportToJSON({ reportInfo: payload[0], data: mockDataRows }, exportName)
    } else if (format === "pdf") {
      success = await generatePDF(report)
    } else if (format === "excel") {
      success = await generateExcel(mockDataRows, exportName)
    }

    if (success) {
      // Add to recent exports
      const sizeFactor = ((rowCount * 13) % 15) / 10; // deterministic 0.0 to 1.4
      const sizeEstimate =
        format === "pdf"
          ? `${(1.2 + sizeFactor).toFixed(1)} MB`
          : format === "excel"
          ? `${Math.round(rowCount * 0.4 + 10)} KB`
          : format === "csv"
          ? `${Math.round(rowCount * 0.25 + 5)} KB`
          : `${Math.round(rowCount * 0.65 + 8)} KB`

      const newExport: RecentExport = {
        id: `exp_${Date.now()}`,
        reportName: report.name,
        format,
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
        status: "completed",
        size: sizeEstimate,
      }
      setRecentExports((prev) => [newExport, ...prev])
    }

    setIsExporting(false)
  }

  const toggleInclude = (key: keyof typeof include) => {
    setInclude((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl p-6 border border-neutral-100">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <FileDown className="h-5 w-5 text-indigo-600" />
            <span>Export Report Data</span>
          </DialogTitle>
          <DialogDescription className="text-neutral-500 text-sm mt-1">
            Configure format, scope, and included parameters for <span className="font-semibold text-neutral-800">"{report.name}"</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Radio Selection */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Export Format</span>
            <div className="grid grid-cols-4 gap-3">
              {[
                { id: "pdf", label: "PDF", desc: "Report PDF Layout", icon: FileText, color: "text-red-500 bg-red-50 border-red-200" },
                { id: "csv", label: "CSV", desc: "Comma-Separated Data", icon: FileSpreadsheet, color: "text-emerald-500 bg-emerald-50 border-emerald-200" },
                { id: "excel", label: "Excel", desc: "Spreadsheet XML", icon: FileSpreadsheet, color: "text-green-600 bg-green-50 border-green-200" },
                { id: "json", label: "JSON", desc: "Structured Object Data", icon: FileCode, color: "text-orange-500 bg-orange-50 border-orange-200" },
              ].map((item) => {
                const Icon = item.icon
                const isSelected = format === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setFormat(item.id as any)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all duration-200 ${
                      isSelected
                        ? "border-neutral-900 bg-neutral-900 text-white shadow-md scale-[1.02]"
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
                    }`}
                  >
                    <Icon className={`h-5 w-5 mb-1 ${isSelected ? "text-white" : item.color.split(" ")[0]}`} />
                    <span className="text-xs font-bold">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Data Scope */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Data Scope</span>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "current", label: "Current View", desc: "Filtered rows only" },
                { id: "all", label: "All Data", desc: "Entire campaign timeline" },
                { id: "date_range", label: "Date Range", desc: "Within filter bounds" },
              ].map((item) => {
                const isSelected = scope === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setScope(item.id as any)}
                    className={`p-2.5 rounded-lg border text-left transition-all duration-200 ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600"
                        : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                    }`}
                  >
                    <span className={`block text-xs font-bold ${isSelected ? "text-indigo-950" : "text-neutral-800"}`}>
                      {item.label}
                    </span>
                    <span className="text-[10px] text-neutral-500 block leading-tight mt-0.5">{item.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Include Checklist */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Include Content Modules</span>
            <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-3 rounded-lg border border-neutral-200/50">
              {[
                { key: "scores", label: "Performance Scores" },
                { key: "traffic", label: "Traffic Analytics" },
                { key: "rankings", label: "Class Standings / Rankings" },
                { key: "decisions", label: "Decisions Logs" },
                { key: "insights", label: "Narrative Insights Summary" },
              ].map((item) => {
                const isChecked = include[item.key as keyof typeof include]
                return (
                  <label
                    key={item.key}
                    className="flex items-center gap-2 px-1 py-1 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleInclude(item.key as keyof typeof include)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 border-neutral-300 h-3.5 w-3.5"
                    />
                    <span className="text-xs font-medium text-neutral-700">{item.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Row Estimation and Download Trigger */}
          <div className="bg-indigo-50/40 border border-indigo-100 rounded-lg p-3 flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-indigo-950 block">Export Preview & Estimate</span>
              <p className="text-[11px] text-indigo-800 mt-0.5">
                This will export <span className="font-bold underline">~{getEstimatedRows()} rows</span> of metrics across the selected timeline parameters. Estimated size: {format === "pdf" ? "~2.5 MB" : format === "excel" ? "~80 KB" : "~45 KB"}.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-neutral-100">
            <Button variant="outline" onClick={onClose} disabled={isExporting} className="rounded-lg font-semibold">
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 font-semibold flex items-center gap-2 shadow-sm"
            >
              {isExporting ? (
                <>
                  <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Compiling...</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Generate Export</span>
                </>
              )}
            </Button>
          </div>

          {/* Recent Exports Log */}
          <div className="pt-4 border-t border-neutral-100">
            <div className="flex items-center gap-1.5 mb-2.5">
              <History className="h-3.5 w-3.5 text-neutral-400" />
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Recent Export Logs</span>
            </div>
            <div className="space-y-2">
              {recentExports.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-neutral-100 bg-white text-xs hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-6 w-6 rounded flex items-center justify-center font-bold text-[9px] uppercase ${
                        item.format === "pdf"
                          ? "bg-red-50 text-red-600"
                          : item.format === "excel"
                          ? "bg-green-50 text-green-700"
                          : item.format === "json"
                          ? "bg-orange-50 text-orange-600"
                          : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      {item.format}
                    </span>
                    <div>
                      <span className="font-semibold text-neutral-800 block truncate max-w-[180px]">{item.reportName}</span>
                      <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" /> {item.timestamp}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="text-[10px] text-neutral-500 font-semibold">{item.size}</span>
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Success
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
