import { Link, useLocation } from "react-router"
import { cn } from "@/lib/utils"
import { useUiStore } from "@/stores/uiStore"
import { useAuthStore } from "@/stores/authStore"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  LayoutDashboard,
  Search,
  Target,
  Share2,
  Newspaper,
  BarChart3,
  Award,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Shield,
  Users,
  School,
  Settings,
  Bell,
  Clock,
} from "lucide-react"

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavGroup {
  groupName: string
  items: NavItem[]
  role?: string
}

const navConfig: NavGroup[] = [
  {
    groupName: "Dashboard",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard }
    ]
  },
  {
    groupName: "Simulation",
    items: [
      { name: "SEO", href: "/simulation/seo", icon: Search },
      { name: "Google Ads", href: "/simulation/google-ads", icon: Target },
      { name: "Meta Ads", href: "/simulation/meta-ads", icon: Share2 }
    ]
  },
  {
    groupName: "Market Events",
    items: [
      { name: "Market Events", href: "/events", icon: Newspaper }
    ]
  },
  {
    groupName: "Reports",
    items: [
      { name: "Reports", href: "/reports", icon: BarChart3 },
      { name: "Leaderboard", href: "/leaderboard", icon: Trophy }
    ]
  },
  {
    groupName: "Certification",
    items: [
      { name: "Certification", href: "/certificates", icon: Award }
    ]
  },
  {
    groupName: "Updates",
    items: [
      { name: "Notifications", href: "/notifications", icon: Bell },
      { name: "Activity Feed", href: "/activity", icon: Clock }
    ]
  },
  {
    groupName: "Instructor Panel",
    role: "instructor",
    items: [
      { name: "Instructor Panel", href: "/instructor", icon: GraduationCap }
    ]
  },
  {
    groupName: "Admin Panel",
    role: "admin",
    items: [
      { name: "Admin Dashboard", href: "/admin", icon: Shield },
      { name: "User Management", href: "/admin/users", icon: Users },
      { name: "Class Overview", href: "/admin/classes", icon: School },
      { name: "System Settings", href: "/admin/settings", icon: Settings }
    ]
  }
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation()
  const { sidebarCollapsed, toggleSidebar } = useUiStore()
  const { user } = useAuthStore()

  const userRole = user?.role || "individual"

  const isActive = (href: string) => {
    if (href === "/") {
      return location.pathname === "/"
    }
    return location.pathname.startsWith(href)
  }

  // Filter groups by role
  const visibleGroups = navConfig.filter(group => {
    if (!group.role) return true
    return group.role === userRole
  })

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "h-screen bg-white border-r border-neutral-200 flex flex-col transition-all duration-300 shrink-0 sticky top-0 left-0 z-40",
          sidebarCollapsed ? "w-16" : "w-64",
          className
        )}
      >
        {/* Brand logo */}
        <div className="h-16 px-4 border-b border-neutral-100 flex items-center gap-2.5 overflow-hidden">
          <div className="h-9 w-9 rounded-lg bg-neutral-900 flex items-center justify-center text-white font-black text-lg shrink-0">
            S
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col animate-in fade-in duration-200">
              <span className="font-bold text-neutral-900 tracking-tight block">SimpLab</span>
              <span className="text-xs text-neutral-500 font-medium block -mt-0.5">Marketing Platform</span>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-6 px-3 space-y-6 overflow-y-auto">
          {visibleGroups.map((group) => (
            <div key={group.groupName} className="space-y-1.5">
              {!sidebarCollapsed && (
                <h3 className="px-3 text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
                  {group.groupName}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)

                  const itemLink = (
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 group relative",
                        active
                          ? "bg-neutral-900 text-white shadow-sm"
                          : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                          active ? "text-white" : "text-neutral-500 group-hover:text-neutral-900"
                        )}
                      />
                      {!sidebarCollapsed && (
                        <span className="truncate">{item.name}</span>
                      )}
                    </Link>
                  )

                  if (sidebarCollapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          {itemLink}
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {item.name}
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return <div key={item.href}>{itemLink}</div>
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse Toggle Footer */}
        <div className="p-3 border-t border-neutral-100 flex justify-end">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 focus:outline-none transition-colors border border-neutral-200/50"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
export default Sidebar
