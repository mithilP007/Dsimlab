import { useState, useEffect } from "react"
import { useSimulationStore } from "@/stores/simulationStore"
import { useResultsStore } from "@/stores/resultsStore"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import api from "@/lib/api"
import { toast } from "sonner"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts"
import {
  Award, Activity, CheckCircle, 
  Lock, Check, FileText, ChevronDown, ChevronUp, AlertCircle
} from "lucide-react"

export function ProgressDashboardPage() {
  const { activeSimulation, fetchLatestState } = useSimulationStore()
  const { fetchResults, breakdowns, allMetrics, snapshots } = useResultsStore()

  // Local States
  const [loading, setLoading] = useState(true)
  const [eligibility, setEligibility] = useState<any>(null)
  const [claiming, setClaiming] = useState(false)
  const [expandedRound, setExpandedRound] = useState<number | null>(null)
  const [achievements, setAchievements] = useState<string[]>([])
  const [activeChartTab, setActiveChartTab] = useState<"scores" | "financials" | "traffic">("scores")

  const loadProgressData = async () => {
    setLoading(true)
    try {
      // 1. Fetch simulation details
      const sim = await fetchLatestState()
      if (sim) {
        // 2. Fetch history metrics, breakdowns, snapshots
        await fetchResults(sim.id)

        // 3. Fetch eligibility checks
        const eligRes = await api.get<any>('/api/v1/certificate/eligibility')
        if (eligRes.data?.success) {
          setEligibility(eligRes.data)
        }

        // 4. Fetch notifications to extract unlocked achievements
        const noticeRes = await api.get<{ success: boolean; notifications: any[] }>('/api/v1/notifications')
        if (noticeRes.data?.success) {
          const notices = noticeRes.data.notifications || []
          const unlocked = notices
            .filter((n) => n.type === 'achievement' && n.title.startsWith('Achievement Unlocked:'))
            .map((n) => n.title.replace('Achievement Unlocked: ', ''))
          setAchievements(Array.from(new Set(unlocked)))
        }
      }
    } catch (err) {
      console.error("Failed to load progress dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProgressData()
  }, [])

  const handleClaimCertificate = async () => {
    if (!eligibility?.eligible) return
    setClaiming(true)
    try {
      const res = await api.post<{ success: boolean; certificate: any }>('/api/v1/certificate/generate')
      if (res.data?.success) {
        toast.success("Certificate generated successfully!")
        await loadProgressData()
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.message || "Failed to generate certificate.")
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Activity className="h-10 w-10 text-indigo-600 animate-spin" />
        <span className="text-sm text-neutral-500 font-bold">Loading simulation progress...</span>
      </div>
    )
  }

  if (!activeSimulation) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-white border border-neutral-200 rounded-2xl text-center space-y-4 shadow-sm">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-black text-neutral-900">Simulation Not Found</h2>
        <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
          Please join a classroom or start a sandbox simulation from the home console to view progress tracking.
        </p>
      </div>
    )
  }

  // Completed rounds computation
  const roundsCompleted = breakdowns.length
  const currentRound = activeSimulation.currentRound
  const maxRounds = activeSimulation.allowedPlatforms ? 10 : 10 // scenario max rounds defaults to 10
  const remainingRounds = Math.max(0, maxRounds - roundsCompleted)
  const completionPct = Math.round((roundsCompleted / maxRounds) * 100)

  // Certification Levels Progress computation
  const compositeScore = eligibility?.compositeScore || activeSimulation.score || 0
  const strategicConsistency = eligibility?.strategicConsistency || 0

  const certLevels = [
    { level: "Bronze", targetScore: 70, targetConsistency: 65, description: "Qualified Simulator Practitioner" },
    { level: "Silver", targetScore: 80, targetConsistency: 70, description: "Proficient Simulator strategist" },
    { level: "Gold", targetScore: 90, targetConsistency: 80, description: "Advanced Digital Marketing Specialist" },
    { level: "Platinum", targetScore: 95, targetConsistency: 88, description: "Elite Simulator Strategist" }
  ]

  // Achievements master list
  const ALL_ACHIEVEMENTS = [
    { title: "Top Performer", desc: "Climb to #1 on the cohort standings leaderboard.", badge: "🏆" },
    { title: "SEO Expert", desc: "Earn a round SEO Optimization score of 90% or above.", badge: "🔍" },
    { title: "Ads Strategist", desc: "Earn an Ads platform score of 90% or above.", badge: "🎯" },
    { title: "ROI Master", desc: "Gain an ROI Efficiency rating of 85% or above.", badge: "💰" },
    { title: "Fast Learner", desc: "Increase your overall score by 15+ points in a single round.", badge: "⚡" },
    { title: "Consistency Champion", desc: "Maintain overall strategic decisions consistency of 85% or above.", badge: "🛡️" },
    { title: "Adaptive Marketer", desc: "Earn an adaptability rating of 85% or above in volatile rounds.", badge: "🔮" }
  ]

  // Prepare Recharts chart data
  const chartData = breakdowns.map((b) => {
    // Sum financials for the round
    const roundMetrics = allMetrics.filter((m) => m.round === b.round)
    const revenue = roundMetrics.reduce((sum, m) => sum + (m.revenue || 0), 0)
    const clicks = roundMetrics.reduce((sum, m) => sum + (m.organicClicks || 0) + (m.googleClicks || 0) + (m.metaClicks || 0), 0)
    
    return {
      round: `R${b.round}`,
      SEO: b.seoScore,
      GoogleAds: b.googleAdsScore,
      MetaAds: b.metaAdsScore,
      Composite: b.compositeIndex,
      Revenue: Math.round(revenue),
      Clicks: clicks
    }
  })

  // Prepare detailed round drilldowns
  const roundDetailsList = breakdowns.map((b) => {
    const roundMetrics = allMetrics.filter((m) => m.round === b.round)
    const roundSpend = roundMetrics.reduce((sum, m) => sum + (m.googleCost || 0) + (m.metaCost || 0), 0)
    const roundRev = roundMetrics.reduce((sum, m) => sum + (m.revenue || 0), 0)
    const roundClicks = roundMetrics.reduce((sum, m) => sum + (m.organicClicks || 0) + (m.googleClicks || 0) + (m.metaClicks || 0), 0)
    const roundConvs = roundMetrics.reduce((sum, m) => sum + (m.organicConversions || 0) + (m.googleConversions || 0) + (m.metaConversions || 0), 0)
    const roundCtr = roundMetrics.length > 0 ? (roundMetrics.reduce((sum, m) => sum + (m.organicCTR || 0) + (m.googleClicks / (m.googleImpressions || 1)) + (m.metaClicks / (m.metaImpressions || 1)), 0) / roundMetrics.length) * 100 : 0
    const roi = roundSpend > 0 ? ((roundRev - roundSpend) / roundSpend) * 100 : 0

    // Retrieve decisions from snapshot
    const snap = snapshots.find((s) => s.round === b.round)
    let decisionSummary = "No decision record."
    let detailedDecisions = null
    if (snap?.data) {
      try {
        const snapData = JSON.parse(snap.data)
        detailedDecisions = snapData.decision || snapData
        const keywords = detailedDecisions.seoTargetKeywords ? JSON.parse(detailedDecisions.seoTargetKeywords) : []
        const googleCamps = detailedDecisions.googleCampaigns ? JSON.parse(detailedDecisions.googleCampaigns) : []
        const metaCamps = detailedDecisions.metaCampaigns ? JSON.parse(detailedDecisions.metaCampaigns) : []
        decisionSummary = `SEO Keywords: ${keywords.slice(0, 3).join(', ') || 'none'} • Google Ads: $${googleCamps[0]?.budget || 0} budget • Meta Ads: $${metaCamps[0]?.budget || 0} budget`
      } catch (e) {
        console.error(e)
      }
    }

    return {
      round: b.round,
      score: b.compositeIndex,
      revenue: roundRev,
      spend: roundSpend,
      traffic: roundClicks,
      conversions: roundConvs,
      ctr: parseFloat(roundCtr.toFixed(2)),
      roi: parseFloat(roi.toFixed(1)),
      decisionSummary,
      detailedDecisions
    }
  })



  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Header Overview Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-r from-indigo-950 via-neutral-900 to-indigo-900 p-6 md:p-8 text-white shadow-lg text-left">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-indigo-300 tracking-widest bg-indigo-900/50 border border-indigo-700/50 px-2.5 py-1 rounded-full w-max block">
              Student Progress Tracker
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Progress Dashboard</h1>
            <p className="text-xs sm:text-sm text-neutral-300 font-medium">
              Review completed rounds, track skill certification levels, and audit performance analytics growth.
            </p>
          </div>
          <Card className="bg-white/5 border-white/10 text-white p-4 rounded-xl shrink-0 self-start md:self-auto w-full md:w-auto grid grid-cols-3 md:flex gap-4 sm:gap-6 md:gap-8 justify-around text-center">
            <div>
              <span className="text-[9px] font-bold text-neutral-450 uppercase block">Round</span>
              <span className="text-lg font-black text-indigo-300 mt-0.5 block">{currentRound}/{maxRounds}</span>
            </div>
            <div className="border-l border-white/10 pl-4 sm:pl-6 md:pl-8">
              <span className="text-[9px] font-bold text-neutral-450 uppercase block">Completed</span>
              <span className="text-lg font-black text-emerald-400 mt-0.5 block">{roundsCompleted}</span>
            </div>
            <div className="border-l border-white/10 pl-4 sm:pl-6 md:pl-8">
              <span className="text-[9px] font-bold text-neutral-450 uppercase block">Score</span>
              <span className="text-lg font-black text-amber-400 mt-0.5 block">{Math.round(compositeScore)}%</span>
            </div>
          </Card>
        </div>
      </div>

      {/* 2. Completion Status Card */}
      <Card className="border-neutral-200/80 shadow-md bg-white p-6 text-left">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Simulation Completion Status</span>
            <h3 className="text-base font-black text-neutral-900">
              {completionPct}% Complete <span className="text-neutral-500 font-semibold">({roundsCompleted} rounds finished, {remainingRounds} rounds remaining)</span>
            </h3>
          </div>
          <Progress value={completionPct} className="w-full sm:w-80 h-3 bg-neutral-100 [&>div]:bg-indigo-600 rounded-full" />
        </div>
      </Card>

      {/* 3. Certification levels tracker */}
      <Card className="border-neutral-200/80 shadow-md bg-white text-left overflow-hidden">
        <CardHeader className="border-b border-neutral-100 bg-white py-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg font-black text-neutral-900">Certification Progress Tracker</CardTitle>
              <CardDescription className="text-xs font-semibold mt-0.5">
                Earn professional digital marketing simulator pass certificates as your overall parameters improve.
              </CardDescription>
            </div>
            {eligibility?.eligible && (
              <Button
                onClick={handleClaimCertificate}
                disabled={claiming || activeSimulation.status === 'COMPLETED'}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs h-10 px-4 rounded-xl shrink-0 self-start sm:self-auto flex items-center gap-1.5 shadow"
              >
                {activeSimulation.status === 'COMPLETED' ? (
                  <>
                    <Check className="h-4 w-4" />
                    Claimed Certificate
                  </>
                ) : (
                  <>
                    <Award className="h-4 w-4 fill-white" />
                    Claim Certificate
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* Certificate Download Button if already claimed */}
          {activeSimulation.status === 'COMPLETED' && (
            <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-xl text-left flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in fade-in duration-300">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-extrabold text-emerald-900">Certificate Claimed & Locked</h4>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-0.5 leading-relaxed">
                    You have successfully completed this digital marketing simulation! Download your cryptographic pass certificate now.
                  </p>
                </div>
              </div>
              <a 
                href={`/api/v1/certificate/download/${activeSimulation.id}`} 
                download
                className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-9 px-4 rounded-xl shrink-0 transition-colors shadow"
              >
                <FileText className="mr-1.5 h-4 w-4" />
                Download PDF
              </a>
            </div>
          )}

          {/* Certification Threshold Progress Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {certLevels.map((lvl) => {
              const isScoreMet = compositeScore >= lvl.targetScore
              const isConsistencyMet = strategicConsistency >= lvl.targetConsistency
              const isLvlEligible = isScoreMet && isConsistencyMet

              let statusBadge = (
                <Badge variant="outline" className="bg-neutral-50 text-neutral-400 border-neutral-200 font-bold text-[9px]">
                  Locked
                </Badge>
              )
              if (isLvlEligible) {
                statusBadge = (
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-[9px]">
                    Eligible
                  </Badge>
                )
              }

              const scorePct = Math.min(100, Math.round((compositeScore / lvl.targetScore) * 100))
              const consistencyPct = Math.min(100, Math.round((strategicConsistency / lvl.targetConsistency) * 100))

              return (
                <Card key={lvl.level} className={`border-neutral-200 p-5 space-y-4 flex flex-col justify-between ${isLvlEligible ? "bg-indigo-50/10 border-indigo-200" : "bg-white"}`}>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-black text-neutral-850">{lvl.level} Level</h4>
                      {statusBadge}
                    </div>
                    <span className="text-[10px] text-neutral-400 font-bold block">{lvl.description}</span>
                  </div>

                  <div className="space-y-3 pt-2">
                    {/* Score criteria */}
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold">
                        <span className="text-neutral-500">Composite Score</span>
                        <span className={isScoreMet ? "text-emerald-600" : "text-neutral-400"}>
                          {Math.round(compositeScore)} / {lvl.targetScore}%
                        </span>
                      </div>
                      <Progress value={scorePct} className={`h-2 rounded-full bg-neutral-100 ${isScoreMet ? "[&>div]:bg-emerald-600" : "[&>div]:bg-neutral-350"}`} />
                    </div>

                    {/* Consistency criteria */}
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold">
                        <span className="text-neutral-500">Consistency</span>
                        <span className={isConsistencyMet ? "text-emerald-600" : "text-neutral-400"}>
                          {Math.round(strategicConsistency)} / {lvl.targetConsistency}%
                        </span>
                      </div>
                      <Progress value={consistencyPct} className={`h-2 rounded-full bg-neutral-100 ${isConsistencyMet ? "[&>div]:bg-emerald-600" : "[&>div]:bg-neutral-350"}`} />
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Eligibility Criteria checklist */}
          <div className="p-5 border border-neutral-100 bg-neutral-50/50 rounded-xl space-y-3.5">
            <h4 className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
              <CheckCircle className="h-4.5 w-4.5 text-indigo-500" />
              Certification Requirements Checklist
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-neutral-600">
              <div className="flex items-center gap-2">
                {roundsCompleted >= maxRounds ? (
                  <Check className="h-4 w-4 text-emerald-600 stroke-[3px]" />
                ) : (
                  <Lock className="h-4 w-4 text-neutral-400" />
                )}
                <span>Rounds: {roundsCompleted}/{maxRounds} completed</span>
              </div>
              <div className="flex items-center gap-2">
                {compositeScore >= 70 ? (
                  <Check className="h-4 w-4 text-emerald-600 stroke-[3px]" />
                ) : (
                  <Lock className="h-4 w-4 text-neutral-400" />
                )}
                <span>Composite score &ge; 70%</span>
              </div>
              <div className="flex items-center gap-2">
                {strategicConsistency >= 65 ? (
                  <Check className="h-4 w-4 text-emerald-600 stroke-[3px]" />
                ) : (
                  <Lock className="h-4 w-4 text-neutral-400" />
                )}
                <span>Consistency &ge; 65%</span>
              </div>
              <div className="flex items-center gap-2">
                {(!eligibility?.reasons?.includes('College mode requires instructor approval.') || activeSimulation.status === 'COMPLETED') ? (
                  <Check className="h-4 w-4 text-emerald-600 stroke-[3px]" />
                ) : (
                  <Lock className="h-4 w-4 text-neutral-400" />
                )}
                <span>Instructor approved (College)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Graphical Evolution Trends Recharts Section */}
      <Card className="border-neutral-200/80 shadow-md bg-white text-left overflow-hidden">
        <CardHeader className="border-b border-neutral-100 bg-white py-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <CardTitle className="text-lg font-black text-neutral-900">Performance Evolution</CardTitle>
            <CardDescription className="text-xs font-medium">Visual growth tracking across completed rounds.</CardDescription>
          </div>
          
          <div className="flex bg-neutral-150 p-1 rounded-xl shrink-0 self-start sm:self-auto gap-0.5 border border-neutral-200/50">
            {[
              { id: "scores", label: "Scores" },
              { id: "financials", label: "Financials" },
              { id: "traffic", label: "Traffic" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveChartTab(tab.id as any)}
                className={`text-xs font-black px-3.5 py-1.5 rounded-lg transition-all duration-200 ${
                  activeChartTab === tab.id
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {chartData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%" minHeight={280}>
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="round" stroke="#888888" fontSize={11} fontWeight={600} />
                  <YAxis stroke="#888888" fontSize={11} fontWeight={600} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e5e5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px' }}
                    labelClassName="font-extrabold text-neutral-900"
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                  
                  {activeChartTab === "scores" && (
                    <>
                      <Line type="monotone" dataKey="Composite" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="SEO" stroke="#10b981" strokeWidth={2.5} strokeDasharray="5 5" />
                      <Line type="monotone" dataKey="GoogleAds" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="5 5" />
                      <Line type="monotone" dataKey="MetaAds" stroke="#ec4899" strokeWidth={2.5} strokeDasharray="5 5" />
                    </>
                  )}
                  {activeChartTab === "financials" && (
                    <Line type="monotone" dataKey="Revenue" name="Revenue ($)" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8 }} />
                  )}
                  {activeChartTab === "traffic" && (
                    <Line type="monotone" dataKey="Clicks" name="Total Clicks" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-neutral-400 font-semibold">
              Complete Round 1 to start tracking growth.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Achievements Showcase Grid */}
      <Card className="border-neutral-200/80 shadow-md bg-white text-left p-6">
        <h3 className="text-sm font-black text-neutral-900 border-b border-neutral-100 pb-3 flex items-center gap-2">
          <Award className="h-4 w-4 text-indigo-500" />
          Unlocked Achievements
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-6">
          {ALL_ACHIEVEMENTS.map((ach) => {
            const isUnlocked = achievements.includes(ach.title)
            return (
              <div 
                key={ach.title} 
                className={`p-4 border rounded-2xl flex items-start gap-3.5 transition-all duration-300 ${
                  isUnlocked 
                    ? "bg-indigo-50/10 border-indigo-200 shadow-sm" 
                    : "bg-neutral-50/50 border-neutral-100 text-neutral-400 opacity-60"
                }`}
              >
                <div className={`h-11 w-11 rounded-full flex items-center justify-center text-lg shrink-0 ${
                  isUnlocked ? "bg-indigo-50 text-indigo-700 shadow" : "bg-neutral-100 text-neutral-300"
                }`}>
                  {ach.badge}
                </div>
                <div className="space-y-1">
                  <h4 className={`text-xs font-black ${isUnlocked ? "text-neutral-850" : "text-neutral-500"}`}>
                    {ach.title}
                  </h4>
                  <p className="text-[10px] leading-relaxed font-semibold">{ach.desc}</p>
                  {isUnlocked && (
                    <span className="text-[9px] font-black text-emerald-600 flex items-center gap-0.5 pt-0.5">
                      <Check className="h-3 w-3 stroke-[3.5px]" />
                      Unlocked
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* 6. Round History Timeline Drill-Down */}
      <Card className="border-neutral-200/80 shadow-md bg-white text-left overflow-hidden">
        <CardHeader className="border-b border-neutral-100 bg-white py-5">
          <CardTitle className="text-lg font-black text-neutral-900">Round History Timeline</CardTitle>
          <CardDescription className="text-xs font-medium">Click on any round row to drill down into keyword targeting, ads configuration, and score analytics details.</CardDescription>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="divide-y divide-neutral-100">
            {roundDetailsList.map((rd) => {
              const isOpen = expandedRound === rd.round
              
              return (
                <div key={rd.round} className={`transition-colors ${isOpen ? "bg-neutral-50/30" : "hover:bg-neutral-50/20"}`}>
                  
                  {/* Summary Bar */}
                  <div 
                    onClick={() => setExpandedRound(isOpen ? null : rd.round)}
                    className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer select-none"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                          Round {rd.round}
                        </span>
                        <span className="text-xs font-black text-neutral-850">Round Score: {rd.score}%</span>
                      </div>
                      <p className="text-[11px] text-neutral-450 font-medium line-clamp-1">
                        {rd.decisionSummary}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 md:gap-8 justify-between w-full sm:w-auto text-xs shrink-0 font-bold text-neutral-500">
                      <div>
                        <span className="text-[9px] text-neutral-400 uppercase block tracking-wider">Revenue</span>
                        <span className="text-neutral-850 font-black mt-0.5 block">${rd.revenue.toLocaleString()}</span>
                      </div>
                      <div className="border-l border-neutral-100 pl-4 sm:pl-6 md:pl-8">
                        <span className="text-[9px] text-neutral-400 uppercase block tracking-wider">ROI</span>
                        <span className={`${rd.roi >= 0 ? "text-emerald-600" : "text-rose-500"} font-black mt-0.5 block`}>{rd.roi}%</span>
                      </div>
                      <div className="border-l border-neutral-100 pl-4 sm:pl-6 md:pl-8">
                        <span className="text-[9px] text-neutral-400 uppercase block tracking-wider">Conversions</span>
                        <span className="text-neutral-850 font-black mt-0.5 block">{rd.conversions}</span>
                      </div>
                      <div className="pl-2">
                        {isOpen ? <ChevronUp className="h-4 w-4 text-neutral-450" /> : <ChevronDown className="h-4 w-4 text-neutral-450" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Drilldown */}
                  {isOpen && (
                    <div className="px-5 pb-6 pt-1 border-t border-dashed border-neutral-200 text-xs text-neutral-600 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
                      
                      {/* SEO Decisions */}
                      <div className="space-y-3 text-left">
                        <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">SEO Organic configuration</h4>
                        <div className="p-3.5 bg-neutral-50 rounded-xl space-y-2.5 font-semibold">
                          <div>
                            <span className="text-[9px] text-neutral-400 block uppercase">Target Keywords</span>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {rd.detailedDecisions?.seoTargetKeywords ? (
                                JSON.parse(rd.detailedDecisions.seoTargetKeywords).map((kw: string, i: number) => (
                                  <Badge key={i} variant="outline" className="bg-white text-[10px] font-bold text-neutral-700">
                                    {kw}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-neutral-400">-</span>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between border-t border-neutral-200/50 pt-2 text-[11px]">
                            <span className="text-neutral-400">Content Quality Score</span>
                            <span className="text-neutral-800 font-extrabold">{rd.detailedDecisions?.seoContentQuality || 5}/10</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-neutral-400">Backlink Budget</span>
                            <span className="text-neutral-800 font-extrabold">${rd.detailedDecisions?.seoBacklinkBudget || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Google Ads Decisions */}
                      <div className="space-y-3 text-left">
                        <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Google Paid Campaigns</h4>
                        <div className="p-3.5 bg-neutral-50 rounded-xl space-y-2.5 font-semibold">
                          {rd.detailedDecisions?.googleCampaigns ? (
                            JSON.parse(rd.detailedDecisions.googleCampaigns).map((c: any, i: number) => (
                              <div key={i} className="space-y-2">
                                <div className="flex justify-between text-[11px] font-black text-neutral-800">
                                  <span>{c.name || 'Search Campaign'}</span>
                                  <span>${c.budget || 0}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-450 border-t border-neutral-200/50 pt-1.5">
                                  <div>
                                    <span className="block">Strategy: {c.biddingStrategy || 'Manual CPC'}</span>
                                    <span className="block">Type: {c.campaignType || 'Search'}</span>
                                  </div>
                                  <div>
                                    <span className="block">Objective: {c.objective || 'Sales'}</span>
                                    <span className="block">Keywords: {c.keywords?.length || 0} loaded</span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-neutral-400">No active campaigns.</span>
                          )}
                        </div>
                      </div>

                      {/* Meta Ads Decisions */}
                      <div className="space-y-3 text-left">
                        <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Meta Social Campaigns</h4>
                        <div className="p-3.5 bg-neutral-50 rounded-xl space-y-2.5 font-semibold">
                          {rd.detailedDecisions?.metaCampaigns ? (
                            JSON.parse(rd.detailedDecisions.metaCampaigns).map((c: any, i: number) => (
                              <div key={i} className="space-y-2">
                                <div className="flex justify-between text-[11px] font-black text-neutral-800">
                                  <span>{c.name || 'Social Campaign'}</span>
                                  <span>${c.budget || 0}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-450 border-t border-neutral-200/50 pt-1.5">
                                  <div>
                                    <span className="block capitalize">Audience: {c.audienceInterest || 'broad'}</span>
                                    <span className="block">Creative relevance: {c.creativeQuality || 8}/10</span>
                                  </div>
                                  <div>
                                    <span className="block capitalize">Placement: {c.placement || 'auto'}</span>
                                    <span className="block capitalize">Objective: {c.objective || 'sales'}</span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-neutral-400">No active campaigns.</span>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )
            })}
            
            {roundDetailsList.length === 0 && (
              <div className="py-8 text-center text-neutral-400 font-bold text-xs">
                No rounds completed yet. Submit decision forms inside simulation channels to advance.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
export default ProgressDashboardPage;
