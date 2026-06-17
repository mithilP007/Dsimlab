import { create } from "zustand"
import api from "@/lib/api"

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Student {
  id: string
  studentId: string
  name: string
  avatar: string
  overallScore: number
  compositeScore: number
  roiScore: number
  adaptabilityScore: number
  seoScore: number
  googleAdsScore: number
  metaAdsScore: number
  roundsCompleted: number
  performanceBadge: 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'None'
  rank: number
  previousRank: number
  trend: "up" | "down" | "stable"
  movement: number
  scoreDiff: number
}

export interface ClassStats {
  averageScore: number
  highestScore: number
  lowestScore: number
  medianScore: number
  participationRate: number
}

export interface ScoreDistribution {
  range: string
  count: number
}

export interface TopPerformer {
  category: string
  studentId: string
  studentName: string
  value: number
  avatar: string
}

export interface RecentAchievement {
  studentName: string
  achievement: string
  timeAgo: string
  description: string
  avatar: string
  type: "milestone" | "streak" | "perfect" | "comeback" | "first"
}

interface LeaderboardState {
  className: string
  instructorName: string
  totalStudents: number
  currentRound: number
  totalRounds: number
  classRank: number
  globalRank: number
  students: Student[]
  originalStudents: Student[] // Cache for filtering
  classStats: ClassStats
  scoreDistribution: ScoreDistribution[]
  topPerformers: TopPerformer[]
  recentAchievements: RecentAchievement[]
  isLoading: boolean

  // Actions
  fetchLeaderboard: () => Promise<void>
  sortBy: (field: "rank" | "name" | "overallScore" | "trend", direction: "asc" | "desc") => void
  filterByName: (query: string) => void
  updateStudentScore: (studentId: string, scores: Partial<Pick<Student, "seoScore" | "googleAdsScore" | "metaAdsScore" | "overallScore">>) => void
  refreshLeaderboard: () => void
}

export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  className: "Loading Classroom...",
  instructorName: "Loading Instructor...",
  totalStudents: 0,
  currentRound: 1,
  totalRounds: 10,
  classRank: 0,
  globalRank: 0,
  students: [],
  originalStudents: [],
  classStats: {
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    medianScore: 0,
    participationRate: 0,
  },
  scoreDistribution: [],
  topPerformers: [],
  recentAchievements: [],
  isLoading: false,

  fetchLeaderboard: async () => {
    set({ isLoading: true })
    try {
      const res = await api.get<{
        success: boolean
        classRank: number
        globalRank: number
        className: string
        instructorName: string
        currentRound: number
        totalRounds: number
        classStats: ClassStats
        leaderboard: Student[]
        recentAchievements: RecentAchievement[]
      }>('/api/v1/scoring/leaderboard')

      if (res.data?.success) {
        const data = res.data
        const studentsList = data.leaderboard || []

        // Compute Score Distribution
        const distribution: ScoreDistribution[] = [
          { range: "0-20",   count: 0 },
          { range: "21-40",  count: 0 },
          { range: "41-60",  count: 0 },
          { range: "61-70",  count: 0 },
          { range: "71-80",  count: 0 },
          { range: "81-100", count: 0 },
        ]

        studentsList.forEach(s => {
          const score = s.overallScore
          if (score <= 20) distribution[0].count++
          else if (score <= 40) distribution[1].count++
          else if (score <= 60) distribution[2].count++
          else if (score <= 70) distribution[3].count++
          else if (score <= 80) distribution[4].count++
          else distribution[5].count++
        })

        // Compute Top Performers
        let seoMaster = { studentId: "", studentName: "None", value: 0, avatar: "N" }
        let adsWizard = { studentId: "", studentName: "None", value: 0, avatar: "N" }
        let budgetGenius = { studentId: "", studentName: "None", value: 0, avatar: "N" }
        let risingStar = { studentId: "", studentName: "None", value: 0, avatar: "N" }

        studentsList.forEach(s => {
          if (s.seoScore > seoMaster.value) {
            seoMaster = { studentId: s.id, studentName: s.name, value: s.seoScore, avatar: s.avatar }
          }
          const adsVal = s.googleAdsScore + s.metaAdsScore
          if (adsVal > adsWizard.value) {
            adsWizard = { studentId: s.id, studentName: s.name, value: adsVal, avatar: s.avatar }
          }
          if (s.roiScore > budgetGenius.value) {
            budgetGenius = { studentId: s.id, studentName: s.name, value: s.roiScore, avatar: s.avatar }
          }
          if (s.trend === 'up' && s.movement > risingStar.value) {
            risingStar = { studentId: s.id, studentName: s.name, value: s.movement, avatar: s.avatar }
          }
        })

        const topPerformers: TopPerformer[] = [
          { category: "SEO Master", ...seoMaster },
          { category: "Ads Wizard", ...adsWizard },
          { category: "Budget Genius", ...budgetGenius },
          { category: "Rising Star", ...risingStar }
        ]

        set({
          students: studentsList,
          originalStudents: studentsList,
          className: data.className,
          instructorName: data.instructorName,
          currentRound: data.currentRound,
          totalRounds: data.totalRounds,
          classRank: data.classRank,
          globalRank: data.globalRank,
          classStats: data.classStats,
          scoreDistribution: distribution,
          topPerformers,
          recentAchievements: data.recentAchievements || [],
          totalStudents: studentsList.length,
        })
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard in store:", err)
    } finally {
      set({ isLoading: false })
    }
  },

  sortBy: (field, direction) => {
    set((state) => {
      const sorted = [...state.students].sort((a, b) => {
        const aVal = a[field]
        const bVal = b[field]

        if (typeof aVal === "string" && typeof bVal === "string") {
          return direction === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal)
        }

        // Numeric values
        return direction === "asc"
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number)
      })

      return { students: sorted }
    })
  },

  filterByName: (query) => {
    set((state) => {
      if (!query.trim()) {
        return { students: state.originalStudents }
      }
      const filtered = state.originalStudents.filter((s) =>
        s.name.toLowerCase().includes(query.toLowerCase())
      )
      return { students: filtered }
    })
  },

  updateStudentScore: (studentId, scores) => {
    set((state) => {
      const updated = state.originalStudents.map((s) => {
        if (s.id === studentId) {
          return { ...s, ...scores }
        }
        return s
      })
      return {
        students: updated,
        originalStudents: updated,
      }
    })
  },

  refreshLeaderboard: async () => {
    await get().fetchLeaderboard()
  },
}))

export default useLeaderboardStore
