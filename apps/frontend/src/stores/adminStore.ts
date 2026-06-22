import { create } from "zustand"
import api from "@/lib/api"

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
  phoneNumber?: string
  universityRole?: string
  age?: number
  gender?: string
  category?: string
  institution?: string
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
  students: number
  instructors: number
  colleges: number
  activeSimulations: number
  certificatesIssued: number
  totalRevenue: number
}

export interface SystemSettings {
  registrationOpen: boolean
  maxStudentsPerClass: number
  defaultRounds: number
  maintenanceMode: boolean
  minScoreGold: number
  minScoreSilver: number
  minScoreBronze: number
  defaultBudget: number
  autoEmailToggle: boolean
  digestFrequency: "daily" | "weekly" | "monthly"
}

export interface InstitutionProfile {
  name: string
  studentsCount: number
  instructorCount: number
  completionRate: number
  certificationRate: number
  status: "active" | "suspended"
  code: string
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  actorName: string
  actorEmail: string
  action: string
  target: string
  status: string
}

export interface SystemHealthData {
  api: string
  database: string
  dbLatencyMs: number
  websocket: string
  websocketConnections: number
  cpuUsage?: number
  memory: {
    heapUsedMb: number
    heapTotalMb: number
  }
  storage: {
    usedBytes: number
    totalBytes: number
    percentage: number
  }
  queueHealth?: {
    roundQueue: { waiting: number; active: number; completed: number; failed: number }
    certificateQueue: { waiting: number; active: number; completed: number; failed: number }
    reportQueue: { waiting: number; active: number; completed: number; failed: number }
    notificationQueue: { waiting: number; active: number; completed: number; failed: number }
  } | null
  recentErrors: string[]
}

export interface AnalyticsOverviewData {
  growth: {
    month: string
    users: number
    simulations: number
    certificates: number
  }[]
}

interface AdminStoreState {
  users: AdminUser[]
  classes: AdminClass[]
  systemStats: SystemStats
  settings: SystemSettings
  institutions: InstitutionProfile[]
  auditLogs: AuditLogEntry[]
  systemHealth: SystemHealthData | null
  analyticsOverview: AnalyticsOverviewData | null
  recentActivity: any[]
  isLoading: boolean

  // Actions
  fetchDashboardStats: () => Promise<void>
  fetchUsers: () => Promise<void>
  suspendUser: (id: string) => Promise<void>
  activateUser: (id: string) => Promise<void>
  changeUserRole: (id: string, role: "student" | "instructor" | "admin") => Promise<void>
  updateUserInstitution: (id: string, institution: string | null) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  addUser: (user: Omit<AdminUser, "id" | "joinedAt" | "lastLogin">) => Promise<void>
  resetUserPassword: (id: string) => Promise<void>
  bulkUserAction: (userIds: string[], action: "suspend" | "activate" | "delete") => Promise<void>
  
  fetchInstitutions: () => Promise<void>
  renameInstitution: (name: string, newName: string) => Promise<void>
  deactivateInstitution: (name: string) => Promise<void>
  reactivateInstitution: (name: string) => Promise<void>
  createInstitution: (name: string, code: string) => Promise<void>
  
  fetchAuditLogs: () => Promise<void>
  fetchAnalyticsOverview: () => Promise<void>
  fetchSystemHealth: () => Promise<void>
  broadcastNotification: (payload: { title: string; message: string; targetRole?: string; targetInstitution?: string }) => Promise<void>
  
  archiveClass: (id: string) => void
  deleteClass: (id: string) => void
  updateSettings: (settings: Partial<SystemSettings>) => void
}

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

