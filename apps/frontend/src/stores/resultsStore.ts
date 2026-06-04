import { create } from "zustand"

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
  trend: number[] // 5 rounds trend data for sparkline
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

  // Actions
  calculateResults: () => void
  advanceRound: () => void
  resetResults: () => void
  generateInsights: () => void
  setDecision: (channel: "seo" | "googleAds" | "metaAds", value: boolean) => void
}

// ─── Initial Mock Data ────────────────────────────────────────────────────────

const INITIAL_DAILY_TRAFFIC: DailyTrafficPoint[] = [
  { day: 1,  organic: 100, paid: 80,  social: 50,  total: 230  },
  { day: 2,  organic: 110, paid: 90,  social: 60,  total: 260  },
  { day: 3,  organic: 115, paid: 95,  social: 65,  total: 275  },
  { day: 4,  organic: 120, paid: 100, social: 70,  total: 290  },
  { day: 5,  organic: 130, paid: 110, social: 80,  total: 320  },
  { day: 6,  organic: 135, paid: 115, social: 85,  total: 335  },
  { day: 7,  organic: 140, paid: 120, social: 90,  total: 350  },
  { day: 8,  organic: 150, paid: 125, social: 95,  total: 370  },
  { day: 9,  organic: 155, paid: 130, social: 98,  total: 383  },
  { day: 10, organic: 160, paid: 135, social: 100, total: 395  },
  { day: 11, organic: 165, paid: 140, social: 105, total: 410  },
  { day: 12, organic: 170, paid: 145, social: 108, total: 423  },
  { day: 13, organic: 172, paid: 148, social: 110, total: 430  },
  { day: 14, organic: 175, paid: 150, social: 112, total: 437  },
  { day: 15, organic: 180, paid: 152, social: 115, total: 447  },
  { day: 16, organic: 182, paid: 155, social: 118, total: 455  },
  { day: 17, organic: 185, paid: 158, social: 120, total: 463  },
  { day: 18, organic: 188, paid: 160, social: 122, total: 470  },
  { day: 19, organic: 190, paid: 162, social: 125, total: 477  },
  { day: 20, organic: 192, paid: 165, social: 128, total: 485  },
  { day: 21, organic: 195, paid: 168, social: 130, total: 493  },
  { day: 22, organic: 198, paid: 170, social: 132, total: 500  },
  { day: 23, organic: 200, paid: 172, social: 135, total: 507  },
  { day: 24, organic: 202, paid: 175, social: 138, total: 515  },
  { day: 25, organic: 205, paid: 178, social: 140, total: 523  },
  { day: 26, organic: 208, paid: 180, social: 142, total: 530  },
  { day: 27, organic: 210, paid: 182, social: 145, total: 537  },
  { day: 28, organic: 212, paid: 185, social: 148, total: 545  },
  { day: 29, organic: 215, paid: 188, social: 150, total: 553  },
  { day: 30, organic: 218, paid: 190, social: 154, total: 562  },
]

// Sum matches: Organic = 5,230, Paid = 4,180, Social = 3,040, Total = 12,450 (sum of all entries = 12,450)
const INITIAL_KEYWORD_RANKINGS: KeywordRanking[] = [
  { keyword: "buy shoes online",            position: 2,  previousPosition: 4,  change: 2,   volume: 74000, trend: [8, 6, 5, 4, 2] },
  { keyword: "running shoes sale",           position: 5,  previousPosition: 3,  change: -2,  volume: 49500, trend: [2, 3, 3, 3, 5] },
  { keyword: "custom sneakers",             position: 3,  previousPosition: 7,  change: 4,   volume: 27100, trend: [12, 10, 9, 7, 3] },
  { keyword: "athletic footwear",            position: 8,  previousPosition: 8,  change: 0,   volume: 33800, trend: [9, 8, 8, 8, 8] },
  { keyword: "discount running shoes",       position: 12, previousPosition: 15, change: 3,   volume: 33400, trend: [18, 16, 15, 15, 12] },
  { keyword: "best trail running shoes",     position: 1,  previousPosition: 2,  change: 1,   volume: 12100, trend: [5, 4, 3, 2, 1] },
  { keyword: "women's sneakers",            position: 4,  previousPosition: 9,  change: 5,   volume: 22800, trend: [14, 11, 9, 9, 4] },
  { keyword: "men's dress shoes",           position: 15, previousPosition: 14, change: -1,  volume: 19600, trend: [10, 11, 13, 14, 15] },
  { keyword: "kids sports shoes",           position: 6,  previousPosition: 10, change: 4,   volume: 15400, trend: [15, 12, 11, 10, 6] },
  { keyword: "eco friendly shoes",          position: 10, previousPosition: 11, change: 1,   volume: 8900,  trend: [13, 12, 12, 11, 10] },
  { keyword: "wide fit shoes",              position: 9,  previousPosition: 12, change: 3,   volume: 11200, trend: [16, 14, 13, 12, 9] },
  { keyword: "orthopedic walking shoes",     position: 14, previousPosition: 13, change: -1,  volume: 9800,  trend: [11, 12, 12, 13, 14] },
  { keyword: "free shipping sneakers",       position: 11, previousPosition: 10, change: -1,  volume: 41000, trend: [9, 9, 10, 10, 11] },
  { keyword: "sneakers under 50",            position: 7,  previousPosition: 8,  change: 1,   volume: 28700, trend: [10, 10, 9, 8, 7] },
  { keyword: "luxury leather shoes",         position: 18, previousPosition: 20, change: 2,   volume: 6400,  trend: [22, 22, 21, 20, 18] },
  { keyword: "sports shoes for gym",         position: 13, previousPosition: 16, change: 3,   volume: 18600, trend: [19, 18, 17, 16, 13] },
  { keyword: "slip resistant work shoes",    position: 16, previousPosition: 15, change: -1,  volume: 7200,  trend: [14, 14, 15, 15, 16] },
  { keyword: "waterproof hiking boots",      position: 4,  previousPosition: 6,  change: 2,   volume: 14800, trend: [7, 7, 6, 6, 4] },
  { keyword: "buy boots online",             position: 17, previousPosition: 18, change: 1,   volume: 21300, trend: [19, 19, 18, 18, 17] },
  { keyword: "clearance footwear sale",      position: 19, previousPosition: 17, change: -2,  volume: 9100,  trend: [15, 16, 16, 17, 19] },
]

