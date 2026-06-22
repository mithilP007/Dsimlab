import { Link, useLocation } from "react-router"
import { cn } from "@/lib/utils"
import { LayoutDashboard, GraduationCap, Search, Target, Share2, Play, Award, Activity } from "lucide-react"
import { useAuthStore } from "@/stores/authStore"

export function MobileNav() {
  const location = useLocation()
  const { user } = useAuthStore()
  const userRole = user?.role || "individual"

  const bottomNavItems = userRole === "instructor"
    ? [
        { name: "Portal", href: "/instructor", icon: GraduationCap },
        { name: "SEO", href: "/instructor/simulation/seo", icon: Search },
        { name: "Google Ads", href: "/instructor/simulation/google-ads", icon: Target },
        { name: "Meta Ads", href: "/instructor/simulation/meta-ads", icon: Share2 }
      ]
    : [
        { name: "Dashboard", href: "/", icon: LayoutDashboard },
        { name: "Simulation", href: "/simulation", icon: Play },
        { name: "Campaign", href: "/campaign", icon: Activity },
        { name: "Leaderboard", href: "/leaderboard", icon: Award }
      ]

  const isActive = (href: string) => {
    if (href === "/") {
      return location.pathname === "/"
    }
    return location.pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 h-16 flex items-center justify-around px-4 lg:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.03)] pb-safe">
      {bottomNavItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)

        return (
          <Link
            key={item.href}
            to={item.href}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 group transition-colors"
          >
            <Icon
              className={cn(
                "h-5 w-5 transition-transform group-active:scale-95 duration-150",
                active ? "text-neutral-900 stroke-[2.5px]" : "text-neutral-400 group-hover:text-neutral-600"
              )}
            />
            <span
              className={cn(
                "text-[10px] font-semibold mt-1 transition-colors duration-150",
                active ? "text-neutral-900 font-bold" : "text-neutral-400 group-hover:text-neutral-600"
              )}
            >
              {item.name}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
export default MobileNav
