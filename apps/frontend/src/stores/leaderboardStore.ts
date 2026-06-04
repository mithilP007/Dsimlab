import { create } from "zustand"

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Student {
  id: string
  name: string
  avatar: string // initials or color
  overallScore: number
  previousScore: number
  trend: "up" | "down" | "stable"
  seoScore: number
  googleAdsScore: number
  metaAdsScore: number
  badges: number
  streak: number
  lastActive: string
  rank: number
  previousRank: number
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
  currentUserId: string
  students: Student[]
  originalStudents: Student[] // Cache for filtering
  classStats: ClassStats
  scoreDistribution: ScoreDistribution[]
  topPerformers: TopPerformer[]
  recentAchievements: RecentAchievement[]

  // Actions
  sortBy: (field: "rank" | "name" | "overallScore" | "trend", direction: "asc" | "desc") => void
  filterByName: (query: string) => void
  updateStudentScore: (studentId: string, scores: Partial<Pick<Student, "seoScore" | "googleAdsScore" | "metaAdsScore" | "overallScore">>) => void
  refreshLeaderboard: () => void
}

// ─── Mock Student data (25 students) ──────────────────────────────────────────

const MOCK_STUDENTS: Student[] = [
  { id: "s1",  name: "Alexander Wright",  avatar: "AW", overallScore: 94.2, previousScore: 91.0, trend: "up",     seoScore: 96, googleAdsScore: 95, metaAdsScore: 92, badges: 5, streak: 4, lastActive: "2 mins ago",  rank: 1,  previousRank: 2  },
  { id: "s2",  name: "Sophia Martinez",   avatar: "SM", overallScore: 91.5, previousScore: 92.5, trend: "down",   seoScore: 92, googleAdsScore: 91, metaAdsScore: 92, badges: 4, streak: 5, lastActive: "5 mins ago",  rank: 2,  previousRank: 1  },
  { id: "s3",  name: "Liam Chen",         avatar: "LC", overallScore: 89.1, previousScore: 88.0, trend: "up",     seoScore: 89, googleAdsScore: 90, metaAdsScore: 88, badges: 4, streak: 3, lastActive: "15 mins ago", rank: 3,  previousRank: 4  },
  { id: "s4",  name: "Emma Johnson",      avatar: "EJ", overallScore: 87.0, previousScore: 87.0, trend: "stable", seoScore: 84, googleAdsScore: 88, metaAdsScore: 89, badges: 3, streak: 0, lastActive: "1 hour ago",  rank: 4,  previousRank: 3  },
  { id: "current-user", name: "You",      avatar: "U",  overallScore: 85.5, previousScore: 81.0, trend: "up",     seoScore: 85, googleAdsScore: 90, metaAdsScore: 82, badges: 3, streak: 3, lastActive: "Just now",    rank: 5,  previousRank: 7  },
  { id: "s6",  name: "Oliver Brown",      avatar: "OB", overallScore: 83.2, previousScore: 84.0, trend: "down",   seoScore: 82, googleAdsScore: 83, metaAdsScore: 85, badges: 2, streak: 0, lastActive: "2 hours ago",  rank: 6,  previousRank: 5  },
  { id: "s7",  name: "Mia Davis",         avatar: "MD", overallScore: 81.0, previousScore: 78.5, trend: "up",     seoScore: 79, googleAdsScore: 81, metaAdsScore: 83, badges: 2, streak: 0, lastActive: "10 mins ago", rank: 7,  previousRank: 9  },
  { id: "s8",  name: "Lucas Wilson",      avatar: "LW", overallScore: 79.4, previousScore: 79.4, trend: "stable", seoScore: 78, googleAdsScore: 80, metaAdsScore: 80, badges: 2, streak: 0, lastActive: "3 hours ago",  rank: 8,  previousRank: 8  },
  { id: "s9",  name: "Aria Taylor",       avatar: "AT", overallScore: 76.5, previousScore: 80.0, trend: "down",   seoScore: 76, googleAdsScore: 75, metaAdsScore: 78, badges: 2, streak: 0, lastActive: "1 day ago",    rank: 9,  previousRank: 6  },
  { id: "s10", name: "Ethan Thomas",     avatar: "ET", overallScore: 73.8, previousScore: 71.0, trend: "up",     seoScore: 72, googleAdsScore: 74, metaAdsScore: 75, badges: 1, streak: 0, lastActive: "30 mins ago", rank: 10, previousRank: 11 },
  { id: "s11", name: "Isabella Anderson", avatar: "IA", overallScore: 71.0, previousScore: 72.5, trend: "down",   seoScore: 70, googleAdsScore: 71, metaAdsScore: 72, badges: 1, streak: 0, lastActive: "4 hours ago",  rank: 11, previousRank: 10 },
  { id: "s12", name: "Mason Jackson",    avatar: "MJ", overallScore: 69.2, previousScore: 66.0, trend: "up",     seoScore: 68, googleAdsScore: 69, metaAdsScore: 71, badges: 1, streak: 0, lastActive: "15 mins ago", rank: 12, previousRank: 15 },
  { id: "s13", name: "Zoe Roberts",       avatar: "ZR", overallScore: 67.5, previousScore: 67.5, trend: "stable", seoScore: 65, googleAdsScore: 68, metaAdsScore: 69, badges: 1, streak: 0, lastActive: "5 hours ago",  rank: 13, previousRank: 13 },
  { id: "s14", name: "Logan White",       avatar: "LW", overallScore: 65.4, previousScore: 63.0, trend: "up",     seoScore: 63, googleAdsScore: 66, metaAdsScore: 67, badges: 1, streak: 0, lastActive: "2 days ago",   rank: 14, previousRank: 17 },
  { id: "s15", name: "Lily Harris",       avatar: "LH", overallScore: 63.0, previousScore: 65.0, trend: "down",   seoScore: 62, googleAdsScore: 64, metaAdsScore: 63, badges: 0, streak: 0, lastActive: "1 day ago",    rank: 15, previousRank: 12 },
  { id: "s16", name: "Jackson Martin",    avatar: "JM", overallScore: 61.8, previousScore: 61.8, trend: "stable", seoScore: 60, googleAdsScore: 62, metaAdsScore: 63, badges: 0, streak: 0, lastActive: "3 days ago",   rank: 16, previousRank: 16 },
  { id: "s17", name: "Grace Nelson",      avatar: "GN", overallScore: 59.5, previousScore: 57.0, trend: "up",     seoScore: 58, googleAdsScore: 60, metaAdsScore: 61, badges: 0, streak: 0, lastActive: "1 hour ago",   rank: 17, previousRank: 20 },
  { id: "s18", name: "Lucas Lee",         avatar: "LL", overallScore: 57.2, previousScore: 60.0, trend: "down",   seoScore: 56, googleAdsScore: 58, metaAdsScore: 58, badges: 0, streak: 0, lastActive: "1 day ago",    rank: 18, previousRank: 14 },
  { id: "s19", name: "Avery King",        avatar: "AK", overallScore: 55.0, previousScore: 55.0, trend: "stable", seoScore: 54, googleAdsScore: 56, metaAdsScore: 55, badges: 0, streak: 0, lastActive: "4 days ago",   rank: 19, previousRank: 19 },
  { id: "s20", name: "Jack Green",        avatar: "JG", overallScore: 52.8, previousScore: 50.0, trend: "up",     seoScore: 52, googleAdsScore: 53, metaAdsScore: 54, badges: 0, streak: 0, lastActive: "2 hours ago",  rank: 20, previousRank: 22 },
  { id: "s21", name: "Chloe Adams",       avatar: "CA", overallScore: 50.0, previousScore: 52.0, trend: "down",   seoScore: 49, googleAdsScore: 51, metaAdsScore: 50, badges: 0, streak: 0, lastActive: "2 days ago",   rank: 21, previousRank: 18 },
  { id: "s22", name: "Owen Baker",        avatar: "OB", overallScore: 47.5, previousScore: 45.0, trend: "up",     seoScore: 46, googleAdsScore: 48, metaAdsScore: 49, badges: 0, streak: 0, lastActive: "3 hours ago",  rank: 22, previousRank: 24 },
  { id: "s23", name: "Nora Carter",       avatar: "NC", overallScore: 45.0, previousScore: 47.0, trend: "down",   seoScore: 44, googleAdsScore: 45, metaAdsScore: 46, badges: 0, streak: 0, lastActive: "3 days ago",   rank: 23, previousRank: 21 },
  { id: "s24", name: "Leo Miller",        avatar: "LM", overallScore: 42.4, previousScore: 42.4, trend: "stable", seoScore: 41, googleAdsScore: 43, metaAdsScore: 43, badges: 0, streak: 0, lastActive: "5 days ago",   rank: 24, previousRank: 23 },
  { id: "s25", name: "Stella Ward",       avatar: "SW", overallScore: 39.5, previousScore: 38.0, trend: "up",     seoScore: 38, googleAdsScore: 40, metaAdsScore: 41, badges: 0, streak: 0, lastActive: "4 hours ago",  rank: 25, previousRank: 25 },
]

