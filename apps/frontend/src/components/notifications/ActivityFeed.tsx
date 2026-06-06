import { useState } from "react"
import { useNotificationStore, type ActivityItem } from "@/stores/notificationStore"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Clock,
  Search,
  Trophy,
  Terminal,
  Cpu,
  MessageSquare,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function ActivityFeed() {
  const { activityFeed } = useNotificationStore()
  
  // State: Filter and Search
  const [activeFilter, setActiveFilter] = useState<"all" | "class" | "my" | "achievements">("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Helpers: Avatar Initials and Colors
  const getInitials = (name: string) => {
    const cleanName = name.trim()
    const parts = cleanName.split(" ")
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return cleanName.substring(0, 2).toUpperCase()
  }

  const getAvatarColor = (name: string) => {
    const lowerName = name.toLowerCase()
    if (lowerName === "you") {
      return "bg-neutral-900 text-white border-neutral-950 dark:bg-white dark:text-neutral-950 dark:border-white"
    }
    if (lowerName.includes("instructor") || lowerName.includes("dr.")) {
      return "bg-emerald-600 text-white border-emerald-650"
    }
    
    // Hash name to choose a color
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const colors = [
      "bg-indigo-600 text-white border-indigo-600",
      "bg-purple-600 text-white border-purple-600",
      "bg-pink-600 text-white border-pink-600",
      "bg-blue-600 text-white border-blue-600",
      "bg-violet-600 text-white border-violet-600",
      "bg-teal-600 text-white border-teal-600",
      "bg-amber-600 text-white border-amber-600",
    ]
    return colors[Math.abs(hash) % colors.length]
  }

  // Helper: Get Icon and Theme color by Activity Type
  const getTypeConfig = (type: ActivityItem["type"]) => {
    switch (type) {
      case "simulation":
        return {
          icon: Terminal,
          color: "text-blue-600 bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30",
        }
      case "leaderboard":
        return {
          icon: Trophy,
          color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-100 dark:border-yellow-900/30",
        }
      case "social":
        return {
          icon: MessageSquare,
          color: "text-purple-600 bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30",
        }
      default: // system
        return {
          icon: Cpu,
          color: "text-slate-600 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800",
        }
    }
  }

  // Date classification helper
  const getDateGroup = (timestamp: string) => {
    if (timestamp === "Just now" || timestamp.includes("min") || timestamp.includes("hour")) {
      return "Today"
    }
    if (timestamp.includes("1 day") || timestamp.includes("Yesterday")) {
      return "Yesterday"
    }
    return "This Week"
  }

  // Filter & Search Logic
  const filteredFeed = activityFeed.filter((item) => {
    // 1. Category Filter
    if (activeFilter === "my" && item.actor.toLowerCase() !== "you") {
      return false
    }
    if (activeFilter === "class" && item.type !== "simulation" && item.type !== "social") {
      return false
    }
    if (activeFilter === "achievements") {
      const isAchievement =
        item.type === "leaderboard" ||
        item.target.toLowerCase().includes("badge") ||
        item.target.toLowerCase().includes("achievement") ||
        item.target.toLowerCase().includes("certificate")
      if (!isAchievement) return false
    }

    // 2. Search Text Query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase()
      const matchActor = item.actor.toLowerCase().includes(query)
      const matchAction = item.action.toLowerCase().includes(query)
      const matchTarget = item.target.toLowerCase().includes(query)
      if (!matchActor && !matchAction && !matchTarget) return false
    }

    return true
  })

  // Group items by Date Group
  const groupedActivities: Record<string, ActivityItem[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
  }

  filteredFeed.forEach((item) => {
    const group = getDateGroup(item.timestamp)
    groupedActivities[group].push(item)
  })

  // Check if any grouping has elements
  const hasActivities = Object.values(groupedActivities).some((arr) => arr.length > 0)

  return (
    <div className="container mx-auto max-w-4xl space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 text-neutral-900 dark:text-white shrink-0" />
            Activity Timeline
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time feed of simulations, student milestones, leaderboard changes, and classroom updates.
          </p>
        </div>
      </div>

      {/* Main Container Card */}
      <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm rounded-2xl overflow-hidden">
        {/* Filter bar and search */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-850 bg-neutral-50/50 dark:bg-neutral-900/30 flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Tabs Filter */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl w-full md:w-auto">
            {[
              { id: "all", label: "All Timeline" },
              { id: "class", label: "My Class" },
              { id: "my", label: "My Activity" },
              { id: "achievements", label: "Achievements" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as typeof activeFilter)}
                className={cn(
                  "flex-1 md:flex-none text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap",
                  activeFilter === tab.id
                    ? "bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search actor, actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 h-9 text-xs font-bold border-neutral-200 dark:border-neutral-850 bg-white dark:bg-neutral-900 placeholder:text-neutral-400 rounded-xl"
            />
          </div>
        </div>

        {/* Timeline Content */}
        <CardContent className="p-6">
          {hasActivities ? (
            <div className="space-y-8 relative">
              {/* Central vertical connecting line */}
              <div className="absolute left-[21px] top-6 bottom-6 w-[2px] bg-neutral-150 dark:bg-neutral-800" />

              {/* Group loops */}
              {(["Today", "Yesterday", "This Week"] as const).map((groupName) => {
                const groupItems = groupedActivities[groupName]
                if (groupItems.length === 0) return null

                return (
                  <div key={groupName} className="space-y-5">
                    {/* Date header */}
                    <div className="relative z-10 flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 bg-white dark:bg-neutral-950 px-2 py-0.5 border border-neutral-200/50 dark:border-neutral-800 rounded-md shadow-2xs">
                        {groupName}
                      </span>
                      <Separator className="flex-1 bg-neutral-100 dark:bg-neutral-850" />
                    </div>

                    {/* Timeline items list */}
                    <div className="space-y-6">
                      {groupItems.map((item) => {
                        const { icon: TypeIcon, color: typeStyle } = getTypeConfig(item.type)
                        const initials = getInitials(item.actor)
                        const avatarClass = getAvatarColor(item.actor)

                        return (
                          <div
                            key={item.id}
                            className="relative flex items-start gap-4 text-left group animate-in fade-in duration-200"
                          >
                            {/* Initials Avatar */}
                            <div
                              className={cn(
                                "relative z-10 h-11 w-11 rounded-full flex items-center justify-center border-2 font-black text-xs shrink-0 select-none shadow-sm transition-transform duration-200 group-hover:scale-105",
                                avatarClass
                              )}
                              title={item.actor}
                            >
                              {initials}
                              
                              {/* Sub-badge indicating type icon */}
                              <div
                                className={cn(
                                  "absolute -bottom-1 -right-1 h-5.5 w-5.5 rounded-full flex items-center justify-center border shadow-xs",
                                  typeStyle
                                )}
                              >
                                <TypeIcon className="h-3 w-3" />
                              </div>
                            </div>

                            {/* Feed Body */}
                            <div className="flex-1 min-w-0 pt-0.5 bg-neutral-50/40 dark:bg-neutral-900/10 hover:bg-neutral-50/80 dark:hover:bg-neutral-900/20 border border-neutral-100/50 dark:border-neutral-850/30 p-3.5 rounded-2xl transition-colors">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                                  <span className="font-extrabold text-neutral-900 dark:text-white mr-1 text-sm">
                                    {item.actor}
                                  </span>
                                  {item.action}{" "}
                                  <span className="font-extrabold text-neutral-850 dark:text-neutral-200 text-sm">
                                    {item.target}
                                  </span>
                                </p>
                                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold shrink-0 flex items-center gap-1 mt-1 sm:mt-0">
                                  <Clock className="h-3 w-3" />
                                  {item.timestamp}
                                </span>
                              </div>

                              {/* Footer tag details */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] font-extrabold px-2 py-0.5 border-neutral-200 dark:border-neutral-800 uppercase rounded-lg",
                                    item.type === "simulation" && "text-blue-600 bg-blue-50/20 dark:text-blue-400 dark:bg-blue-950/20",
                                    item.type === "leaderboard" && "text-yellow-600 bg-yellow-50/20 dark:text-yellow-400 dark:bg-yellow-950/20",
                                    item.type === "social" && "text-purple-600 bg-purple-50/20 dark:text-purple-400 dark:bg-purple-950/20",
                                    item.type === "system" && "text-slate-600 bg-slate-50/20 dark:text-slate-400 dark:bg-slate-800"
                                  )}
                                >
                                  {item.type}
                                </Badge>
                                
                                {item.type === "leaderboard" && (
                                  <span className="flex items-center gap-1 text-[10px] text-yellow-600 font-black">
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    Rank Change
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center text-neutral-400 dark:text-neutral-600 border border-neutral-150 dark:border-neutral-800 shadow-2xs">
                <Clock className="h-8 w-8" />
              </div>
              <div className="space-y-1 px-4 max-w-sm">
                <span className="text-base font-bold text-neutral-850 dark:text-neutral-200 block">
                  No activities found
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium block leading-relaxed">
                  {searchQuery !== "" || activeFilter !== "all"
                    ? "Try altering your filters or search keywords to fetch matching timeline activity updates."
                    : "No student simulation activities log has been captured yet."}
                </span>
              </div>
              {(searchQuery !== "" || activeFilter !== "all") && (
                <Button
                  onClick={() => {
                    setActiveFilter("all")
                    setSearchQuery("")
                  }}
                  className="mt-2 text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 cursor-pointer rounded-xl px-4 py-2 hover:opacity-90 transition-opacity"
                >
                  Clear search filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
export default ActivityFeed
