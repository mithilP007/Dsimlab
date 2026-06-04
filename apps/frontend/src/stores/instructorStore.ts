import { create } from "zustand"
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

interface InstructorState {
  classes: Class[]
  scenarios: Scenario[]
  grades: ScoreBreakdown[]
  addClass: (newClass: Class) => void
  addScenario: (newScenario: Scenario) => void
  setGrades: (grades: ScoreBreakdown[]) => void

  // New mock data state for College Student Dashboard
  classInfo: ClassInfo
  leaderboard: LeaderboardStudent[]
  studentPerformance: PerformanceDimension[]
  feedbackCount: number
  incrementFeedbackCount: () => void
}

export const useInstructorStore = create<InstructorState>((set) => ({
  classes: [
    {
      id: "c_1",
      name: "MKT 410: Advanced Digital Marketing",
      instructorId: "usr_instructor",
      studentsCount: 24,
      studentIds: ["s_1", "s_2", "s_3"],
      createdAt: new Date().toISOString(),
    },
  ],
  scenarios: [
    {
      id: "sc_1",
      title: "E-Commerce Launch Sprint",
      description: "Optimize ROI for a direct-to-consumer online fashion retail startup.",
      industry: "E-commerce",
      difficulty: "medium" as const,
      startingBudget: 5000,
      targetRevenue: 12000,
      durationDays: 30,
    },
  ],
  grades: [
    { id: "g_1", scenarioId: "sc_1", userId: "Student A", roiScore: 82, seoScore: 92, adsScore: 95, budgetManagementScore: 90, overallScore: 90 },
    { id: "g_2", scenarioId: "sc_1", userId: "Student B", roiScore: 78, seoScore: 88, adsScore: 91, budgetManagementScore: 88, overallScore: 86 },
    { id: "g_3", scenarioId: "sc_1", userId: "Student C (You)", roiScore: 76, seoScore: 85, adsScore: 89, budgetManagementScore: 95, overallScore: 86 },
    { id: "g_4", scenarioId: "sc_1", userId: "Student D", roiScore: 70, seoScore: 80, adsScore: 85, budgetManagementScore: 82, overallScore: 79 },
    { id: "g_5", scenarioId: "sc_1", userId: "Student E", roiScore: 68, seoScore: 78, adsScore: 82, budgetManagementScore: 80, overallScore: 77 },
  ],
  addClass: (newClass) =>
    set((state) => ({ classes: [...state.classes, newClass] })),
  addScenario: (newScenario) =>
    set((state) => ({ scenarios: [...state.scenarios, newScenario] })),
  setGrades: (grades) => set({ grades }),

  // Mock data implementation
  classInfo: {
    className: "MKT 410: Advanced Digital Marketing",
    instructorName: "Dr. Rachel Green",
    daysRemaining: 12,
  },
  leaderboard: [
    { rank: 1, name: "Student A", seoScore: 92, adsScore: 95, totalScore: 187 },
    { rank: 2, name: "Student B", seoScore: 88, adsScore: 91, totalScore: 179 },
    { rank: 3, name: "Student C (You)", seoScore: 85, adsScore: 89, totalScore: 174, isCurrentUser: true },
    { rank: 4, name: "Student D", seoScore: 80, adsScore: 85, totalScore: 165 },
    { rank: 5, name: "Student E", seoScore: 78, adsScore: 82, totalScore: 160 },
    { rank: 6, name: "Student F", seoScore: 75, adsScore: 80, totalScore: 155 },
  ],
  studentPerformance: [
    { subject: "SEO Score", student: 85, average: 75, fullMark: 100 },
    { subject: "Ads Score", student: 89, average: 78, fullMark: 100 },
    { subject: "Budget Discipline", student: 95, average: 82, fullMark: 100 },
    { subject: "Adaptability", student: 80, average: 70, fullMark: 100 },
    { subject: "ROI Performance", student: 90, average: 76, fullMark: 100 },
  ],
  feedbackCount: 4,
  incrementFeedbackCount: () => set((state) => ({ feedbackCount: state.feedbackCount + 1 })),
}))
