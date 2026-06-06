import { create } from "zustand"
import apiClient from "@/lib/api"
import { toast } from "sonner"

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ReportFilters {
  dateRange: string
  classId: string
  studentId: string
  channels: string[]
}

export interface SimulationReport {
  id: string
  name: string
  type: "performance" | "comparison" | "class" | "individual"
  createdAt: string
  status: "ready" | "generating"
  filters: ReportFilters
  /** Raw payload returned by the backend aggregation */
  data?: unknown
}

export interface ScheduledReport {
  id: string
  name: string
  frequency: "daily" | "weekly"
  nextRun: string
  filters: ReportFilters
}

interface ReportsState {
  reports: SimulationReport[]
  currentReport: SimulationReport | null
  exportFormats: string[]
  scheduledReports: ScheduledReport[]
  isLoading: boolean

  // ─── Actions ─────────────────────────────────────────────────────────────

  /**
   * Generate a class-wide performance report.
   * Maps to GET /api/v1/report/class/:classId
   */
  generateReport: (name: string, type: SimulationReport["type"], filters: ReportFilters) => Promise<void>

  deleteReport: (id: string) => void
  scheduleReport: (name: string, frequency: ScheduledReport["frequency"], filters: ReportFilters) => void
  cancelScheduledReport: (id: string) => void
  selectReport: (id: string | null) => void
}

// ─── Store Creation ──────────────────────────────────────────────────────────

export const useReportsStore = create<ReportsState>((set) => ({
  reports: [],
  currentReport: null,
  exportFormats: ["pdf", "csv", "excel", "json"],
  scheduledReports: [],
  isLoading: false,

  // ─── Generate Report ────────────────────────────────────────────────────────

  generateReport: async (name, type, filters) => {
    const reportId = `rep_${Date.now()}`
    const optimisticReport: SimulationReport = {
      id: reportId,
      name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
      type,
      createdAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      status: "generating",
      filters,
    }

    // Optimistically add the report
    set((state) => ({
      reports: [optimisticReport, ...state.reports],
      currentReport: optimisticReport,
      isLoading: true,
    }))

    try {
      // Only class-level reports are supported by current backend
      if (filters.classId && filters.classId !== "all") {
        const { data } = await apiClient.get(`/v1/report/class/${filters.classId}`)
        const ready: SimulationReport = {
          ...optimisticReport,
          status: "ready",
          name: name || data.className + " Report",
          data: data.report,
        }
        set((state) => ({
          reports: state.reports.map((r) => (r.id === reportId ? ready : r)),
          currentReport: ready,
        }))
        toast.success(`Report "${ready.name}" is ready.`)
      } else {
        // No real endpoint yet for other types – mark ready immediately
        const ready: SimulationReport = { ...optimisticReport, status: "ready" }
        set((state) => ({
          reports: state.reports.map((r) => (r.id === reportId ? ready : r)),
          currentReport: ready,
        }))
        toast.success(`Report "${ready.name}" generated.`)
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to generate report."
      toast.error(msg)
      // Remove the failed optimistic entry
      set((state) => ({
        reports: state.reports.filter((r) => r.id !== reportId),
        currentReport: null,
      }))
    } finally {
      set({ isLoading: false })
    }
  },

  // ─── Delete Report ──────────────────────────────────────────────────────────

  deleteReport: (id) => {
    set((state) => ({
      reports: state.reports.filter((r) => r.id !== id),
      currentReport: state.currentReport?.id === id ? null : state.currentReport,
    }))
  },

  // ─── Schedule Report ────────────────────────────────────────────────────────

  scheduleReport: (name, frequency, filters) => {
    set((state) => {
      const nextRunDate = new Date()
      if (frequency === "daily") {
        nextRunDate.setDate(nextRunDate.getDate() + 1)
      } else {
        nextRunDate.setDate(nextRunDate.getDate() + 7)
      }

      const newScheduled: ScheduledReport = {
        id: `sch_${state.scheduledReports.length + 1}`,
        name,
        frequency,
        nextRun: nextRunDate.toISOString().replace("T", " ").slice(0, 16),
        filters,
      }

      return { scheduledReports: [...state.scheduledReports, newScheduled] }
    })
  },

  // ─── Cancel Scheduled ──────────────────────────────────────────────────────

  cancelScheduledReport: (id) => {
    set((state) => ({
      scheduledReports: state.scheduledReports.filter((s) => s.id !== id),
    }))
  },

  // ─── Select Report ─────────────────────────────────────────────────────────

  selectReport: (id) => {
    set((state) => ({
      currentReport: state.reports.find((r) => r.id === id) || null,
    }))
  },
}))

export default useReportsStore
