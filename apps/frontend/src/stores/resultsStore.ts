import { create } from "zustand"
import api from "@/lib/api"

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ChannelSeoScore {
  score: number
  previous: number
  traffic: number
  keywords: number
  backlinks: number
}

export interface ChannelGoogleAdsScore {
  score: number
  previous: number
  impressions: number
  clicks: number
  conversions: number
  spend: number
  cpc: number
  ctr: number
}

export interface ChannelMetaAdsScore {
  score: number
  previous: number
  reach: number
  impressions: number
  clicks: number
  conversions: number
  spend: number
  cpc: number
  ctr: number
  roas: number
}

export interface DailyTrafficPoint {
  day: number
  organic: number
  paid: number
  social: number
  total: number
}

export interface KeywordRanking {
  keyword: string
  position: number
  previousPosition: number
  change: number
  volume: number
  trend: number[]
}

export interface InsightItem {
  type: "success" | "warning" | "tip"
  title: string
  description: string
  metric?: string
  value?: number
}

export interface SimulationBadge {
  name: string
  description: string
  earned: boolean
  icon: string
}

export interface ResultsState {
  currentRound: number
  totalRounds: number
  overallScore: number
  previousScore: number
  scoreChange: number
  classRank: number
  totalStudents: number
  previousRank: number
  rankChange: number
  channelScores: {
    seo: ChannelSeoScore
    googleAds: ChannelGoogleAdsScore
    metaAds: ChannelMetaAdsScore
  }
  dailyTraffic: DailyTrafficPoint[]
  keywordRankings: KeywordRanking[]
  insights: InsightItem[]
  badges: SimulationBadge[]
  decisions: {
    seo: boolean
    googleAds: boolean
    metaAds: boolean
  }
  isLoading: boolean

  // Phase 2 Historical/Context Data
  breakdowns: any[]
  snapshots: any[]
  leaderboard: any[]
  events: any[]
  allMetrics: any[]

  // Actions
  fetchResults: (simulationId: string) => Promise<void>
  calculateResults: () => void
  advanceRound: () => void
  resetResults: () => void
  generateInsights: () => void
  setDecision: (channel: "seo" | "googleAds" | "metaAds", value: boolean) => void
}

