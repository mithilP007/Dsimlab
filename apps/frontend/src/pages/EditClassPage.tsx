import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router"
import { useInstructorPortalStore } from "@/stores/instructorPortalStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  ArrowLeft,
  GraduationCap,
  Pencil,
  Settings2,
  DollarSign,
  TrendingUp,
  Sliders,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react"

export function EditClassPage() {
  const navigate = useNavigate()
  const { classId } = useParams<{ classId: string }>()
  const { fetchClassWithScenario, updateClassDetails, updateScenarioDetails, fetchClasses } =
    useInstructorPortalStore()

  // Loading / Error
  const [isFetching, setIsFetching] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Raw server data refs needed for save
  const [scenarioId, setScenarioId] = useState<string | null>(null)

  // ── Form State ──────────────────────────────────────────────────────────────
  const [className, setClassName] = useState("")
  const [scenarioName, setScenarioName] = useState("")
  const [scenarioDescription, setScenarioDescription] = useState("")
  const [industry, setIndustry] = useState("Digital Marketing")
  const [maxRounds, setMaxRounds] = useState(10)
  const [budgetPerRound, setBudgetPerRound] = useState(5000)
  const [baselineOrganicTraffic, setBaselineOrganicTraffic] = useState(1000)
  const [targetKPI, setTargetKPI] = useState<"revenue" | "clicks" | "conversions">("revenue")
  const [difficulty, setDifficulty] = useState("medium")

  // ── Load existing data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!classId) return
    setIsFetching(true)
    setFetchError(null)

    fetchClassWithScenario(classId)
      .then((data: any) => {
        if (!data) {
          setFetchError("Classroom not found or you don't have permission to edit it.")
          return
        }
        setClassName(data.name || "")

        const sc = data.scenarioFull || data.scenario || null
        if (sc) {
          setScenarioId(sc.id || null)
          setScenarioName(sc.name || "")
          setScenarioDescription(sc.description || "")
          setIndustry(sc.industry || "Digital Marketing")
          setMaxRounds(sc.maxRounds || 10)
          setBudgetPerRound(sc.budgetPerRound || 5000)
          setBaselineOrganicTraffic(sc.baselineOrganicTraffic ?? 1000)
          setTargetKPI((sc.targetKPI as any) || "revenue")
          setDifficulty(sc.difficulty || "medium")
        }
      })
      .catch(() => setFetchError("Failed to load class data. Please try again."))
      .finally(() => setIsFetching(false))
  }, [classId, fetchClassWithScenario])

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classId) return

    if (!className.trim()) { toast.error("Classroom name is required."); return }
    if (!scenarioName.trim()) { toast.error("Scenario title is required."); return }
    if (!scenarioDescription.trim()) { toast.error("Scenario description is required."); return }
    if (maxRounds <= 0) { toast.error("Simulation rounds must be positive."); return }
    if (budgetPerRound <= 0) { toast.error("Budget per round must be positive."); return }

    setIsLoading(true)
    const toastId = toast.loading("Saving changes…")

    try {
      // Step 1 — Update class name
      await updateClassDetails(classId, { name: className.trim() })

      // Step 2 — Update scenario if we have its ID
      if (scenarioId) {
        await updateScenarioDetails(scenarioId, {
          name: scenarioName.trim(),
          description: scenarioDescription.trim(),
          industry: industry.trim(),
          maxRounds: Number(maxRounds),
          budgetPerRound: Number(budgetPerRound),
          baselineOrganicTraffic: Number(baselineOrganicTraffic),
          targetKPI,
          difficulty,
        })
      }

      await fetchClasses()
      toast.success("Classroom updated successfully!", { id: toastId })
      navigate("/instructor")
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to save changes.",
        { id: toastId }
      )
    } finally {
      setIsLoading(false)
    }
  }

  // ── Render: Loading ─────────────────────────────────────────────────────────
  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-neutral-500">Loading classroom data…</p>
        </div>
      </div>
    )
  }

  // ── Render: Error ───────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="max-w-md w-full border border-rose-200 shadow-lg text-left">
          <CardContent className="p-8 space-y-4">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
            <h2 className="text-lg font-black text-neutral-900">Unable to Load Classroom</h2>
            <p className="text-sm text-neutral-500 font-medium">{fetchError}</p>
            <Button
              onClick={() => navigate("/instructor")}
              className="bg-slate-900 hover:bg-slate-950 text-white text-xs font-black h-10 rounded-xl w-full"
            >
              Return to Instructor Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Render: Edit Form ───────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300">

      {/* Back Header */}
      <div className="flex justify-between items-center">
        <Button
          onClick={() => navigate("/instructor")}
          variant="ghost"
          className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 flex items-center gap-1.5 h-8 p-2"
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Instructor Portal
        </Button>
        <span className="text-xs text-neutral-400 font-semibold">
          Edit Mode — Classroom &amp; Scenario
        </span>
      </div>

      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-gradient-to-r from-neutral-900 via-violet-950 to-neutral-950 p-6 md:p-8 text-white shadow-lg text-left">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative z-10 space-y-2.5">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-violet-400" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-violet-300">
              Classroom Configuration Editor
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Edit Class: <span className="text-violet-300">{className || "Untitled"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl font-medium leading-relaxed">
            Modify the classroom name and update the full scenario configuration — including budget, rounds,
            target KPI, industry context, and difficulty — at any time after creation.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* ── Left Column: Classroom Details + Actions ── */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border border-neutral-200/80 shadow-sm bg-white text-left">
            <CardHeader className="border-b border-neutral-100 p-5">
              <CardTitle className="text-sm font-black text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-violet-600" />
                Classroom Details
              </CardTitle>
              <CardDescription className="text-[11px] font-semibold text-neutral-400">
                Rename this cohort — students see this name when they log in.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">

              {/* Class Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block" htmlFor="editClassName">
                  Classroom Name
                </label>
                <Input
                  id="editClassName"
                  type="text"
                  placeholder="e.g. Marketing Principles Cohort B"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="text-xs border-neutral-200 h-10 font-semibold text-neutral-800 bg-white focus-visible:ring-violet-500"
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Industry */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block" htmlFor="editIndustry">
                  Target Industry Vertical
                </label>
                <Input
                  id="editIndustry"
                  type="text"
                  placeholder="e.g. Apparel E-Commerce, B2B SaaS"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="text-xs border-neutral-200 h-10 font-semibold text-neutral-800 bg-white focus-visible:ring-violet-500"
                  disabled={isLoading}
                />
                <span className="text-[10px] text-neutral-400 block leading-tight">
                  Primary sector context for the campaign scenario.
                </span>
              </div>

            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card className="border border-neutral-200/80 shadow-sm bg-neutral-50/50 p-5 text-left space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Changes Apply Immediately
              </h4>
              <p className="text-[10px] text-neutral-400 font-semibold">
                Scenario updates take effect on the next round cycle. Students already in a round
                will finish it with the previous configuration.
              </p>
            </div>

            {!scenarioId && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] font-semibold text-amber-800 leading-snug">
                  No linked scenario found. Only the classroom name can be updated.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-violet-700 hover:bg-violet-800 text-white text-xs font-black h-11 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving Changes…</>
                ) : (
                  "Save All Changes"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/instructor")}
                disabled={isLoading}
                className="w-full border-neutral-200 text-neutral-600 hover:bg-neutral-100 text-xs font-bold h-10 rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>

        {/* ── Right Column: Scenario Configurator ── */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border border-neutral-200/80 shadow-sm bg-white text-left">
            <CardHeader className="border-b border-neutral-100 p-5">
              <CardTitle className="text-sm font-black text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                <Settings2 className="h-4 w-4 text-violet-600" />
                Scenario Configuration
              </CardTitle>
              <CardDescription className="text-[11px] font-semibold text-neutral-400">
                Adjust any scenario parameter — budget, rounds, KPI objective, and complexity.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-6">

              {/* Scenario Title + Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block" htmlFor="editScenarioName">
                    Scenario Title
                  </label>
                  <Input
                    id="editScenarioName"
                    type="text"
                    placeholder="e.g. EcoFashion Blitz, SaaS Growth Hack"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    className="text-xs border-neutral-200 h-10 font-semibold text-neutral-800 bg-white focus-visible:ring-violet-500"
                    disabled={isLoading || !scenarioId}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block" htmlFor="editDifficulty">
                    Difficulty Level
                  </label>
                  <select
                    id="editDifficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-xs bg-white font-semibold text-neutral-800 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading || !scenarioId}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="medium">Intermediate (Medium)</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Scenario Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block" htmlFor="editScenarioDesc">
                  Campaign Description
                </label>
                <Textarea
                  id="editScenarioDesc"
                  placeholder="Describe the company background, product, target audience, and campaign objectives for students…"
                  value={scenarioDescription}
                  onChange={(e) => setScenarioDescription(e.target.value)}
                  className="text-xs border-neutral-200 min-h-[90px] font-semibold text-neutral-800 bg-white focus-visible:ring-violet-500 disabled:opacity-50"
                  disabled={isLoading || !scenarioId}
                />
              </div>

              {/* Budget, Rounds, Traffic, KPI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-neutral-100">

                {/* Simulation Rounds */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider flex items-center gap-1" htmlFor="editMaxRounds">
                      <Sliders className="h-3 w-3 text-neutral-400" />
                      Simulation Rounds
                    </label>
                    <Badge variant="outline" className="text-[10px] font-bold border-violet-200 text-violet-700 bg-violet-50/20">
                      {maxRounds} Rounds
                    </Badge>
                  </div>
                  <Input
                    id="editMaxRounds"
                    type="number"
                    min="1"
                    max="30"
                    value={maxRounds}
                    onChange={(e) => setMaxRounds(Math.max(1, parseInt(e.target.value) || 1))}
                    className="text-xs border-neutral-200 h-10 font-semibold text-neutral-800 focus-visible:ring-violet-500 disabled:opacity-50"
                    disabled={isLoading || !scenarioId}
                    required
                  />
                  <span className="text-[10px] text-neutral-400 block leading-tight">
                    Total decision cycles — one submission per round per student.
                  </span>
                </div>

                {/* Budget Per Round */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider flex items-center gap-1" htmlFor="editBudget">
                      <DollarSign className="h-3 w-3 text-neutral-400" />
                      Budget Per Round
                    </label>
                    <Badge variant="outline" className="text-[10px] font-bold border-emerald-200 text-emerald-700 bg-emerald-50/20">
                      ${budgetPerRound.toLocaleString()} / Round
                    </Badge>
                  </div>
                  <Input
                    id="editBudget"
                    type="number"
                    min="100"
                    step="50"
                    value={budgetPerRound}
                    onChange={(e) => setBudgetPerRound(Math.max(1, parseInt(e.target.value) || 0))}
                    className="text-xs border-neutral-200 h-10 font-semibold text-neutral-800 focus-visible:ring-violet-500 disabled:opacity-50"
                    disabled={isLoading || !scenarioId}
                    required
                  />
                  <span className="text-[10px] text-neutral-400 block leading-tight">
                    Maximum spend available across SEO, Google Ads, and Meta Ads per round.
                  </span>
                </div>

                {/* Baseline Organic Traffic */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider flex items-center gap-1" htmlFor="editBaseline">
                      <TrendingUp className="h-3 w-3 text-neutral-400" />
                      Baseline Organic Traffic
                    </label>
                    <Badge variant="outline" className="text-[10px] font-bold border-amber-200 text-amber-700 bg-amber-50/20">
                      {baselineOrganicTraffic.toLocaleString()} / Mo
                    </Badge>
                  </div>
                  <Input
                    id="editBaseline"
                    type="number"
                    min="0"
                    step="100"
                    value={baselineOrganicTraffic}
                    onChange={(e) => setBaselineOrganicTraffic(Math.max(0, parseInt(e.target.value) || 0))}
                    className="text-xs border-neutral-200 h-10 font-semibold text-neutral-800 focus-visible:ring-violet-500 disabled:opacity-50"
                    disabled={isLoading || !scenarioId}
                  />
                  <span className="text-[10px] text-neutral-400 block leading-tight">
                    Starting organic search traffic before any SEO or keyword adjustments.
                  </span>
                </div>

                {/* Target KPI */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block" htmlFor="editKPI">
                    Primary Target KPI
                  </label>
                  <select
                    id="editKPI"
                    value={targetKPI}
                    onChange={(e) => setTargetKPI(e.target.value as any)}
                    className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-xs bg-white font-semibold text-neutral-800 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading || !scenarioId}
                  >
                    <option value="revenue">Revenue Generation (Total Sales)</option>
                    <option value="clicks">Click-Through Engagement (Ad Clicks)</option>
                    <option value="conversions">Lead / Order Conversions (Count)</option>
                  </select>
                  <span className="text-[10px] text-neutral-400 block leading-tight">
                    The metric tracked and scored on the student simulation dashboard.
                  </span>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>

      </form>
    </div>
  )
}

export default EditClassPage
