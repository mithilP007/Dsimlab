import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Trophy, Award, Medal, ArrowUp, ArrowDown, Flame, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Student } from "@/stores/leaderboardStore"

interface StudentRankCardProps {
  student: Student
  isCurrentUser: boolean
}

export function StudentRankCard({ student, isCurrentUser }: StudentRankCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Rank Styling Helper
  const renderRankEmblem = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="h-8 w-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
            <Trophy className="h-4.5 w-4.5 fill-white/10" />
          </div>
        )
      case 2:
        return (
          <div className="h-8 w-8 rounded-full bg-slate-400 text-white flex items-center justify-center shadow-sm shrink-0">
            <Medal className="h-4.5 w-4.5 fill-white/10" />
          </div>
        )
      case 3:
        return (
          <div className="h-8 w-8 rounded-full bg-amber-700 text-white flex items-center justify-center shadow-sm shrink-0">
            <Award className="h-4.5 w-4.5 fill-white/10" />
          </div>
        )
      default:
        return (
          <span className="text-sm font-black text-neutral-400 w-8 text-center shrink-0">
            #{rank}
          </span>
        )
    }
  }

  // Trend styling
  const renderTrend = (trend: Student["trend"]) => {
    switch (trend) {
      case "up":
        return <ArrowUp className="h-3.5 w-3.5 text-emerald-500" />
      case "down":
        return <ArrowDown className="h-3.5 w-3.5 text-rose-500" />
      case "stable":
      default:
        return <Minus className="h-3.5 w-3.5 text-neutral-400" />
    }
  }

  // Rank change calculation
  const rankDiff = student.previousRank - student.rank
  const renderRankChange = () => {
    if (rankDiff > 0) {
      return (
        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
          <ArrowUp className="h-2.5 w-2.5" />
          +{rankDiff}
        </span>
      )
    }
    if (rankDiff < 0) {
      return (
        <span className="text-[10px] font-bold text-rose-600 flex items-center gap-0.5">
          <ArrowDown className="h-2.5 w-2.5" />
          -{Math.abs(rankDiff)}
        </span>
      )
    }
    return null
  }

  const getAvatarBg = (id: string) => {
    if (id === "current-user") return "bg-slate-900 text-white"
    const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const colors = [
      "bg-violet-100 text-violet-700",
      "bg-sky-100 text-sky-700",
      "bg-emerald-100 text-emerald-700",
      "bg-amber-100 text-amber-700",
      "bg-rose-100 text-rose-700",
      "bg-indigo-100 text-indigo-700",
    ]
    return colors[hash % colors.length]
  }

  return (
    <Card
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "border-neutral-200 bg-white transition-all duration-300 rounded-2xl overflow-hidden shadow-2xs text-left",
        isCurrentUser && "border-l-4 border-l-slate-900 bg-slate-50/20",
        isHovered && "shadow-md -translate-y-0.5 border-neutral-350"
      )}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* LEFT: Rank + Avatar + Name */}
        <div className="flex items-center gap-3.5 min-w-[200px]">
          {renderRankEmblem(student.rank)}

          {/* Profile Initials Avatar */}
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center font-black text-xs shrink-0 border border-neutral-100 shadow-2xs",
            getAvatarBg(student.id)
          )}>
            {student.avatar}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className={cn("text-sm font-bold text-neutral-850", isCurrentUser && "font-black text-neutral-950")}>
                {student.name}
              </span>
              {isCurrentUser && (
                <Badge className="bg-slate-900 text-white font-black text-[8px] uppercase px-1.5 py-0 rounded-full">
                  You
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">
                Round {student.streak >= 3 ? "Streak" : "Active"}
              </span>
              {renderRankChange()}
            </div>
          </div>
        </div>

        {/* CENTER: Score bars & Mini pills */}
        <div className="flex-1 space-y-2.5 max-w-md">
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-neutral-450 uppercase tracking-wide">
              <span>Overall Score</span>
              <span className="font-black text-neutral-900">{student.overallScore}%</span>
            </div>
            <Progress value={student.overallScore} className="h-1.5" />
          </div>

          {/* 3 channel pills */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <Badge variant="outline" className="bg-violet-50/50 text-violet-750 border-violet-150 font-bold text-[9px] px-2 py-0 rounded-full">
              SEO: {student.seoScore}
            </Badge>
            <Badge variant="outline" className="bg-sky-50/50 text-sky-750 border-sky-150 font-bold text-[9px] px-2 py-0 rounded-full">
              Google Ads: {student.googleAdsScore}
            </Badge>
            <Badge variant="outline" className="bg-amber-50/50 text-amber-750 border-amber-150 font-bold text-[9px] px-2 py-0 rounded-full">
              Meta Ads: {student.metaAdsScore}
            </Badge>
          </div>
        </div>

        {/* RIGHT: Streaks + Badges + Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 border-t sm:border-none pt-3 sm:pt-0 border-neutral-100">
          <div className="flex items-center gap-4">
            {/* Trend */}
            <div className="flex flex-col items-center shrink-0">
              <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Trend</span>
              {renderTrend(student.trend)}
            </div>

            {/* Streak flame */}
            {student.streak >= 3 && (
              <div className="flex flex-col items-center shrink-0">
                <span className="text-[8px] font-bold text-neutral-450 uppercase tracking-widest mb-0.5">Streak</span>
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-bold text-[10px] px-1.5 py-0 flex items-center gap-0.5 rounded-full">
                  <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
                  {student.streak}
                </Badge>
              </div>
            )}

            {/* Badges count */}
            <div className="flex flex-col items-center shrink-0">
              <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Badges</span>
              <Badge variant="secondary" className="bg-neutral-100 text-neutral-700 border-neutral-250 font-black text-[9px] px-2 py-0 rounded-full">
                {student.badges}
              </Badge>
            </div>
          </div>

          {/* Action button on hover */}
          <div className="w-24 flex justify-end">
            {isHovered ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-black shadow-2xs border-neutral-250 animate-in fade-in slide-in-from-right-2 duration-200 bg-white"
              >
                View Profile
              </Button>
            ) : (
              <span className="text-[10px] text-neutral-400 font-bold hidden sm:block">
                {student.lastActive}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default StudentRankCard
