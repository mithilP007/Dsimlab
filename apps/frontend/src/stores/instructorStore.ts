import { create } from "zustand"
import apiClient from "@/lib/api"
import { toast } from "sonner"
import type { Class, Scenario, ScoreBreakdown } from "@/types"

export interface ClassInfo {
  className: string
  instructorName: string
  daysRemaining: number
}

export interface LeaderboardStudent {
  rank: number
  name: string
  seoScore: number
  adsScore: number
  totalScore: number
  isCurrentUser?: boolean
}

export interface PerformanceDimension {
  subject: string
  student: number
  average: number
  fullMark: number
}

// ─── Instructor-side class detail ─────────────────────────────────────────────

export interface LiveClassDetail {
  id: string
  name: string
  inviteCode: string
  scenario: Scenario
  students: Array<{
    id: string
    name: string
    email: string
    simulations: Array<{
      currentRound: number
      isCompleted: boolean
      status: string
    }>
  }>
}

// ─── Report row shape from /api/v1/report/class/:classId ─────────────────────

export interface ClassReportRow {
  studentId: string
  studentName: string
  studentEmail: string
  currentRound: number
  isCompleted: boolean
  totalRevenue: number
  totalSpend: number
  googleAdsSpend: number
  metaAdsSpend: number
  averageCompositeScore: number
  averagePercentileRank: number
}

interface InstructorState {
  classes: Class[]
  liveClasses: LiveClassDetail[]
  scenarios: Scenario[]
  grades: ScoreBreakdown[]
  classReport: ClassReportRow[]
  isLoading: boolean

  // College-student dashboard state (loaded from /api/v1/class by student)
  classInfo: ClassInfo | null
  leaderboard: LeaderboardStudent[]
  studentPerformance: PerformanceDimension[]
  feedbackCount: number

  // ─── Actions ───────────────────────────────────────────────────────────────

  /** Instructor: list all classes */
  fetchClasses: () => Promise<void>

  /** Instructor: create a new class */
  createClass: (name: string, scenarioId: string) => Promise<void>

  /** Instructor: load single class detail with student roster */
  fetchClassDetail: (classId: string) => Promise<void>

  /** Instructor: generate class-wide performance report */
  fetchClassReport: (classId: string) => Promise<void>

  addClass: (newClass: Class) => void
  addScenario: (newScenario: Scenario) => void
  setGrades: (grades: ScoreBreakdown[]) => void
  incrementFeedbackCount: () => void
}

export const useInstructorStore = create<InstructorState>((set) => ({
  classes: [],
  liveClasses: [],
  scenarios: [],
  grades: [],
  classReport: [],
  isLoading: false,
  classInfo: null,
  leaderboard: [],
  studentPerformance: [],
  feedbackCount: 0,

  // ─── Fetch Classes ─────────────────────────────────────────────────────────

  fetchClasses: async () => {
    set({ isLoading: true })
    try {
      const { data } = await apiClient.get("/v1/class")
      const liveClasses: LiveClassDetail[] = data.classes ?? []

      // Map to the legacy Class type for backwards compatibility
      const classes: Class[] = liveClasses.map((c) => ({
        id: c.id,
        name: c.name,
        instructorId: "",
        studentsCount: c.students?.length ?? 0,
        studentIds: c.students?.map((s) => s.id) ?? [],
        createdAt: "",
      }))

      set({ liveClasses, classes })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to load classes."
      toast.error(msg)
    } finally {
      set({ isLoading: false })
    }
  },

  // ─── Create Class ──────────────────────────────────────────────────────────

  createClass: async (name, scenarioId) => {
    set({ isLoading: true })
    try {
      const { data } = await apiClient.post("/v1/class", { name, scenarioId })
      const newClass = data.class as LiveClassDetail
      set((state) => ({
        liveClasses: [newClass, ...state.liveClasses],
        classes: [
          {
            id: newClass.id,
            name: newClass.name,
            instructorId: "",
            studentsCount: 0,
            studentIds: [],
            createdAt: "",
          },
          ...state.classes,
        ],
      }))
      toast.success(`Class "${name}" created! Invite code: ${newClass.inviteCode}`)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to create class."
      toast.error(msg)
    } finally {
      set({ isLoading: false })
    }
  },

  // ─── Fetch Class Detail ────────────────────────────────────────────────────

  fetchClassDetail: async (classId) => {
    set({ isLoading: true })
    try {
      const { data } = await apiClient.get(`/v1/class/${classId}`)
      const detail = data.class as LiveClassDetail
      set((state) => {
        const idx = state.liveClasses.findIndex((c) => c.id === classId)
        if (idx !== -1) {
          const updated = [...state.liveClasses]
          updated[idx] = detail
          return { liveClasses: updated }
        }
        return { liveClasses: [...state.liveClasses, detail] }
      })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to load class detail."
      toast.error(msg)
    } finally {
      set({ isLoading: false })
    }
  },

  // ─── Class Report ──────────────────────────────────────────────────────────

  fetchClassReport: async (classId) => {
    set({ isLoading: true })
    try {
      const { data } = await apiClient.get(`/v1/report/class/${classId}`)
      const rows: ClassReportRow[] = data.report ?? []

      // Build a leaderboard from report data for the college-student dashboard
      const leaderboard: LeaderboardStudent[] = rows
        .sort((a, b) => b.averageCompositeScore - a.averageCompositeScore)
        .map((row, idx) => ({
          rank: idx + 1,
          name: row.studentName,
          seoScore: Math.round(row.averageCompositeScore * 0.5),
          adsScore: Math.round(row.averageCompositeScore * 0.5),
          totalScore: Math.round(row.averageCompositeScore),
        }))

      set({ classReport: rows, leaderboard })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to load class report."
      toast.error(msg)
    } finally {
      set({ isLoading: false })
    }
  },

  // ─── Legacy actions ────────────────────────────────────────────────────────

  addClass: (newClass) =>
    set((state) => ({ classes: [...state.classes, newClass] })),
  addScenario: (newScenario) =>
    set((state) => ({ scenarios: [...state.scenarios, newScenario] })),
  setGrades: (grades) => set({ grades }),
  incrementFeedbackCount: () =>
    set((state) => ({ feedbackCount: state.feedbackCount + 1 })),
}))
