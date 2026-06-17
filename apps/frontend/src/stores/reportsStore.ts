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
  
  isLoading: boolean
  nbaData: any | null
  obeData: any | null
  accreditationData: any | null
  performanceData: any | null
  studentData: any | null
  comparisonsData: any[]
  aiInsightsData: any | null

  // Actions
  fetchNBAReport: (classId: string) => Promise<any>
  fetchOBEReport: (classId: string) => Promise<any>
  fetchAccreditationReport: (classId: string) => Promise<any>
  fetchPerformanceReport: (classId: string) => Promise<any>
  fetchStudentReport: (studentId: string) => Promise<any>
  fetchInstructorComparisons: () => Promise<any>
  fetchAiInsights: (classId: string) => Promise<any>

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
  isLoading: false,
  nbaData: null,
  obeData: null,
  accreditationData: null,
  performanceData: null,
  studentData: null,
  comparisonsData: [],
  aiInsightsData: null,

  fetchNBAReport: async (classId) => {
    set({ isLoading: true })
    try {
      const res = await api.get(`/api/v1/report/class/${classId}/nba`)
      set({ nbaData: res.data, isLoading: false })
      return res.data
    } catch (err) {
      console.error("Failed to fetch NBA report:", err)
      set({ isLoading: false })
      return null
    }
  },

  fetchOBEReport: async (classId) => {
    set({ isLoading: true })
    try {
      const res = await api.get(`/api/v1/report/class/${classId}/obe`)
      set({ obeData: res.data, isLoading: false })
      return res.data
    } catch (err) {
      console.error("Failed to fetch OBE report:", err)
      set({ isLoading: false })
      return null
    }
  },

  fetchAccreditationReport: async (classId) => {
    set({ isLoading: true })
    try {
      const res = await api.get(`/api/v1/report/class/${classId}/accreditation`)
      set({ accreditationData: res.data, isLoading: false })
      return res.data
    } catch (err) {
      console.error("Failed to fetch accreditation report:", err)
      set({ isLoading: false })
      return null
    }
  },

  fetchPerformanceReport: async (classId) => {
    set({ isLoading: true })
    try {
      const res = await api.get(`/api/v1/report/class/${classId}/performance`)
      set({ performanceData: res.data, isLoading: false })
      return res.data
    } catch (err) {
      console.error("Failed to fetch performance report:", err)
      set({ isLoading: false })
      return null
    }
  },

  fetchStudentReport: async (studentId) => {
    set({ isLoading: true })
    try {
      const res = await api.get(`/api/v1/report/student/${studentId}`)
      set({ studentData: res.data, isLoading: false })
      return res.data
    } catch (err) {
      console.error("Failed to fetch student report:", err)
      set({ isLoading: false })
      return null
    }
  },

  fetchInstructorComparisons: async () => {
    set({ isLoading: true })
    try {
      const res = await api.get(`/api/v1/report/instructor/comparisons`)
      set({ comparisonsData: res.data?.comparisons || [], isLoading: false })
      return res.data
    } catch (err) {
      console.error("Failed to fetch instructor comparisons:", err)
      set({ isLoading: false })
      return null
    }
  },

  fetchAiInsights: async (classId) => {
    set({ isLoading: true })
    try {
      const res = await api.get(`/api/v1/report/class/${classId}/ai-insights`)
      set({ aiInsightsData: res.data, isLoading: false })
      return res.data
    } catch (err) {
      console.error("Failed to fetch AI insights:", err)
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
