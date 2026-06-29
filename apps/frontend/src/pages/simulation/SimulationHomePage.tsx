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
  MapPin, CheckCircle, RefreshCw, ShieldAlert,
  Settings, Clock, Sparkles, Download
} from "lucide-react"

export function SimulationHomePage() {
  const { user } = useAuthStore()
  const { fetchLatestState } = useSimulationStore()
  const [loading, setLoading] = useState(true)
  const [fullState, setFullState] = useState<any>(null)
  const [progressState, setProgressState] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [checkpointSubmitted, setCheckpointSubmitted] = useState(true)
  const [isInitializingPath, setIsInitializingPath] = useState(false)
  const [selectedSimType, setSelectedSimType] = useState<'SEO' | 'GOOGLE_ADS' | 'META_ADS' | 'DISPLAY' | 'VIDEO' | 'SHOPPING' | 'FULL'>('FULL')
  const [selectedPath, setSelectedPath] = useState<'beginner' | 'intermediate' | 'advanced' | 'custom'>('intermediate')
  const [optionsData, setOptionsData] = useState<any>(null)

  // Custom scenario form states
  const [scenarioName, setScenarioName] = useState("My Custom Sandbox")
  const [industry, setIndustry] = useState("B2B Software")
  const [targetAudience, setTargetAudience] = useState("business owners")
  const [location, setLocation] = useState("Global")
  const [totalBudget, setTotalBudget] = useState(5000)
  const [dailyBudget, setDailyBudget] = useState(150)
  const [campaignDuration, setCampaignDuration] = useState(30)
  const [simulationRounds, setSimulationRounds] = useState(10)
  const [seoEnabled, setSeoEnabled] = useState(true)
  const [googleAdsEnabled, setGoogleAdsEnabled] = useState(true)
  const [metaAdsEnabled, setMetaAdsEnabled] = useState(true)
  const [displayVideoShoppingEnabled, setDisplayVideoShoppingEnabled] = useState(true)
  const [difficulty, setDifficulty] = useState("medium")
  const [targetKPI, setTargetKPI] = useState("revenue")
  const [checkpointRequired, setCheckpointRequired] = useState(true)
  const [certificateEnabled, setCertificateEnabled] = useState(true)
  const [timingRuleType, setTimingRuleType] = useState("instant")
  const [customHours, setCustomHours] = useState(24)

  // Certificate check states
  const [certEligible, setCertEligible] = useState<any>(null)
  const [checkingCert, setCheckingCert] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      await fetchLatestState()
      
      // Load sandbox/state
      const res = await api.get<{ success: boolean; hasState: boolean; state: any; progress?: any }>('/api/v1/sandbox/state')
      if (res.data?.success && res.data.hasState) {
        setFullState(res.data.state)
        setProgressState(res.data.progress)
        
        // Check for student checkpoint justifications if college student
        const isCollegeStudent = user?.role === "student-college"
        if (isCollegeStudent && res.data.state.currentRound > 1) {
          const checkRes = await api.get<{ success: boolean; checkpoints: any[] }>(`/api/v1/simulation/checkpoint/${res.data.state.id}`)
          if (checkRes.data?.success) {
            const hasPrevCheckpoint = checkRes.data.checkpoints.some(
              cp => cp.roundNumber === res.data.state.currentRound - 1
            )
            setCheckpointSubmitted(hasPrevCheckpoint)
          } else {
            setCheckpointSubmitted(false)
          }
        } else {
          setCheckpointSubmitted(true)
        }

        // Fetch certificate check if completed
        if (res.data.state.isCompleted || res.data.state.status === 'COMPLETED' || res.data.state.status === 'SCORE_LOCKED') {
          await loadCertCheck()
        }
      } else {
        // Fetch preset choices options
        const optsRes = await api.get<any>('/api/v1/sandbox/options')
        if (optsRes.data?.success) {
          setOptionsData(optsRes.data)
        }
        setFullState(null)
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.response?.data?.message || "Please start a new sandbox simulation.")
    } finally {
      setLoading(false)
    }
  }

  const loadCertCheck = async () => {
    try {
      setCheckingCert(true)
      const res = await api.get<any>('/api/v1/sandbox/certificate/check')
      if (res.data?.success) {
        setCertEligible(res.data)
      }
    } catch (e) {
      console.error("Certificate check error", e)
    } finally {
      setCheckingCert(false)
    }
  }

  const handleGenerateCert = async () => {
    const tid = toast.loading("Generating certificate PDF...")
    try {
      const res = await api.post<any>('/api/v1/sandbox/certificate/generate')
      if (res.data?.success) {
        toast.success("Certificate issued successfully!", { id: tid })
        window.open(res.data.downloadUrl, '_blank')
        await loadCertCheck()
      } else {
        toast.error("Failed to generate certificate.", { id: tid })
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Not eligible yet.", { id: tid })
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSetupSandbox = async (pathType: 'beginner' | 'intermediate' | 'advanced' | 'custom') => {
    setIsInitializingPath(true)
    const tid = toast.loading(`Provisioning ${pathType} ${selectedSimType} sandbox track...`)
    try {
      let scenarioId = ""

      if (pathType === 'custom') {
        const timingRuleVal = timingRuleType === 'custom' ? `custom_${customHours}` : timingRuleType
        const customRes = await api.post<any>('/api/v1/sandbox/scenario/custom', {
          scenarioName,
          industry,
          targetAudience,
          location,
          totalBudget,
          dailyBudget,
          campaignDuration,
          simulationRounds,
          seoEnabled,
          googleAdsEnabled,
          metaAdsEnabled,
          displayVideoShoppingEnabled,
          difficulty,
          targetKPI,
          checkpointRequired,
          certificateEnabled,
          timingRule: timingRuleVal
        })
        if (customRes.data?.success) {
          scenarioId = customRes.data.scenarioId
        } else {
          throw new Error("Failed to create custom scenario.")
        }
      } else {
        // Resolve preset from options preset list
        const presetList = optionsData?.presetScenarios || []
        let match = presetList[0]

        if (pathType === 'beginner') {
          match = presetList.find((s: any) => s.name.toLowerCase().includes('saas')) || presetList[0]
        } else if (pathType === 'intermediate') {
          match = presetList.find((s: any) => s.name.toLowerCase().includes('saas')) || presetList[0]
        } else if (pathType === 'advanced') {
          match = presetList.find((s: any) => s.name.toLowerCase().includes('fashion')) || presetList[0]
        }
        
        if (!match) {
          throw new Error("No matching preset scenario found.")
        }
        scenarioId = match.id
      }

      // Start simulation
      const startRes = await api.post<any>('/api/v1/sandbox/start', { scenarioId })
      if (startRes.data?.success) {
        toast.success(`Successfully initialized sandbox track!`, { id: tid })
        await loadData()
      } else {
        toast.error("Failed to start sandbox.", { id: tid })
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.message || err.message || "Failed to setup sandbox.", { id: tid })
    } finally {
      setIsInitializingPath(false)
    }
  }

  const handleFastForward = async () => {
    const tid = toast.loading("Fast-forwarding round processing...")
    try {
      const res = await api.post<any>('/api/v1/sandbox/fast-forward')
      if (res.data?.success) {
        toast.success("Round advanced successfully!", { id: tid })
        await loadData()
      } else {
        toast.error("Failed to fast forward round.", { id: tid })
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fast forward.", { id: tid })
    }
  }

  const handleResetSandbox = async () => {
    if (confirm("Are you sure you want to delete current progress and restart sandbox?")) {
      setFullState(null)
      setProgressState(null)
      const optsRes = await api.get<any>('/api/v1/sandbox/options')
      if (optsRes.data?.success) {
        setOptionsData(optsRes.data)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
        <span className="text-sm text-neutral-500 font-bold">Loading sandbox console...</span>
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
            Choose your learning track, simulation type, and budget plan, or customize scenarios completely to run campaign cycles.
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
                  { key: 'DISPLAY', label: 'Display Ads Simulation', desc: 'Google Display Network CPM only' },
                  { key: 'VIDEO', label: 'Video Ads Simulation', desc: 'YouTube Video CPV delivery only' },
                  { key: 'SHOPPING', label: 'Shopping Ads Simulation', desc: 'Merchant Center product bids only' },
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
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
              {/* Beginner Card */}
              <Card className={`border shadow-md hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden bg-white ${selectedPath === 'beginner' ? 'border-indigo-600 ring-2 ring-indigo-150' : 'border-neutral-200'}`}>
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-[10px] uppercase">
                      Beginner
                    </Badge>
                    <span className="text-xs font-black text-neutral-400">Easy Mode</span>
                  </div>
                  <h3 className="text-base font-black text-neutral-900">SaaS Marketing Basics</h3>
                  <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                    Start with a large budget envelope to explore basic SEO density weights and target CPC bidding.
                  </p>
                  <div className="divide-y divide-neutral-100 text-[11px] pt-2">
                    <div className="py-2 flex justify-between font-semibold">
                      <span className="text-neutral-450">Round Budget</span>
                      <span className="text-emerald-600 font-black">$8,000 / round</span>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-neutral-50 border-t border-neutral-100">
                  <Button 
                    onClick={() => { setSelectedPath('beginner'); handleSetupSandbox('beginner'); }}
                    disabled={isInitializingPath}
                    className="w-full bg-slate-900 hover:bg-slate-950 text-white font-black text-xs h-9 rounded-xl"
                  >
                    Start Beginner
                  </Button>
                </div>
              </Card>

              {/* Intermediate Card */}
              <Card className={`border shadow-md hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden bg-white ${selectedPath === 'intermediate' ? 'border-indigo-600 ring-2 ring-indigo-150' : 'border-neutral-200'}`}>
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <Badge className="bg-indigo-50 text-indigo-850 border border-indigo-200 font-black text-[10px] uppercase">
                      Intermediate
                    </Badge>
                    <span className="text-xs font-black text-neutral-455">Medium Mode</span>
                  </div>
                  <h3 className="text-base font-black text-neutral-900">SaaS Challenge</h3>
                  <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                    Balanced budgets and competitive ad bidding settings in B2B SaaS space.
                  </p>
                  <div className="divide-y divide-neutral-100 text-[11px] pt-2">
                    <div className="py-2 flex justify-between font-semibold">
                      <span className="text-neutral-450">Round Budget</span>
                      <span className="text-indigo-650 font-black">$5,000 / round</span>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-neutral-50 border-t border-neutral-100">
                  <Button 
                    onClick={() => { setSelectedPath('intermediate'); handleSetupSandbox('intermediate'); }}
                    disabled={isInitializingPath}
                    className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-black text-xs h-9 rounded-xl"
                  >
                    Start Intermediate
                  </Button>
                </div>
              </Card>

              {/* Advanced Card */}
              <Card className={`border shadow-md hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden bg-white ${selectedPath === 'advanced' ? 'border-indigo-600 ring-2 ring-indigo-150' : 'border-neutral-200'}`}>
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <Badge className="bg-amber-50 text-amber-850 border border-amber-200 font-black text-[10px] uppercase">
                      Advanced
                    </Badge>
                    <span className="text-xs font-black text-neutral-400">Hard Mode</span>
                  </div>
                  <h3 className="text-base font-black text-neutral-900">E-Commerce App Blitz</h3>
                  <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                    A high-volatility retail simulation. Stretch tight budgets to convert visitors.
                  </p>
                  <div className="divide-y divide-neutral-100 text-[11px] pt-2">
                    <div className="py-2 flex justify-between font-semibold">
                      <span className="text-neutral-450">Round Budget</span>
                      <span className="text-amber-700 font-black">$3,500 / round</span>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-neutral-50 border-t border-neutral-100">
                  <Button 
                    onClick={() => { setSelectedPath('advanced'); handleSetupSandbox('advanced'); }}
                    disabled={isInitializingPath}
                    className="w-full bg-slate-900 hover:bg-slate-950 text-white font-black text-xs h-9 rounded-xl"
                  >
                    Start Advanced
                  </Button>
                </div>
              </Card>

              {/* Custom Card */}
              <Card className={`border shadow-md hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden bg-white ${selectedPath === 'custom' ? 'border-violet-600 ring-2 ring-violet-150' : 'border-neutral-200'}`}>
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <Badge className="bg-violet-50 text-violet-850 border border-violet-200 font-black text-[10px] uppercase">
                      Custom
                    </Badge>
                    <span className="text-xs font-black text-neutral-400">Configurable</span>
                  </div>
                  <h3 className="text-base font-black text-neutral-900">Custom Setup</h3>
                  <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                    Create a scenario with custom budgets, rounds, difficulty and timing rules.
                  </p>
                  <div className="divide-y divide-neutral-100 text-[11px] pt-2">
                    <div className="py-2 flex justify-between font-semibold">
                      <span className="text-neutral-450">KPI Target</span>
                      <span className="text-violet-650 font-black">Choose KPI</span>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-neutral-50 border-t border-neutral-100">
                  <Button 
                    onClick={() => setSelectedPath('custom')}
                    className="w-full bg-violet-650 hover:bg-violet-700 text-white font-black text-xs h-9 rounded-xl"
                  >
                    Configure Custom
                  </Button>
                </div>
              </Card>
            </div>

            {/* Custom Scenario Form */}
            {selectedPath === 'custom' && (
              <Card className="p-6 border-violet-200/80 shadow-md bg-white text-left space-y-6 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                  <Settings className="h-5 w-5 text-violet-600" />
                  <h2 className="text-base font-black text-neutral-900">Custom Scenario Configuration</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Basic Metadata */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider">Basic Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Scenario Name</label>
                        <input 
                          type="text" 
                          value={scenarioName} 
                          onChange={(e) => setScenarioName(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-bold border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-500" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Industry</label>
                        <input 
                          type="text" 
                          value={industry} 
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-bold border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-500" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Target Audience</label>
                        <input 
                          type="text" 
                          value={targetAudience} 
                          onChange={(e) => setTargetAudience(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-bold border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-500" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Location</label>
                        <input 
                          type="text" 
                          value={location} 
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-bold border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-500" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Budget & Target Rules */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider">Budgets & Targets</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Total Budget ($)</label>
                          <input 
                            type="number" 
                            value={totalBudget} 
                            onChange={(e) => setTotalBudget(Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-xs font-bold border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-500" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Daily Cap ($)</label>
                          <input 
                            type="number" 
                            value={dailyBudget} 
                            onChange={(e) => setDailyBudget(Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-xs font-bold border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-500" 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Duration (Days)</label>
                          <input 
                            type="number" 
                            value={campaignDuration} 
                            onChange={(e) => setCampaignDuration(Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-xs font-bold border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-500" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Rounds</label>
                          <input 
                            type="number" 
                            value={simulationRounds} 
                            onChange={(e) => setSimulationRounds(Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-xs font-bold border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-500" 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Difficulty</label>
                          <select 
                            value={difficulty} 
                            onChange={(e) => setDifficulty(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-bold border border-neutral-200 rounded-lg bg-white focus:outline-none"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-neutral-600 uppercase block mb-1">KPI Target</label>
                          <select 
                            value={targetKPI} 
                            onChange={(e) => setTargetKPI(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-bold border border-neutral-200 rounded-lg bg-white focus:outline-none"
                          >
                            <option value="revenue">Revenue</option>
                            <option value="conversions">Conversions</option>
                            <option value="clicks">Clicks</option>
                            <option value="ctr">CTR</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Timing Rule</label>
                        <select 
                          value={timingRuleType} 
                          onChange={(e) => setTimingRuleType(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-bold border border-neutral-200 rounded-lg bg-white focus:outline-none"
                        >
                          <option value="instant">Instant (Dev/Admin default)</option>
                          <option value="24h">24 Hours (Overnight processing)</option>
                          <option value="custom">Custom hours delay</option>
                        </select>
                      </div>

                      {timingRuleType === 'custom' && (
                        <div>
                          <label className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Delay Duration (Hours)</label>
                          <input 
                            type="number" 
                            value={customHours} 
                            onChange={(e) => setCustomHours(Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-xs font-bold border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-500" 
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Channels & Rule Toggles */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider">Channels & Policy Rules</h3>
                    <div className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200/60">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="seo" 
                          checked={seoEnabled} 
                          onChange={(e) => setSeoEnabled(e.target.checked)} 
                        />
                        <label htmlFor="seo" className="text-xs font-bold text-neutral-700">SEO Channel</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="google" 
                          checked={googleAdsEnabled} 
                          onChange={(e) => setGoogleAdsEnabled(e.target.checked)} 
                        />
                        <label htmlFor="google" className="text-xs font-bold text-neutral-700">Google Ads (Search)</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="meta" 
                          checked={metaAdsEnabled} 
                          onChange={(e) => setMetaAdsEnabled(e.target.checked)} 
                        />
                        <label htmlFor="meta" className="text-xs font-bold text-neutral-700">Meta Ads (Paid Social)</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="displayVideo" 
                          checked={displayVideoShoppingEnabled} 
                          onChange={(e) => setDisplayVideoShoppingEnabled(e.target.checked)} 
                        />
                        <label htmlFor="displayVideo" className="text-xs font-bold text-neutral-700">Display, Video & Shopping</label>
                      </div>

                      <div className="border-t border-neutral-200 my-2 pt-2" />

                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="checkpoint" 
                          checked={checkpointRequired} 
                          onChange={(e) => setCheckpointRequired(e.target.checked)} 
                        />
                        <label htmlFor="checkpoint" className="text-xs font-bold text-neutral-700">Required Checkpoint Reflection</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="cert" 
                          checked={certificateEnabled} 
                          onChange={(e) => setCertificateEnabled(e.target.checked)} 
                        />
                        <label htmlFor="cert" className="text-xs font-bold text-neutral-700">Enable Graduation Certificate</label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <Button 
                    onClick={() => handleSetupSandbox('custom')}
                    disabled={isInitializingPath}
                    className="bg-violet-650 hover:bg-violet-700 text-white font-black text-xs px-6 h-10 rounded-xl"
                  >
                    Start Custom Simulation
                  </Button>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <Card className="max-w-md mx-auto p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm text-center space-y-4">
            <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
            <h2 className="text-lg font-black text-neutral-900">Simulation Not Started</h2>
            <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
              {errorMsg || "No active simulation class cohort has been found for your account."}
            </p>
          </Card>
        )}
      </div>
    )
  }

  // --- RENDERING ACTIVE WORKSPACE CONSOLE ---
  const allowed = fullState?.class?.scenario?.allowedPlatforms
    ? JSON.parse(fullState.class.scenario.allowedPlatforms)
    : ["SEO", "GOOGLE_ADS", "META_ADS"];

  const getFirstStrategyPath = () => {
    if (allowed.includes("SEO")) return "/simulation/seo";
    if (allowed.includes("GOOGLE_ADS")) return "/simulation/google-ads";
    if (allowed.includes("META_ADS")) return "/simulation/meta-ads";
    return "/simulation/results";
  }

  const scenario = fullState.class?.scenario
  const progress = progressState || fullState.progress

  // Calculated values
  const currentRound = fullState.currentRound || 1
  const maxRounds = scenario?.maxRounds || 10
  const progressPct = Math.round(((currentRound - 1) / maxRounds) * 100)

  const isCompleted = fullState.isCompleted || fullState.status === "SCORE_LOCKED" || fullState.status === "COMPLETED"
  const isProcessing = fullState.status === "PROCESSING" || progress?.status === "PROCESSING"

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left border-b border-neutral-200 pb-5">
        <div>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-max">
            <Activity className="h-3.5 w-3.5" />
            Sandbox Workspace Console
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 mt-2">
            Active Digital Marketing Sandbox
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-semibold mt-1">
            Running Mode: <span className="text-neutral-800 font-bold">Personal Sandbox</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleResetSandbox} className="text-xs border-neutral-200">
            Reset Sandbox
          </Button>
          {isProcessing ? (
            <Badge className="bg-indigo-50 text-indigo-850 border border-indigo-200 font-black text-[10px] animate-pulse">
              Processing Campaign...
            </Badge>
          ) : (
            <Badge className="bg-emerald-50 text-emerald-805 border border-emerald-200 font-black text-[10px]">
              Ready for Decision
            </Badge>
          )}
        </div>
      </div>

      {/* Processing State Card */}
      {isProcessing && (
        <Card className="p-6 border-indigo-200 shadow-md bg-indigo-50/20 text-left space-y-4">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-indigo-650 animate-spin" />
            <div>
              <h2 className="text-sm font-black text-neutral-900">Campaign Processing in Progress</h2>
              <p className="text-xs text-neutral-500 font-medium">
                Your settings are locked and being modeled against rival bids and trend index behaviors.
              </p>
            </div>
          </div>
          {progress?.nextResultAt && (
            <div className="text-xs text-neutral-600 font-bold bg-white/80 p-3 rounded-lg border border-indigo-100 flex justify-between items-center">
              <span>Estimated results unlock time:</span>
              <span className="text-indigo-650">{new Date(progress.nextResultAt).toLocaleString()}</span>
            </div>
          )}
          {process.env.NODE_ENV !== 'production' && (
            <div className="pt-2">
              <Button onClick={handleFastForward} className="bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black h-9 px-4 rounded-xl">
                Fast-Forward processing (Dev Mode)
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Left Card: Active Scenario Details */}
        <Card className="md:col-span-2 border-neutral-200/80 shadow-md bg-white text-left flex flex-col justify-between overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Active Configuration</span>
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
                  {scenario?.location || 'Global'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100">
              <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block mb-1.5">Enabled Channels</span>
              <div className="flex flex-wrap gap-1.5">
                {allowed.map((plat: string) => (
                  <Badge key={plat} className="bg-indigo-50 text-indigo-800 border-none font-bold text-[9px] uppercase px-2 py-0.5">
                    {plat.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 border-t border-neutral-100 p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="text-left">
              <span className="text-[9px] font-black text-neutral-400 uppercase block">Round Duration</span>
              <span className="text-xs font-bold text-neutral-700 block mt-0.5">{scenario?.durationDays || 30} campaign days</span>
            </div>
            
            <div className="flex gap-2">
              <Link to="/simulation/briefing">
                <Button variant="outline" className="text-xs font-bold h-9 border-neutral-200">
                  <BookOpen className="mr-1.5 h-4 w-4" />
                  Briefing
                </Button>
              </Link>
              
              {!isCompleted && !isProcessing && (
                checkpointSubmitted ? (
                  <Link to={getFirstStrategyPath()}>
                    <Button className="bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black h-9 px-4 rounded-xl flex items-center gap-1">
                      Continue Setup
                      <Play className="h-3.5 w-3.5 fill-white" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/simulation/checkpoint">
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black h-9 px-4 rounded-xl flex items-center gap-1">
                      Checkpoint Reflection
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                    </Button>
                  </Link>
                )
              )}

              {(isCompleted || currentRound > 1) && (
                <Link to="/simulation/results">
                  <Button className="bg-slate-900 hover:bg-slate-950 text-white text-xs font-black h-9 px-4 rounded-xl flex items-center gap-1">
                    View Results
                    <Award className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </Card>

        {/* Right Card: Progress & Decision Checklist */}
        <div className="space-y-6 text-left">
          {/* Progress Card */}
          <Card className="border-neutral-200/80 shadow-md bg-white p-6 space-y-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Current Progress</span>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-neutral-500">Round {currentRound} of {maxRounds}</span>
                <span className="text-indigo-600">{progressPct}% Complete</span>
              </div>
              <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-650 rounded-full transition-all duration-500" 
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="divide-y divide-neutral-100 text-xs">
              <div className="py-2.5 flex justify-between items-center font-semibold">
                <span className="text-neutral-500">Total Budget Limit</span>
                <span className="text-neutral-800 font-black">${(scenario?.budgetPerRound || 5000.0).toLocaleString()}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center font-semibold">
                <span className="text-neutral-500">Cumulative Score</span>
                <span className="text-indigo-650 font-black">{fullState.score || 0}%</span>
              </div>
            </div>
          </Card>

          {/* Quick Links Checklist */}
          <Card className="border-neutral-200/80 shadow-md bg-white p-6 space-y-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Decision Channels</span>
            
            <div className="space-y-3">
              {[
                { label: "SEO Settings & Keywords", path: "/simulation/seo", key: "SEO" },
                { label: "Google Ads Campaigns", path: "/simulation/google-ads", key: "GOOGLE_ADS" },
                { label: "Meta Ads Creatives", path: "/simulation/meta-ads", key: "META_ADS" },
              ].map((item, idx) => {
                const isPlatAllowed = allowed.includes(item.key);
                return (
                  <div key={idx}>
                    {isPlatAllowed ? (
                      <Link to={isProcessing ? "#" : item.path} className={`flex items-start gap-2.5 group ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}>
                        <CheckCircle className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5 transition-colors" />
                        <span className="text-xs font-bold text-neutral-600 group-hover:text-indigo-600 leading-snug transition-colors">
                          {item.label}
                        </span>
                      </Link>
                    ) : (
                      <div className="flex items-start gap-2.5 opacity-40">
                        <CheckCircle className="h-4.5 w-4.5 text-neutral-300 shrink-0 mt-0.5" />
                        <span className="text-xs font-bold text-neutral-400 leading-snug line-through">
                          {item.label} (Disabled)
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Graduation Certificate Download Panel */}
      {isCompleted && certEligible && (
        <Card className="p-6 border-violet-200 shadow-md bg-violet-50/20 text-left space-y-4 animate-in fade-in duration-300">
          <div className="flex items-start justify-between flex-col sm:flex-row gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-violet-650 uppercase tracking-widest bg-violet-55 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-max">
                <Sparkles className="h-3.5 w-3.5 fill-violet-650" />
                Graduation Certificate Status
              </span>
              <h2 className="text-lg font-black text-neutral-900 mt-2">
                {certEligible.eligible ? `Eligible: ${certEligible.band} Certification Level` : 'Certificate Eligibility Check'}
              </h2>
              <p className="text-xs text-neutral-500 font-medium">
                Platform certificates are awarded to sandbox campaigns reaching a score of at least 60% and demonstrating adaptability of at least 50%.
              </p>
            </div>
            
            {certEligible.eligible ? (
              <Button onClick={handleGenerateCert} className="bg-violet-650 hover:bg-violet-750 text-white font-black text-xs px-6 h-10 rounded-xl shrink-0 flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download Certificate PDF
              </Button>
            ) : (
              <Badge className="bg-rose-50 text-rose-800 border border-rose-200 font-black text-[10px]">
                Not Eligible
              </Badge>
            )}
          </div>

          {!certEligible.eligible && certEligible.reasons && certEligible.reasons.length > 0 && (
            <div className="bg-white/80 border border-rose-100 rounded-xl p-4 text-xs space-y-1.5">
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider block">Remaining Requirements:</span>
              <ul className="list-disc pl-4 space-y-0.5 text-neutral-600 font-semibold">
                {certEligible.reasons.map((r: string, index: number) => (
                  <li key={index}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

    </div>
  )
}
export default SimulationHomePage;
