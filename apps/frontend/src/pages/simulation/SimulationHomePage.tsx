import { useState, useEffect } from "react"
import { Link } from "react-router"
import { useSimulationStore } from "@/stores/simulationStore"
import { useAuthStore } from "@/stores/authStore"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import { toast } from "sonner"
import { 
  Play, Activity, Award, BookOpen, 
  MapPin, CheckCircle, RefreshCw, ShieldAlert
} from "lucide-react"

export function SimulationHomePage() {
  const { user } = useAuthStore()
  const { fetchLatestState } = useSimulationStore()
  const [loading, setLoading] = useState(true)
  const [fullState, setFullState] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [checkpointSubmitted, setCheckpointSubmitted] = useState(true)
  const [isInitializingPath, setIsInitializingPath] = useState(false)
  const [selectedSimType, setSelectedSimType] = useState<'SEO' | 'GOOGLE_ADS' | 'META_ADS' | 'FULL'>('FULL')

  const loadData = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      // Fetch mapped state in Zustand store
      await fetchLatestState()
      
      // Fetch full state directly for scenario / class information
      const res = await api.get<{ success: boolean; state: any }>('/api/v1/simulation/state')
      if (res.data?.success && res.data.state) {
        const stateData = res.data.state
        setFullState(stateData)
        
        // Gate check for college student checkpoint justification
        const isCollegeStudent = user?.role === "student-college"
        if (isCollegeStudent && stateData.currentRound > 1) {
          const checkRes = await api.get<{ success: boolean; checkpoints: any[] }>(`/api/v1/simulation/checkpoint/${stateData.id}`)
          if (checkRes.data?.success) {
            const hasPrevCheckpoint = checkRes.data.checkpoints.some(
              cp => cp.roundNumber === stateData.currentRound - 1
            )
            setCheckpointSubmitted(hasPrevCheckpoint)
          } else {
            setCheckpointSubmitted(false)
          }
        } else {
          setCheckpointSubmitted(true)
        }
      } else {
        setErrorMsg("Failed to retrieve simulation state details.")
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.response?.data?.message || "No active simulation state initialized yet.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSetupSandbox = async (path: 'beginner' | 'intermediate' | 'advanced') => {
    setIsInitializingPath(true)
    const tid = toast.loading(`Provisioning ${path} ${selectedSimType} sandbox track...`)
    try {
      const res = await api.post('/api/simulations/setup-sandbox', { path, simulationType: selectedSimType })
      if (res.data?.success) {
        toast.success(`Successfully initialized ${path} sandbox track!`, { id: tid })
        await loadData()
      } else {
        toast.error("Failed to provision sandbox track.", { id: tid })
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.error || err.message || "Failed to setup sandbox.", { id: tid })
    } finally {
      setIsInitializingPath(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
        <span className="text-sm text-neutral-500 font-bold">Loading simulation state...</span>
      </div>
    )
  }

  const isIndividualOrStaff = user?.role === "individual" || user?.role === "instructor" || user?.role === "admin";

  if (errorMsg || !fullState) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-8 animate-in fade-in duration-300">
        <div className="text-left space-y-2">
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full w-max block">
            Sandbox Onboarding
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900">
            Welcome to the Digital Marketing Sandbox
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-semibold max-w-2xl">
            Choose your learning track and simulation type to initialize a personal sandbox workspace. In sandbox mode, you can focus on specific digital channels or run the full combined simulation.
          </p>
        </div>

        {isIndividualOrStaff ? (
          <div className="space-y-6">
            {/* Simulation Type Selector */}
            <Card className="p-5 border-neutral-200/80 shadow-sm bg-white text-left space-y-3">
              <span className="text-[10px] font-black text-neutral-405 uppercase tracking-wider block">1. Choose Simulation Type</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                {[
                  { key: 'FULL', label: 'Full Digital Marketing', desc: 'SEO + Google Ads + Meta Ads' },
                  { key: 'SEO', label: 'SEO Simulation', desc: 'Search engine optimization only' },
                  { key: 'GOOGLE_ADS', label: 'Google Ads Simulation', desc: 'Google Search Ads bidding only' },
                  { key: 'META_ADS', label: 'Meta Ads Simulation', desc: 'Meta Paid Social delivery only' },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setSelectedSimType(t.key as any)}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                      selectedSimType === t.key ? "border-indigo-600 bg-indigo-50/25 text-indigo-900 font-extrabold" : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }`}
                  >
                    <span className="text-xs font-black block">{t.label}</span>
                    <span className="text-[9px] text-neutral-400 font-semibold leading-snug mt-1 block">{t.desc}</span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Path Selection Cards */}
            <div className="space-y-2 text-left">
              <span className="text-[10px] font-black text-neutral-405 uppercase tracking-wider block">2. Select Learning Path & Budget Level</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {/* Beginner Card */}
              <Card className="border border-neutral-200/80 shadow-md hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden bg-white">
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-[10px] uppercase">
                      Beginner Path
                    </Badge>
                    <span className="text-xs font-black text-neutral-400">Easy Mode</span>
                  </div>
                  <h3 className="text-base font-black text-neutral-900">SaaS Marketing Basics</h3>
                  <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                    Perfect for beginners. Start with a large budget envelope to explore basic SEO density weights and target CPC bidding.
                  </p>
                  <div className="divide-y divide-neutral-100 text-[11px] pt-2">
                    <div className="py-2 flex justify-between font-semibold">
                      <span className="text-neutral-450">Scenario</span>
                      <span className="text-neutral-800">Global SaaS CRM</span>
                    </div>
                    <div className="py-2 flex justify-between font-semibold">
                      <span className="text-neutral-450">Round Budget</span>
                      <span className="text-emerald-600 font-black">$8,000 / round</span>
                    </div>
                    <div className="py-2 flex justify-between font-semibold">
                      <span className="text-neutral-450">Target KPI</span>
                      <span className="text-neutral-800">Revenue Generation</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-neutral-50/50 border-t border-neutral-100">
                  <Button 
                    onClick={() => handleSetupSandbox('beginner')}
                    disabled={isInitializingPath}
                    className="w-full bg-slate-900 hover:bg-slate-950 text-white font-black text-xs h-10 rounded-xl"
                  >
                    Start Beginner Track
                  </Button>
                </div>
              </Card>

              {/* Intermediate Card */}
              <Card className="border border-indigo-200 shadow-md hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden bg-white relative">
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-bl-lg shadow-sm">
                  Recommended
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <Badge className="bg-indigo-50 text-indigo-850 border border-indigo-200 font-black text-[10px] uppercase">
                      Intermediate Path
                    </Badge>
                    <span className="text-xs font-black text-neutral-455">Medium Mode</span>
                  </div>
                  <h3 className="text-base font-black text-neutral-900">SaaS Strategy Challenge</h3>
                  <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                    The standard platform experience. Manage balanced budgets and competitive ad bidding settings in B2B SaaS space.
                  </p>
                  <div className="divide-y divide-neutral-100 text-[11px] pt-2">
                    <div className="py-2 flex justify-between font-semibold">
                      <span className="text-neutral-450">Scenario</span>
                      <span className="text-neutral-800">Global SaaS CRM</span>
                    </div>
                    <div className="py-2 flex justify-between font-semibold">
                      <span className="text-neutral-450">Round Budget</span>
                      <span className="text-indigo-650 font-black">$5,000 / round</span>
                    </div>
                    <div className="py-2 flex justify-between font-semibold">
                      <span className="text-neutral-450">Target KPI</span>
                      <span className="text-neutral-800">Revenue Generation</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-indigo-50/20 border-t border-indigo-100">
                  <Button 
                    onClick={() => handleSetupSandbox('intermediate')}
                    disabled={isInitializingPath}
                    className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-black text-xs h-10 rounded-xl"
                  >
                    Start Intermediate Track
                  </Button>
                </div>
              </Card>

              {/* Advanced Card */}
              <Card className="border border-neutral-200/80 shadow-md hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden bg-white">
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <Badge className="bg-amber-50 text-amber-850 border border-amber-200 font-black text-[10px] uppercase">
                      Advanced Path
                    </Badge>
                    <span className="text-xs font-black text-neutral-400">Hard Mode</span>
                  </div>
                  <h3 className="text-base font-black text-neutral-900">E-Commerce App Blitz</h3>
                  <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                    A high-volatility retail simulation. Stretch tight budgets to convert visitors and maintain high positive CTR efficiency.
                  </p>
                  <div className="divide-y divide-neutral-100 text-[11px] pt-2">
                    <div className="py-2 flex justify-between font-semibold">
                      <span className="text-neutral-450">Scenario</span>
                      <span className="text-neutral-800">Fashion E-Commerce</span>
                    </div>
                    <div className="py-2 flex justify-between font-semibold">
                      <span className="text-neutral-450">Round Budget</span>
                      <span className="text-amber-700 font-black">$3,500 / round</span>
                    </div>
                    <div className="py-2 flex justify-between font-semibold">
                      <span className="text-neutral-450">Target KPI</span>
                      <span className="text-neutral-800">Conversion Rate</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-neutral-50/50 border-t border-neutral-100">
                  <Button 
                    onClick={() => handleSetupSandbox('advanced')}
                    disabled={isInitializingPath}
                    className="w-full bg-slate-900 hover:bg-slate-950 text-white font-black text-xs h-10 rounded-xl"
                  >
                    Start Advanced Track
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="max-w-md mx-auto p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm text-center space-y-4">
            <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
            <h2 className="text-lg font-black text-neutral-900">Simulation Not Started</h2>
            <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
              {errorMsg || "No active simulation class cohort has been found for your account."}
            </p>
            <div className="text-xs bg-indigo-50 text-indigo-805 p-3.5 rounded-xl border border-indigo-200 font-semibold leading-relaxed">
              Please make sure you have joined a class cohort with your instructor's invite code in the main dashboard.
            </div>
          </Card>
        )}
      </div>
    )
  }

  const allowed = fullState?.class?.scenario?.allowedPlatforms
    ? JSON.parse(fullState.class.scenario.allowedPlatforms)
    : ["SEO", "GOOGLE_ADS", "META_ADS"];

  const getFirstStrategyPath = () => {
    if (allowed.includes("SEO")) return "/simulation/seo";
    if (allowed.includes("GOOGLE_ADS")) return "/simulation/google-ads";
    return "/simulation/meta-ads";
  }

  const scenario = fullState.class?.scenario
  const progress = fullState.progress
  const instructor = fullState.class?.instructor

  // Calculated values
  const currentRound = fullState.currentRound || 1
  const maxRounds = scenario?.maxRounds || 10
  const progressPct = Math.round(((currentRound - 1) / maxRounds) * 100)


  // Status mapping
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DECISION_OPEN":
        return <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-[10px]">Decision Open</Badge>
      case "LOCKED":
        return <Badge className="bg-amber-50 text-amber-800 border border-amber-200 font-black text-[10px]">Submitted / Locked</Badge>
      case "PROCESSING":
        return <Badge className="bg-indigo-50 text-indigo-800 border border-indigo-200 font-black text-[10px] animate-pulse">Processing Round...</Badge>
      case "RESULTS_READY":
        return <Badge className="bg-blue-50 text-blue-800 border border-blue-200 font-black text-[10px]">Results Ready</Badge>
      case "COMPLETED":
      case "SCORE_LOCKED":
        return <Badge className="bg-neutral-900 text-white font-black text-[10px]">Completed</Badge>
      default:
        return <Badge className="bg-neutral-100 text-neutral-600 border border-neutral-200 font-black text-[10px]">{status}</Badge>
    }
  }

  const isCompleted = fullState.isCompleted || fullState.status === "SCORE_LOCKED" || fullState.status === "COMPLETED"

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Top Welcome Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left border-b border-neutral-200 pb-5">
        <div>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-max">
            <Activity className="h-3.5 w-3.5" />
            Marketing Lab Console
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 mt-2">
            Active Digital Marketing Simulation
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-semibold mt-1">
            Classroom: <span className="text-neutral-800 font-bold">{fullState.class?.name || "Sandbox"}</span>
            {instructor && (
              <> • Instructor: <span className="text-neutral-800 font-bold">{instructor.name}</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {getStatusBadge(fullState.status)}
        </div>
      </div>

      {/* Main Grid: Active Scenario + Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Left 2 Cols: Active Scenario Card */}
        <Card className="md:col-span-2 border-neutral-200/80 shadow-md bg-white text-left flex flex-col justify-between overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Active Scenario</span>
                <CardTitle className="text-lg sm:text-xl font-black text-neutral-900 mt-1">
                  {scenario?.name || "Marketing Challenge"}
                </CardTitle>
              </div>
              <Badge className="bg-slate-100 text-slate-800 border-none font-bold text-[10px] capitalize">
                {scenario?.industry || "B2B Software"}
              </Badge>
            </div>
            
            <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed font-semibold">
              {scenario?.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-neutral-100">
              <div>
                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Difficulty</span>
                <span className="text-xs font-black text-neutral-800 block capitalize mt-0.5">{scenario?.difficulty || "Medium"}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Target KPI</span>
                <span className="text-xs font-black text-indigo-600 block capitalize mt-0.5">{scenario?.targetKPI || "Revenue"}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Target Location</span>
                <span className="text-xs font-black text-neutral-800 block flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-neutral-400" />
                  Global
                </span>
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 border-t border-neutral-100 p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="text-left">
              <span className="text-[9px] font-black text-neutral-400 uppercase block">Round Duration</span>
              <span className="text-xs font-bold text-neutral-700 block mt-0.5">30 simulated days per round</span>
            </div>
            
            <div className="flex gap-2">
              <Link to="/simulation/briefing">
                <Button variant="outline" className="text-xs font-bold h-9 border-neutral-200">
                  <BookOpen className="mr-1.5 h-4 w-4" />
                  View Full Briefing
                </Button>
              </Link>
              
              {!isCompleted && (
                checkpointSubmitted ? (
                  <Link to={getFirstStrategyPath()}>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black h-9 px-4 rounded-xl flex items-center gap-1">
                      Continue Simulation
                      <Play className="h-3.5 w-3.5 fill-white" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/simulation/checkpoint">
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black h-9 px-4 rounded-xl flex items-center gap-1">
                      Complete Checkpoint
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                    </Button>
                  </Link>
                )
              )}

              {isCompleted && (
                <Link to="/simulation/results">
                  <Button className="bg-slate-900 hover:bg-slate-950 text-white text-xs font-black h-9 px-4 rounded-xl flex items-center gap-1">
                    View Final Results
                    <Award className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </Card>

        {/* Right Col: Metrics */}
        <div className="space-y-6">

          {/* Budget/Round Status Card */}
          <Card className="border-neutral-200/80 shadow-md bg-white p-6 text-left space-y-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Current Progress</span>
            
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-neutral-500">Round {currentRound} of {maxRounds}</span>
                <span className="text-indigo-600">{progressPct}% Complete</span>
              </div>
              <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="divide-y divide-neutral-100 text-xs">
              <div className="py-2.5 flex justify-between items-center font-semibold">
                <span className="text-neutral-500">Budget Per Round</span>
                <span className="text-neutral-800 font-black">${(scenario?.budgetPerRound || 5000.0).toLocaleString()}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center font-semibold">
                <span className="text-neutral-500">Total Score</span>
                <span className="text-indigo-600 font-black">{fullState.score || 0}%</span>
              </div>
              <div className="py-2.5 flex justify-between items-center font-semibold">
                <span className="text-neutral-500">Last Saved</span>
                <span className="text-neutral-600 font-bold">
                  {progress?.lastSubmittedAt ? new Date(progress.lastSubmittedAt).toLocaleTimeString() : "No saves yet"}
                </span>
              </div>
            </div>
          </Card>

          {/* Quick Checklist */}
          <Card className="border-neutral-200/80 shadow-md bg-white p-6 text-left space-y-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Decision Checklist</span>
            
            <div className="space-y-3">
              {[
                { label: "On-Page SEO keywords & backlinks", path: "/simulation/seo" },
                { label: "Google Pay-Per-Click campaigns", path: "/simulation/google-ads" },
                { label: "Meta Paid Social creatives & targeting", path: "/simulation/meta-ads" },
              ].map((item, idx) => (
                <Link key={idx} to={item.path} className="flex items-start gap-2.5 group">
                  <CheckCircle className="h-4.5 w-4.5 text-neutral-300 group-hover:text-indigo-500 shrink-0 mt-0.5 transition-colors" />
                  <span className="text-xs font-bold text-neutral-600 group-hover:text-indigo-600 leading-snug transition-colors">
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          </Card>

        </div>

      </div>

    </div>
  )
}
export default SimulationHomePage;
