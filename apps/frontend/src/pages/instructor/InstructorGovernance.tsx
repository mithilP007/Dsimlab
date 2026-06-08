import { useState, useEffect } from "react"
import { useAuthStore } from "@/stores/authStore"
import { Navigate } from "react-router"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import api from "@/lib/api"
import {
  Cpu, BarChart3, BookOpen, Clock, GitBranch,
  Database, Lock, AlertTriangle, CheckCircle2,
  Info, ChevronRight, RefreshCw
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string
  simulationId: string
  studentName?: string
  round: number
  action: string
  platform?: string
  impactSummary?: string
  createdAt: string
}

const SIMULATION_STATES = [
  { name: "INITIALIZED", color: "bg-neutral-100 text-neutral-600", who: "System", description: "Simulation workspace created. No decisions submitted yet.", frozen: "Nothing" },
  { name: "DECISION_OPEN", color: "bg-sky-100 text-sky-700", who: "Student", description: "Student can freely enter and modify campaign decisions for the current round.", frozen: "Previous round results" },
  { name: "LOCKED", color: "bg-amber-100 text-amber-700", who: "System", description: "Student has submitted decisions. Awaiting processing trigger.", frozen: "Current round decisions" },
  { name: "PROCESSING", color: "bg-violet-100 text-violet-700", who: "System", description: "Simulation engine is computing auction results, SEO rankings, and performance metrics.", frozen: "All data" },
  { name: "RESULTS_READY", color: "bg-emerald-100 text-emerald-700", who: "Student", description: "Round results are available. Student can view metrics, AI insights, and score breakdown.", frozen: "Computed results" },
  { name: "SCORE_LOCKED", color: "bg-blue-100 text-blue-700", who: "Instructor", description: "Instructor has locked the final score for this round. No adjustments possible.", frozen: "Round scores" },
  { name: "COMPLETED", color: "bg-neutral-900 text-white", who: "System", description: "All rounds exhausted. Simulation closed. Certificate eligibility can be evaluated.", frozen: "All round data permanently" },
]

const SCENARIO_TEMPLATES = [
  {
    name: "SEO-Dominant Growth Scenario",
    difficulty: "Medium",
    duration: "30 days",
    objective: "Maximize organic traffic share over paid channels",
    skills: ["Keyword research & ranking", "Content quality optimization", "Backlink strategy", "Long-term compounding SEO returns"],
    description: "A market where organic search drives 70% of customer acquisition. Students must balance SEO investment against paid ad spend while managing domain authority growth over multiple rounds.",
  },
  {
    name: "Budget-Constrained Startup",
    difficulty: "Hard",
    duration: "15 days",
    objective: "Achieve profitable ROAS within tight spending limits",
    skills: ["Budget allocation under constraints", "High-intent keyword selection", "Bid strategy optimization", "Negative keyword filtering"],
    description: "Limited total budget forces students to prioritize channel efficiency. Google Ads and Meta CPM compete for the same wallet. Poor allocation causes campaigns to exhaust budget before round completion.",
  },
  {
    name: "High-Competition Market",
    difficulty: "Expert",
    duration: "30 days",
    objective: "Win market share against aggressive rival bidders",
    skills: ["Quality Score optimization", "Ad rank mechanics", "Impression share analysis", "Landing page experience"],
    description: "Mock rivals bid aggressively with large budgets. Student must improve Quality Score, landing page relevance, and ad copy precision to win auctions cost-effectively against better-funded competitors.",
  },
  {
    name: "Algorithm Volatility Scenario",
    difficulty: "Hard",
    duration: "30 days",
    objective: "Adapt strategy to sudden platform and market shifts",
    skills: ["Adaptive campaign management", "Event response agility", "Cross-platform reallocation", "Creative refresh cadence"],
    description: "Random market events (algorithm updates, seasonal spikes, competitor moves, policy changes) fire at unpredictable intervals. Students must pivot strategy mid-simulation to maintain performance.",
  },
]

