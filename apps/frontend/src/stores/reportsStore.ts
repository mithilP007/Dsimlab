import { create } from "zustand"

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

  // Actions
  generateReport: (name: string, type: SimulationReport["type"], filters: ReportFilters) => void
  deleteReport: (id: string) => void
  scheduleReport: (name: string, frequency: ScheduledReport["frequency"], filters: ReportFilters) => void
  cancelScheduledReport: (id: string) => void
  selectReport: (id: string | null) => void
}

// ─── Initial Mock Data ────────────────────────────────────────────────────────

const INITIAL_REPORTS: SimulationReport[] = [
  {
    id: "rep_1",
    name: "Q2 Overall Performance Audit",
    type: "performance",
    createdAt: "2026-06-01 10:30",
    status: "ready",
    filters: { dateRange: "Last 30 Days", classId: "c_1", studentId: "all", channels: ["seo", "google", "meta"] },
  },
  {
    id: "rep_2",
    name: "Class Comparison Roster Analysis",
    type: "comparison",
    createdAt: "2026-06-02 14:15",
    status: "ready",
    filters: { dateRange: "Last 30 Days", classId: "c_1", studentId: "std_1", channels: ["seo", "google"] },
  },
  {
    id: "rep_3",
    name: "MKT 410 Cohort Progression",
    type: "class",
    createdAt: "2026-06-03 09:00",
    status: "ready",
    filters: { dateRange: "Custom", classId: "c_1", studentId: "all", channels: ["seo", "google", "meta"] },
  },
  {
    id: "rep_4",
    name: "Alexander Wright - Skill Drilldown",
    type: "individual",
    createdAt: "2026-06-03 16:45",
    status: "ready",
    filters: { dateRange: "Last 7 Days", classId: "c_1", studentId: "std_1", channels: ["seo", "google", "meta"] },
  },
  {
    id: "rep_5",
    name: "Q2 Google Ads ROI Review",
    type: "performance",
    createdAt: "2026-06-04 11:20",
    status: "ready",
    filters: { dateRange: "Last 30 Days", classId: "all", studentId: "all", channels: ["google"] },
  },
  {
    id: "rep_6",
    name: "Meta Campaign CTR Forecast",
    type: "performance",
    createdAt: "2026-06-04 19:15",
    status: "generating",
    filters: { dateRange: "Last 30 Days", classId: "c_2", studentId: "all", channels: ["meta"] },
  },
]

const INITIAL_SCHEDULED: ScheduledReport[] = [
  {
    id: "sch_1",
    name: "Weekly Cohort Progression Sync",
    frequency: "weekly",
    nextRun: "2026-06-08 08:00",
    filters: { dateRange: "Last 7 Days", classId: "c_1", studentId: "all", channels: ["seo", "google", "meta"] },
  },
  {
    id: "sch_2",
    name: "Daily Student Decisions Timeline Backup",
    frequency: "daily",
    nextRun: "2026-06-05 00:00",
    filters: { dateRange: "Last 24 Hours", classId: "all", studentId: "all", channels: ["seo", "google", "meta"] },
  },
]

// ─── Store Creation ──────────────────────────────────────────────────────────

export const useReportsStore = create<ReportsState>((set) => ({
  reports: INITIAL_REPORTS,
  currentReport: null,
  exportFormats: ["pdf", "csv", "excel", "json"],
  scheduledReports: INITIAL_SCHEDULED,

  generateReport: (name, type, filters) => {
    set((state) => {
      const newReportId = `rep_${state.reports.length + 1}`
      const newReport: SimulationReport = {
        id: newReportId,
        name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
        type,
        createdAt: new Date().toISOString().replace("T", " ").slice(0, 16),
        status: "generating",
        filters,
      }

      // Mock completion timeout
      setTimeout(() => {
        set((currentState) => ({
          reports: currentState.reports.map((r) =>
            r.id === newReportId ? { ...r, status: "ready" as const } : r
          ),
        }))
      }, 2500)

      return {
        reports: [newReport, ...state.reports],
        currentReport: newReport,
      }
    })
  },

  deleteReport: (id) => {
    set((state) => ({
      reports: state.reports.filter((r) => r.id !== id),
      currentReport: state.currentReport?.id === id ? null : state.currentReport,
    }))
  },

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

      return {
        scheduledReports: [...state.scheduledReports, newScheduled],
      }
    })
  },

  cancelScheduledReport: (id) => {
    set((state) => ({
      scheduledReports: state.scheduledReports.filter((s) => s.id !== id),
    }))
  },

  selectReport: (id) => {
    set((state) => {
      const report = state.reports.find((r) => r.id === id) || null
      return {
        currentReport: report,
      }
    })
  },
}))

export default useReportsStore
