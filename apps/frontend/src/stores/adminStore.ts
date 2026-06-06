import { create } from "zustand"

export interface AdminUser {
  id: string
  name: string
  email: string
  role: "student" | "instructor" | "admin"
  status: "active" | "suspended" | "pending"
  joinedAt: string
  lastLogin: string
  classCount: number
  totalScore: number
}

export interface AdminClass {
  id: string
  name: string
  instructor: string
  students: number
  status: "active" | "archived"
  createdAt: string
  avgScore: number
}

export interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalClasses: number
  simulationsRun: number
  avgPlatformScore: number
  newUsersThisWeek: number
}

export interface SystemSettings {
  registrationOpen: boolean
  maxStudentsPerClass: number
  defaultRounds: number
  maintenanceMode: boolean
  // Certificate limits
  minScoreGold: number
  minScoreSilver: number
  minScoreBronze: number
  // Budget & notification defaults
  defaultBudget: number
  autoEmailToggle: boolean
  digestFrequency: "daily" | "weekly" | "monthly"
}

interface AdminStoreState {
  users: AdminUser[]
  classes: AdminClass[]
  systemStats: SystemStats
  settings: SystemSettings

  // Actions
  suspendUser: (id: string) => void
  activateUser: (id: string) => void
  changeUserRole: (id: string, role: "student" | "instructor" | "admin") => void
  deleteUser: (id: string) => void
  archiveClass: (id: string) => void
  deleteClass: (id: string) => void
  updateSettings: (settings: Partial<SystemSettings>) => void
  addUser: (user: Omit<AdminUser, "id" | "joinedAt" | "lastLogin">) => void
}

// ─── Mock Data Generators ───────────────────────────────────────────────────