const INITIAL_INSIGHTS: InsightItem[] = [
  {
    type: "success",
    title: "SEO Backlinks Grew",
    description: "Your backlink strategy gained 12 new quality links, boosting domain authority.",
    metric: "Backlinks Added",
    value: 12,
  },
  {
    type: "success",
    title: "Google Ads Conversions High",
    description: "High conversions achieved on transactional search terms.",
    metric: "Conversions",
    value: 245,
  },
  {
    type: "warning",
    title: "Google Ads CTR Dropping",
    description: "Your CTR fell from 3.2% to 2.1%. Consider refreshing ad copy or adjusting bids.",
    metric: "CTR Drop",
    value: -1.1,
  },
  {
    type: "warning",
    title: "High Ad Fatigue on Meta Feed",
    description: "Users are seeing the same image creative too frequently. Swap creatives to lift engagement.",
    metric: "Frequency Rate",
    value: 4.8,
  },
  {
    type: "tip",
    title: "Meta Ads ROAS Opportunity",
    description: "Your Meta Ads ROAS is 2.5x. Increasing budget by 20% could yield 35% more conversions.",
    metric: "ROAS Multiplier",
    value: 2.5,
  },
]

const INITIAL_BADGES: SimulationBadge[] = [
  { name: "SEO Apprentice",   description: "Optimized On-page tags for 3 pages", earned: true,  icon: "Search" },
  { name: "Ad Master",        description: "Achieved ad copy strength of Excellent", earned: true,  icon: "Target" },
  { name: "ROI Booster",       description: "Gained positive ROI of 150%+", earned: true,  icon: "TrendingUp" },
  { name: "Conversion Guru",   description: "Get a conversion rate above 5%", earned: false, icon: "Zap" },
  { name: "Social Lead",       description: "Gained 5000+ social visitors", earned: false, icon: "Share2" },
  { name: "Budget Optimizer",  description: "Keep total spend under $1000", earned: false, icon: "Award" },
]

