import { useState } from "react"
import { useLeaderboardStore } from "@/stores/leaderboardStore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Award, Flame, TrendingUp, Sparkles, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export function AchievementWall() {
  const { recentAchievements } = useLeaderboardStore()
  const [visibleCount, setVisibleCount] = useState(5)

  // Configure icons and colors based on achievement type
  const typeConfigs = {
    milestone: {
      icon: Award,
      colorClass: "bg-amber-500 text-white",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-100",
      label: "Score Milestone",
    },
    streak: {
      icon: Flame,
      colorClass: "bg-orange-500 text-white",
      badgeClass: "bg-orange-50 text-orange-700 border-orange-100",
      label: "Streak",
    },
    perfect: {
      icon: Sparkles,
      colorClass: "bg-emerald-500 text-white",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
      label: "Perfect Round",
    },
    comeback: {
      icon: TrendingUp,
      colorClass: "bg-purple-500 text-white",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-100",
      label: "Comeback",
    },
    first: {
      icon: Trophy,
      colorClass: "bg-blue-500 text-white",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-100",
      label: "First Place",
    },
  }

  // Generate initials for avatars
  const getInitials = (name: string) => {
    if (name === "You") return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }

  const getAvatarBg = (name: string) => {
    if (name === "You") return "bg-slate-900 text-white font-black"
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const colors = [
      "bg-violet-100 text-violet-750",
      "bg-sky-100 text-sky-750",
      "bg-emerald-100 text-emerald-750",
      "bg-amber-100 text-amber-750",
      "bg-rose-100 text-rose-750",
      "bg-indigo-100 text-indigo-750",
    ]
    return colors[hash % colors.length]
  }

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 5, recentAchievements.length))
  }

  const achievementsToShow = recentAchievements.slice(0, visibleCount)
  const hasMore = visibleCount < recentAchievements.length

  return (
    <Card className="border-neutral-200 bg-white shadow-2xs rounded-2xl overflow-hidden flex flex-col h-full text-left">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
          <Award className="h-4.5 w-4.5 text-neutral-900" />
          Recent Achievements
        </CardTitle>
        <CardDescription className="text-xs text-neutral-500">
          Simulation milestones unlocked by students in this cohort.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-5 pt-0 flex-1 flex flex-col justify-between gap-4">
        {/* Scrollable feed - Max 5 items comfortably fits in ~380px before scroll */}
        <div className="max-h-[380px] overflow-y-auto pr-1.5 space-y-3.5 scrollbar-thin scrollbar-thumb-neutral-200 scrollbar-track-transparent">
          {achievementsToShow.map((item, index) => {
            const config = typeConfigs[item.type] || typeConfigs.milestone
            const Icon = config.icon

            return (
              <div
                key={`${item.studentName}-${index}`}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border border-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 hover:shadow-2xs transition-all duration-200"
                )}
              >
                {/* Left: Small Student Avatar */}
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border border-neutral-100 shadow-3xs",
                    getAvatarBg(item.studentName)
                  )}
                >
                  {getInitials(item.studentName)}
                </div>

                {/* Center Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                    <span className="text-xs font-bold text-neutral-800 truncate">
                      {item.studentName}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-bold text-[8px] uppercase tracking-wide px-1.5 py-0 rounded-full",
                        config.badgeClass
                      )}
                    >
                      {config.label}
                    </Badge>
                  </div>

                  <span className="text-xs font-black text-neutral-950 block">
                    {item.achievement}
                  </span>

                  <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex items-center gap-1 text-[9px] font-bold text-neutral-400">
                    <Clock className="h-2.5 w-2.5" />
                    {item.timeAgo}
                  </div>
                </div>

                {/* Right: Achievement Icon inside colored circle */}
                <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0 shadow-3xs border border-white", config.colorClass)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
            )
          })}
        </div>

        {/* Load More Button */}
        {hasMore ? (
          <Button
            onClick={handleLoadMore}
            variant="outline"
            className="w-full h-9 font-bold text-xs shadow-3xs border-neutral-250 hover:bg-neutral-50 bg-white"
          >
            Load More Achievements
          </Button>
        ) : (
          <div className="text-center text-[10px] font-bold text-neutral-400 pt-2 border-t border-neutral-100">
            All achievements loaded
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AchievementWall
