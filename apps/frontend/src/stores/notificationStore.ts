import { create } from "zustand"

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

  // Actions
  addNotification: (item: Omit<NotificationItem, "id" | "read" | "timestamp">) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  dismissNotification: (id: string) => void
  addActivity: (activity: Omit<ActivityItem, "id" | "timestamp">) => void
  clearOldNotifications: () => void
}

// ─── Initial Mock Data ────────────────────────────────────────────────────────

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "not_1",
    type: "achievement",
    title: "Achievement Earned",
    message: "You earned 'Budget Genius' badge",
    timestamp: "2 mins ago",
    read: false,
    link: "/certificates",
  },
  {
    id: "not_2",
    type: "success",
    title: "Simulation Passed",
    message: "Sarah completed Round 5 in SEO Simulation",
    timestamp: "10 mins ago",
    read: false,
    link: "/simulation/seo",
    actor: "Sarah",
  },
  {
    id: "not_3",
    type: "info",
    title: "New Course Briefing",
    message: "Instructor posted new scenario 'Q4 Launch'",
    timestamp: "1 hour ago",
    read: false,
    link: "/",
    actor: "Instructor Green",
  },
  {
    id: "not_4",
    type: "warning",
    title: "Daily Budget Alert",
    message: "Google Ads campaign 'Spring Leads' exceeded limit",
    timestamp: "3 hours ago",
    read: false,
    link: "/simulation/google-ads",
  },
  {
    id: "not_5",
    type: "success",
    title: "Meta Ads Approved",
    message: "Facebook ad set 'Retargeting' is now active",
    timestamp: "5 hours ago",
    read: true,
    link: "/simulation/meta-ads",
  },
  {
    id: "not_6",
    type: "achievement",
    title: "Leaderboard Overtake",
    message: "Mike overtook you on the leaderboard",
    timestamp: "1 day ago",
    read: true,
    link: "/leaderboard",
    actor: "Mike",
  },
  {
    id: "not_7",
    type: "info",
    title: "Class Announcement",
    message: "Reminder: Final project submission deadline is next Monday",
    timestamp: "1 day ago",
    read: true,
    actor: "Instructor Green",
  },
  {
    id: "not_8",
    type: "warning",
    title: "Keyword Match Issue",
    message: "High search volume on negative keywords detected in Google Ads",
    timestamp: "2 days ago",
    read: true,
    link: "/simulation/google-ads",
  },
  {
    id: "not_9",
    type: "success",
    title: "Landing Page Optimized",
    message: "Site crawl score improved by 12 points",
    timestamp: "3 days ago",
    read: true,
    link: "/simulation/seo",
  },
  {
    id: "not_10",
    type: "info",
    title: "Platform Update",
    message: "We upgraded ad simulator algorithms to support dynamic bid adjustments",
    timestamp: "4 days ago",
    read: true,
  },
  {
    id: "not_11",
    type: "success",
    title: "Invite Accepted",
    message: "Emily joined your class cohort MKT 410",
    timestamp: "5 days ago",
    read: true,
    actor: "Emily",
  },
  {
    id: "not_12",
    type: "achievement",
    title: "SEO Master Badge",
    message: "You earned 'SEO Master' badge by completing all landing page checks",
    timestamp: "1 week ago",
    read: true,
    link: "/certificates",
  },
]

