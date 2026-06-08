import { create } from "zustand"
import apiClient from "@/lib/api"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

export type MatchType = "exact" | "phrase" | "broad"
export type AdStrength = "poor" | "average" | "excellent"
export type CampaignStatus = "draft" | "active" | "paused"
export type AudienceType = "In-Market" | "Affinity" | "Custom Intent" | "Remarketing"
export type CompetitionLevel = "Low" | "Medium" | "High"

export interface SelectedKeyword {
  keyword: string
  bid: number
  matchType: MatchType
}

export interface AdCopy {
  headline1: string
  headline2: string
  headline3: string
  description1: string
  description2: string
  strength: AdStrength
}

export interface AudienceSegment {
  name: string
  type: AudienceType
  selected: boolean
  reach: number // estimated users in millions
}

export interface LocationOption {
  name: string
  selected: boolean
}

export interface Devices {
  desktop: boolean
  mobile: boolean
  tablet: boolean
}

// ─── Keyword Pool (25 keywords) ───────────────────────────────────────────────

export interface KeywordOption {
  keyword: string
  searchVolume: number   // monthly
  suggestedBid: number   // USD
  competition: CompetitionLevel
}

export const KEYWORD_POOL: KeywordOption[] = [
  { keyword: "buy shoes online",             searchVolume: 74000, suggestedBid: 1.20, competition: "High"   },
  { keyword: "running shoes sale",            searchVolume: 49500, suggestedBid: 1.55, competition: "High"   },
  { keyword: "custom sneakers",              searchVolume: 27100, suggestedBid: 2.10, competition: "Medium" },
  { keyword: "athletic footwear",             searchVolume: 33800, suggestedBid: 0.95, competition: "Medium" },
  { keyword: "discount running shoes",        searchVolume: 33400, suggestedBid: 0.75, competition: "Low"    },
  { keyword: "best trail running shoes",      searchVolume: 12100, suggestedBid: 1.80, competition: "Medium" },
  { keyword: "women's sneakers",             searchVolume: 22800, suggestedBid: 1.30, competition: "High"   },
  { keyword: "men's dress shoes",            searchVolume: 19600, suggestedBid: 1.45, competition: "Medium" },
  { keyword: "kids sports shoes",            searchVolume: 15400, suggestedBid: 0.65, competition: "Low"    },
  { keyword: "eco friendly shoes",           searchVolume: 8900,  suggestedBid: 1.10, competition: "Low"    },
  { keyword: "wide fit shoes",              searchVolume: 11200, suggestedBid: 0.95, competition: "Low"    },
  { keyword: "orthopedic walking shoes",     searchVolume: 9800,  suggestedBid: 2.20, competition: "Medium" },
  { keyword: "free shipping sneakers",       searchVolume: 41000, suggestedBid: 0.80, competition: "High"   },
  { keyword: "sneakers under 50",            searchVolume: 28700, suggestedBid: 0.70, competition: "Medium" },
  { keyword: "luxury leather shoes",         searchVolume: 6400,  suggestedBid: 3.50, competition: "Low"    },
  { keyword: "sports shoes for gym",         searchVolume: 18600, suggestedBid: 1.15, competition: "Medium" },
  { keyword: "slip resistant work shoes",    searchVolume: 7200,  suggestedBid: 1.40, competition: "Low"    },
  { keyword: "waterproof hiking boots",      searchVolume: 14800, suggestedBid: 1.90, competition: "Medium" },
  { keyword: "buy boots online",             searchVolume: 21300, suggestedBid: 1.25, competition: "High"   },
  { keyword: "clearance footwear sale",      searchVolume: 9100,  suggestedBid: 0.60, competition: "Low"    },
  { keyword: "comfortable walking shoes",    searchVolume: 25400, suggestedBid: 1.05, competition: "Medium" },
  { keyword: "sneakers for flat feet",       searchVolume: 6700,  suggestedBid: 1.55, competition: "Low"    },
  { keyword: "affordable basketball shoes",  searchVolume: 11900, suggestedBid: 1.35, competition: "Medium" },
  { keyword: "vegan leather shoes",          searchVolume: 5300,  suggestedBid: 1.80, competition: "Low"    },
  { keyword: "school shoes for kids",        searchVolume: 17600, suggestedBid: 0.85, competition: "Medium" },
]