export const useResultsStore = create<ResultsState>((set, get) => ({
  currentRound: 1,
  totalRounds: 10,
  overallScore: 0,
  previousScore: 0,
  scoreChange: 0,
  classRank: 1,
  totalStudents: 1,
  previousRank: 1,
  rankChange: 0,
  channelScores: {
    seo: { score: 0, previous: 0, traffic: 0, keywords: 0, backlinks: 0 },
    googleAds: { score: 0, previous: 0, impressions: 0, clicks: 0, conversions: 0, spend: 0, cpc: 0, ctr: 0 },
    metaAds: { score: 0, previous: 0, reach: 0, impressions: 0, clicks: 0, conversions: 0, spend: 0, cpc: 0, ctr: 0, roas: 0 },
  },
  dailyTraffic: [],
  keywordRankings: [],
  insights: [],
  badges: [
    { name: "SEO Apprentice",   description: "Optimized On-page tags for 3 pages", earned: false,  icon: "Search" },
    { name: "Ad Master",        description: "Achieved ad copy strength of Excellent", earned: false,  icon: "Target" },
    { name: "ROI Booster",       description: "Gained positive ROI of 150%+", earned: false,  icon: "TrendingUp" },
    { name: "Conversion Guru",   description: "Get a conversion rate above 5%", earned: false, icon: "Zap" },
    { name: "Social Lead",       description: "Gained 5000+ social visitors", earned: false, icon: "Share2" },
    { name: "Budget Optimizer",  description: "Keep total spend under $1000", earned: false, icon: "Award" },
  ],
  decisions: {
    seo: false,
    googleAds: false,
    metaAds: false,
  },
  isLoading: false,

  breakdowns: [],
  snapshots: [],
  leaderboard: [],
  events: [],
  allMetrics: [],

  fetchResults: async (simulationId) => {
    set({ isLoading: true })
    try {
      // 1. Fetch simulation details
      const simRes = await api.get<any>(`/api/simulations/${simulationId}`)
      const sim = simRes.data
      const currentRoundNum = sim.currentRound

      // 2. Fetch score breakdowns
      const breakRes = await api.get<{ success: boolean; breakdowns: any[] }>('/api/v1/scoring/breakdown')
      const breakdowns = breakRes.data?.breakdowns || []
      
      const latestBreakdown = breakdowns.find((b) => b.round === currentRoundNum)
      const prevBreakdown = breakdowns.find((b) => b.round === currentRoundNum - 1)

      // 3. Fetch classmate leaderboard
      const leadRes = await api.get<{ success: boolean; leaderboard: any[] }>('/api/v1/scoring/leaderboard')
      const leaderboard = leadRes.data?.leaderboard || []
      const currentRankIndex = leaderboard.findIndex((item) => item.id === simulationId)
      const classRank = currentRankIndex !== -1 ? currentRankIndex + 1 : 1
      const totalStudents = leaderboard.length || 1

      // 4. Fetch daily metrics (all rounds)
      const metricRes = await api.get<{ success: boolean; metrics: any[] }>(`/api/simulations/${simulationId}/metrics`)
      const allMetrics = metricRes.data?.metrics || []
      const metrics = allMetrics.filter((m) => m.round === currentRoundNum)

      // 5. Fetch triggered events
      const eventRes = await api.get<{ success: boolean; events: any[] }>(`/api/simulations/${simulationId}/events`)
      const events = eventRes.data?.events || []

      // 6. Fetch snapshots
      const snapRes = await api.get<{ success: boolean; snapshots: any[] }>(`/api/simulations/${simulationId}/snapshots`)
      const snapshots = snapRes.data?.snapshots || []

      // Aggregate metrics for SEO/Google/Meta (Current Round)
      let seoTraffic = 0
      let googleImpressions = 0, googleClicks = 0, googleConversions = 0, googleSpend = 0
      let metaImpressions = 0, metaClicks = 0, metaConversions = 0, metaSpend = 0

      metrics.forEach((m) => {
        seoTraffic += m.organicClicks || 0
        googleImpressions += m.googleImpressions || 0
        googleClicks += m.googleClicks || 0
        googleConversions += m.googleConversions || 0
        googleSpend += m.googleCost || 0

        metaImpressions += m.metaImpressions || 0
        metaClicks += m.metaClicks || 0
        metaConversions += m.metaConversions || 0
        metaSpend += m.metaCost || 0
      })

      const googleCtr = googleImpressions > 0 ? parseFloat(((googleClicks / googleImpressions) * 100).toFixed(2)) : 0
      const googleCpc = googleClicks > 0 ? parseFloat((googleSpend / googleClicks).toFixed(2)) : 0

      const metaCtr = metaImpressions > 0 ? parseFloat(((metaClicks / metaImpressions) * 100).toFixed(2)) : 0
      const metaCpc = metaClicks > 0 ? parseFloat((metaSpend / metaClicks).toFixed(2)) : 0
      const metaRoas = metaSpend > 0 ? parseFloat(((metaConversions * 120.0) / metaSpend).toFixed(2)) : 0 // sell price $120

      // Map DailyTrafficPoint
      const dailyTraffic: DailyTrafficPoint[] = metrics.map((m) => ({
        day: m.day,
        organic: m.organicClicks || 0,
        paid: m.googleClicks || 0,
        social: m.metaClicks || 0,
        total: (m.organicClicks || 0) + (m.googleClicks || 0) + (m.metaClicks || 0),
      }))

      // Keyword rankings deterministic map based on seoScore
      const seoScore = latestBreakdown?.seoScore || 0
      const targetedKeywords: string[] = latestBreakdown?.seoTargetKeywords ? JSON.parse(latestBreakdown.seoTargetKeywords) : []
      const keywordRankings: KeywordRanking[] = targetedKeywords.map((kw, index) => {
        const seed = kw.length + index
        const position = Math.max(1, Math.round((100 - seoScore) / 5 + (seed % 5)))
        const previousPosition = Math.max(1, position + (seed % 3) - 1)
        return {
          keyword: kw,
          position,
          previousPosition,
          change: previousPosition - position,
          volume: 500 + (kw.length * 150),
          trend: [previousPosition + 2, previousPosition + 1, previousPosition, previousPosition, position],
        }
      })

      // Fetch AI Insights dynamically
      const insights: InsightItem[] = []
      try {
        const [seoInsight, googleInsight, metaInsight] = await Promise.all([
          api.post('/api/ai/insight', { simulationId, platform: 'seo' }).catch(() => null),
          api.post('/api/ai/insight', { simulationId, platform: 'google_ads' }).catch(() => null),
          api.post('/api/ai/insight', { simulationId, platform: 'meta_ads' }).catch(() => null),
        ])

        if (seoInsight?.data?.insight) {
          insights.push({
            type: "success",
            title: "SEO Performance Insight",
            description: seoInsight.data.insight,
          })
        }
        if (googleInsight?.data?.insight) {
          insights.push({
            type: "tip",
            title: "Google Ads Optimization Insight",
            description: googleInsight.data.insight,
          })
        }
        if (metaInsight?.data?.insight) {
          insights.push({
            type: "warning",
            title: "Meta Ads Strategy Insight",
            description: metaInsight.data.insight,
          })
        }
      } catch (err) {
        console.warn("Failed to retrieve AI insights, rendering fallback items", err)
      }

      // Fallback insights if AI was offline or empty
      if (insights.length === 0) {
        insights.push(
          { type: "success", title: "Organic SEO Growth", description: "Search ranking positions are stabilizing. Target informational keywords to drive traffic." },
          { type: "tip", title: "Google Ads CPC efficiency", description: "Your Google Ads CPC is healthy. Consider rising budget bounds to lift search clicks." }
        )
      }

      // Badge achievements
      const overallScore = Math.round(latestBreakdown?.compositeIndex || sim.score || 0)
      const badges = get().badges.map((b) => {
        if (b.name === "SEO Apprentice" && seoScore > 70) return { ...b, earned: true }
        if (b.name === "Ad Master" && (latestBreakdown?.googleAdsScore || 0) > 85) return { ...b, earned: true }
        if (b.name === "ROI Booster" && (latestBreakdown?.efficiencyRoi || 0) > 80) return { ...b, earned: true }
        if (b.name === "Conversion Guru" && overallScore > 80) return { ...b, earned: true }
        return b
      })

      set({
        currentRound: currentRoundNum,
        totalRounds: sim.class?.scenario?.maxRounds || 10,
        overallScore,
        previousScore: Math.round(prevBreakdown?.compositeIndex || 0),
        scoreChange: overallScore - Math.round(prevBreakdown?.compositeIndex || 0),
        classRank,
        totalStudents,
        previousRank: classRank,
        rankChange: 0,
        channelScores: {
          seo: {
            score: Math.round(seoScore),
            previous: Math.round(prevBreakdown?.seoScore || 0),
            traffic: seoTraffic,
            keywords: targetedKeywords.length,
            backlinks: Math.round(latestBreakdown?.seoBacklinkBudget || 0),
          },
          googleAds: {
            score: Math.round(latestBreakdown?.googleAdsScore || 0),
            previous: Math.round(prevBreakdown?.googleAdsScore || 0),
            impressions: googleImpressions,
            clicks: googleClicks,
            conversions: googleConversions,
            spend: googleSpend,
            ctr: googleCtr,
            cpc: googleCpc,
          },
          metaAds: {
            score: Math.round(latestBreakdown?.metaAdsScore || 0),
            previous: Math.round(prevBreakdown?.metaAdsScore || 0),
            reach: Math.round(metaImpressions * 0.7),
            impressions: metaImpressions,
            clicks: metaClicks,
            conversions: metaConversions,
            spend: metaSpend,
            ctr: metaCtr,
            cpc: metaCpc,
            roas: metaRoas,
          },
        },
        dailyTraffic,
        keywordRankings,
        insights,
        badges,
        isLoading: false,

        // Save Raw/History data for Phase 2 components
        breakdowns,
        snapshots,
        leaderboard,
        events,
        allMetrics,
      })
    } catch (err) {
      console.error("Failed to fetch results:", err)
      set({ isLoading: false })
    }
  },

  calculateResults: () => {},
  advanceRound: () => {},
  resetResults: () => {},
  generateInsights: () => {},
  setDecision: (channel, value) => {
    set((state) => ({
      decisions: {
        ...state.decisions,
        [channel]: value,
      },
    }))
  },
}))

export default useResultsStore