const MOCK_ACTIVITIES: ActivityItem[] = [
  // Today
  { id: "act_1", actor: "Sarah", action: "completed Round 5 in", target: "SEO Simulation", timestamp: "2 mins ago", type: "simulation" },
  { id: "act_2", actor: "You", action: "earned 'Budget Genius'", target: "Badge Achievement", timestamp: "10 mins ago", type: "system" },
  { id: "act_3", actor: "Instructor Green", action: "posted new scenario", target: "Q4 Launch Briefing", timestamp: "1 hour ago", type: "system" },
  { id: "act_4", actor: "Mike", action: "overtook you on the", target: "Leaderboard Rankings", timestamp: "3 hours ago", type: "leaderboard" },
  { id: "act_5", actor: "Liam Chen", action: "launched campaign", target: "Meta Ad Set 'Retargeting'", timestamp: "4 hours ago", type: "simulation" },
  { id: "act_6", actor: "Sophia Martinez", action: "modified CPC bid to $1.20 in", target: "Google Ads campaign 'Black Friday'", timestamp: "5 hours ago", type: "simulation" },
  
  // Yesterday
  { id: "act_7", actor: "Dr. Rachel Carter", action: "published class invites for", target: "MKT 501: MBA Growth Lab", timestamp: "1 day ago", type: "social" },
  { id: "act_8", actor: "Brendan Birch", action: "submitted round 3 settings in", target: "Meta Ads placements", timestamp: "1 day ago", type: "simulation" },
  { id: "act_9", actor: "May Maple", action: "joined your classroom", target: "MKT 220: Marketing Fundamentals", timestamp: "1 day ago", type: "social" },
  { id: "act_10", actor: "You", action: "optimized negative keywords list in", target: "Google Ads Campaign", timestamp: "1 day ago", type: "simulation" },
  { id: "act_11", actor: "Alex Sandbox", action: "earned 'SEO Optimizer' certificate", target: "Bronze Tier", timestamp: "1 day ago", type: "leaderboard" },
  { id: "act_12", actor: "Dr. Rachel Carter", action: "updated course milestones for", target: "MKT 305: Brand Development", timestamp: "1 day ago", type: "social" },
  
  // This Week
  { id: "act_13", actor: "Grace Nelson", action: "completed Round 4 in", target: "SEO Simulation", timestamp: "2 days ago", type: "simulation" },
  { id: "act_14", actor: "You", action: "unlocked course achievement", target: "Conversion King Badge", timestamp: "3 days ago", type: "system" },
  { id: "act_15", actor: "Jackson Martin", action: "posted a class question on", target: "Meta ad creative optimization", timestamp: "4 days ago", type: "social" },
  { id: "act_16", actor: "Oliver Brown", action: "overtook Alex Sandbox on the", target: "Global Leaderboard", timestamp: "5 days ago", type: "leaderboard" },
  { id: "act_17", actor: "Dr. Rachel Carter", action: "extended project deadline for", target: "MKT 610: Doctoral Seminar", timestamp: "5 days ago", type: "system" },
  { id: "act_18", actor: "Steven Stone", action: "earned 'ROI Champion' certificate", target: "Gold Tier", timestamp: "6 days ago", type: "leaderboard" },
  { id: "act_19", actor: "Emma Johnson", action: "submitted round 8 inputs in", target: "Google Ads campaign 'Winter Sale'", timestamp: "6 days ago", type: "simulation" },
  { id: "act_20", actor: "Wally Ralts", action: "joined SimpLab platform via", target: "Classroom invitation code", timestamp: "1 week ago", type: "social" },
]

// ─── Store Creation ──────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationStoreState>()((set) => ({
  notifications: MOCK_NOTIFICATIONS,
  unreadCount: MOCK_NOTIFICATIONS.filter((n) => !n.read).length,
  activityFeed: MOCK_ACTIVITIES,

  addNotification: (item) => {
    set((state) => {
      const newNotification: NotificationItem = {
        ...item,
        id: `not_${state.notifications.length + 1}`,
        read: false,
        timestamp: "Just now",
      }
      const nextNotifications = [newNotification, ...state.notifications]
      return {
        notifications: nextNotifications,
        unreadCount: nextNotifications.filter((n) => !n.read).length,
      }
    })
  },

  markAsRead: (id) => {
    set((state) => {
      const nextNotifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
      return {
        notifications: nextNotifications,
        unreadCount: nextNotifications.filter((n) => !n.read).length,
      }
    })
  },

  markAllAsRead: () => {
    set((state) => {
      const nextNotifications = state.notifications.map((n) => ({
        ...n,
        read: true,
      }))
      return {
        notifications: nextNotifications,
        unreadCount: 0,
      }
    })
  },

  dismissNotification: (id) => {
    set((state) => {
      const nextNotifications = state.notifications.filter((n) => n.id !== id)
      return {
        notifications: nextNotifications,
        unreadCount: nextNotifications.filter((n) => !n.read).length,
      }
    })
  },

  addActivity: (activity) => {
    set((state) => {
      const newActivity: ActivityItem = {
        ...activity,
        id: `act_${state.activityFeed.length + 1}`,
        timestamp: "Just now",
      }
      return {
        activityFeed: [newActivity, ...state.activityFeed],
      }
    })
  },

  clearOldNotifications: () => {
    set((state) => {
      const nextNotifications = state.notifications.filter((n) => !n.read)
      return {
        notifications: nextNotifications,
        unreadCount: nextNotifications.length,
      }
    })
  },
}))

export default useNotificationStore