export const useAdminStore = create<AdminStoreState>()((set, get) => ({
  users: [],
  classes: [],
  systemStats: {
    totalUsers: 0,
    activeUsers: 0,
    students: 0,
    instructors: 0,
    colleges: 0,
    activeSimulations: 0,
    certificatesIssued: 0,
    totalRevenue: 0
  },
  settings: INITIAL_SETTINGS,
  institutions: [],
  auditLogs: [],
  systemHealth: null,
  analyticsOverview: null,
  recentActivity: [],
  isLoading: false,

  fetchDashboardStats: async () => {
    set({ isLoading: true })
    try {
      const res = await api.get<{ success: boolean; stats: SystemStats; recentActivity: any[] }>("/api/v1/admin/dashboard-stats")
      if (res.data.success) {
        set({
          systemStats: res.data.stats,
          recentActivity: res.data.recentActivity,
          isLoading: false
        })
      }
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err)
      set({ isLoading: false })
    }
  },

  fetchUsers: async () => {
    set({ isLoading: true })
    try {
      const res = await api.get<{ success: boolean; users: AdminUser[] }>("/api/v1/users")
      if (res.data.success) {
        const usersList = res.data.users
        set((state) => ({
          users: usersList,
          systemStats: {
            ...state.systemStats,
            totalUsers: usersList.length,
            activeUsers: usersList.filter((u) => u.status === "active").length,
          },
          isLoading: false
        }))
      }
    } catch (err) {
      console.error("Failed to fetch users", err)
      set({ isLoading: false })
    }
  },

  suspendUser: async (id) => {
    try {
      await api.post(`/api/v1/users/${id}/suspend`)
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
    } catch (err) {
      console.error("Failed to suspend user", err)
      throw err
    }
  },

  activateUser: async (id) => {
    try {
      await api.post(`/api/v1/users/${id}/activate`)
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
    } catch (err) {
      console.error("Failed to activate user", err)
      throw err
    }
  },

  changeUserRole: async (id, role) => {
    try {
      await api.post(`/api/v1/users/assign-role`, { userId: id, role })
      set((state) => ({
        users: state.users.map((u) => (u.id === id ? { ...u, role } : u)),
      }))
    } catch (err) {
      console.error("Failed to change user role", err)
      throw err
    }
  },

  updateUserInstitution: async (id, institution) => {
    try {
      await api.put(`/api/v1/admin/users/${id}`, { institution })
      set((state) => ({
        users: state.users.map((u) => (u.id === id ? { ...u, institution: institution || undefined } : u)),
      }))
    } catch (err) {
      console.error("Failed to update user institution", err)
      throw err
    }
  },

  deleteUser: async (id) => {
    try {
      await api.delete(`/api/v1/users/${id}`)
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
    } catch (err) {
      console.error("Failed to delete user", err)
      throw err
    }
  },

  addUser: async (user) => {
    try {
      const res = await api.post<{ success: boolean; user: AdminUser }>(`/api/v1/users/provision`, user)
      if (res.data.success) {
        set((state) => {
          const nextUsers = [...state.users, res.data.user]
          return {
            users: nextUsers,
            systemStats: {
              ...state.systemStats,
              totalUsers: nextUsers.length,
              activeUsers: nextUsers.filter((u) => u.status === "active").length,
            },
          }
        })
      }
    } catch (err) {
      console.error("Failed to provision user", err)
      throw err
    }
  },

  resetUserPassword: async (id) => {
    try {
      await api.post(`/api/v1/admin/users/${id}/reset-password`)
    } catch (err) {
      console.error("Failed to reset password", err)
      throw err
    }
  },

  bulkUserAction: async (userIds, action) => {
    try {
      await api.post(`/api/v1/admin/users/bulk-action`, { userIds, action })
      await get().fetchUsers()
    } catch (err) {
      console.error("Failed to execute bulk user action", err)
      throw err
    }
  },

  fetchInstitutions: async () => {
    set({ isLoading: true })
    try {
      const res = await api.get<{ success: boolean; institutions: InstitutionProfile[] }>("/api/v1/admin/institutions")
      if (res.data.success) {
        set({ institutions: res.data.institutions, isLoading: false })
      }
    } catch (err) {
      console.error("Failed to fetch institutions", err)
      set({ isLoading: false })
    }
  },

  renameInstitution: async (name, newName) => {
    try {
      await api.put(`/api/v1/admin/institutions/${encodeURIComponent(name)}`, { newName })
      await get().fetchInstitutions()
    } catch (err) {
      console.error("Failed to rename institution", err)
      throw err
    }
  },

  deactivateInstitution: async (name) => {
    try {
      await api.post(`/api/v1/admin/institutions/${encodeURIComponent(name)}/deactivate`)
      await get().fetchInstitutions()
    } catch (err) {
      console.error("Failed to deactivate institution", err)
      throw err
    }
  },

  reactivateInstitution: async (name) => {
    try {
      await api.post(`/api/v1/admin/institutions/${encodeURIComponent(name)}/reactivate`)
      await get().fetchInstitutions()
    } catch (err) {
      console.error("Failed to reactivate institution", err)
      throw err
    }
  },

  createInstitution: async (name, code) => {
    try {
      await api.post(`/api/v1/admin/institutions`, { name, code })
      await get().fetchInstitutions()
    } catch (err) {
      console.error("Failed to create institution", err)
      throw err
    }
  },

  fetchAuditLogs: async () => {
    set({ isLoading: true })
    try {
      const res = await api.get<{ success: boolean; logs: AuditLogEntry[] }>("/api/v1/admin/audit-logs")
      if (res.data.success) {
        set({ auditLogs: res.data.logs, isLoading: false })
      }
    } catch (err) {
      console.error("Failed to fetch audit logs", err)
      set({ isLoading: false })
    }
  },

  fetchAnalyticsOverview: async () => {
    set({ isLoading: true })
    try {
      const res = await api.get<{ success: boolean; growth: any[] }>("/api/v1/admin/analytics/overview")
      if (res.data.success) {
        set({
          analyticsOverview: { growth: res.data.growth },
          isLoading: false
        })
      }
    } catch (err) {
      console.error("Failed to fetch analytics overview", err)
      set({ isLoading: false })
    }
  },

  fetchSystemHealth: async () => {
    set({ isLoading: true })
    try {
      const res = await api.get<{ success: boolean; health: SystemHealthData }>("/api/v1/admin/system-health")
      if (res.data.success) {
        set({ systemHealth: res.data.health, isLoading: false })
      }
    } catch (err) {
      console.error("Failed to fetch system health", err)
      set({ isLoading: false })
    }
  },

  broadcastNotification: async (payload) => {
    try {
      await api.post(`/api/v1/admin/broadcast-notification`, payload)
    } catch (err) {
      console.error("Failed to broadcast notification", err)
      throw err
    }
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
}))

export default useAdminStore
