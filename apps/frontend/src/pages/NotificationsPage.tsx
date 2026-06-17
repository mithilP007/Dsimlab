import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router"
import { useNotificationStore, type NotificationItem } from "@/stores/notificationStore"
import { useInstructorPortalStore } from "@/stores/instructorPortalStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Bell,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Info,
  Trophy,
  Check,
  Trash2,
  RefreshCw,
  Clock,
  UserCheck,
  UserX,
  Loader2,
  Sparkles,
  Activity,
  CircleAlert
} from "lucide-react"

export function NotificationsPage() {
  const navigate = useNavigate()
  const location = useLocation()

  // Notification Store
  const {
    notifications,
    unreadCount,
    activityFeed,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    fetchActivities,
    clearOldNotifications
  } = useNotificationStore()

  // Instructor Store (for Join Requests)
  const {
    pendingRequests,
    fetchClasses,
    fetchPendingRequests,
    approveJoinRequest,
    rejectJoinRequest
  } = useInstructorPortalStore()

  // Local UI States
  const [activeTab, setActiveTab] = useState<"all" | "requests" | "activity" | "system">("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Sync active tab based on URL path initially (if navigated from dropdown footer)
  useEffect(() => {
    if (location.pathname.includes("/activity")) {
      setActiveTab("activity")
    } else {
      setActiveTab("all")
    }
  }, [location.pathname])

  // Initial Data Load
  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line

  const loadData = async () => {
    setIsRefreshing(true)
    try {
      await fetchNotifications()
      await fetchActivities()
      await fetchClasses()
      await fetchPendingRequests()
    } catch (err) {
      console.error("Failed to load notifications data:", err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Handle Join Requests Actions
  const handleApprove = async (classId: string, studentId: string, studentName: string) => {
    setActionLoadingId(`${classId}-${studentId}`)
    const toastId = toast.loading(`Approving ${studentName}...`)
    try {
      await approveJoinRequest(classId, studentId)
      toast.success(`${studentName} approved and added to the classroom!`, { id: toastId })
      // Refresh notifications & pending lists
      await fetchPendingRequests()
      await fetchNotifications()
    } catch {
      toast.error("Failed to approve student. Please try again.", { id: toastId })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleReject = async (classId: string, studentId: string, studentName: string) => {
    if (!confirm(`Reject ${studentName}'s join request? They will be removed from the list.`)) return

    setActionLoadingId(`${classId}-${studentId}`)
    const toastId = toast.loading(`Rejecting ${studentName}...`)
    try {
      await rejectJoinRequest(classId, studentId)
      toast.success(`${studentName}'s request has been rejected.`, { id: toastId })
      await fetchPendingRequests()
      await fetchNotifications()
    } catch {
      toast.error("Failed to reject request. Please try again.", { id: toastId })
    } finally {
      setActionLoadingId(null)
    }
  }

  // Helper: Match a notification to a pending request (to render inline actions inside the notification card)
  const findMatchingRequest = (notif: NotificationItem) => {
    if (!notif.actor) return null
    // Find a request matching the actor name
    return pendingRequests.find(
      (r) => r.name.toLowerCase() === notif.actor!.toLowerCase()
    ) || null
  }

  // Helper: Get Icon & Styles by Notification Type
  const getTypeConfig = (type: NotificationItem["type"]) => {
    switch (type) {
      case "success":
        return {
          icon: CheckCircle2,
          color: "text-emerald-600 border-emerald-200 bg-emerald-50",
          badge: "bg-emerald-100 text-emerald-800",
        }
      case "warning":
        return {
          icon: AlertTriangle,
          color: "text-amber-600 border-amber-200 bg-amber-50",
          badge: "bg-amber-100 text-amber-800",
        }
      case "achievement":
        return {
          icon: Trophy,
          color: "text-violet-600 border-violet-200 bg-violet-50",
          badge: "bg-violet-100 text-violet-800",
        }
      default:
        return {
          icon: Info,
          color: "text-blue-600 border-blue-200 bg-blue-50",
          badge: "bg-blue-100 text-blue-800",
        }
    }
  }

  // Filters for lists
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "system") {
      return n.type === "info" || n.type === "warning" || n.type === "achievement"
    }
    return true
  })

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Navigation & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button
          onClick={() => navigate("/instructor")}
          variant="ghost"
          className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 flex items-center gap-1.5 h-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Portal Dashboard
        </Button>
        
        <div className="flex items-center gap-2.5 w-full sm:w-auto self-stretch justify-end">
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              variant="outline"
              className="text-xs font-bold border-neutral-200 h-9 px-3 rounded-xl flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" />
              Mark All Read
            </Button>
          )}
          <Button
            onClick={clearOldNotifications}
            variant="outline"
            className="text-xs font-bold border-neutral-200 hover:text-rose-600 hover:bg-rose-50/50 h-9 px-3 rounded-xl flex items-center gap-1.5"
            title="Remove all read notifications from logs"
          >
            <Trash2 className="h-4 w-4" />
            Clear Read
          </Button>
          <Button
            onClick={loadData}
            disabled={isRefreshing}
            className="bg-slate-900 text-white hover:bg-slate-950 font-black text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Main Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-gradient-to-r from-neutral-950 via-slate-900 to-neutral-900 p-6 md:p-8 text-white shadow-lg text-left">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-56 w-56 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 space-y-2.5">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-400" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">
              Lab Notification Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Classroom Notifications &amp; Actions
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 max-w-3xl font-medium leading-relaxed">
            Monitor real-time student activity feed submissions, milestone score achievements, and approve student classroom access permissions instantly.
          </p>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Filter Column */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border border-neutral-200/80 shadow-sm bg-white p-4 text-left">
            <div className="space-y-1 pb-3 border-b border-neutral-100">
              <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider">Filter Folders</h3>
              <p className="text-[10px] text-neutral-400 font-semibold">Navigate notification types</p>
            </div>
            
            <div className="flex flex-col gap-1.5 mt-4">
              {[
                { key: "all", label: "All Alerts", icon: Bell, badge: notifications.length },
                { key: "requests", label: "Access Permissions", icon: UserCheck, badge: pendingRequests.length, badgeColor: "bg-rose-500 text-white" },
                { key: "activity", label: "Student Activities", icon: Activity, badge: activityFeed.length },
                { key: "system", label: "System Messages", icon: CircleAlert },
              ].map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key as any)}
                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-black transition-all ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black leading-none ${
                        item.badgeColor || "bg-neutral-100 text-neutral-600"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Quick Metrics */}
          <Card className="border border-neutral-200/80 shadow-sm bg-white p-4 text-left space-y-3">
            <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Unread Alert Metrics</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-neutral-50 border border-neutral-100 p-3 rounded-xl">
                <span className="text-[9px] font-black text-neutral-400 uppercase block">Unread Count</span>
                <span className={`text-xl font-black block mt-0.5 ${unreadCount > 0 ? "text-indigo-600" : "text-neutral-800"}`}>
                  {unreadCount}
                </span>
              </div>
              <div className="bg-neutral-50 border border-neutral-100 p-3 rounded-xl">
                <span className="text-[9px] font-black text-neutral-400 uppercase block">Pending Join</span>
                <span className={`text-xl font-black block mt-0.5 ${pendingRequests.length > 0 ? "text-rose-500" : "text-neutral-800"}`}>
                  {pendingRequests.length}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side: Tab Contents list */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* TAB 1: ALL NOTIFICATIONS & ALERTS */}
          {activeTab === "all" && (
            <div className="space-y-4">
              <div className="text-left space-y-0.5">
                <h2 className="text-base font-black text-neutral-900">All System Alerts &amp; Audits</h2>
                <p className="text-xs text-neutral-400 font-semibold">General updates triggered by algorithm evaluations and classroom entries.</p>
              </div>

              {filteredNotifications.length === 0 ? (
                <Card className="border border-neutral-200/80 shadow-sm min-h-[280px] flex items-center justify-center bg-neutral-50/20 rounded-2xl">
                  <div className="text-center space-y-2.5 p-6">
                    <Bell className="mx-auto h-9 w-9 text-neutral-300" />
                    <h3 className="font-extrabold text-sm text-neutral-800">Clear Notification Feed</h3>
                    <p className="text-xs text-neutral-400 max-w-xs leading-normal">
                      No notifications logged. New classroom round completions and student registrations will show up here.
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notif) => {
                    const { icon: Icon, color } = getTypeConfig(notif.type)
                    const matchingReq = findMatchingRequest(notif)
                    const isActionLoading = actionLoadingId && actionLoadingId.includes(matchingReq?.id || "")

                    return (
                      <Card
                        key={notif.id}
                        className={`border border-neutral-200/80 shadow-sm hover:shadow-md transition-all text-left bg-white relative overflow-hidden ${
                          !notif.read ? "border-l-4 border-l-indigo-500" : ""
                        }`}
                      >
                        <CardContent className="p-5 flex gap-4">
                          {/* Type Icon */}
                          <div className={`h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 shadow-inner mt-0.5 ${color}`}>
                            <Icon className="h-5 w-5" />
                          </div>

                          {/* Info Content */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2 justify-between">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-black text-neutral-900 truncate">
                                  {notif.title}
                                </h3>
                                {!notif.read && (
                                  <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold border-none text-[8px] uppercase tracking-wide">
                                    New
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-neutral-400 font-semibold flex items-center gap-1 shrink-0">
                                <Clock className="h-3.5 w-3.5" />
                                {notif.timestamp}
                              </span>
                            </div>

                            <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
                              {notif.message}
                            </p>

                            {/* Render Inline Accept/Reject Buttons for Class Join Request Notifications */}
                            {matchingReq && (
                              <div className="pt-3 border-t border-neutral-100 mt-3 flex flex-wrap gap-2 items-center">
                                <div className="text-[10px] text-neutral-400 font-bold mr-auto">
                                  Classroom Code Request: <code className="bg-neutral-50 px-1 py-0.5 rounded border text-neutral-800">{matchingReq.className}</code>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(matchingReq.classId, matchingReq.id, matchingReq.name)}
                                  disabled={isActionLoading || !!actionLoadingId}
                                  className="h-8 text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 px-3"
                                >
                                  {isActionLoading ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <UserCheck className="h-3.5 w-3.5" />
                                  )}
                                  Accept Permission
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReject(matchingReq.classId, matchingReq.id, matchingReq.name)}
                                  disabled={isActionLoading || !!actionLoadingId}
                                  className="h-8 text-[10px] font-bold border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg flex items-center gap-1 px-3"
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                  Reject
                                </Button>
                              </div>
                            )}

                            {/* Standard Dismissal & Mark Read Controls */}
                            {!matchingReq && (
                              <div className="pt-2.5 flex items-center justify-end gap-3.5">
                                {!notif.read && (
                                  <button
                                    onClick={() => markAsRead(notif.id)}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 focus:outline-none"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    Mark as read
                                  </button>
                                )}
                                <button
                                  onClick={() => dismissNotification(notif.id)}
                                  className="text-[10px] font-bold text-neutral-400 hover:text-neutral-600 flex items-center gap-1 focus:outline-none"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Dismiss
                                </button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACCESS PERMISSIONS / JOIN REQUESTS */}
          {activeTab === "requests" && (
            <div className="space-y-4">
              <div className="text-left space-y-0.5">
                <h2 className="text-base font-black text-neutral-900">Student Access Permission Board</h2>
                <p className="text-xs text-neutral-400 font-semibold">Join requests submitted by students entering classroom invite codes. Approving lets them begin simulation runs.</p>
              </div>

              {pendingRequests.length === 0 ? (
                <Card className="border border-neutral-200/80 shadow-sm min-h-[280px] flex items-center justify-center bg-neutral-50/20 rounded-2xl text-left">
                  <div className="text-center space-y-3 p-8">
                    <div className="h-12 w-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto border">
                      <UserCheck className="h-6 w-6 text-neutral-400" />
                    </div>
                    <h3 className="font-extrabold text-sm text-neutral-800">No Pending Access Permissions</h3>
                    <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed font-semibold">
                      All join requests have been processed successfully! When a new student joins your class invite cohort, their access permission will land here.
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  {pendingRequests.map((req) => {
                    const isActionLoading = actionLoadingId === `${req.classId}-${req.id}`
                    return (
                      <Card
                        key={`${req.classId}-${req.id}`}
                        className="border border-neutral-200/80 bg-white hover:shadow-md transition-shadow flex flex-col justify-between"
                      >
                        <CardContent className="p-5 space-y-4">
                          <div className="flex items-start gap-3.5">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center shrink-0 border border-indigo-200/60 shadow-inner">
                              <span className="text-sm font-black text-indigo-700">
                                {req.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <p className="text-sm font-black text-neutral-900 truncate">{req.name}</p>
                              <p className="text-xs text-neutral-500 font-semibold truncate">{req.email}</p>
                              {req.institution && (
                                <p className="text-[10px] text-neutral-400 font-semibold truncate">{req.institution}</p>
                              )}
                            </div>
                          </div>

                          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs font-semibold text-neutral-700 space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-neutral-450">Class Target:</span>
                              <span className="font-bold text-neutral-850 truncate max-w-[150px]">{req.className}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-450">Requested On:</span>
                              <span className="font-bold text-neutral-500">
                                {new Date(req.requestedAt).toLocaleDateString("en-IN", {
                                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                                })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1.5">
                            <Button
                              onClick={() => handleApprove(req.classId, req.id, req.name)}
                              disabled={!!actionLoadingId}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black h-9.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              {isActionLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleReject(req.classId, req.id, req.name)}
                              disabled={!!actionLoadingId}
                              className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-[11px] font-black h-9.5 rounded-xl flex items-center justify-center gap-1.5"
                            >
                              <UserX className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STUDENT ACTIVITY LOG */}
          {activeTab === "activity" && (
            <div className="space-y-4">
              <div className="text-left space-y-0.5">
                <h2 className="text-base font-black text-neutral-900">Student Activity Timeline</h2>
                <p className="text-xs text-neutral-400 font-semibold">Real-time audit log of student operations, budget spent, and round completions.</p>
              </div>

              {activityFeed.length === 0 ? (
                <Card className="border border-neutral-200/80 shadow-sm min-h-[280px] flex items-center justify-center bg-neutral-50/20 rounded-2xl">
                  <div className="text-center space-y-2.5 p-6">
                    <Activity className="mx-auto h-9 w-9 text-neutral-300" />
                    <h3 className="font-extrabold text-sm text-neutral-800">Activity Timeline Empty</h3>
                    <p className="text-xs text-neutral-400 max-w-xs leading-normal">
                      Wait for students to start operations, submit marketing rounds, or update target setups to see real-time timeline logs.
                    </p>
                  </div>
                </Card>
              ) : (
                <Card className="border border-neutral-200/80 shadow-sm bg-white p-6 text-left">
                  <div className="relative border-l border-neutral-200 pl-6 ml-2 space-y-7">
                    {activityFeed.map((item, i) => {
                      const isSim = item.action.includes("ROUND") || item.action.includes("SIMULATION")
                      const isSubmit = item.action.includes("ADVANCE") || item.action.includes("ROUND_ADVANCE")

                      return (
                        <div key={item.id || i} className="relative group">
                          {/* Chronological Circle Indicator */}
                          <div className={`absolute -left-[31px] top-0.5 h-4.5 w-4.5 rounded-full border-4 border-white flex items-center justify-center shadow-sm ${
                            isSubmit ? "bg-emerald-500" : isSim ? "bg-indigo-500" : "bg-neutral-400"
                          }`}>
                            {isSubmit && <div className="h-1 w-1 bg-white rounded-full animate-ping" />}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2 justify-between">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border-none ${
                                isSubmit ? "bg-emerald-50 text-emerald-700" : isSim ? "bg-indigo-50 text-indigo-700" : "bg-neutral-100 text-neutral-600"
                              }`}>
                                {item.action.replace(/_/g, " ")}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-semibold flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {item.timestamp}
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-neutral-800 leading-relaxed pt-0.5">
                              {item.target}
                            </p>

                            <p className="text-[10px] text-neutral-400 font-bold">
                              Actor ID: <span className="text-neutral-500 font-semibold">{item.id}</span>
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* TAB 4: SYSTEM MESSAGES */}
          {activeTab === "system" && (
            <div className="space-y-4">
              <div className="text-left space-y-0.5">
                <h2 className="text-base font-black text-neutral-900">System Messages &amp; Milestones</h2>
                <p className="text-xs text-neutral-400 font-semibold">General configuration updates, achievements, and structural alerts.</p>
              </div>

              {filteredNotifications.filter(n => n.type === "achievement" || n.type === "warning").length === 0 ? (
                <Card className="border border-neutral-200/80 shadow-sm min-h-[280px] flex items-center justify-center bg-neutral-50/20 rounded-2xl">
                  <div className="text-center space-y-2.5 p-6">
                    <Sparkles className="mx-auto h-9 w-9 text-neutral-300" />
                    <h3 className="font-extrabold text-sm text-neutral-800">No Milestones Logs</h3>
                    <p className="text-xs text-neutral-400 max-w-xs leading-normal">
                      Students reaching score thresholds, high conversions, or target ROI multipliers will trigger custom achievements here.
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.filter(n => n.type === "achievement" || n.type === "warning").map((notif) => {
                    const { icon: Icon, color } = getTypeConfig(notif.type)
                    return (
                      <Card
                        key={notif.id}
                        className="border border-neutral-200/80 shadow-sm hover:shadow-md transition-all text-left bg-white relative overflow-hidden"
                      >
                        <CardContent className="p-5 flex gap-4">
                          <div className={`h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 shadow-inner mt-0.5 ${color}`}>
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2 justify-between">
                              <h3 className="text-sm font-black text-neutral-900 truncate">
                                {notif.title}
                              </h3>
                              <span className="text-[10px] text-neutral-400 font-semibold flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {notif.timestamp}
                              </span>
                            </div>

                            <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
                              {notif.message}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  )
}

export default NotificationsPage
