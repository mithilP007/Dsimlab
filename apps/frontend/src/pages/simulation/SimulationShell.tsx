import { Outlet, NavLink } from "react-router"
import { TimeControlBar } from "./TimeControlBar"
import { cn } from "@/lib/utils"

export function SimulationShell() {
  const tabs = [
    { name: "SEO Optimization", path: "/simulation/seo" },
    { name: "Google Ads CPC", path: "/simulation/google-ads" },
    { name: "Meta Social Ads", path: "/simulation/meta-ads" },
    { name: "Simulation Results", path: "/simulation/results" },
  ]

  return (
    <div className="space-y-6 text-left -mt-6">
      {/* Simulation Time Control Bar */}
      <TimeControlBar />

      {/* Tab Navigation links */}
      <div className="border-b border-neutral-200 bg-white px-6 pt-3 -mx-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                cn(
                  "pb-3 text-xs uppercase tracking-wider font-extrabold border-b-2 px-0.5 transition-all",
                  isActive
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-neutral-400 hover:text-neutral-600"
                )
              }
            >
              {tab.name}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Dynamic Simulation Route Outlet */}
      <div className="p-1">
        <Outlet />
      </div>
    </div>
  )
}

export default SimulationShell