const INITIAL_STATS: ClassStats = {
  averageScore: 68.4,
  highestScore: 94.2,
  lowestScore: 39.5,
  medianScore: 71.0,
  participationRate: 92,
}

const INITIAL_DISTRIBUTION: ScoreDistribution[] = [
  { range: "0-20",   count: 0 },
  { range: "21-40",  count: 2 },
  { range: "41-60",  count: 6 },
  { range: "61-70",  count: 5 },
  { range: "71-80",  count: 4 },
  { range: "81-100", count: 8 },
]

const INITIAL_TOP_PERFORMERS: TopPerformer[] = [
  { category: "SEO Master",   studentId: "s1", studentName: "Alexander Wright", value: 96, avatar: "AW" },
  { category: "Ads Wizard",   studentId: "s1", studentName: "Alexander Wright", value: 187, avatar: "AW" }, // combined google + meta
  { category: "Budget Genius", studentId: "s3", studentName: "Liam Chen",         value: 242.0, avatar: "LC" }, // ROI %
  { category: "Rising Star",   studentId: "current-user", studentName: "You",     value: 4.5, avatar: "U" }, // Rank Change
]

const INITIAL_ACHIEVEMENTS: RecentAchievement[] = [
  { studentName: "Alexander Wright", achievement: "Perfect Round", description: "Earned 100% on SEO Technical Checklist checks.", timeAgo: "2 mins ago", avatar: "AW", type: "perfect" },
  { studentName: "You",              achievement: "Streak Winner", description: "Maintained a 3-round streak of score increases.", timeAgo: "15 mins ago", avatar: "U", type: "streak" },
  { studentName: "Sophia Martinez",   achievement: "Score Milestone", description: "Reached overall campaign score of 90+.", timeAgo: "1 hour ago", avatar: "SM", type: "milestone" },
  { studentName: "Liam Chen",         achievement: "Comeback Star", description: "Gained 4 ranks in a single round cycle.", timeAgo: "3 hours ago", avatar: "LC", type: "comeback" },
  { studentName: "Emma Johnson",      achievement: "Score Milestone", description: "Reached overall campaign score of 85+.", timeAgo: "5 hours ago", avatar: "EJ", type: "milestone" },
  { studentName: "Oliver Brown",      achievement: "Streak Winner", description: "Maintained a 4-round active submission streak.", timeAgo: "1 day ago", avatar: "OB", type: "streak" },
  { studentName: "Mia Davis",         achievement: "Comeback Star", description: "Gained 2 ranks in a single round cycle.", timeAgo: "2 days ago", avatar: "MD", type: "comeback" },
  { studentName: "Alexander Wright",  achievement: "First Place", description: "Achieved the #1 position on the standings board.", timeAgo: "3 days ago", avatar: "AW", type: "first" },
]

