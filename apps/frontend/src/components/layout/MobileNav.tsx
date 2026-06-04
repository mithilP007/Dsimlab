import { Link, useLocation } from "react-router"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Megaphone, Newspaper, BarChart3 } from "lucide-react"

export function MobileNav() {
  const location = useLocation()

  const bottomNavItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Campaigns", href: "/campaigns", icon: Megaphone },
    { name: "Events", href: "/events", icon: Newspaper },
    { name: "Reports", href: "/reports", icon: BarChart3 },
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