export const useResultsStore = create<ResultsState>((set) => ({
  currentRound: 3,
  totalRounds: 10,
  overallScore: 72,
  previousScore: 65,
  scoreChange: 7,
  classRank: 5,
  totalStudents: 25,
  previousRank: 8,
  rankChange: 3,
  channelScores: {
    seo: { score: 68, previous: 63, traffic: 5230, keywords: 5, backlinks: 12 },
    googleAds: { score: 75, previous: 67, impressions: 98400, clicks: 4180, conversions: 245, spend: 1250, cpc: 0.30, ctr: 4.25 },
    metaAds: { score: 71, previous: 65, reach: 125000, impressions: 185000, clicks: 3040, conversions: 188, spend: 950, cpc: 0.31, ctr: 1.64, roas: 2.5 },
  },
  dailyTraffic: INITIAL_DAILY_TRAFFIC,
  keywordRankings: INITIAL_KEYWORD_RANKINGS,
  insights: INITIAL_INSIGHTS,
  badges: INITIAL_BADGES,
  decisions: {
    seo: false,
    googleAds: false,
    metaAds: false,
  },

  calculateResults: () => {
    // Recalculates metrics for simulation round calculations
    set((state) => {
      const overall = Math.round((state.channelScores.seo.score + state.channelScores.googleAds.score + state.channelScores.metaAds.score) / 3)
      return {
        overallScore: overall,
        scoreChange: overall - state.previousScore,
      }
    })
  },

  advanceRound: () => {
    set((state) => {
      if (state.currentRound >= state.totalRounds) {
        return {
          currentRound: state.totalRounds,
          decisions: { seo: false, googleAds: false, metaAds: false },
        }
      }
      
      const nextRound = state.currentRound + 1
      
      // Simulate slightly improved scores for the next round
      const nextSeo = Math.min(100, state.channelScores.seo.score + Math.floor(Math.random() * 4) + 1)
      const nextGoogle = Math.min(100, state.channelScores.googleAds.score + Math.floor(Math.random() * 4) + 1)
      const nextMeta = Math.min(100, state.channelScores.metaAds.score + Math.floor(Math.random() * 4) + 1)
      const nextOverall = Math.round((nextSeo + nextGoogle + nextMeta) / 3)
      const prevOverall = state.overallScore

      // Slightly shift traffic totals
      const trafficMultiplier = 1.12
      const updatedTraffic = state.dailyTraffic.map((pt) => ({
        ...pt,
        organic: Math.round(pt.organic * trafficMultiplier),
        paid: Math.round(pt.paid * trafficMultiplier),
        social: Math.round(pt.social * trafficMultiplier),
        total: Math.round(pt.total * trafficMultiplier),
      }))

      // Keyword improvements
      const updatedRankings = state.keywordRankings.map((kw) => {
        const step = Math.random() > 0.3 ? 1 : -1
        const pos = Math.max(1, kw.position - step)
        return {
          ...kw,
          previousPosition: kw.position,
          position: pos,
          change: kw.position - pos,
          trend: [...kw.trend.slice(1), pos],
        }
      })

      // Unlock a badge if overall score > 75
      const updatedBadges = state.badges.map((b) => {
        if (b.name === "Conversion Guru" && nextOverall > 75) {
          return { ...b, earned: true }
        }
        return b
      })

      return {
        currentRound: nextRound,
        overallScore: nextOverall,
        previousScore: prevOverall,
        scoreChange: nextOverall - prevOverall,
        previousRank: state.classRank,
        classRank: Math.max(1, state.classRank - (Math.random() > 0.5 ? 1 : 0)),
        rankChange: state.classRank - Math.max(1, state.classRank - (Math.random() > 0.5 ? 1 : 0)),
        channelScores: {
          seo: {
            score: nextSeo,
            previous: state.channelScores.seo.score,
            traffic: Math.round(state.channelScores.seo.traffic * trafficMultiplier),
            keywords: state.channelScores.seo.keywords,
            backlinks: state.channelScores.seo.backlinks + 3,
          },
          googleAds: {
            score: nextGoogle,
            previous: state.channelScores.googleAds.score,
            impressions: Math.round(state.channelScores.googleAds.impressions * trafficMultiplier),
            clicks: Math.round(state.channelScores.googleAds.clicks * trafficMultiplier),
            conversions: Math.round(state.channelScores.googleAds.conversions * trafficMultiplier),
            spend: state.channelScores.googleAds.spend + 150,
            cpc: state.channelScores.googleAds.cpc,
            ctr: parseFloat((state.channelScores.googleAds.ctr + 0.1).toFixed(2)),
          },
          metaAds: {
            score: nextMeta,
            previous: state.channelScores.metaAds.score,
            reach: Math.round(state.channelScores.metaAds.reach * trafficMultiplier),
            impressions: Math.round(state.channelScores.metaAds.impressions * trafficMultiplier),
            clicks: Math.round(state.channelScores.metaAds.clicks * trafficMultiplier),
            conversions: Math.round(state.channelScores.metaAds.conversions * trafficMultiplier),
            spend: state.channelScores.metaAds.spend + 120,
            cpc: state.channelScores.metaAds.cpc,
            ctr: parseFloat((state.channelScores.metaAds.ctr + 0.05).toFixed(2)),
            roas: parseFloat((state.channelScores.metaAds.roas + 0.15).toFixed(2)),
          },
        },
        dailyTraffic: updatedTraffic,
        keywordRankings: updatedRankings,
        badges: updatedBadges,
        decisions: { seo: false, googleAds: false, metaAds: false },
      }
    })
  },

  resetResults: () => {
    set({
      currentRound: 3,
      totalRounds: 10,
      overallScore: 72,
      previousScore: 65,
      scoreChange: 7,
      classRank: 5,
      totalStudents: 25,
      previousRank: 8,
      rankChange: 3,
      channelScores: {
        seo: { score: 68, previous: 63, traffic: 5230, keywords: 5, backlinks: 12 },
        googleAds: { score: 75, previous: 67, impressions: 98400, clicks: 4180, conversions: 245, spend: 1250, cpc: 0.30, ctr: 4.25 },
        metaAds: { score: 71, previous: 65, reach: 125000, impressions: 185000, clicks: 3040, conversions: 188, spend: 950, cpc: 0.31, ctr: 1.64, roas: 2.5 },
      },
      dailyTraffic: INITIAL_DAILY_TRAFFIC,
      keywordRankings: INITIAL_KEYWORD_RANKINGS,
      insights: INITIAL_INSIGHTS,
      badges: INITIAL_BADGES,
      decisions: { seo: false, googleAds: false, metaAds: false },
    })
  },

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