// ─── Default data ─────────────────────────────────────────────────────────────

const DEFAULT_AUDIENCES: AudienceSegment[] = [
  { name: "Shoe & Footwear Shoppers",   type: "In-Market",     selected: true,  reach: 4.2  },
  { name: "Athletic Enthusiasts",        type: "Affinity",      selected: true,  reach: 12.8 },
  { name: "Fashion & Style Lovers",      type: "Affinity",      selected: false, reach: 18.5 },
  { name: "Sports Equipment Buyers",     type: "In-Market",     selected: false, reach: 6.7  },
  { name: "Eco-Conscious Consumers",     type: "Custom Intent", selected: false, reach: 3.1  },
  { name: "Site Visitors (30-day)",      type: "Remarketing",   selected: true,  reach: 0.8  },
  { name: "Cart Abandoners",             type: "Remarketing",   selected: false, reach: 0.3  },
  { name: "High-Intent Keyword Users",   type: "Custom Intent", selected: false, reach: 2.4  },
]

const DEFAULT_LOCATIONS: LocationOption[] = [
  { name: "United States",   selected: true  },
  { name: "United Kingdom",  selected: false },
  { name: "Canada",          selected: false },
  { name: "Australia",       selected: false },
  { name: "India",           selected: false },
  { name: "Germany",         selected: false },
]

const DEFAULT_KEYWORDS: SelectedKeyword[] = [
  { keyword: "buy shoes online",       bid: 1.20, matchType: "broad"  },
  { keyword: "running shoes sale",     bid: 1.55, matchType: "phrase" },
  { keyword: "custom sneakers",        bid: 2.10, matchType: "exact"  },
  { keyword: "free shipping sneakers", bid: 0.80, matchType: "broad"  },
  { keyword: "athletic footwear",      bid: 0.95, matchType: "phrase" },
]

const DEFAULT_AD_COPY: AdCopy = {
  headline1:    "Buy Premium Shoes Online",
  headline2:    "Free Shipping on Orders $50+",
  headline3:    "Shop 500+ Styles Today",
  description1: "Discover our curated collection of athletic and casual footwear. Quality you can feel.",
  description2: "Easy 30-day returns. Secure checkout. Order by midnight for next-day delivery.",
  strength:     "excellent",
}

// ─── Score helper ─────────────────────────────────────────────────────────────

export function computeStrength(ad: Omit<AdCopy, "strength">): AdStrength {
  let score = 0
  if (ad.headline1.length >= 20) score++
  if (ad.headline2.length >= 15) score++
  if (ad.headline3.length >= 10) score++
  if (ad.description1.length >= 60) score++
  if (ad.description2.length >= 40) score++
  if (score >= 4) return "excellent"
  if (score >= 2) return "average"
  return "poor"
}

// ─── Estimates helper ─────────────────────────────────────────────────────────

interface Estimates {
  estimatedCpc: number
  estimatedImpressions: number
  estimatedClicks: number
  estimatedCtr: number
  budgetSpent: number
  estimatedConversions: number
}