const MOCK_USERS: AdminUser[] = [
  { id: "usr_1", name: "Alex Sandbox", email: "alex.sandbox@simplab.dev", role: "student", status: "active", joinedAt: "2026-05-01", lastLogin: "2 mins ago", classCount: 1, totalScore: 88.5 },
  { id: "usr_2", name: "Professor Green", email: "p.green@simplab.dev", role: "instructor", status: "active", joinedAt: "2026-04-15", lastLogin: "5 mins ago", classCount: 3, totalScore: 0 },
  { id: "usr_3", name: "Admin Manager", email: "admin@simplab.dev", role: "admin", status: "active", joinedAt: "2026-01-01", lastLogin: "Just now", classCount: 0, totalScore: 0 },
  { id: "usr_4", name: "Sophia Martinez", email: "sophia.m@univ.edu", role: "student", status: "active", joinedAt: "2026-05-02", lastLogin: "15 mins ago", classCount: 1, totalScore: 94.2 },
  { id: "usr_5", name: "Ethan Thomas", email: "ethan.t@univ.edu", role: "student", status: "suspended", joinedAt: "2026-05-03", lastLogin: "3 days ago", classCount: 1, totalScore: 71.0 },
  { id: "usr_6", name: "Dr. Rachel Carter", email: "r.carter@statecollege.edu", role: "instructor", status: "active", joinedAt: "2026-03-20", lastLogin: "1 day ago", classCount: 2, totalScore: 0 },
  { id: "usr_7", name: "Olivia Vance", email: "o.vance@univ.edu", role: "student", status: "pending", joinedAt: "2026-06-02", lastLogin: "Never", classCount: 0, totalScore: 0 },
  { id: "usr_8", name: "Marcus Aurelius", email: "marcus@rome.edu", role: "student", status: "active", joinedAt: "2026-05-10", lastLogin: "2 hours ago", classCount: 1, totalScore: 85.0 },
  { id: "usr_9", name: "Lucy Heartfilia", email: "lucy@fairy.edu", role: "student", status: "active", joinedAt: "2026-05-12", lastLogin: "4 hours ago", classCount: 1, totalScore: 92.4 },
  { id: "usr_10", name: "Natsu Dragneel", email: "natsu@fairy.edu", role: "student", status: "suspended", joinedAt: "2026-05-12", lastLogin: "5 days ago", classCount: 1, totalScore: 54.0 },
  { id: "usr_11", name: "Gray Fullbuster", email: "gray@fairy.edu", role: "student", status: "active", joinedAt: "2026-05-13", lastLogin: "10 mins ago", classCount: 1, totalScore: 89.8 },
  { id: "usr_12", name: "Erza Scarlet", email: "erza@fairy.edu", role: "student", status: "active", joinedAt: "2026-05-13", lastLogin: "1 hour ago", classCount: 1, totalScore: 99.1 },
  { id: "usr_13", name: "Wendy Marvell", email: "wendy@fairy.edu", role: "student", status: "pending", joinedAt: "2026-06-03", lastLogin: "Never", classCount: 0, totalScore: 0 },
  { id: "usr_14", name: "Gajeel Redfox", email: "gajeel@fairy.edu", role: "student", status: "active", joinedAt: "2026-05-14", lastLogin: "2 days ago", classCount: 1, totalScore: 78.6 },
  { id: "usr_15", name: "Mirajane Strauss", email: "mira@fairy.edu", role: "student", status: "active", joinedAt: "2026-05-14", lastLogin: "3 hours ago", classCount: 1, totalScore: 95.0 },
  { id: "usr_16", name: "Laxus Dreyar", email: "laxus@fairy.edu", role: "student", status: "active", joinedAt: "2026-05-15", lastLogin: "1 day ago", classCount: 1, totalScore: 91.5 },
  { id: "usr_17", name: "Juvia Lockser", email: "juvia@fairy.edu", role: "student", status: "active", joinedAt: "2026-05-15", lastLogin: "45 mins ago", classCount: 1, totalScore: 83.0 },
  { id: "usr_18", name: "Gildarts Clive", email: "gildarts@fairy.edu", role: "instructor", status: "active", joinedAt: "2026-02-10", lastLogin: "2 weeks ago", classCount: 1, totalScore: 0 },
  { id: "usr_19", name: "Makarov Dreyar", email: "master@fairy.edu", role: "admin", status: "active", joinedAt: "2026-01-01", lastLogin: "12 hours ago", classCount: 0, totalScore: 0 },
  { id: "usr_20", name: "Cana Alberona", email: "cana@fairy.edu", role: "student", status: "active", joinedAt: "2026-05-16", lastLogin: "30 mins ago", classCount: 1, totalScore: 77.2 },
  { id: "usr_21", name: "Levy McGarden", email: "levy@fairy.edu", role: "student", status: "active", joinedAt: "2026-05-16", lastLogin: "15 mins ago", classCount: 1, totalScore: 96.5 },
  { id: "usr_22", name: "Happy Exceed", email: "happy@fairy.edu", role: "student", status: "active", joinedAt: "2026-05-17", lastLogin: "5 mins ago", classCount: 1, totalScore: 68.0 },
  { id: "usr_23", name: "Carla Exceed", email: "carla@fairy.edu", role: "student", status: "active", joinedAt: "2026-05-17", lastLogin: "4 hours ago", classCount: 1, totalScore: 86.4 },
  { id: "usr_24", name: "Lily Panther", email: "lily@fairy.edu", role: "student", status: "suspended", joinedAt: "2026-05-18", lastLogin: "4 days ago", classCount: 1, totalScore: 72.8 },
  { id: "usr_25", name: "Professor Birch", email: "birch@hoenn.edu", role: "instructor", status: "active", joinedAt: "2026-03-01", lastLogin: "1 day ago", classCount: 1, totalScore: 0 },
  { id: "usr_26", name: "May Maple", email: "may@hoenn.edu", role: "student", status: "active", joinedAt: "2026-05-20", lastLogin: "2 hours ago", classCount: 1, totalScore: 84.1 },
  { id: "usr_27", name: "Brendan Birch", email: "brendan@hoenn.edu", role: "student", status: "active", joinedAt: "2026-05-20", lastLogin: "3 hours ago", classCount: 1, totalScore: 89.0 },
  { id: "usr_28", name: "Wally Ralts", email: "wally@hoenn.edu", role: "student", status: "pending", joinedAt: "2026-06-04", lastLogin: "Never", classCount: 0, totalScore: 0 },
  { id: "usr_29", name: "Steven Stone", email: "steven@champion.edu", role: "student", status: "active", joinedAt: "2026-05-22", lastLogin: "5 mins ago", classCount: 1, totalScore: 98.7 },
  { id: "usr_30", name: "Wallace Gym", email: "wallace@sootopolis.edu", role: "student", status: "active", joinedAt: "2026-05-25", lastLogin: "1 hour ago", classCount: 1, totalScore: 90.5 }
]

