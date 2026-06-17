import { create } from "zustand"
import api from "@/lib/api"

export interface NotificationItem {
  id: string
  type: "info" | "success" | "warning" | "achievement"
  title: string
  message: string
  timestamp: string
  read: boolean
  link?: string
  actor?: string
}

export interface ActivityItem {
  id: string
  actor: string
  action: string
  target: string
  timestamp: string
  type: "simulation" | "leaderboard" | "social" | "system"
}

interface NotificationStoreState {
  notifications: NotificationItem[]
  unreadCount: number
  activityFeed: ActivityItem[]
  isLoading: boolean

  // Actions
  fetchNotifications: () => Promise<void>
  addNotification: (item: Omit<NotificationItem, "id" | "read" | "timestamp">) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  dismissNotification: (id: string) => Promise<void>
  fetchActivities: () => Promise<void>
  addActivity: (activity: Omit<ActivityItem, "id" | "timestamp">) => Promise<void>
  clearOldNotifications: () => Promise<void>
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "just now"
  if (diffMins < 65) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export const useNotificationStore = create<NotificationStoreState>()((set) => ({
  notifications: [],
  unreadCount: 0,
  activityFeed: [],
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true })
    try {
      const res = await api.get<{ success: boolean; notifications: any[] }>("/api/v1/notifications")
      if (res.data.success) {
        const list: NotificationItem[] = res.data.notifications.map(n => ({
          id: n.id,
          type: n.type as any,
          title: n.title,
          message: n.message,
          timestamp: formatTimeAgo(n.createdAt),
          read: n.read,
          link: n.link || undefined,
          actor: n.actor || undefined
        }))
        set({
          notifications: list,
          unreadCount: list.filter(n => !n.read).length
        })
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err)
    } finally {
      set({ isLoading: false })
    }
  },

  addNotification: async (item) => {
    const newNotification: NotificationItem = {
      ...item,
      id: `local_${Date.now()}`,
      read: false,
      timestamp: "just now"
    }
    set(state => {
      const next = [newNotification, ...state.notifications]
      return {
        notifications: next,
        unreadCount: next.filter(n => !n.read).length
      }
    })
  },

  markAsRead: async (id) => {
    if (id.startsWith("local_")) {
      set(state => {
        const next = state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
        return { notifications: next, unreadCount: next.filter(n => !n.read).length }
      })
      return
    }
    try {
      const res = await api.put<{ success: boolean }>(`/api/v1/notifications/${id}/read`)
      if (res.data.success) {
        set(state => {
          const next = state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
          return { notifications: next, unreadCount: next.filter(n => !n.read).length }
        })
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err)
    }
  },

  markAllAsRead: async () => {
    try {
      const res = await api.put<{ success: boolean }>("/api/v1/notifications/read-all")
      if (res.data.success) {
        set(state => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0
        }))
      }
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err)
    }
  },

  dismissNotification: async (id) => {
    if (id.startsWith("local_")) {
      set(state => {
        const next = state.notifications.filter(n => n.id !== id)
        return { notifications: next, unreadCount: next.filter(n => !n.read).length }
      })
      return
    }
    try {
      const res = await api.delete<{ success: boolean }>(`/api/v1/notifications/${id}`)
      if (res.data.success) {
        set(state => {
          const next = state.notifications.filter(n => n.id !== id)
          return { notifications: next, unreadCount: next.filter(n => !n.read).length }
        })
      }
    } catch (err) {
      console.error("Failed to dismiss notification:", err)
    }
  },

  fetchActivities: async () => {
    try {
      const res = await api.get<{ success: boolean; logs: any[] }>("/api/v1/audit")
      if (res.data.success) {
        const activities: ActivityItem[] = res.data.logs.map(log => ({
          id: log.id,
          actor: "Student",
          action: log.action,
          target: log.details || "",
          timestamp: formatTimeAgo(log.createdAt),
          type: log.action.includes("ADS") ? "simulation" : "system"
        }))
        set({ activityFeed: activities })
      }
    } catch (err) {
      console.error("Failed to fetch audit log activities:", err)
    }
  },

  addActivity: async (activity) => {
    const newAct: ActivityItem = {
      ...activity,
      id: `local_act_${Date.now()}`,
      timestamp: "just now"
    }
    set(state => ({
      activityFeed: [newAct, ...state.activityFeed]
    }))
  },

  clearOldNotifications: async () => {
    try {
      const res = await api.delete<{ success: boolean }>("/api/v1/notifications/clear-read")
      if (res.data.success) {
        set(state => {
          const next = state.notifications.filter(n => !n.read)
          return { notifications: next, unreadCount: next.length }
        })
      }
    } catch (err) {
      console.error("Failed to clear read notifications:", err)
    }
  }
}))

export default useNotificationStore
