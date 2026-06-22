import { useState, useEffect } from "react"
import { useCertificationStore } from "@/stores/certificationStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import api from "@/lib/api"
import {
  Award, ShieldCheck, Download, ExternalLink,
  Trophy, CheckCircle, Lock, Sparkles, Activity, Cpu, Copy
} from "lucide-react"
import { Link } from "react-router"

export function CertificatePortal() {
  const { activeSimulation, fetchLatestState } = useSimulationStore()
  const {
    certificates,
    issueCertificate,
    fetchUserCertificates,
    downloadCertificate
  } = useCertificationStore()

  // Local States
  const [eligibility, setEligibility] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState(0)
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const steps = [
    "Analyzing campaign decisions...",
    "Calculating consistency metrics...",
    "Generating cryptographic signature...",
    "Finalizing landscape PDF layout..."
  ]

  const loadData = async () => {
    try {
      await fetchLatestState()
      await fetchUserCertificates()
      
      // Fetch eligibility
      const res = await api.post<any>('/api/certificates/check-eligibility')
      if (res.data?.success) {
        setEligibility(res.data)
      }

      // Fetch achievements
      const noticeRes = await api.get<{ success: boolean; notifications: any[] }>('/api/v1/notifications')
      if (noticeRes.data?.success) {
        const notices = noticeRes.data.notifications || []
        const unlocked = notices
          .filter((n) => n.type === 'achievement' && n.title.startsWith('Achievement Unlocked:'))
          .map((n) => n.title.replace('Achievement Unlocked: ', ''))
        setUnlockedAchievements(Array.from(new Set(unlocked)))
      }
    } catch (err) {
      console.error("Failed to load certificate portal:", err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const triggerGenerationFlow = async () => {
    if (!eligibility?.eligible) return
    setIsGenerating(true)
    setGenerationStep(0)

    const interval = setInterval(() => {
      setGenerationStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 1200)

    try {
      // Simulate steps then generate
      await new Promise((resolve) => setTimeout(resolve, 5000))
      
      const cert = await issueCertificate(
        activeSimulation?.userId || "Student",
        eligibility.band,
        activeSimulation?.id || ""
      )
      
      if (cert) {
        toast.success(`Success! Your ${eligibility.band} Certificate is generated.`)
        await loadData()
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.error || "Certificate generation failed.")
    } finally {
      clearInterval(interval)
      setIsGenerating(false)
    }
  }

  const handleCopyLink = (verId: string) => {
    const link = `${window.location.origin}/verify/${verId}`
    navigator.clipboard.writeText(link)
    setCopiedId(verId)
    toast.success("Verification link copied!")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const compositeScore = eligibility?.compositeScore || activeSimulation?.score || 0
  const strategicConsistency = eligibility?.strategicConsistency || 0

  const levels = [
    { name: "Bronze", minScore: 60, minConsistency: 0, color: "text-amber-700 bg-amber-50 border-amber-200", badgeColor: "bg-amber-600", desc: "Qualified Simulator Practitioner" },
    { name: "Silver", minScore: 70, minConsistency: 0, color: "text-slate-500 bg-slate-50 border-slate-200", badgeColor: "bg-slate-500", desc: "Proficient Simulator Strategist" },
    { name: "Gold", minScore: 80, minConsistency: 0, color: "text-amber-500 bg-amber-50 border-amber-250", badgeColor: "bg-amber-500", desc: "Advanced Marketing Specialist" },
    { name: "Platinum", minScore: 90, minConsistency: 0, color: "text-indigo-600 bg-indigo-50 border-indigo-200", badgeColor: "bg-indigo-600", desc: "Elite Simulator Specialist" }
  ]

  const activeLevel = levels.slice().reverse().find(lvl => 
    compositeScore >= lvl.minScore && strategicConsistency >= lvl.minConsistency
  )

  const isClaimed = activeSimulation?.status === 'COMPLETED'

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-950/20 bg-gradient-to-r from-indigo-950 via-neutral-900 to-slate-900 p-6 md:p-8 text-white shadow-xl text-left">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl animate-pulse" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase text-indigo-300 tracking-widest bg-indigo-900/50 border border-indigo-700/50 px-2.5 py-1 rounded-full w-max block">
              SimLab Credentials Console
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">Certification Portal</h1>
            <p className="text-xs sm:text-sm text-neutral-300 font-medium max-w-xl">
              Earn, view, and verify cryptographic pass certificates verifying your strategic optimization and search bidding expertise.
            </p>
          </div>
          
          <div className="shrink-0 self-start md:self-auto w-full md:w-auto bg-white/5 backdrop-blur border border-white/10 p-5 rounded-2xl flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${activeLevel ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-300' : 'bg-neutral-800 border border-neutral-700 text-neutral-400'}`}>
              <Award className="h-6.5 w-6.5" />
            </div>
            <div className="text-left">
              <span className="text-[9px] font-bold text-neutral-450 uppercase block">Current Level</span>
              <span className="text-lg font-black text-white mt-0.5 block">
                {activeLevel ? `${activeLevel.name} Level` : "No Level Achieved"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Grid: Status & Requirements / Generation Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Eligibility and Levels */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Eligibility Panel */}
          <Card className="border-neutral-200/80 shadow-md bg-white text-left overflow-hidden">
            <CardHeader className="border-b border-neutral-100 bg-neutral-50/20 py-5">
              <CardTitle className="text-base font-black text-neutral-850 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                Certification Status & Checklist
              </CardTitle>
              <CardDescription className="text-xs font-semibold">
                Your performance criteria must align with the baseline thresholds below.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* Requirements Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50/50 flex items-start gap-3">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs mt-0.5 ${compositeScore >= 70 ? 'bg-emerald-50 text-emerald-600 font-bold' : 'bg-neutral-100 text-neutral-400'}`}>
                    {compositeScore >= 70 ? <CheckCircle className="h-4.5 w-4.5" /> : <Lock className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider block">Composite Score</span>
                    <span className="text-sm font-bold text-neutral-800">{compositeScore.toFixed(1)}% / 70%</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50/50 flex items-start gap-3">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs mt-0.5 ${strategicConsistency >= 65 ? 'bg-emerald-50 text-emerald-600 font-bold' : 'bg-neutral-100 text-neutral-400'}`}>
                    {strategicConsistency >= 65 ? <CheckCircle className="h-4.5 w-4.5" /> : <Lock className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider block">Consistency Index</span>
                    <span className="text-sm font-bold text-neutral-800">{strategicConsistency.toFixed(1)}% / 65%</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50/50 flex items-start gap-3">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs mt-0.5 ${activeSimulation?.status === 'SCORE_LOCKED' || activeSimulation?.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 font-bold' : 'bg-neutral-100 text-neutral-400'}`}>
                    {activeSimulation?.status === 'SCORE_LOCKED' || activeSimulation?.status === 'COMPLETED' ? <CheckCircle className="h-4.5 w-4.5" /> : <Lock className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider block">Round Submissions</span>
                    <span className="text-sm font-bold text-neutral-800">Completed (Score Locked)</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50/50 flex items-start gap-3">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs mt-0.5 ${!eligibility?.reasons?.includes('College mode requires instructor approval.') || isClaimed ? 'bg-emerald-50 text-emerald-600 font-bold' : 'bg-neutral-100 text-neutral-400'}`}>
                    {(!eligibility?.reasons?.includes('College mode requires instructor approval.') || isClaimed) ? <CheckCircle className="h-4.5 w-4.5" /> : <Lock className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider block">Instructor Approval</span>
                    <span className="text-sm font-bold text-neutral-800">
                      {(!eligibility?.reasons?.includes('College mode requires instructor approval.') || isClaimed) ? "Approved" : "Pending Approval"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Eligibility Indicator Banner */}
              {eligibility?.eligible ? (
                <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-emerald-900">Eligibility Status: Qualified</h4>
                    <p className="text-[11px] text-emerald-700 font-semibold leading-relaxed">
                      Congratulations! You have satisfied all certification performance requirements at the **{eligibility.band}** level.
                    </p>
                  </div>
                  {!isGenerating && !isClaimed && (
                    <Button
                      onClick={triggerGenerationFlow}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-9 px-4 rounded-xl shadow shrink-0 self-start sm:self-auto flex items-center gap-1.5"
                    >
                      <Sparkles className="h-4 w-4 text-emerald-200" />
                      Generate Certificate
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-4 border border-rose-200 bg-rose-50 rounded-2xl">
                  <h4 className="text-sm font-black text-rose-900">Eligibility Status: Not Yet Eligible</h4>
                  <p className="text-[11px] text-rose-700 font-semibold leading-relaxed mt-1">
                    You have not qualified for a certificate yet. Reasons:
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-rose-600 font-bold mt-1.5 space-y-1">
                    {eligibility?.reasons?.map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    )) || <li>Loading eligibility parameters...</li>}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Level Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {levels.map((lvl) => {
              const isScoreMet = compositeScore >= lvl.minScore
              const isConsistencyMet = strategicConsistency >= lvl.minConsistency
              const isEligible = isScoreMet && isConsistencyMet

              return (
                <Card 
                  key={lvl.name} 
                  className={`border-neutral-200 p-5 space-y-4 flex flex-col justify-between transition-all hover:shadow-md relative ${isEligible ? "bg-indigo-50/5 border-indigo-200 shadow-sm" : "bg-white opacity-80"}`}
                >
                  <div className="space-y-1 text-left">
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-full text-white ${lvl.badgeColor}`}>
                        {lvl.name}
                      </span>
                      {isEligible ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black">Unlocked</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-neutral-50 text-neutral-400 border-neutral-200 text-[9px] font-bold">Locked</Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-400 font-bold block pt-1">{lvl.desc}</span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-neutral-100 text-xs font-semibold text-neutral-600 text-left">
                    <div className="flex justify-between">
                      <span>Score Req</span>
                      <span className={isScoreMet ? "text-emerald-600 font-bold" : "text-neutral-400"}>
                        {lvl.minScore}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Consistency Score</span>
                      <span className="text-neutral-800 font-bold">
                        {strategicConsistency.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

        </div>

        {/* Right 1 Col: Certificate History & Generation Status */}
        <div className="space-y-8">
          
          {/* Generation Progress Panel (only active when isGenerating is true) */}
          {isGenerating && (
            <Card className="border border-indigo-200 bg-indigo-50/15 p-6 space-y-4 text-left shadow-lg animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-3">
                <Cpu className="h-5 w-5 text-indigo-600 animate-spin" />
                <h4 className="text-sm font-black text-indigo-900">Assembling Cryptographic Certificate</h4>
              </div>
              <p className="text-xs text-neutral-600 font-semibold">
                Step {generationStep + 1} of {steps.length}: {steps[generationStep]}
              </p>
              <Progress value={((generationStep + 1) / steps.length) * 100} className="h-2 rounded-full bg-indigo-100 [&>div]:bg-indigo-600 w-full" />
            </Card>
          )}

          {/* Professional Credentials Card History */}
          <Card className="border-neutral-200/80 shadow-md bg-white text-left overflow-hidden">
            <CardHeader className="border-b border-neutral-100 bg-neutral-50/20 py-5">
              <CardTitle className="text-base font-black text-neutral-850 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-indigo-600" />
                Earned Credentials
              </CardTitle>
              <CardDescription className="text-xs font-semibold">
                Download or verify your active digital marketing pass certificates.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              
              {certificates.length === 0 ? (
                <div className="py-8 text-center text-neutral-400 font-bold text-xs space-y-2">
                  <Award className="h-10 w-10 mx-auto text-neutral-200" />
                  <p>No certificates issued yet.</p>
                  <p className="text-[10px] text-neutral-400 font-normal">Finish your cohort rounds and claim your credentials above.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {certificates.map((cert) => (
                    <div key={cert.id} className="p-4 border border-indigo-150 rounded-2xl bg-gradient-to-br from-indigo-50/5 to-white space-y-3 shadow-inner hover:shadow transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-indigo-600 block">Digital Marketing Simulator</span>
                          <h4 className="text-xs font-black text-neutral-850">{cert.band} Certification</h4>
                          <span className="text-[10px] text-neutral-400 font-semibold block">{cert.verificationId}</span>
                        </div>
                        <Badge className="bg-indigo-600 text-white font-bold text-[9px]">{cert.band}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-[10px] font-semibold text-neutral-500 py-1.5 border-y border-dashed border-neutral-150">
                        <div>
                          <span className="text-[8px] text-neutral-400 block uppercase">Issue Date</span>
                          <span className="text-neutral-850 font-bold">{new Date(cert.issueDate).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-neutral-400 block uppercase">Score Achieved</span>
                          <span className="text-neutral-850 font-bold">{cert.compositeScore}%</span>
                        </div>
                      </div>

                      {/* Action Links */}
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          to={`/certificate/view/${cert.verificationId || cert.id}`}
                          className="flex items-center justify-center gap-1 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 text-xs font-black h-8 rounded-xl transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View
                        </Link>
                        <button
                          onClick={() => downloadCertificate(cert.verificationId || cert.id)}
                          className="flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black h-8 rounded-xl shadow transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 pt-1.5">
                        <button
                          onClick={() => handleCopyLink(cert.verificationId || "")}
                          className="flex items-center justify-center gap-1 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 text-[10px] font-bold h-7 rounded-lg transition-colors"
                        >
                          <Copy className="h-3 w-3" />
                          {copiedId === cert.verificationId ? "Copied Link!" : "Copy Verification Link"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>

      {/* 3. Skill Growth and Core Competencies Visual Panel */}
      <Card className="border-neutral-200/80 shadow-md bg-white text-left p-6">
        <h3 className="text-sm font-black text-neutral-900 border-b border-neutral-100 pb-3 flex items-center gap-2">
          <Activity className="h-4.5 w-4.5 text-indigo-500" />
          Core Competency Growth Journey
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-neutral-750 uppercase tracking-wide">Acquired Technical Skills</h4>
            
            {/* Skill 1 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-neutral-600">
                <span>Search Engine Optimization (SEO) Density</span>
                <span>{compositeScore >= 90 ? '95%' : compositeScore >= 80 ? '85%' : '70%'}</span>
              </div>
              <Progress value={compositeScore >= 90 ? 95 : compositeScore >= 80 ? 85 : 70} className="h-2 rounded-full bg-neutral-100 [&>div]:bg-emerald-600" />
            </div>

            {/* Skill 2 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-neutral-600">
                <span>PPC Bid Optimization & CPC Ceilings</span>
                <span>{compositeScore >= 90 ? '90%' : compositeScore >= 80 ? '80%' : '65%'}</span>
              </div>
              <Progress value={compositeScore >= 90 ? 90 : compositeScore >= 80 ? 80 : 65} className="h-2 rounded-full bg-neutral-100 [&>div]:bg-indigo-600" />
            </div>

            {/* Skill 3 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-neutral-600">
                <span>Paid Social Creative Targeting</span>
                <span>{compositeScore >= 90 ? '92%' : compositeScore >= 80 ? '82%' : '60%'}</span>
              </div>
              <Progress value={compositeScore >= 90 ? 92 : compositeScore >= 80 ? 82 : 60} className="h-2 rounded-full bg-neutral-100 [&>div]:bg-pink-600" />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black text-neutral-750 uppercase tracking-wide">Recent Unlocked Milestones</h4>
            <div className="divide-y divide-neutral-100">
              {unlockedAchievements.slice(0, 3).map((ach, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between text-xs font-semibold text-neutral-600">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span className="font-bold text-neutral-800">{ach}</span>
                  </div>
                  <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[9px] font-bold">Earned</Badge>
                </div>
              ))}
              {unlockedAchievements.length === 0 && (
                <div className="py-6 text-center text-neutral-400 font-semibold text-xs leading-relaxed">
                  Start executing campaigns and submit rounds to unlock digital milestone badges.
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

    </div>
  )
}
export default CertificatePortal;
