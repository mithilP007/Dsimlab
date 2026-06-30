import { useState, useEffect } from "react"
import { useSearchParams, Link, useNavigate } from "react-router"
import { useAuthStore } from "@/stores/authStore"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import { toast } from "sonner"
import { 
  Play, Activity, Award, BookOpen, 
  MapPin, CheckCircle, RefreshCw, ShieldAlert,
  Settings, Clock, Sparkles, Download, ArrowRight,
  TrendingUp, BarChart3, AlertCircle
} from "lucide-react"

export function SandboxWorkspace() {
  const { user } = useAuthStore()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const mode = searchParams.get("mode") || "GOOGLE_ADS"

  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<any>(null)
  const [progress, setProgress] = useState<any>(null)
  const [report, setReport] = useState<any>(null)
  const [checkingCert, setCheckingCert] = useState(false)
  const [certEligible, setCertEligible] = useState<any>(null)

  // Platform Specific Form States
  // Google Ads
  const [googleGoal, setGoogleGoal] = useState("Sales")
  const [googleBidding, setGoogleBidding] = useState("Maximize Clicks")
  const [googleMaxCpc, setGoogleMaxCpc] = useState(1.50)
  const [googleDailyBudget, setGoogleDailyBudget] = useState(100)
  const [googleKeywordsInput, setGoogleKeywordsInput] = useState("crm software, sales tool")
  const [googleMatchType, setGoogleMatchType] = useState("phrase")
  const [googleNegativeInput, setGoogleNegativeInput] = useState("free, cheap")
  const [googleHeadline1, setGoogleHeadline1] = useState("Best Collaborative CRM")
  const [googleHeadline2, setGoogleHeadline2] = useState("Boost Your Sales Efficiency")
  const [googleDesc1, setGoogleDesc1] = useState("Track deals, manage customer relations, and automate pipelines easily.")
  const [googleLandingPage, setGoogleLandingPage] = useState("https://mycrm.com/landing")
  const [googleSitelinks, setGoogleSitelinks] = useState("Pricing, Free Trial")

  // Meta Ads
  const [metaObjective, setMetaObjective] = useState("leads")
  const [metaAgeMin, setMetaAgeMin] = useState(25)
  const [metaAgeMax, setMetaAgeMax] = useState(54)
  const [metaGender, setMetaGender] = useState("all")
  const [metaInterests, setMetaInterests] = useState("Business owners, Startups")
  const [metaPlacement, setMetaPlacement] = useState("feed-reels")
  const [metaDailyBudget, setMetaDailyBudget] = useState(150)
  const [metaCreativeFormat, setMetaCreativeFormat] = useState("image")
  const [metaPrimaryText, setMetaPrimaryText] = useState("Start streamlining your team operations today. Free 14-day trial!")
  const [metaHeadline, setMetaHeadline] = useState("Collaborative CRM Software")
  const [metaCta, setMetaCta] = useState("LEARN_MORE")
  const [metaLandingPage, setMetaLandingPage] = useState("https://mycrm.com/social-leads")

  // SEO
  const [seoTargetKeywordsInput, setSeoTargetKeywordsInput] = useState("best crm software, team pipeline tool")
  const [seoMetaTitle, setSeoMetaTitle] = useState("Collaborative CRM Tool | Streamline Deal Pipelines")
  const [seoMetaDescription, setSeoMetaDescription] = useState("Discover the top-rated cloud CRM software. Boost customer retention and manage active sales targets in one shared dashboard.")
  const [seoBodyContent, setSeoBodyContent] = useState("A CRM tool helps collaborative teams automate redundant pipeline steps. Using modern CRM software allows sales reps to track client conversations, record deals, and access analytics logs instantly.")
  const [seoUrlSlug, setSeoUrlSlug] = useState("collaborative-crm-software")
  const [seoBacklinkBudget, setSeoBacklinkBudget] = useState(250)
  const [seoTechnicalSSL, setSeoTechnicalSSL] = useState(true)
  const [seoTechnicalSitemap, setSeoTechnicalSitemap] = useState(true)
  const [seoTechnicalMobile, setSeoTechnicalMobile] = useState(true)
  const [seoTechnicalRobots, setSeoTechnicalRobots] = useState(true)

  const loadWorkspaceState = async () => {
    setLoading(true)
    try {
      const res = await api.get<any>("/api/v1/sandbox/state")
      if (res.data?.success && res.data.hasState) {
        setState(res.data.state)
        setProgress(res.data.progress)
        
        // Load report if round > 1 or completed
        if (res.data.state.currentRound > 1 || res.data.state.isCompleted || res.data.state.status === 'RESULTS_READY') {
          const repRes = await api.get<any>("/api/v1/sandbox/report")
          if (repRes.data?.success) {
            setReport(repRes.data)
          }
          await checkCertificate()
        }
      } else {
        toast.error("No active sandbox simulation found. Redirecting...")
        navigate("/simulation")
      }
    } catch (e) {
      console.error(e)
      toast.error("Failed to load workspace.")
    } finally {
      setLoading(false)
    }
  }

  const checkCertificate = async () => {
    try {
      setCheckingCert(true)
      const res = await api.get<any>("/api/v1/sandbox/certificate/check")
      if (res.data?.success) {
        setCertEligible(res.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCheckingCert(false)
    }
  }

  const handleGenerateCertificate = async () => {
    const tid = toast.loading("Generating certificate PDF...")
    try {
      const res = await api.post<any>("/api/v1/sandbox/certificate/generate")
      if (res.data?.success) {
        toast.success("Certificate issued successfully!", { id: tid })
        window.open(res.data.downloadUrl, '_blank')
        await checkCertificate()
      } else {
        toast.error("Not eligible yet.", { id: tid })
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Generation failed.", { id: tid })
    }
  }

  const handleSaveDecision = async () => {
    const tid = toast.loading("Saving settings...")
    try {
      let payload = {}

      if (mode === "GOOGLE_ADS") {
        const kws = googleKeywordsInput.split(",").map(k => k.trim()).filter(Boolean).map(word => ({
          word,
          bid: googleMaxCpc,
          matchType: googleMatchType
        }))
        const negKws = googleNegativeInput.split(",").map(k => k.trim()).filter(Boolean)

        payload = {
          googleCampaigns: [
            {
              name: "Search CRM Campaigns",
              budget: googleDailyBudget * 30,
              objective: googleGoal,
              biddingStrategy: googleBidding,
              maxCpcBid: googleMaxCpc,
              keywords: kws,
              negativeKeywords: negKws,
              locations: [state?.class?.scenario?.location || "Global"],
              adCopy: {
                headline1: googleHeadline1,
                headline2: googleHeadline2,
                description1: googleDesc1,
                landingPageUrl: googleLandingPage,
              },
              extensions: {
                sitelinks: googleSitelinks.split(",").map(s => s.trim()).filter(Boolean)
              }
            }
          ]
        }
      } else if (mode === "META_ADS") {
        payload = {
          metaCampaigns: [
            {
              name: "Social Leads Target",
              budget: metaDailyBudget * 30,
              objective: metaObjective,
              audienceInterest: metaInterests,
              placement: metaPlacement,
              bidType: "LOWEST_COST",
              creative: {
                creativeFormat: metaCreativeFormat,
                primaryText: metaPrimaryText,
                headline: metaHeadline,
                callToAction: metaCta,
                landingPageUrl: metaLandingPage
              },
              ageMin: metaAgeMin,
              ageMax: metaAgeMax,
              gender: metaGender
            }
          ]
        }
      } else if (mode === "SEO") {
        payload = {
          seoTargetKeywords: seoTargetKeywordsInput.split(",").map(k => k.trim()).filter(Boolean),
          seoContentQuality: 7.0,
          seoBacklinkBudget: seoBacklinkBudget,
          seoMetaTitle,
          seoMetaDescription,
          seoBodyContent,
          seoUrlSlug,
          seoTechnicalConfig: {
            hasSitemap: seoTechnicalSitemap,
            hasRobots: seoTechnicalRobots,
            hasSsl: seoTechnicalSSL,
            isMobileFriendly: seoTechnicalMobile
          }
        }
      }

      const res = await api.post<any>("/api/v1/sandbox/decision", payload)
      if (res.data?.success) {
        toast.success("Settings saved successfully!", { id: tid })
      } else {
        toast.error("Failed to save decisions.", { id: tid })
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save settings.", { id: tid })
    }
  }

  const handleRunSimulation = async () => {
    const tid = toast.loading("Executing campaign settings...")
    try {
      const res = await api.post<any>("/api/v1/sandbox/run")
      if (res.data?.success) {
        if (res.data.instant) {
          toast.success("Campaign advanced instantly!", { id: tid })
        } else {
          toast.success("Campaign submitted! Processing scheduled.", { id: tid })
        }
        await loadWorkspaceState()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to run simulation.", { id: tid })
    }
  }

  const handleNextRound = async () => {
    const tid = toast.loading("Opening next round cycle...")
    try {
      const res = await api.post<any>("/api/v1/sandbox/next-cycle")
      if (res.data?.success) {
        toast.success("Next round cycle initialized!", { id: tid })
        await loadWorkspaceState()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to start next cycle.", { id: tid })
    }
  }

  const handleFastForward = async () => {
    const tid = toast.loading("Advancing round instantly...")
    try {
      const res = await api.post<any>("/api/v1/sandbox/fast-forward")
      if (res.data?.success) {
        toast.success("Round advanced successfully!", { id: tid })
        await loadWorkspaceState()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Fast forward failed.", { id: tid })
    }
  }

  useEffect(() => {
    loadWorkspaceState()
  }, [mode])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
        <span className="text-sm text-neutral-500 font-bold">Loading simulation workbench...</span>
      </div>
    )
  }

  if (!state) return null

  const isCompleted = state.isCompleted || state.status === "COMPLETED" || state.status === "SCORE_LOCKED"
  const isProcessing = state.status === "PROCESSING" || progress?.status === "PROCESSING"
  const isResultsReady = state.status === "RESULTS_READY"

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Dynamic Header Badge / Console Details */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-sm text-left flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <Badge className="bg-indigo-50 text-indigo-900 border-none uppercase text-[9px] font-black tracking-widest px-2.5 py-1">
            Sandbox Live Console
          </Badge>
          <h1 className="text-2xl font-black text-neutral-900">
            {state.class?.scenario?.name}
          </h1>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-xs font-semibold text-neutral-500 pt-2">
            <div>
              Simulation Type: <span className="text-neutral-850 font-black">{mode.replace('_', ' ')}</span>
            </div>
            <div>
              Scenario Type: <span className="text-neutral-850 font-black uppercase text-[10px]">{state.class?.scenario?.scenarioType}</span>
            </div>
            <div>
              Timing Rule: <span className="text-neutral-850 font-black">{state.class?.scenario?.trendRefreshFrequency === 'instant' ? 'Instant runs' : '24h standard lock'}</span>
            </div>
            <div>
              Day / Round: <span className="text-indigo-650 font-black">Round {state.currentRound} of {state.class?.scenario?.maxRounds}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-neutral-400 font-black uppercase tracking-wider block">Workspace Status</span>
            {isProcessing ? (
              <Badge className="bg-amber-50 text-amber-850 border border-amber-200 font-black text-[10px] animate-pulse">
                Processing Campaign...
              </Badge>
            ) : isResultsReady ? (
              <Badge className="bg-indigo-50 text-indigo-850 border border-indigo-200 font-black text-[10px]">
                Results Ready
              </Badge>
            ) : isCompleted ? (
              <Badge className="bg-rose-50 text-rose-850 border border-rose-200 font-black text-[10px]">
                Simulation Completed
              </Badge>
            ) : (
              <Badge className="bg-emerald-50 text-emerald-850 border border-emerald-250 font-black text-[10px]">
                Ready for Decisions
              </Badge>
            )}
          </div>
          <div className="h-10 w-[1px] bg-neutral-200 hidden md:block" />
          <div className="text-right">
            <span className="text-[10px] text-neutral-400 font-black uppercase tracking-wider block">Cumulative Score</span>
            <span className="text-lg font-black text-indigo-650">{state.score || 0}%</span>
          </div>
        </div>
      </div>

      {/* Main Workspace split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Isolated Input Form */}
        <div className="lg:col-span-2 space-y-6 text-left">
          
          {!isCompleted && !isProcessing && !isResultsReady ? (
            <Card className="p-6 border-neutral-200 shadow-sm bg-white space-y-6">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                <Settings className="h-5 w-5 text-indigo-650" />
                <h2 className="text-base font-black text-neutral-900">Campaign Platform Settings</h2>
              </div>

              {/* GOOGLE ADS VIEW */}
              {mode === "GOOGLE_ADS" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="google-goal" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Campaign Objective</label>
                      <select 
                        id="google-goal"
                        name="googleGoal"
                        value={googleGoal} 
                        onChange={(e) => setGoogleGoal(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                      >
                        <option value="Sales">Sales (E-Commerce)</option>
                        <option value="Leads">Leads Acquisition</option>
                        <option value="Website Traffic">Website Traffic</option>
                        <option value="Brand Awareness">Brand Awareness</option>
                      </select>
                    </div>
 
                    <div>
                      <label htmlFor="google-bidding" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Bidding Strategy</label>
                      <select 
                        id="google-bidding"
                        name="googleBidding"
                        value={googleBidding} 
                        onChange={(e) => setGoogleBidding(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                      >
                        <option value="Maximize Clicks">Maximize Clicks</option>
                        <option value="Maximize Conversions">Maximize Conversions</option>
                        <option value="Target CPA">Target CPA</option>
                        <option value="Target ROAS">Target ROAS</option>
                      </select>
                    </div>
                  </div>
 
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="google-max-cpc" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Max CPC Bid ($)</label>
                      <input 
                        id="google-max-cpc"
                        name="googleMaxCpc"
                        type="number" 
                        step="0.05"
                        value={googleMaxCpc} 
                        onChange={(e) => setGoogleMaxCpc(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="google-daily-budget" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Daily Budget ($)</label>
                      <input 
                        id="google-daily-budget"
                        name="googleDailyBudget"
                        type="number" 
                        value={googleDailyBudget} 
                        onChange={(e) => setGoogleDailyBudget(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>
 
                  <div>
                    <label htmlFor="google-keywords" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Target Keywords (comma-separated)</label>
                    <input 
                      id="google-keywords"
                      name="googleKeywords"
                      type="text" 
                      value={googleKeywordsInput} 
                      onChange={(e) => setGoogleKeywordsInput(e.target.value)}
                      placeholder="best crm, CRM SaaS"
                      className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                    />
                  </div>
 
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="google-match-type" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Match Type</label>
                      <select 
                        id="google-match-type"
                        name="googleMatchType"
                        value={googleMatchType} 
                        onChange={(e) => setGoogleMatchType(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                      >
                        <option value="exact">Exact Match</option>
                        <option value="phrase">Phrase Match</option>
                        <option value="broad">Broad Match</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="google-negative-keywords" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Negative Keywords (comma-separated)</label>
                      <input 
                        id="google-negative-keywords"
                        name="googleNegativeKeywords"
                        type="text" 
                        value={googleNegativeInput} 
                        onChange={(e) => setGoogleNegativeInput(e.target.value)}
                        placeholder="free, cheap"
                        className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>
 
                  <div className="border-t border-neutral-100 my-4 pt-4 space-y-3">
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Google Search Ad Headlines & Descriptions</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="google-headline-1" className="text-[10px] font-semibold text-neutral-500 block mb-1">Ad Headline 1</label>
                        <input 
                          id="google-headline-1"
                          name="googleHeadline1"
                          type="text" 
                          value={googleHeadline1} 
                          onChange={(e) => setGoogleHeadline1(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="google-headline-2" className="text-[10px] font-semibold text-neutral-500 block mb-1">Ad Headline 2</label>
                        <input 
                          id="google-headline-2"
                          name="googleHeadline2"
                          type="text" 
                          value={googleHeadline2} 
                          onChange={(e) => setGoogleHeadline2(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="google-desc-1" className="text-[10px] font-semibold text-neutral-500 block mb-1">Ad Description</label>
                      <input 
                        id="google-desc-1"
                        name="googleDesc1"
                        type="text" 
                        value={googleDesc1} 
                        onChange={(e) => setGoogleDesc1(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="google-landing-page" className="text-[10px] font-semibold text-neutral-500 block mb-1">Landing Page URL</label>
                        <input 
                          id="google-landing-page"
                          name="googleLandingPage"
                          type="text" 
                          value={googleLandingPage} 
                          onChange={(e) => setGoogleLandingPage(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="google-sitelinks" className="text-[10px] font-semibold text-neutral-500 block mb-1">Sitelink Extensions (comma-separated)</label>
                        <input 
                          id="google-sitelinks"
                          name="googleSitelinks"
                          type="text" 
                          value={googleSitelinks} 
                          onChange={(e) => setGoogleSitelinks(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
 
              {/* META ADS VIEW */}
              {mode === "META_ADS" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="meta-objective" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Meta Campaign Objective</label>
                      <select 
                        id="meta-objective"
                        name="metaObjective"
                        value={metaObjective} 
                        onChange={(e) => setMetaObjective(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                      >
                        <option value="sales">Sales (Conversions)</option>
                        <option value="leads">Leads Forms</option>
                        <option value="traffic">Traffic Links</option>
                        <option value="engagement">Page Engagement</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="meta-daily-budget" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Daily Budget ($)</label>
                      <input 
                        id="meta-daily-budget"
                        name="metaDailyBudget"
                        type="number" 
                        value={metaDailyBudget} 
                        onChange={(e) => setMetaDailyBudget(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>
 
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="meta-age-min" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Min Age</label>
                      <input 
                        id="meta-age-min"
                        name="metaAgeMin"
                        type="number" 
                        value={metaAgeMin} 
                        onChange={(e) => setMetaAgeMin(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="meta-age-max" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Max Age</label>
                      <input 
                        id="meta-age-max"
                        name="metaAgeMax"
                        type="number" 
                        value={metaAgeMax} 
                        onChange={(e) => setMetaAgeMax(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="meta-gender" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Gender</label>
                      <select 
                        id="meta-gender"
                        name="metaGender"
                        value={metaGender} 
                        onChange={(e) => setMetaGender(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none animate-none"
                      >
                        <option value="all">All</option>
                        <option value="men">Men Only</option>
                        <option value="women">Women Only</option>
                      </select>
                    </div>
                  </div>
 
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="meta-interests" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Audience Interest Targeting</label>
                      <input 
                        id="meta-interests"
                        name="metaInterests"
                        type="text" 
                        value={metaInterests} 
                        onChange={(e) => setMetaInterests(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="meta-placement" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Placement Delivery</label>
                      <select 
                        id="meta-placement"
                        name="metaPlacement"
                        value={metaPlacement} 
                        onChange={(e) => setMetaPlacement(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                      >
                        <option value="auto">Automatic (Recommended)</option>
                        <option value="feed-reels">Feeds & Reels only</option>
                        <option value="stories">Stories only</option>
                      </select>
                    </div>
                  </div>
 
                  <div className="border-t border-neutral-100 my-4 pt-4 space-y-3">
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Meta Creatives & Text Ad Copy</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="meta-creative-format" className="text-[10px] font-semibold text-neutral-500 block mb-1">Format Type</label>
                        <select 
                          id="meta-creative-format"
                          name="metaCreativeFormat"
                          value={metaCreativeFormat} 
                          onChange={(e) => setMetaCreativeFormat(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                        >
                          <option value="image">Single Image</option>
                          <option value="video">Promotional Video</option>
                          <option value="carousel">Multi-Image Carousel</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="meta-headline" className="text-[10px] font-semibold text-neutral-500 block mb-1">Headline Text</label>
                        <input 
                          id="meta-headline"
                          name="metaHeadline"
                          type="text" 
                          value={metaHeadline} 
                          onChange={(e) => setMetaHeadline(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="meta-primary-text" className="text-[10px] font-semibold text-neutral-500 block mb-1">Primary Description Text</label>
                      <textarea 
                        id="meta-primary-text"
                        name="metaPrimaryText"
                        value={metaPrimaryText} 
                        onChange={(e) => setMetaPrimaryText(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="meta-cta" className="text-[10px] font-semibold text-neutral-500 block mb-1">Call to Action (CTA)</label>
                        <select 
                          id="meta-cta"
                          name="metaCta"
                          value={metaCta} 
                          onChange={(e) => setMetaCta(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                        >
                          <option value="LEARN_MORE">Learn More</option>
                          <option value="SIGN_UP">Sign Up</option>
                          <option value="SHOP_NOW">Shop Now</option>
                          <option value="DOWNLOAD">Download App</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="meta-landing-page" className="text-[10px] font-semibold text-neutral-500 block mb-1">Landing Destination URL</label>
                        <input 
                          id="meta-landing-page"
                          name="metaLandingPage"
                          type="text" 
                          value={metaLandingPage} 
                          onChange={(e) => setMetaLandingPage(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
 
              {/* SEO VIEW */}
              {mode === "SEO" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <label htmlFor="seo-keywords" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Target Focus Keywords (comma-separated)</label>
                    <input 
                      id="seo-keywords"
                      name="seoKeywords"
                      type="text" 
                      value={seoTargetKeywordsInput} 
                      onChange={(e) => setSeoTargetKeywordsInput(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                    />
                  </div>
 
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="seo-meta-title" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Meta Page Title</label>
                      <input 
                        id="seo-meta-title"
                        name="seoMetaTitle"
                        type="text" 
                        value={seoMetaTitle} 
                        onChange={(e) => setSeoMetaTitle(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="seo-url-slug" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">URL Slug</label>
                      <input 
                        id="seo-url-slug"
                        name="seoUrlSlug"
                        type="text" 
                        value={seoUrlSlug} 
                        onChange={(e) => setSeoUrlSlug(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>
 
                  <div>
                    <label htmlFor="seo-meta-description" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Meta Description (120-160 characters)</label>
                    <input 
                      id="seo-meta-description"
                      name="seoMetaDescription"
                      type="text" 
                      value={seoMetaDescription} 
                      onChange={(e) => setSeoMetaDescription(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                    />
                  </div>
 
                  <div>
                    <label htmlFor="seo-body-content" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Content Body Content (Optimized Density)</label>
                    <textarea 
                      id="seo-body-content"
                      name="seoBodyContent"
                      value={seoBodyContent} 
                      onChange={(e) => setSeoBodyContent(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                    />
                  </div>
 
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="seo-backlink-budget" className="text-[10px] font-black text-neutral-600 uppercase block mb-1">Backlink Strategy Budget ($)</label>
                      <input 
                        id="seo-backlink-budget"
                        name="seoBacklinkBudget"
                        type="number" 
                        value={seoBacklinkBudget} 
                        onChange={(e) => setSeoBacklinkBudget(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-bold border border-neutral-205 rounded-xl focus:outline-none"
                      />
                    </div>
                    
                    {/* Checklist */}
                    <div>
                      <label className="text-[10px] font-black text-neutral-600 uppercase block mb-2">Technical SEO Checklist</label>
                      <div className="space-y-1 bg-neutral-50 p-3 rounded-xl border border-neutral-200/60 grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="checkbox" 
                            id="ssl" 
                            checked={seoTechnicalSSL} 
                            onChange={(e) => setSeoTechnicalSSL(e.target.checked)} 
                          />
                          <label htmlFor="ssl" className="text-[10px] font-bold text-neutral-700">SSL Certificate</label>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="checkbox" 
                            id="sitemap" 
                            checked={seoTechnicalSitemap} 
                            onChange={(e) => setSeoTechnicalSitemap(e.target.checked)} 
                          />
                          <label htmlFor="sitemap" className="text-[10px] font-bold text-neutral-700">XML Sitemap</label>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="checkbox" 
                            id="mobile" 
                            checked={seoTechnicalMobile} 
                            onChange={(e) => setSeoTechnicalMobile(e.target.checked)} 
                          />
                          <label htmlFor="mobile" className="text-[10px] font-bold text-neutral-700">Mobile Friendly</label>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="checkbox" 
                            id="robots" 
                            checked={seoTechnicalRobots} 
                            onChange={(e) => setSeoTechnicalRobots(e.target.checked)} 
                          />
                          <label htmlFor="robots" className="text-[10px] font-bold text-neutral-700">robots.txt config</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 border-t border-neutral-100 pt-4">
                <Button 
                  variant="outline" 
                  onClick={handleSaveDecision}
                  className="text-xs font-bold px-5 h-9 rounded-xl border-neutral-200"
                >
                  Save Settings
                </Button>
                <Button 
                  onClick={handleRunSimulation}
                  className="bg-indigo-650 hover:bg-indigo-755 text-white text-xs font-black px-6 h-9 rounded-xl"
                >
                  Run simulation round
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-6 border-neutral-200 shadow-sm bg-white text-center space-y-4 py-12">
              <Clock className="h-12 w-12 text-indigo-650 mx-auto animate-pulse" />
              <h3 className="text-base font-black text-neutral-900">Campaign settings locked for this round</h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                {isProcessing 
                  ? "Your decisions are locked and the simulation calculations are processing." 
                  : "You have completed this round's execution cycle. Review the report or start the next cycle."}
              </p>
              
              {isResultsReady && (
                <div className="pt-2">
                  <Button onClick={handleNextRound} className="bg-indigo-650 hover:bg-indigo-700 text-white font-black text-xs px-6 h-10 rounded-xl flex items-center gap-2 mx-auto">
                    Start Next Cycle / Day
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {isProcessing && process.env.NODE_ENV !== 'production' && (
                <div className="pt-2">
                  <Button onClick={handleFastForward} className="bg-indigo-650 hover:bg-indigo-700 text-white font-black text-xs px-6 h-10 rounded-xl mx-auto">
                    Fast-Forward processing (Dev Mode)
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Mode Specific Results Output */}
          {report && (
            <Card className="p-6 border-neutral-200 shadow-sm bg-white space-y-6">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                <BarChart3 className="h-5 w-5 text-indigo-650" />
                <h2 className="text-base font-black text-neutral-900">Simulation Campaign Performance Report</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/50">
                  <span className="text-[9px] text-neutral-400 font-bold block uppercase">Impressions</span>
                  <span className="text-sm font-black text-neutral-850 block mt-0.5">{report.summary.impressions.toLocaleString()}</span>
                </div>
                <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/50">
                  <span className="text-[9px] text-neutral-400 font-bold block uppercase">Clicks</span>
                  <span className="text-sm font-black text-neutral-850 block mt-0.5">{report.summary.clicks.toLocaleString()}</span>
                </div>
                <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/50">
                  <span className="text-[9px] text-neutral-400 font-bold block uppercase">Conversions</span>
                  <span className="text-sm font-black text-neutral-850 block mt-0.5">{report.summary.conversions.toLocaleString()}</span>
                </div>
                <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/50">
                  <span className="text-[9px] text-neutral-400 font-bold block uppercase">Total Cost</span>
                  <span className="text-sm font-black text-rose-600 block mt-0.5">${report.summary.cost.toLocaleString()}</span>
                </div>
                <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/50">
                  <span className="text-[9px] text-neutral-400 font-bold block uppercase">Revenue</span>
                  <span className="text-sm font-black text-emerald-600 block mt-0.5">${report.summary.revenue.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div className="border border-neutral-200/60 p-3.5 rounded-xl">
                  <span className="text-[9px] text-neutral-400 font-bold block uppercase">CTR</span>
                  <span className="text-xs font-black text-neutral-800 block mt-0.5">{(report.summary.ctr * 100).toFixed(2)}%</span>
                </div>
                <div className="border border-neutral-200/60 p-3.5 rounded-xl">
                  <span className="text-[9px] text-neutral-400 font-bold block uppercase">Avg CPC</span>
                  <span className="text-xs font-black text-neutral-800 block mt-0.5">${report.summary.cpc.toFixed(2)}</span>
                </div>
                <div className="border border-neutral-200/60 p-3.5 rounded-xl">
                  <span className="text-[9px] text-neutral-400 font-bold block uppercase">Avg CPA</span>
                  <span className="text-xs font-black text-neutral-800 block mt-0.5">${report.summary.cpa.toFixed(2)}</span>
                </div>
                <div className="border border-neutral-200/60 p-3.5 rounded-xl">
                  <span className="text-[9px] text-neutral-400 font-bold block uppercase">ROAS</span>
                  <span className="text-xs font-black text-neutral-800 block mt-0.5">{report.summary.roas.toFixed(2)}x</span>
                </div>
              </div>
            </Card>
          )}

        </div>

        {/* Locked Delay Timer & Certs */}
        <div className="space-y-6 text-left">
          
          {/* Active Campaign Card */}
          <Card className="border border-neutral-200 bg-white p-6 space-y-4 shadow-sm">
            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Campaign Overview</span>
            
            <div className="divide-y divide-neutral-100 text-xs">
              <div className="py-2.5 flex justify-between items-center font-semibold">
                <span className="text-neutral-500">Selected Simulation Type</span>
                <Badge className="bg-indigo-50 text-indigo-850 border-none font-bold uppercase text-[9px]">{mode.replace('_', ' ')}</Badge>
              </div>
              <div className="py-2.5 flex justify-between items-center font-semibold">
                <span className="text-neutral-500">Selected Scenario</span>
                <span className="text-neutral-800 font-black truncate max-w-[150px]">{state.class?.scenario?.name}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center font-semibold">
                <span className="text-neutral-500">Timing / Duration</span>
                <span className="text-neutral-800 font-black">{state.class?.scenario?.maxRounds} days total</span>
              </div>
              
              {progress?.nextResultAt && (
                <div className="py-2.5 flex justify-between items-center font-semibold text-amber-600">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Next Result Unlock</span>
                  <span className="font-black text-[10px]">{new Date(progress.nextResultAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Certificate Band */}
          {isCompleted && (
            certEligible ? (
              <Card className="p-6 border-violet-200 shadow-md bg-violet-50/20 text-left space-y-4 animate-in fade-in duration-300">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-violet-650 uppercase tracking-widest bg-violet-55 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-max">
                    <Sparkles className="h-3.5 w-3.5 fill-violet-650 animate-pulse" />
                    Graduation Certificate Status
                  </span>
                  <h2 className="text-sm font-black text-neutral-900 mt-2">
                    {certEligible.eligible ? `Eligible: ${certEligible.band} Certification` : 'Graduation Check'}
                  </h2>
                  <p className="text-[11px] text-neutral-500 font-medium">
                    Certificates are awarded based on campaign performance score &ge; 60% and adaptability index &ge; 50%.
                  </p>
                </div>

                {certEligible.eligible ? (
                  <Button onClick={handleGenerateCertificate} className="w-full bg-violet-650 hover:bg-violet-755 text-white font-black text-xs h-9 rounded-xl flex items-center justify-center gap-2">
                    <Download className="h-4 w-4" />
                    Download Certificate PDF
                  </Button>
                ) : (
                  <Badge className="bg-rose-50 text-rose-800 border border-rose-200 font-black text-[10px] w-full justify-center py-1">
                    Not Eligible
                  </Badge>
                )}

                {!certEligible.eligible && certEligible.reasons && certEligible.reasons.length > 0 && (
                  <div className="bg-white/80 border border-rose-100 rounded-xl p-3 text-[11px] space-y-1">
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider block">Failed Criteria:</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-neutral-600 font-semibold">
                      {certEligible.reasons.map((r: string, index: number) => (
                        <li key={index}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="p-6 border-neutral-200 shadow-sm bg-white text-left space-y-3">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Graduation Certificate</span>
                <span className="text-xs text-neutral-500 font-bold block">Certificate eligibility status check is currently unavailable.</span>
                <Button 
                  onClick={checkCertificate} 
                  disabled={checkingCert}
                  className="w-full text-xs font-bold bg-neutral-900 hover:bg-neutral-950 text-white h-9 rounded-xl flex items-center justify-center gap-1.5 animate-none"
                >
                  <RefreshCw className={`h-4 w-4 ${checkingCert ? 'animate-spin' : ''}`} />
                  Check Eligibility
                </Button>
              </Card>
            )
          )}

          {/* Quick Exit */}
          <Link to="/simulation" className="block">
            <Button variant="outline" className="w-full text-xs font-bold border-neutral-200 rounded-xl h-9">
              Exit Sandbox Workspace
            </Button>
          </Link>

        </div>

      </div>

    </div>
  )
}
export default SandboxWorkspace;