function computeEstimates(
  keywords: SelectedKeyword[],
  dailyBudget: number,
  audiences: AudienceSegment[],
  adCopies: AdCopy[],
): Estimates {
  if (keywords.length === 0) {
    return {
      estimatedCpc: 0,
      estimatedImpressions: 0,
      estimatedClicks: 0,
      estimatedCtr: 0,
      budgetSpent: 0,
      estimatedConversions: 0,
    }
  }

  // 1. Average Keyword Bid
  const avgBid = keywords.reduce((s, k) => s + k.bid, 0) / keywords.length

  // 2. Keyword Match Type & Intent CVR
  // Exact match = highest CVR (4.5%), Phrase = 3.0%, Broad = 1.5%
  const totalBaseCvr = keywords.reduce((sum, kw) => {
    let kwCvr = 0.015
    if (kw.matchType === "exact") kwCvr = 0.045
    else if (kw.matchType === "phrase") kwCvr = 0.03
    return sum + kwCvr
  }, 0)
  const avgBaseCvr = totalBaseCvr / keywords.length

  // 3. Bid Quality relative to Suggested Bid
  let totalBidQuality = 0
  keywords.forEach((kw) => {
    const poolItem = KEYWORD_POOL.find((k) => k.keyword === kw.keyword)
    const suggested = poolItem ? poolItem.suggestedBid : 1.0
    const ratio = kw.bid / suggested
    const kwQuality = ratio >= 1 ? Math.min(1.2, ratio) : Math.max(0.4, ratio)
    totalBidQuality += kwQuality
  })
  const avgBidQuality = totalBidQuality / keywords.length

  // 4. Ad Strength multiplier
  const bestAd = adCopies.reduce((best, ad) => {
    if (ad.strength === "excellent") return "excellent"
    if (ad.strength === "average" && best !== "excellent") return "average"
    return best
  }, "poor")
  const adMultiplier = bestAd === "excellent" ? 1.35 : bestAd === "average" ? 1.0 : 0.6

  // 5. Audience targeting multiplier
  const activeAudiences = audiences.filter((a) => a.selected)
  const audienceMultiplier = Math.min(1.5, 1 + activeAudiences.length * 0.08)

  // 6. Calculate CPC
  const cpc = parseFloat(Math.max(0.15, avgBid * (1 / avgBidQuality) * (2 - audienceMultiplier * 0.5)).toFixed(2))

  // 7. Calculate Clicks
  const clicks = Math.floor(dailyBudget / cpc)

  // 8. Calculate CTR
  const ctr = parseFloat(Math.min(15, Math.max(0.5, 3.5 * avgBidQuality * adMultiplier * audienceMultiplier)).toFixed(2))

  // 9. Calculate Impressions
  const impressions = ctr > 0 ? Math.floor(clicks / (ctr / 100)) : 0

  // 10. Budget Spent
  const budgetSpent = parseFloat((clicks * cpc).toFixed(2))

  // 11. Conversions (Leads)
  const finalCvr = avgBaseCvr * avgBidQuality * adMultiplier * audienceMultiplier
  const conversions = Math.round(clicks * finalCvr)

  return {
    estimatedCpc: cpc,
    estimatedImpressions: impressions,
    estimatedClicks: clicks,
    estimatedCtr: ctr,
    budgetSpent,
    estimatedConversions: conversions,
  }
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface GoogleAdsState {
  campaignName: string
  objective: string
  campaignType: string
  biddingStrategy: string
  negativeKeywords: string[]
  landingPage: {
    pageRelevance: number
    mobileFriendly: number
    pageSpeed: number
    trustSignals: number
    offerClarity: number
    conversionReadiness: number
  }
  dailyBudget: number
  totalBudget: number
  budgetSpent: number
  selectedKeywords: SelectedKeyword[]
  adCopies: AdCopy[]
  audiences: AudienceSegment[]
  locations: LocationOption[]
  devices: Devices
  campaignStatus: CampaignStatus
  estimatedCpc: number
  estimatedImpressions: number
  estimatedClicks: number
  estimatedCtr: number
  estimatedConversions: number
  decisionsMade: boolean
  isSubmitting: boolean

  // Actions
  setCampaignName: (name: string) => void
  setObjective: (objective: string) => void
  setCampaignType: (campaignType: string) => void
  setBiddingStrategy: (biddingStrategy: string) => void
  addNegativeKeyword: (word: string) => void
  removeNegativeKeyword: (word: string) => void
  updateLandingPage: (key: string, value: number) => void
  setDailyBudget: (budget: number) => void
  addKeyword: (keyword: string, bid: number, matchType: MatchType) => void
  removeKeyword: (keyword: string) => void
  updateBid: (keyword: string, bid: number) => void
  updateMatchType: (keyword: string, matchType: MatchType) => void
  addAdCopy: (ad: Omit<AdCopy, "strength">) => void
  removeAdCopy: (index: number) => void
  toggleAudience: (audienceName: string) => void
  toggleLocation: (locationName: string) => void
  toggleDevice: (device: keyof Devices) => void
  setCampaignStatus: (status: CampaignStatus) => void
  calculateEstimates: () => void
  markDecisionsMade: () => void
  resetCampaign: () => void

  /**
   * Submit Google Ads campaign configurations to the backend for the current round.
   * POST /api/v1/google-ads/decision
   */
  submitDecisions: () => Promise<void>
}

// ─── Store ────────────────────────────────────────────────────────────────────

const initialEstimates = computeEstimates(DEFAULT_KEYWORDS, 50, DEFAULT_AUDIENCES, [DEFAULT_AD_COPY])

export const useGoogleAdsStore = create<GoogleAdsState>((set, get) => ({
  campaignName:         "Footwear Summer Sale 2025",
  objective:            "Sales",
  campaignType:         "Search",
  biddingStrategy:      "Manual CPC",
  negativeKeywords:     [],
  landingPage: {
    pageRelevance: 5,
    mobileFriendly: 5,
    pageSpeed: 5,
    trustSignals: 5,
    offerClarity: 5,
    conversionReadiness: 5,
  },
  dailyBudget:          50,
  totalBudget:          1500,
  budgetSpent:          initialEstimates.budgetSpent,
  selectedKeywords:     DEFAULT_KEYWORDS,
  adCopies:             [DEFAULT_AD_COPY],
  audiences:            DEFAULT_AUDIENCES,
  locations:            DEFAULT_LOCATIONS,
  devices:              { desktop: true, mobile: true, tablet: false },
  campaignStatus:       "draft",
  estimatedCpc:         initialEstimates.estimatedCpc,
  estimatedImpressions: initialEstimates.estimatedImpressions,
  estimatedClicks:      initialEstimates.estimatedClicks,
  estimatedCtr:         initialEstimates.estimatedCtr,
  estimatedConversions: initialEstimates.estimatedConversions,
  decisionsMade:        false,
  isSubmitting:         false,

  setCampaignName: (name) => set({ campaignName: name }),

  setObjective: (objective) => set({ objective }),

  setCampaignType: (campaignType) => set({ campaignType }),

  setBiddingStrategy: (biddingStrategy) => set({ biddingStrategy }),

  addNegativeKeyword: (word) =>
    set((state) => {
      const trimmed = word.trim().toLowerCase()
      if (!trimmed || state.negativeKeywords.includes(trimmed)) return state
      return { negativeKeywords: [...state.negativeKeywords, trimmed] }
    }),

  removeNegativeKeyword: (word) =>
    set((state) => ({
      negativeKeywords: state.negativeKeywords.filter((w) => w !== word),
    })),

  updateLandingPage: (key, value) =>
    set((state) => ({
      landingPage: { ...state.landingPage, [key]: value },
    })),

  setDailyBudget: (budget) => {
    set({ dailyBudget: budget, totalBudget: budget * 30 })
    get().calculateEstimates()
  },

  addKeyword: (keyword, bid, matchType) =>
    set((state) => {
      if (state.selectedKeywords.find((k) => k.keyword === keyword)) return state
      const next = [...state.selectedKeywords, { keyword, bid, matchType }]
      const est = computeEstimates(next, state.dailyBudget, state.audiences, state.adCopies)
      return { selectedKeywords: next, ...est }
    }),

  removeKeyword: (keyword) =>
    set((state) => {
      const next = state.selectedKeywords.filter((k) => k.keyword !== keyword)
      const est = computeEstimates(next, state.dailyBudget, state.audiences, state.adCopies)
      return { selectedKeywords: next, ...est }
    }),

  updateBid: (keyword, bid) =>
    set((state) => {
      const next = state.selectedKeywords.map((k) =>
        k.keyword === keyword ? { ...k, bid: Math.max(0.01, bid) } : k,
      )
      const est = computeEstimates(next, state.dailyBudget, state.audiences, state.adCopies)
      return { selectedKeywords: next, ...est }
    }),

  updateMatchType: (keyword, matchType) => {
    set((state) => ({
      selectedKeywords: state.selectedKeywords.map((k) =>
        k.keyword === keyword ? { ...k, matchType } : k
      ),
    }))
    get().calculateEstimates()
  },

  addAdCopy: (ad) => {
    set((state) => ({
      adCopies: [...state.adCopies, { ...ad, strength: computeStrength(ad) }],
    }))
    get().calculateEstimates()
  },

  removeAdCopy: (index) => {
    set((state) => ({
      adCopies: state.adCopies.filter((_, i) => i !== index),
    }))
    get().calculateEstimates()
  },

  toggleAudience: (audienceName) =>
    set((state) => {
      const next = state.audiences.map((a) =>
        a.name === audienceName ? { ...a, selected: !a.selected } : a,
      )
      const est = computeEstimates(state.selectedKeywords, state.dailyBudget, next, state.adCopies)
      return { audiences: next, ...est }
    }),

  toggleLocation: (locationName) =>
    set((state) => ({
      locations: state.locations.map((l) =>
        l.name === locationName ? { ...l, selected: !l.selected } : l,
      ),
    })),

  toggleDevice: (device) =>
    set((state) => ({
      devices: { ...state.devices, [device]: !state.devices[device] },
    })),

  setCampaignStatus: (status) => set({ campaignStatus: status }),

  calculateEstimates: () =>
    set((state) => {
      const est = computeEstimates(state.selectedKeywords, state.dailyBudget, state.audiences, state.adCopies)
      return est
    }),

  markDecisionsMade: () => set({ decisionsMade: true, campaignStatus: "active" }),

  submitDecisions: async () => {
    const { selectedKeywords, dailyBudget, campaignName } = get()

    if (selectedKeywords.length === 0) {
      toast.error("Add at least one keyword before submitting Google Ads decisions.")
      return
    }

    set({ isSubmitting: true })
    try {
      await apiClient.post("/v1/google-ads/decision", {
        campaigns: [
          {
            name: campaignName,
            budget: dailyBudget,
            keywords: selectedKeywords.map((kw) => ({
              word: kw.keyword,
              bid: kw.bid,
            })),
          },
        ],
      })
      set({ decisionsMade: true, campaignStatus: "active" })
      toast.success("Google Ads decisions saved to the simulation!")
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to save Google Ads decisions."
      toast.error(msg)
    } finally {
      set({ isSubmitting: false })
    }
  },

  resetCampaign: () => {
    const est = computeEstimates(DEFAULT_KEYWORDS, 50, DEFAULT_AUDIENCES, [DEFAULT_AD_COPY])
    set({
      campaignName:         "Footwear Summer Sale 2025",
      objective:            "Sales",
      campaignType:         "Search",
      biddingStrategy:      "Manual CPC",
      negativeKeywords:     [],
      landingPage: {
        pageRelevance: 5,
        mobileFriendly: 5,
        pageSpeed: 5,
        trustSignals: 5,
        offerClarity: 5,
        conversionReadiness: 5,
      },
      dailyBudget:          50,
      totalBudget:          1500,
      budgetSpent:          est.budgetSpent,
      selectedKeywords:     DEFAULT_KEYWORDS,
      adCopies:             [DEFAULT_AD_COPY],
      audiences:            DEFAULT_AUDIENCES,
      locations:            DEFAULT_LOCATIONS,
      devices:              { desktop: true, mobile: true, tablet: false },
      campaignStatus:       "draft",
      estimatedCpc:         est.estimatedCpc,
      estimatedImpressions: est.estimatedImpressions,
      estimatedClicks:      est.estimatedClicks,
      estimatedCtr:         est.estimatedCtr,
      estimatedConversions: est.estimatedConversions,
      decisionsMade:        false,
    })
  },
}))

export default useGoogleAdsStore