const DATA_MODELS = [
  {
    name: "Student Profile",
    fields: ["id (UUID)", "name", "email", "role (STUDENT_COLLEGE | INDIVIDUAL)", "classId", "planType", "institution"],
    notes: "Roles are set at registration and cannot be manually changed post-login.",
  },
  {
    name: "Class Enrollment",
    fields: ["id", "name", "inviteCode", "instructorId", "scenarioId", "createdAt"],
    notes: "Students join via inviteCode. Each class has one scenario assigned.",
  },
  {
    name: "Scenario Assignment",
    fields: ["id", "name", "industry", "durationDays", "budgetPerRound", "maxRounds", "targetKPI", "allowedPlatforms", "difficulty", "dataMode"],
    notes: "dataMode defaults to REAL_TIME_TREND_SIMULATION. Scenario parameters drive engine behavior.",
  },
  {
    name: "Decision Log",
    fields: ["id", "simulationId", "round", "seoTargetKeywords", "seoContentQuality", "seoBacklinkBudget", "googleCampaigns (JSON)", "metaCampaigns (JSON)", "submitted", "createdAt"],
    notes: "One decision record per round. Decisions are immutable once round transitions to LOCKED.",
  },
  {
    name: "Performance Metrics",
    fields: ["id", "simulationId", "round", "day (1-30)", "organicClicks", "googleClicks", "googleCost", "googleConversions", "metaClicks", "metaCost", "metaConversions", "revenue"],
    notes: "30 daily metric rows per round. Used for charting and trend analysis.",
  },
  {
    name: "Score Summary",
    fields: ["id", "simulationId", "round", "seoScore", "googleAdsScore", "metaAdsScore", "budgetScore", "revenueScore", "compositeScore"],
    notes: "Composite is weighted average. ScoreBreakdown records are immutable once SCORE_LOCKED.",
  },
  {
    name: "Round Snapshot",
    fields: ["id", "simulationId", "round", "data (JSON blob)", "createdAt"],
    notes: "Immutable audit record created after each round. Contains scores, metrics, market conditions, and AI insights. Cannot be modified after creation.",
  },
]

// ─── Tab: Simulation Engine ───────────────────────────────────────────────────

