import { create } from "zustand"
import api from "@/lib/api"

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
  
  seoReport: any | null
  adsReport: any | null
  attributionReport: any | null
  isLoading: boolean

  // Actions
  fetchSeoReport: (simulationId: string) => Promise<any>
  fetchAdsReport: (simulationId: string) => Promise<any>
  fetchAttribution: (simulationId: string) => Promise<any>
  generateReport: (name: string, type: SimulationReport["type"], filters: ReportFilters) => void
  deleteReport: (id: string) => void
  scheduleReport: (name: string, frequency: ScheduledReport["frequency"], filters: ReportFilters) => void
  cancelScheduledReport: (id: string) => void
  selectReport: (id: string | null) => void
}

export const useReportsStore = create<ReportsState>((set) => ({
  reports: [
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
  ],
  currentReport: null,
  exportFormats: ["pdf", "csv", "excel", "json"],
  scheduledReports: [
    {
      id: "sch_1",
      name: "Weekly Cohort Progression Sync",
      frequency: "weekly",
      nextRun: "2026-06-08 08:00",
      filters: { dateRange: "Last 7 Days", classId: "c_1", studentId: "all", channels: ["seo", "google", "meta"] },
    },
  ],
  seoReport: null,
  adsReport: null,
  attributionReport: null,
  isLoading: false,

  fetchSeoReport: async (simulationId) => {
    set({ isLoading: true })
    try {
      const res = await api.get<{ success: boolean; report: any }>(`/api/reports/${simulationId}/seo`)
      const report = res.data?.report || null
      set({ seoReport: report, isLoading: false })
      return report
    } catch (err) {
      console.error("Failed to fetch SEO report:", err)
      set({ isLoading: false })
      return null
    }
  },

  fetchAdsReport: async (simulationId) => {
    set({ isLoading: true })
    try {
      const res = await api.get<{ success: boolean; report: any }>(`/api/reports/${simulationId}/ads`)
      const report = res.data?.report || null
      set({ adsReport: report, isLoading: false })
      return report
    } catch (err) {
      console.error("Failed to fetch Ads report:", err)
      set({ isLoading: false })
      return null
    }
  },

  fetchAttribution: async (simulationId) => {
    set({ isLoading: true })
    try {
      const res = await api.get<{ success: boolean; report: any }>(`/api/reports/${simulationId}/attribution`)
      const report = res.data?.report || null
      set({ attributionReport: report, isLoading: false })
      return report
    } catch (err) {
      console.error("Failed to fetch attribution report:", err)
      set({ isLoading: false })
      return null
    }
  },

  generateReport: (name, type, filters) => {
    set((state) => {
      const newReportId = `rep_${state.reports.length + 1}`
      const newReport: SimulationReport = {
        id: newReportId,
        name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
        type,
        createdAt: new Date().toISOString().replace("T", " ").slice(0, 16),
        status: "ready",
        filters,
      }
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