export const useLeaderboardStore = create<LeaderboardState>((set) => ({
  className: "Spring 2026 - Growth Hacking Masterclass",
  instructorName: "Dr. Sarah Jenkins",
  totalStudents: 25,
  currentRound: 3,
  totalRounds: 10,
  currentUserId: "current-user",
  students: MOCK_STUDENTS,
  originalStudents: MOCK_STUDENTS,
  classStats: INITIAL_STATS,
  scoreDistribution: INITIAL_DISTRIBUTION,
  topPerformers: INITIAL_TOP_PERFORMERS,
  recentAchievements: INITIAL_ACHIEVEMENTS,

  sortBy: (field, direction) => {
    set((state) => {
      const sorted = [...state.students].sort((a, b) => {
        let aVal = a[field]
        let bVal = b[field]

        if (typeof aVal === "string" && typeof bVal === "string") {
          return direction === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal)
        }

        // Numeric values
        if (field === "rank") {
          return direction === "asc"
            ? (aVal as number) - (bVal as number)
            : (bVal as number) - (aVal as number)
        }

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
          const next = { ...s, ...scores }
          return next
        }
        return s
      })
      return {
        students: updated,
        originalStudents: updated,
      }
    })
  },

  refreshLeaderboard: () => {
    // Simulated refresh changes rankings slightly
    set((state) => {
      const refreshed = state.originalStudents.map((s) => {
        // Slight fluctuation
        const scoreChange = Math.random() > 0.6 ? (Math.random() > 0.5 ? 0.5 : -0.5) : 0
        const overall = parseFloat(Math.min(100, Math.max(0, s.overallScore + scoreChange)).toFixed(1))
        return {
          ...s,
          overallScore: overall,
        }
      })
      // Re-sort by overallScore
      const sorted = [...refreshed].sort((a, b) => b.overallScore - a.overallScore)
      const mapped = sorted.map((s, idx) => ({
        ...s,
        previousRank: s.rank,
        rank: idx + 1,
        trend: (idx + 1) < s.rank ? "up" as const : (idx + 1) > s.rank ? "down" as const : "stable" as const,
      }))

      // Recalculate stats
      const avg = parseFloat((mapped.reduce((s, r) => s + r.overallScore, 0) / mapped.length).toFixed(1))
      const maxScore = Math.max(...mapped.map((r) => r.overallScore))
      const minScore = Math.min(...mapped.map((r) => r.overallScore))
      const sortedScores = mapped.map((r) => r.overallScore).sort((a, b) => a - b)
      const median = sortedScores[Math.floor(sortedScores.length / 2)]

      return {
        students: mapped,
        originalStudents: mapped,
        classStats: {
          ...state.classStats,
          averageScore: avg,
          highestScore: maxScore,
          lowestScore: minScore,
          medianScore: median,
        },
      }
    })
  },
}))

export default useLeaderboardStore