function SimulationEngineTab() {
  const inputCategories = [
    {
      label: "SEO Inputs",
      items: ["Target keywords", "Content quality score (1–10)", "Backlink budget ($)", "Domain Authority (DA) accumulates round-over-round", "Page Authority (PA) calculated per content quality"],
    },
    {
      label: "Google Ads Inputs",
      items: ["Campaign objective (Sales / Leads / Traffic / Brand Awareness)", "Bidding strategy (Manual CPC / Maximize Clicks / Maximize Conversions)", "Keyword bids ($) per keyword", "Match type (Broad / Phrase / Exact)", "Negative keywords list", "Ad copy (3 headlines, 2 descriptions)", "Landing page quality (6 dimensions, 1–10 each)", "Device targeting (Desktop / Mobile / Tablet)", "Location targeting", "Daily budget ($)"],
    },
    {
      label: "Meta Ads Inputs",
      items: ["Campaign objective (Awareness / Traffic / Engagement / Leads / Sales)", "Audience interest segment", "Placement (Feeds / Stories / Reels / Auto)", "Creative quality score (1–10)", "Creative headline & primary text", "Daily budget ($)", "Creative freshness (same vs. changed round-over-round)"],
    },
  ]

  const processingSteps = [
    { step: "1", label: "Market Condition Build", desc: "Real-time trend signals (SerpAPI/NewsAPI) are fetched and converted into demand index, competition index, CPC/CPM pressure, and seasonal modifiers." },
    { step: "2", label: "Market Event Roll", desc: "Probabilistic engine rolls for random events (algorithm updates, competitor surges, policy changes). Instructor-triggered events are merged in." },
    { step: "3", label: "SEO Engine", desc: "Domain Authority and Page Authority computed from cumulative backlink spend and content quality. Organic rank calculated against preset competitor profiles. Click-through rate and conversion rate derived from rank position." },
    { step: "4", label: "Google Ads Auction (GSP)", desc: "Quality Score computed from ad copy relevance, landing page dimensions, and keyword intent. Ad Rank = bid × Quality Score. Second-price auction (GSP) determines actual CPC. Budget pacing caps delivery to campaign budget ceiling." },
    { step: "5", label: "Meta Ads CPM Auction", desc: "Base CPM fetched from placement × audience tier matrix. Objective multiplier applied. Impressions = (budget / CPM) × 1000. CTR computed from creative quality + fatigue decay. Conversions = clicks × CVR × social buzz multiplier. Total spend capped at campaign budget ceiling." },
    { step: "6", label: "Daily Metric Generation", desc: "30-day time-series generated by distributing round totals with ±15% seeded random variance per day. Stored in DailyMetric table for charting." },
    { step: "7", label: "Scoring", desc: "5 dimension scores computed: SEO, Google Ads ROAS, Meta Ads ROAS, Budget Discipline, Revenue. Weighted composite index (0–100) calculated. Percentile rank computed against class cohort." },
    { step: "8", label: "Snapshot & Lock", desc: "RoundSnapshot created (immutable). SimulationState advanced to next round. Score record sealed for audit." },
  ]

  return (
    <div className="space-y-8">
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
        <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 font-medium leading-relaxed">
          This view is <strong>instructor-only</strong>. The specific formula weights, auction constants, and scoring parameters are not disclosed to students to preserve simulation integrity. What is shown here is the architectural overview for academic transparency.
        </p>
      </div>

      {/* Input Categories */}
      <div>
        <h3 className="text-sm font-black text-neutral-900 mb-4 uppercase tracking-wider">Simulation Inputs</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {inputCategories.map((cat) => (
            <Card key={cat.label} className="border-neutral-200 bg-neutral-50/50 rounded-xl">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-black text-neutral-700 uppercase tracking-wider">{cat.label}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ul className="space-y-1.5">
                  {cat.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-neutral-600">
                      <ChevronRight className="h-3 w-3 shrink-0 mt-0.5 text-neutral-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Processing Pipeline */}
      <div>
        <h3 className="text-sm font-black text-neutral-900 mb-4 uppercase tracking-wider">Processing Pipeline — Per Round</h3>
        <div className="space-y-3">
          {processingSteps.map((s) => (
            <div key={s.step} className="flex items-start gap-4 p-4 rounded-xl border border-neutral-200 bg-white">
              <div className="h-7 w-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-xs font-black shrink-0">
                {s.step}
              </div>
              <div>
                <p className="text-xs font-black text-neutral-900">{s.label}</p>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Models */}
      <div>
        <h3 className="text-sm font-black text-neutral-900 mb-4 uppercase tracking-wider">Key Mathematical Models</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { name: "Competition Intensity Model", desc: "Rival bidders are seeded per class + round to ensure all classmates face identical market conditions. Rival bids scale with market competitionIndex from trend data." },
            { name: "Market Demand Model", desc: "Demand index derived from real-time Google Trends search interest for scenario keywords. High demand amplifies impressions and conversions; low demand suppresses them." },
            { name: "Algorithm Volatility Model", desc: "Probabilistic event trigger engine fires 0–3 events per round. Events modify SEO CTR, CPC pressure, CPM, and conversion intent multipliers independently." },
            { name: "Diminishing Returns Logic", desc: "Backlink budget yields decreasing DA growth per round. Repeated same-creative Meta Ads trigger fatigue decay on CTR. Keyword over-saturation lowers impression share." },
          ].map((m) => (
            <Card key={m.name} className="border-neutral-200 bg-white rounded-xl">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-black text-neutral-900">{m.name}</p>
                <p className="text-xs text-neutral-500 leading-relaxed">{m.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Scoring Framework ───────────────────────────────────────────────────

function ScoringFrameworkTab() {
  const dimensions = [
    { name: "Strategic Alignment", weight: "20%", desc: "Measures how well the student's campaign objective, keyword intent, audience targeting, and overall strategy aligns with the scenario's target KPI (revenue / clicks / conversions).", indicators: ["Objective matches scenario KPI", "Keywords match product/service intent", "Meta audience interest relevance"] },
    { name: "Budget Discipline", weight: "15%", desc: "Evaluates efficiency of budget allocation across SEO, Google Ads, and Meta Ads relative to the scenario's budgetPerRound ceiling. Over-spending and under-utilization both reduce this score.", indicators: ["Total spend vs. budget ceiling ratio", "Per-platform allocation balance", "Pacing efficiency (no zero-delivery days)"] },
    { name: "Optimization Skill", weight: "20%", desc: "Rewards students who apply optimization techniques: using exact match keywords, filtering negative keywords, refreshing creatives, improving landing page quality round-over-round.", indicators: ["Match type selection", "Negative keyword count", "Creative refresh cadence", "Landing page quality improvement trajectory"] },
    { name: "Audience & Keyword Quality", weight: "15%", desc: "Quality Score in Google Ads and audience relevance in Meta Ads. Derived from ad copy–keyword alignment, landing page experience, and creative relevance to audience interest.", indicators: ["Google Quality Score (1–10)", "Meta relevance ranking (Below Avg / Avg / Above Avg)", "Keyword-to-headline relevance"] },
    { name: "Creative Quality", weight: "10%", desc: "Meta Ad creative quality directly affects CPM, CTR, and conversion rate. High creative quality + fresh copy each round maximizes reach without increasing spend.", indicators: ["creativeQuality score (1–10)", "Fatigue factor (same vs. refreshed creative)", "Headline and primary text length/specificity"] },
    { name: "Adaptability", weight: "10%", desc: "Rewards strategy changes in response to market events and declining performance. Students who modify their approach after a bad round score higher than those who repeat identical decisions.", indicators: ["Decision variance round-over-round", "Response to market events", "Budget reallocation after negative result"] },
    { name: "ROI Efficiency", weight: "10%", desc: "ROAS (Return on Ad Spend) for both Google and Meta channels. Revenue generated per dollar spent. Higher conversion rates and lower CPAs drive this dimension.", indicators: ["Google ROAS = (conversions × price) / cost", "Meta ROAS = (conversions × price) / cost", "Combined CPA vs. average price point"] },
  ]

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex items-start gap-3">
        <Info className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
        <p className="text-xs text-sky-800 font-medium leading-relaxed">
          Raw formula weights and exact scoring constants are <strong>not disclosed to students</strong>. Students see their composite score and dimension scores as percentages only. This prevents gaming the scoring model rather than learning genuine marketing skills.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {dimensions.map((dim) => (
          <Card key={dim.name} className="border-neutral-200 bg-white rounded-xl">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-neutral-900">{dim.name}</p>
                <Badge variant="outline" className="text-xs font-black border-neutral-200 text-neutral-700">{dim.weight}</Badge>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">{dim.desc}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {dim.indicators.map((ind) => (
                  <span key={ind} className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">{ind}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-neutral-200 bg-neutral-900 text-white rounded-xl">
        <CardContent className="p-5 space-y-2">
          <p className="text-sm font-black">Composite Score Formula (Conceptual)</p>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Composite = Σ (dimension_score × weight) for all 7 dimensions. Each dimension is normalized 0–100. Final composite is also 0–100. Percentile rank is computed relative to all student simulations in the same class cohort.
          </p>
          <p className="text-xs text-neutral-500 mt-2">Note: Exact weights are configurable per scenario and are not exposed in the student-facing UI.</p>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab: Scenario Templates ──────────────────────────────────────────────────

function ScenarioTemplatesTab() {
  return (
    <div className="space-y-6">
      <p className="text-xs text-neutral-500 font-medium leading-relaxed">
        These pre-built scenario templates can be used directly or as starting points when creating custom classroom scenarios. Each template is designed around specific learning objectives and skill progressions.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {SCENARIO_TEMPLATES.map((tmpl) => (
          <Card key={tmpl.name} className="border-neutral-200 bg-white rounded-xl hover:shadow-md transition-shadow">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-black text-neutral-900 leading-snug">{tmpl.name}</CardTitle>
                <div className="flex gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-[9px] font-black border-neutral-200">{tmpl.difficulty}</Badge>
                  <Badge variant="outline" className="text-[9px] font-black border-neutral-200">{tmpl.duration}</Badge>
                </div>
              </div>
              <CardDescription className="text-xs text-neutral-600 mt-2 leading-relaxed font-medium">{tmpl.description}</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3">
              <div>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-2">Learning Objective</p>
                <p className="text-xs text-neutral-700 font-semibold">{tmpl.objective}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-2">Skills Tested</p>
                <div className="flex flex-wrap gap-1.5">
                  {tmpl.skills.map((skill) => (
                    <span key={skill} className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">{skill}</span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Decision Audit Trail ────────────────────────────────────────────────

function DecisionAuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)

  const loadAudit = async () => {
    setLoading(true)
    try {
      const res = await api.get<{ success: boolean; logs: any[] }>('/api/audit')
      // Map log records into display-friendly AuditEntry shape
      const mapped: AuditEntry[] = (res.data.logs || []).map((log: any) => ({
        id: log.id,
        simulationId: log.simulationId || '',
        studentName: log.user?.name || undefined,
        round: log.round || 0,
        action: log.action || log.message || 'Audit event',
        platform: log.platform || undefined,
        impactSummary: log.metadata ? JSON.stringify(log.metadata).slice(0, 80) : undefined,
        createdAt: log.createdAt,
      }))
      setEntries(mapped)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAudit() }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500 font-medium">Decision-by-decision timeline of student strategy changes, market event impacts, and score outcomes. Visible to instructor only.</p>
        <Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={loadAudit} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {entries.length === 0 ? (
        <Card className="border-neutral-200 rounded-xl">
          <CardContent className="p-8 text-center space-y-2">
            <Clock className="h-8 w-8 text-neutral-300 mx-auto" />
            <p className="text-sm font-bold text-neutral-500">No audit entries yet</p>
            <p className="text-xs text-neutral-400">Audit entries are created automatically as students submit decisions and rounds are processed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-start gap-4 p-4 rounded-xl border border-neutral-200 bg-white">
              <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 text-violet-600">
                <Clock className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-black text-neutral-900">{entry.studentName || entry.simulationId.slice(0, 8)}</p>
                  <Badge variant="outline" className="text-[9px] font-black">Round {entry.round}</Badge>
                  {entry.platform && <Badge variant="outline" className="text-[9px] font-black border-sky-200 text-sky-700">{entry.platform}</Badge>}
                </div>
                <p className="text-xs text-neutral-600 mt-1">{entry.action}</p>
                {entry.impactSummary && <p className="text-[11px] text-neutral-400 mt-0.5 font-medium">{entry.impactSummary}</p>}
              </div>
              <span className="text-[10px] text-neutral-400 font-bold shrink-0">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Simulation States ───────────────────────────────────────────────────

function SimulationStatesTab() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500 font-medium leading-relaxed">
        The simulation follows a strict state machine. Each transition is validated server-side. State regressions are not permitted except through instructor Evaluation Lock actions.
      </p>
      <div className="space-y-3">
        {SIMULATION_STATES.map((s, i) => (
          <div key={s.name} className="flex items-start gap-4">
            {i < SIMULATION_STATES.length - 1 && (
              <div className="flex flex-col items-center">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-black ${s.color}`}>
                  {i + 1}
                </div>
                <div className="w-0.5 bg-neutral-200 flex-1 mt-1 mb-0 h-6" />
              </div>
            )}
            {i === SIMULATION_STATES.length - 1 && (
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-black ${s.color}`}>
                {i + 1}
              </div>
            )}
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-black text-neutral-900">{s.name}</p>
                <Badge variant="outline" className="text-[9px] font-bold border-neutral-200">Actor: {s.who}</Badge>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">{s.description}</p>
              <p className="text-[11px] text-neutral-400 mt-1">Frozen: <span className="font-bold">{s.frozen}</span></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Data Models ─────────────────────────────────────────────────────────

function DataModelsTab() {
  return (
    <div className="space-y-5">
      <p className="text-xs text-neutral-500 font-medium leading-relaxed">
        Overview of all database entities. <strong>RoundSnapshot</strong> records are immutable by design — they serve as the audit-safe record of simulation performance for academic integrity purposes.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DATA_MODELS.map((model) => (
          <Card key={model.name} className="border-neutral-200 bg-white rounded-xl">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-neutral-500" />
                <CardTitle className="text-xs font-black text-neutral-900">{model.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {model.fields.map((f) => (
                  <code key={f} className="text-[10px] font-mono bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded">{f}</code>
                ))}
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed pt-1">{model.notes}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-amber-200 bg-amber-50 rounded-xl">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-amber-800">Academic Retention Policy</p>
            <p className="text-xs text-amber-700 leading-relaxed mt-1">
              Round snapshots, score locks, certificate audit logs, and instructor approvals are retained for academic audit purposes. These records cannot be deleted from the system by instructors or students. Administrators may archive data per institutional data governance policies.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab: Evaluation Locks ────────────────────────────────────────────────────

function EvaluationLocksTab() {
  const [classId, setClassId] = useState("")
  const [loading, setLoading] = useState(false)

  const handleReset = async () => {
    if (!classId) { toast.error("Enter a Class ID to reset"); return }
    setLoading(true)
    try {
      await api.post(`/api/classes/${classId}/reset`)
      toast.success("Class simulation reset successfully. All student simulations have been cleared.")
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Reset failed")
    } finally {
      setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
        <p className="text-xs text-red-800 font-medium leading-relaxed">
          Evaluation lock actions affect all students in a class. These actions cannot be undone. <strong>Individual student scores cannot be edited manually</strong> — the system only allows class-wide resets or grade locks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50", title: "Lock Final Grades", desc: "Transitions all completed simulations in a class to SCORE_LOCKED. No further round processing is permitted after this action.", action: "Lock Grades", disabled: true, note: "Use class dashboard to trigger grade locks per-student." },
          { icon: Lock, color: "text-amber-600 bg-amber-50", title: "Reopen Decision Window", desc: "Allows instructor to manually reopen a LOCKED round so a student can resubmit decisions. Use when a student encountered a technical issue.", action: "Reopen Round", disabled: true, note: "Go to Class Manager → select student → Reopen Round." },
          { icon: Clock, color: "text-sky-600 bg-sky-50", title: "Extend Deadline", desc: "Grants additional time for a student to submit pending decisions. Does not affect other students in the class.", action: "Extend Deadline", disabled: true, note: "Configure deadline extension in Class Manager settings." },
          { icon: RefreshCw, color: "text-red-600 bg-red-50", title: "Reset Class Simulation", desc: "Clears all student simulation states for a class. All rounds, decisions, metrics, and scores are deleted. This cannot be undone.", action: "Reset Class", disabled: false, note: "" },
        ].map((action) => (
          <Card key={action.title} className={`border-neutral-200 bg-white rounded-xl ${!action.disabled ? 'border-red-200' : ''}`}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg ${action.color} flex items-center justify-center`}>
                  <action.icon className="h-4.5 w-4.5" />
                </div>
                <p className="text-sm font-black text-neutral-900">{action.title}</p>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">{action.desc}</p>
              {action.note && <p className="text-[11px] text-neutral-400 italic">{action.note}</p>}
              {!action.disabled && (
                <div className="space-y-2 pt-1">
                  <input
                    className="w-full h-8 text-xs border border-neutral-200 rounded-lg px-3 font-mono"
                    placeholder="Class ID (UUID)"
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full h-8 text-xs font-black"
                    onClick={handleReset}
                    disabled={loading}
                  >
                    {loading ? "Resetting..." : action.action}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InstructorGovernance() {
  const { user } = useAuthStore()

  // Strict instructor/admin gate
  if (!user || (user.role !== "instructor" && user.role !== "admin")) {
    return <Navigate to="/" replace />
  }

  const tabs = [
    { id: "engine", label: "Simulation Engine", icon: Cpu, component: SimulationEngineTab },
    { id: "scoring", label: "Scoring Framework", icon: BarChart3, component: ScoringFrameworkTab },
    { id: "templates", label: "Scenario Templates", icon: BookOpen, component: ScenarioTemplatesTab },
    { id: "audit", label: "Decision Audit Trail", icon: Clock, component: DecisionAuditTab },
    { id: "states", label: "Simulation States", icon: GitBranch, component: SimulationStatesTab },
    { id: "models", label: "Data Models", icon: Database, component: DataModelsTab },
    { id: "locks", label: "Evaluation Locks", icon: Lock, component: EvaluationLocksTab },
  ]

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-2xs relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-[9px] font-black border-violet-200 text-violet-700 bg-violet-50 uppercase">Instructor Only</Badge>
          </div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Instructor Governance Console</h2>
          <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
            Academic platform transparency — simulation engine mechanics, scoring framework, audit trail
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="engine" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1 p-1 bg-neutral-100 rounded-xl w-full justify-start">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="h-8 text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {tabs.map((tab) => {
          const Component = tab.component
          return (
            <TabsContent key={tab.id} value={tab.id} className="mt-6">
              <Component />
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}

export default InstructorGovernance
