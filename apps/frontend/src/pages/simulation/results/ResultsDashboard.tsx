import { useState, useEffect } from "react"
import { useResultsStore } from "@/stores/resultsStore"
import { useCampaignStore } from "@/stores/campaignStore"
import { useGoogleAdsStore } from "@/stores/googleAdsStore"
import { useMetaAdsStore } from "@/stores/metaAdsStore"
import { ScoreBreakdown } from "./ScoreBreakdown"
import { TrafficAnalytics } from "./TrafficAnalytics"
import { RankingReport } from "./RankingReport"
import { InsightCards } from "./InsightCards"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import {
  Search,
  Target,
  TrendingUp,
  Zap,
  Share2,
  Award,
  Lock,
  ChevronRight,
  Clock,
  Play,
  ArrowUpRight,
  CheckCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function ResultsDashboard() {
  const {
    currentRound,
    totalRounds,
    classRank,
    totalStudents,
    previousRank,
    badges,
    advanceRound,
  } = useResultsStore()

  const seoDecisionsMade = useCampaignStore((s) => s.decisionsMade)
  const googleDecisionsMade = useGoogleAdsStore((s) => s.decisionsMade)
  const metaDecisionsMade = useMetaAdsStore((s) => s.decisionsMade)

  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [activeTab]) // Trigger skeleton loader on tab change to match spec

  // Enable next round when all decisions are saved
  const allDecisionsMade = seoDecisionsMade && googleDecisionsMade && metaDecisionsMade

  const handleAdvanceRound = () => {
    if (!allDecisionsMade) {
      toast.error("Decisions Pending", {
        description: "You must complete and save your decisions in SEO, Google Ads, and Meta Ads first.",
      })
      return
    }
    advanceRound()
    // Reset stores
    useCampaignStore.getState().resetCampaign()
    useGoogleAdsStore.getState().resetCampaign()
    useMetaAdsStore.getState().resetCampaign()

    toast.success(`Successfully advanced to Round ${currentRound + 1}!`, {
      description: "Simulation results recalculating. Prepare your strategies for the new round.",
    })
  }

  const renderBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case "Search":
        return <Search className="h-5 w-5" />
      case "Target":
        return <Target className="h-5 w-5" />
      case "TrendingUp":
        return <TrendingUp className="h-5 w-5" />
      case "Zap":
        return <Zap className="h-5 w-5" />
      case "Share2":
        return <Share2 className="h-5 w-5" />
      case "Award":
      default:
        return <Award className="h-5 w-5" />
    }
  }

  const rankDiff = previousRank - classRank
  const isRankUp = rankDiff >= 0

  return (
    <div className="space-y-6 pb-24 text-left">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 p-5 rounded-2xl border border-neutral-200 bg-neutral-950 text-white">
        <div className="space-y-1">
          <Badge className="bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-800 font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full">
            Simulation Dashboard
          </Badge>
          <h1 className="text-xl font-black">Round {currentRound} Results</h1>
          <p className="text-xs text-neutral-400 font-medium">
            Review campaign data and optimize channels for round {currentRound} of {totalRounds}.
          </p>
        </div>

        {/* Status Metrics Container */}
        <div className="flex flex-wrap items-center gap-6">
          {/* Countdown timer */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0">
              <Clock className="h-4.5 w-4.5 text-neutral-300" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Round End</span>
              <span className="text-xs font-black text-white">Next Round in: 2 days</span>
            </div>
          </div>

          {/* Class rank stats */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-neutral-850 flex items-center justify-center shrink-0">
              <Award className="h-4.5 w-4.5 text-amber-500 fill-amber-500/20" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Class Standings</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white">Rank #{classRank} of {totalStudents}</span>
                <Badge variant="outline" className={cn(
                  "font-bold text-[8px] py-0 px-1 rounded-full",
                  isRankUp ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                )}>
                  {isRankUp ? `+${rankDiff}` : rankDiff}
                </Badge>
              </div>
            </div>
          </div>

          <Button
            onClick={() => setActiveTab("leaderboard")}
            variant="outline"
            className="h-9 font-bold text-xs border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white"
          >
            View Leaderboard
            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-neutral-100 p-1 rounded-xl h-11 border border-neutral-200">
          <TabsTrigger value="overview" className="rounded-lg text-xs font-bold tracking-wide">
            Overview
          </TabsTrigger>
          <TabsTrigger value="traffic" className="rounded-lg text-xs font-bold tracking-wide">
            Traffic
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="rounded-lg text-xs font-bold tracking-wide">
            Rankings
          </TabsTrigger>
          <TabsTrigger value="insights" className="rounded-lg text-xs font-bold tracking-wide">
            Insights
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview" className="mt-0">
            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <Skeleton className="h-[400px] w-full rounded-2xl" />
                <Skeleton className="h-[400px] w-full rounded-2xl" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <ScoreBreakdown />
                <InsightCards />
              </div>
            )}
          </TabsContent>

          <TabsContent value="traffic" className="mt-0">
            {isLoading ? (
              <Skeleton className="h-[500px] w-full rounded-2xl" />
            ) : (
              <TrafficAnalytics />
            )}
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-0">
            {isLoading ? (
              <Skeleton className="h-[450px] w-full rounded-2xl" />
            ) : (
              <RankingReport />
            )}
          </TabsContent>

          <TabsContent value="insights" className="mt-0 space-y-6">
            {isLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-[300px] w-full rounded-2xl" />
                <Skeleton className="h-[200px] w-full rounded-2xl" />
              </div>
            ) : (
              <>
                <InsightCards />

                {/* Badge Gallery */}
                <Card className="border-neutral-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                  <div className="p-5 border-b border-neutral-100">
                    <h2 className="text-base font-black text-neutral-900">Earned Achievement Badges</h2>
                    <p className="text-xs text-neutral-500">
                      Gamified rewards unlocked as your metrics and optimization scores reach simulation milestones.
                    </p>
                  </div>
                  <CardContent className="p-5">
                    <TooltipProvider>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                        {badges.map((b) => (
                          <Tooltip key={b.name}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "flex flex-col items-center justify-center p-4 rounded-xl border border-neutral-200 text-center transition-all cursor-help relative",
                                  b.earned
                                    ? "bg-slate-50 border-neutral-350 opacity-100 shadow-sm hover:scale-[1.02]"
                                    : "bg-neutral-50 border-dashed border-neutral-200 opacity-50"
                                )}
                              >
                                {/* Lock Indicator Overlay */}
                                {!b.earned && (
                                  <div className="absolute top-2 right-2 h-4 w-4 bg-neutral-200 rounded-full flex items-center justify-center border border-neutral-300 shadow-2xs">
                                    <Lock className="h-2.5 w-2.5 text-neutral-500" />
                                  </div>
                                )}

                                <div className={cn(
                                  "h-10 w-10 rounded-full flex items-center justify-center mb-2.5 shadow-2xs",
                                  b.earned ? "bg-slate-900 text-white" : "bg-neutral-200 text-neutral-400"
                                )}>
                                  {renderBadgeIcon(b.icon)}
                                </div>
                                <span className={cn("text-[11px] font-black text-neutral-900", !b.earned && "text-neutral-500")}>
                                  {b.name}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-neutral-900 text-white text-[10px] font-bold py-1.5 px-3 rounded shadow-lg max-w-[180px] text-center">
                              {b.description}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </TooltipProvider>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* Decisions Pending Warning Bar */}
      {!allDecisionsMade && (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-amber-250 bg-amber-50/50 text-amber-800">
          <CheckCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="text-xs">
            <span className="font-bold">Next Round Progression Locked:</span> Decisions are required on all channels. Current status:
            <span className="font-semibold ml-1.5">
              SEO: {seoDecisionsMade ? "Saved ✓" : "Pending ✗"} · Google Ads: {googleDecisionsMade ? "Saved ✓" : "Pending ✗"} · Meta Ads: {metaDecisionsMade ? "Saved ✓" : "Pending ✗"}
            </span>
          </div>
        </div>
      )}

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur-sm shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-white shrink-0",
              allDecisionsMade ? "bg-slate-900 animate-pulse" : "bg-neutral-300"
            )}>
              <Play className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-900">
                {allDecisionsMade ? "All Decisions Locked & Ready" : "Round Decisions Pending"}
              </p>
              <p className="text-[10px] text-neutral-500 font-medium">
                {allDecisionsMade
                  ? "You have saved configuration parameters for all channels. Ready to compute results."
                  : "Save SEO, Google Ads, and Meta Ads controls to unlock round progression."}
              </p>
            </div>
          </div>

          <Button
            onClick={handleAdvanceRound}
            disabled={!allDecisionsMade}
            className={cn(
              "h-10 px-6 font-bold text-xs shrink-0 transition-all flex items-center gap-1.5",
              allDecisionsMade
                ? "bg-slate-900 text-white hover:bg-neutral-700 shadow-sm"
                : "bg-neutral-200 text-neutral-400 cursor-not-allowed border-none shadow-none"
            )}
          >
            Proceed to Next Round
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ResultsDashboard
