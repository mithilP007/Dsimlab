import { useState, useEffect } from "react"
import { useCertificationStore } from "@/stores/certificationStore"
import { useInstructorPortalStore } from "@/stores/instructorPortalStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { ShieldCheck, Award, Trophy, Users, Save, Sliders, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

export function CriteriaConfig() {
  const { criteriaConfig, updateCriteria } = useCertificationStore()
  const { students } = useInstructorPortalStore()

  // Form State
  const [completionEnabled, setCompletionEnabled] = useState(true)
  const [distinctionEnabled, setDistinctionEnabled] = useState(true)
  const [excellenceEnabled, setExcellenceEnabled] = useState(true)

  const [minScoreCompletion, setMinScoreCompletion] = useState(60)
  const [minScoreDistinction, setMinScoreDistinction] = useState(75)
  const [minScoreExcellence, setMinScoreExcellence] = useState(90)

  const [minRankDistinction, setMinRankDistinction] = useState(10)
  const [minRankExcellence, setMinRankExcellence] = useState(3)

  // Sync state with store on mount
  useEffect(() => {
    setCompletionEnabled(criteriaConfig.completionEnabled)
    setDistinctionEnabled(criteriaConfig.distinctionEnabled)
    setExcellenceEnabled(criteriaConfig.excellenceEnabled)
    setMinScoreCompletion(criteriaConfig.minScoreCompletion)
    setMinScoreDistinction(criteriaConfig.minScoreDistinction)
    setMinScoreExcellence(criteriaConfig.minScoreExcellence)
    setMinRankDistinction(criteriaConfig.minRankDistinction)
    setMinRankExcellence(criteriaConfig.minRankExcellence)
  }, [criteriaConfig])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()

    if (minScoreCompletion < 0 || minScoreCompletion > 100) {
      toast.error("Completion minimum score must be between 0 and 100")
      return
    }
    if (minScoreDistinction < minScoreCompletion || minScoreDistinction > 100) {
      toast.error("Distinction minimum score must exceed completion and be under 100")
      return
    }
    if (minScoreExcellence < minScoreDistinction || minScoreExcellence > 100) {
      toast.error("Excellence minimum score must exceed distinction and be under 100")
      return
    }
    if (minRankDistinction <= 0 || minRankExcellence <= 0) {
      toast.error("Min ranks must be at least 1")
      return
    }

    updateCriteria({
      completionEnabled,
      distinctionEnabled,
      excellenceEnabled,
      minScoreCompletion,
      minScoreDistinction,
      minScoreExcellence,
      minRankDistinction,
      minRankExcellence,
    })

    toast.success("Successfully updated simulation certificate criteria parameters!")
  }

  // ─── Live Preview Calculator ───
  // Calculate ranks dynamically for all 25 students inside the instructor store cohort
  const sortedCohort = [...students].sort((a, b) => b.overallScore - a.overallScore)
  const cohortWithRanks = sortedCohort.map((s, index) => ({
    ...s,
    rank: index + 1,
  }))

  const qualifiesForCompletion = cohortWithRanks.filter(
    (s) => completionEnabled && s.overallScore >= minScoreCompletion
  ).length

  const qualifiesForDistinction = cohortWithRanks.filter(
    (s) =>
      distinctionEnabled &&
      s.overallScore >= minScoreDistinction &&
      s.rank <= minRankDistinction
  ).length

  const qualifiesForExcellence = cohortWithRanks.filter(
    (s) =>
      excellenceEnabled &&
      s.overallScore >= minScoreExcellence &&
      s.rank <= minRankExcellence
  ).length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left items-start animate-in fade-in duration-200">
      {/* LEFT: Config Form (7 columns) */}
      <div className="lg:col-span-7">
        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
              <Sliders className="h-4.5 w-4.5 text-neutral-900" />
              Standards config editor
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Tune simulation metrics required to authorize student certificates.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <form onSubmit={handleSave} className="space-y-6">
              {/* Tier 1: Completion */}
              <div className="space-y-3.5 p-3 border border-neutral-100 rounded-xl bg-neutral-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-black text-neutral-900">Completion Tier</span>
                  </div>
                  <Switch checked={completionEnabled} onCheckedChange={setCompletionEnabled} />
                </div>

                {completionEnabled && (
                  <div className="space-y-1 pl-9">
                    <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                      Min Overall Score (%)
                    </label>
                    <Input
                      type="number"
                      value={minScoreCompletion}
                      onChange={(e) => setMinScoreCompletion(parseInt(e.target.value) || 0)}
                      className="h-9 text-xs border-neutral-250 bg-white font-bold max-w-[120px]"
                    />
                  </div>
                )}
              </div>

              {/* Tier 2: Distinction */}
              <div className="space-y-3.5 p-3 border border-neutral-100 rounded-xl bg-neutral-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Award className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-black text-neutral-900">Distinction Tier</span>
                  </div>
                  <Switch checked={distinctionEnabled} onCheckedChange={setDistinctionEnabled} />
                </div>

                {distinctionEnabled && (
                  <div className="grid grid-cols-2 gap-4 pl-9">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                        Min Overall Score (%)
                      </label>
                      <Input
                        type="number"
                        value={minScoreDistinction}
                        onChange={(e) => setMinScoreDistinction(parseInt(e.target.value) || 0)}
                        className="h-9 text-xs border-neutral-250 bg-white font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                        Max Standings Rank
                      </label>
                      <Input
                        type="number"
                        value={minRankDistinction}
                        onChange={(e) => setMinRankDistinction(parseInt(e.target.value) || 0)}
                        className="h-9 text-xs border-neutral-250 bg-white font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Tier 3: Excellence */}
              <div className="space-y-3.5 p-3 border border-neutral-100 rounded-xl bg-neutral-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Trophy className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-black text-neutral-900">Excellence Tier</span>
                  </div>
                  <Switch checked={excellenceEnabled} onCheckedChange={setExcellenceEnabled} />
                </div>

                {excellenceEnabled && (
                  <div className="grid grid-cols-2 gap-4 pl-9">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                        Min Overall Score (%)
                      </label>
                      <Input
                        type="number"
                        value={minScoreExcellence}
                        onChange={(e) => setMinScoreExcellence(parseInt(e.target.value) || 0)}
                        className="h-9 text-xs border-neutral-250 bg-white font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-neutral-450 uppercase tracking-wider block">
                        Max Standings Rank
                      </label>
                      <Input
                        type="number"
                        value={minRankExcellence}
                        onChange={(e) => setMinRankExcellence(parseInt(e.target.value) || 0)}
                        className="h-9 text-xs border-neutral-250 bg-white font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-9 font-black bg-slate-900 text-white hover:bg-slate-950 text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Save className="h-4 w-4" />
                Save Criteria Thresholds
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT: Live Preview (5 columns) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="flex items-center gap-1.5">
          <Users className="h-4.5 w-4.5 text-neutral-850" />
          <h2 className="text-xs font-black text-neutral-450 uppercase tracking-widest block">
            Eligibility Preview
          </h2>
        </div>

        <Card className="border border-neutral-200 bg-white shadow-2xs rounded-2xl p-5 space-y-5">
          <div className="space-y-1 text-xs">
            <span className="font-black text-neutral-900 block leading-tight">Roster Forecast</span>
            <p className="text-neutral-500 font-semibold leading-relaxed">
              Live preview illustrating how many of the 25 current class students would qualify under current settings.
            </p>
          </div>

          <div className="space-y-4 pt-1">
            {/* Completion preview */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-neutral-700">Qualify for Completion</span>
                <span className="text-neutral-900 font-extrabold">{qualifiesForCompletion} / 25</span>
              </div>
              <Progress value={(qualifiesForCompletion / 25) * 100} className="h-1.5 bg-neutral-100 text-emerald-500" />
            </div>

            {/* Distinction preview */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-neutral-700">Qualify for Distinction</span>
                <span className="text-neutral-900 font-extrabold">{qualifiesForDistinction} / 25</span>
              </div>
              <Progress value={(qualifiesForDistinction / 25) * 100} className="h-1.5 bg-neutral-100 text-blue-500" />
            </div>

            {/* Excellence preview */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-neutral-700">Qualify for Excellence</span>
                <span className="text-neutral-900 font-extrabold">{qualifiesForExcellence} / 25</span>
              </div>
              <Progress value={(qualifiesForExcellence / 25) * 100} className="h-1.5 bg-neutral-100 text-amber-500" />
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-neutral-50 border border-neutral-150 rounded-xl p-3 text-[10px] font-bold text-neutral-400">
            <AlertTriangle className="h-4 w-4 text-neutral-450 shrink-0 pt-0.5" />
            <p className="leading-relaxed">
              Updates occur dynamically inside student dashboards. Threshold increases immediately update status markers inside student score sheets.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default CriteriaConfig