const MOCK_CLASSES: AdminClass[] = [
  { id: "cls_1", name: "MKT 410: Advanced Digital Marketing", instructor: "Professor Green", students: 12, status: "active", createdAt: "2026-05-01", avgScore: 84.5 },
  { id: "cls_2", name: "MKT 420: Social Media Strategy", instructor: "Professor Green", students: 8, status: "active", createdAt: "2026-05-10", avgScore: 78.2 },
  { id: "cls_3", name: "MKT 310: Intro to Advertising", instructor: "Professor Green", students: 5, status: "archived", createdAt: "2026-04-15", avgScore: 81.0 },
  { id: "cls_4", name: "MKT 501: MBA Growth Lab", instructor: "Dr. Rachel Carter", students: 18, status: "active", createdAt: "2026-05-20", avgScore: 88.6 },
  { id: "cls_5", name: "MKT 305: Brand Development", instructor: "Dr. Rachel Carter", students: 15, status: "active", createdAt: "2026-05-22", avgScore: 82.1 },
  { id: "cls_6", name: "MKT 460: Campaign Analytics", instructor: "Gildarts Clive", students: 22, status: "active", createdAt: "2026-05-15", avgScore: 85.3 },
  { id: "cls_7", name: "MKT 220: Marketing Fundamentals", instructor: "Professor Birch", students: 25, status: "active", createdAt: "2026-05-20", avgScore: 79.4 },
  { id: "cls_8", name: "MKT 610: Doctoral Seminar", instructor: "Dr. Rachel Carter", students: 4, status: "archived", createdAt: "2026-04-01", avgScore: 91.2 }
]

const INITIAL_SETTINGS: SystemSettings = {
  registrationOpen: true,
  maxStudentsPerClass: 30,
  defaultRounds: 10,
  maintenanceMode: false,
  minScoreGold: 90,
  minScoreSilver: 80,
  minScoreBronze: 70,
  defaultBudget: 5000,
  autoEmailToggle: true,
  digestFrequency: "weekly",
}

// ─── Store Creation ──────────────────────────────────────────────────────────

export const useAdminStore = create<AdminStoreState>()((set) => ({
  users: MOCK_USERS,
  classes: MOCK_CLASSES,
  systemStats: {
    totalUsers: MOCK_USERS.length,
    activeUsers: MOCK_USERS.filter((u) => u.status === "active").length,
    totalClasses: MOCK_CLASSES.length,
    simulationsRun: 147,
    avgPlatformScore: 82.4,
    newUsersThisWeek: 6,
  },
  settings: INITIAL_SETTINGS,

  suspendUser: (id) => {
    set((state) => {
      const nextUsers = state.users.map((u) =>
        u.id === id ? { ...u, status: "suspended" as const } : u
      )
      return {
        users: nextUsers,
        systemStats: {
          ...state.systemStats,
          activeUsers: nextUsers.filter((u) => u.status === "active").length,
        },
      }
    })
  },

  activateUser: (id) => {
    set((state) => {
      const nextUsers = state.users.map((u) =>
        u.id === id ? { ...u, status: "active" as const } : u
      )
      return {
        users: nextUsers,
        systemStats: {
          ...state.systemStats,
          activeUsers: nextUsers.filter((u) => u.status === "active").length,
        },
      }
    })
  },

  changeUserRole: (id, role) => {
    set((state) => ({
      users: state.users.map((u) => (u.id === id ? { ...u, role } : u)),
    }))
  },

  deleteUser: (id) => {
    set((state) => {
      const nextUsers = state.users.filter((u) => u.id !== id)
      return {
        users: nextUsers,
        systemStats: {
          ...state.systemStats,
          totalUsers: nextUsers.length,
          activeUsers: nextUsers.filter((u) => u.status === "active").length,
        },
      }
    })
  },

  archiveClass: (id) => {
    set((state) => ({
      classes: state.classes.map((c) =>
        c.id === id ? { ...c, status: "archived" as const } : c
      ),
    }))
  },

  deleteClass: (id) => {
    set((state) => {
      const nextClasses = state.classes.filter((c) => c.id !== id)
      return {
        classes: nextClasses,
        systemStats: {
          ...state.systemStats,
          totalClasses: nextClasses.length,
        },
      }
    })
  },

  updateSettings: (settingsUpdates) => {
    set((state) => ({
      settings: { ...state.settings, ...settingsUpdates },
    }))
  },

  addUser: (user) => {
    set((state) => {
      const newUser: AdminUser = {
        ...user,
        id: `usr_${state.users.length + 1}`,
        joinedAt: new Date().toISOString().split("T")[0],
        lastLogin: "Never",
      }
      const nextUsers = [...state.users, newUser]
      return {
        users: nextUsers,
        systemStats: {
          ...state.systemStats,
          totalUsers: nextUsers.length,
          activeUsers: nextUsers.filter((u) => u.status === "active").length,
        },
      }
    })
  },
}))

export default useAdminStore
