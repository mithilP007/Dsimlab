import { useState } from "react"
import { useNavigate } from "react-router"
import { useNotificationStore, type NotificationItem } from "@/stores/notificationStore"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BellOff,
  Check,
  CheckCircle2,
  AlertTriangle,
  Info,
  Trophy,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function NotificationPanel() {
  const navigate = useNavigate()
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearOldNotifications,
  } = useNotificationStore()

  // State: Tab Filter
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "achievements" | "system">("all")
  
  // State: Severity / Type Filter
  const [typeFilter, setTypeFilter] = useState<"all" | NotificationItem["type"]>("all")

  // State: Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Helper: Get icon and style by type
  const getTypeConfig = (type: NotificationItem["type"]) => {
    switch (type) {
      case "success":
        return {
          icon: CheckCircle2,
          border: "border-l-4 border-l-emerald-500",
          iconColor: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
          bg: "bg-emerald-50/5 dark:bg-emerald-950/5",
        }
      case "warning":
        return {
          icon: AlertTriangle,
          border: "border-l-4 border-l-amber-500",
          iconColor: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
          bg: "bg-amber-50/5 dark:bg-amber-950/5",
        }
      case "achievement":
        return {
          icon: Trophy,
          border: "border-l-4 border-l-yellow-500",
          iconColor: "text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30",
          bg: "bg-yellow-50/5 dark:bg-yellow-950/5",
        }
      default:
        return {
          icon: Info,
          border: "border-l-4 border-l-blue-500",
          iconColor: "text-blue-500 bg-blue-50 dark:bg-blue-950/30",
          bg: "bg-blue-50/5 dark:bg-blue-950/5",
        }
    }
  }

  // Filter Logic
  const filteredNotifications = notifications.filter((item) => {
    // 1. Tab Filter
    if (activeTab === "unread" && item.read) return false
    if (activeTab === "achievements" && item.type !== "achievement") return false
    if (activeTab === "system" && item.type === "achievement") return false // non-achievement constitutes system

    // 2. Severity/Type Filter
    if (typeFilter !== "all" && item.type !== typeFilter) return false

    return true
  })

  // Pagination Logic
  const totalItems = filteredNotifications.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + itemsPerPage)

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab)
    setCurrentPage(1)
  }

  const handleTypeFilterChange = (val: typeof typeFilter) => {
    setTypeFilter(val)
    setCurrentPage(1)
  }

  const handleCardClick = (item: NotificationItem) => {
    if (!item.read) {
      markAsRead(item.id)
    }
    if (item.link) {
      navigate(item.link)
    }
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            Notification Console
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage your classroom simulation alerts, system status warnings, and earned achievements.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs font-semibold flex items-center gap-1.5 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Mark all read
            </Button>
          )}

          {notifications.some((n) => n.read) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearOldNotifications}
              className="text-xs font-semibold flex items-center gap-1.5 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Clear read alerts
            </Button>
          )}
        </div>
      </div>

      <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm rounded-2xl overflow-hidden">
        {/* Filters and Tabs Header */}
        <CardHeader className="p-5 border-b border-neutral-100 dark:border-neutral-850 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Tabs Filter */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl max-w-fit">
            {(["all", "unread", "achievements", "system"] as const).map((tab) => {
              const label = tab.charAt(0).toUpperCase() + tab.slice(1)
              const isActive = activeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={cn(
                    "text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer capitalize flex items-center gap-1.5",
                    isActive
                      ? "bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                  )}
                >
                  {label}
                  {tab === "unread" && unreadCount > 0 && (
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Type dropdown filter */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 shrink-0">
              Severity:
            </span>
            <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
              <SelectTrigger className="w-[150px] h-9 text-xs font-bold border-neutral-200 dark:border-neutral-850 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
                <SelectValue placeholder="All severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-semibold">All Types</SelectItem>
                <SelectItem value="info" className="text-xs font-semibold">Info</SelectItem>
                <SelectItem value="success" className="text-xs font-semibold">Success</SelectItem>
                <SelectItem value="warning" className="text-xs font-semibold">Warning</SelectItem>
                <SelectItem value="achievement" className="text-xs font-semibold">Achievement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        {/* Content list */}
        <CardContent className="p-0">
          {paginatedNotifications.length > 0 ? (
            <div className="divide-y divide-neutral-150 dark:divide-neutral-800">
              {paginatedNotifications.map((item) => {
                const config = getTypeConfig(item.type)
                const Icon = config.icon

                return (
                  <div
                    key={item.id}
                    onClick={() => handleCardClick(item)}
                    className={cn(
                      "p-5 flex flex-col sm:flex-row items-start gap-4 transition-all hover:bg-neutral-50/50 dark:hover:bg-neutral-900/10 cursor-pointer text-left relative",
                      config.border,
                      !item.read ? "bg-blue-50/5 dark:bg-blue-950/5" : ""
                    )}
                  >
                    {/* Icon Column */}
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center border shrink-0 mt-0.5 shadow-2xs",
                        config.iconColor,
                        item.type === "success" && "border-emerald-100 dark:border-emerald-950",
                        item.type === "warning" && "border-amber-100 dark:border-amber-950",
                        item.type === "achievement" && "border-yellow-100 dark:border-yellow-950",
                        item.type === "info" && "border-blue-100 dark:border-blue-950"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Details Column */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                          {item.title}
                        </h3>
                        {!item.read && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                            New
                          </span>
                        )}
                        {item.actor && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-850 text-neutral-600 dark:text-neutral-400">
                            By: {item.actor}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-neutral-600 dark:text-neutral-350 font-medium leading-relaxed mt-1.5">
                        {item.message}
                      </p>
                      
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold block mt-2">
                        Received: {item.timestamp}
                      </span>
                    </div>

                    {/* Actions Column */}
                    <div className="flex sm:flex-col items-center gap-1.5 shrink-0 self-center sm:self-start w-full sm:w-auto mt-2 sm:mt-0 justify-end">
                      {!item.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(item.id)
                          }}
                          className="text-[10px] h-8 font-black text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-850 cursor-pointer w-full sm:w-auto px-3"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Mark read
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          dismissNotification(item.id)
                        }}
                        className="text-[10px] h-8 font-black text-neutral-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer w-full sm:w-auto px-3"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="py-24 text-center flex flex-col items-center justify-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center text-neutral-400 dark:text-neutral-600 border border-neutral-150 dark:border-neutral-800 shadow-2xs">
                <BellOff className="h-8 w-8" />
              </div>
              <div className="space-y-1 px-4 max-w-sm">
                <span className="text-base font-bold text-neutral-800 dark:text-neutral-200 block">
                  No notifications found
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium block leading-relaxed">
                  {typeFilter !== "all" || activeTab !== "all"
                    ? "Try loosening your active filters or category selections to view more notification updates."
                    : "You are all caught up! As students execute rounds in simulation modules, notifications will log here."}
                </span>
              </div>
              
              {(typeFilter !== "all" || activeTab !== "all") && (
                <Button
                  onClick={() => {
                    setActiveTab("all")
                    setTypeFilter("all")
                  }}
                  className="mt-2 text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 cursor-pointer rounded-xl px-4 py-2 hover:opacity-90 transition-opacity"
                >
                  Reset filters
                </Button>
              )}
            </div>
          )}
        </CardContent>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-neutral-150 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex items-center justify-between">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-bold">
              Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems}
            </span>

            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 border-neutral-200 dark:border-neutral-800 disabled:opacity-50 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center justify-center px-3 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0 border-neutral-200 dark:border-neutral-800 disabled:opacity-50 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
export default NotificationPanel
