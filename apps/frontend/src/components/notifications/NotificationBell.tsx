import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router"
import { useNotificationStore, type NotificationItem } from "@/stores/notificationStore"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Bell, Info, CheckCircle2, AlertTriangle, Trophy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotificationStore()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Show max 8 notifications in the dropdown
  const visibleNotifications = notifications.slice(0, 8)

  // Helper: Get icon by notification type
  const getTypeConfig = (type: NotificationItem["type"]) => {
    switch (type) {
      case "success":
        return {
          icon: CheckCircle2,
          color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/30",
        }
      case "warning":
        return {
          icon: AlertTriangle,
          color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/30",
        }
      case "achievement":
        return {
          icon: Trophy,
          color: "text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-100 dark:border-yellow-900/30",
        }
      default:
        return {
          icon: Info,
          color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/30",
        }
    }
  }

  const handleItemClick = (item: NotificationItem) => {
    markAsRead(item.id)
    if (item.link) {
      navigate(item.link)
    }
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "relative h-9 w-9 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:scale-105 transition-all duration-200 focus:outline-none cursor-pointer shrink-0",
            open && "bg-neutral-50 dark:bg-neutral-800 text-neutral-950 dark:text-white"
          )}
          aria-label="Open notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          
          {/* Unread count badge indicator with pulsing effect */}
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-[9px] font-black items-center justify-center border border-white dark:border-neutral-900 shadow-sm">
                {unreadCount}
              </span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 rounded-2xl shadow-xl overflow-hidden flex flex-col focus:outline-none z-50"
      >
        {/* Dropdown Header */}
        <div className="p-4 pb-3 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/30">
          <div>
            <h4 className="text-xs font-black text-neutral-900 dark:text-white uppercase tracking-wider">
              Notifications
            </h4>
            {unreadCount > 0 && (
              <span className="text-[10px] text-red-500 font-bold block mt-0.5">
                {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                markAllAsRead()
              }}
              className="text-[10px] font-bold text-neutral-500 hover:text-neutral-950 dark:hover:text-white flex items-center gap-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 px-2 py-1 rounded transition-colors"
              title="Mark all as read"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        <DropdownMenuSeparator className="bg-neutral-150 dark:bg-neutral-800 m-0" />

        {/* Dropdown List Content */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60 custom-scrollbar">
          {visibleNotifications.length > 0 ? (
            visibleNotifications.map((item) => {
              const { icon: Icon, color } = getTypeConfig(item.type)
              return (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "p-3.5 flex gap-3 cursor-pointer transition-all relative group text-left outline-none select-none focus:bg-neutral-50 dark:focus:bg-neutral-900/50",
                    !item.read && "bg-blue-50/20 dark:bg-blue-950/5 hover:bg-blue-50/30 dark:hover:bg-blue-950/10"
                  )}
                >
                  {/* Type Icon */}
                  <div
                    className={cn(
                      "h-8.5 w-8.5 rounded-xl flex items-center justify-center border shrink-0 mt-0.5 transition-transform group-hover:scale-105",
                      color
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 justify-between">
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                        {item.title}
                      </span>
                      {!item.read && (
                        <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed mt-0.5 line-clamp-2">
                      {item.message}
                    </p>
                    <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-semibold block mt-1.5">
                      {item.timestamp}
                    </span>
                  </div>
                </DropdownMenuItem>
              )
            })
          ) : (
            <div className="py-12 text-center flex flex-col items-center justify-center space-y-2.5">
              <div className="h-10 w-10 rounded-full bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center text-neutral-400 dark:text-neutral-600 border border-neutral-150 dark:border-neutral-800">
                <Bell className="h-5 w-5" />
              </div>
              <div className="space-y-0.5 px-4">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">No notifications</span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-semibold block leading-normal">
                  You are all caught up!
                </span>
              </div>
            </div>
          )}
        </div>

        <DropdownMenuSeparator className="bg-neutral-150 dark:bg-neutral-800 m-0" />

        {/* Dropdown Footer */}
        <div className="p-3 bg-neutral-50/50 dark:bg-neutral-900/30 flex justify-between items-center text-xs font-bold">
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors"
          >
            All Notifications
          </Link>
          <Link
            to="/activity"
            onClick={() => setOpen(false)}
            className="text-blue-600 dark:text-blue-400 hover:underline transition-colors"
          >
            View all activity
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
export default NotificationBell
