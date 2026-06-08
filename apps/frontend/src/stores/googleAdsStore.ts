import { create } from "zustand"

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

function computeStrength(ad: Omit<AdCopy, "strength">): AdStrength {
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
}

function computeEstimates(
  keywords: SelectedKeyword[],
  dailyBudget: number,
  audiences: AudienceSegment[],
): Estimates {
  if (keywords.length === 0) {
    return { estimatedCpc: 0, estimatedImpressions: 0, estimatedClicks: 0, estimatedCtr: 0, budgetSpent: 0 }
  }

  const avgBid = keywords.reduce((s, k) => s + k.bid, 0) / keywords.length
  const audienceBoost = audiences.filter((a) => a.selected).length * 0.05 + 1
  const cpc = parseFloat((avgBid * audienceBoost).toFixed(2))
  const clicks = Math.floor(dailyBudget / cpc)
  const impressions = Math.floor(clicks / (0.04 + keywords.length * 0.003))
  const ctr = impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0
  const budgetSpent = parseFloat((clicks * cpc).toFixed(2))

  return { estimatedCpc: cpc, estimatedImpressions: impressions, estimatedClicks: clicks, estimatedCtr: ctr, budgetSpent }
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
  decisionsMade: boolean

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
}

// ─── Store ────────────────────────────────────────────────────────────────────

const initialEstimates = computeEstimates(DEFAULT_KEYWORDS, 50, DEFAULT_AUDIENCES)

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
  decisionsMade:        false,

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
      const est = computeEstimates(next, state.dailyBudget, state.audiences)
      return { selectedKeywords: next, ...est }
    }),

  removeKeyword: (keyword) =>
    set((state) => {
      const next = state.selectedKeywords.filter((k) => k.keyword !== keyword)
      const est = computeEstimates(next, state.dailyBudget, state.audiences)
      return { selectedKeywords: next, ...est }
    }),

  updateBid: (keyword, bid) =>
    set((state) => {
      const next = state.selectedKeywords.map((k) =>
        k.keyword === keyword ? { ...k, bid: Math.max(0.01, bid) } : k,
      )
      const est = computeEstimates(next, state.dailyBudget, state.audiences)
      return { selectedKeywords: next, ...est }
    }),

  updateMatchType: (keyword, matchType) =>
    set((state) => ({
      selectedKeywords: state.selectedKeywords.map((k) =>
        k.keyword === keyword ? { ...k, matchType } : k,
      ),
    })),

  addAdCopy: (ad) =>
    set((state) => ({
      adCopies: [...state.adCopies, { ...ad, strength: computeStrength(ad) }],
    })),

  removeAdCopy: (index) =>
    set((state) => ({
      adCopies: state.adCopies.filter((_, i) => i !== index),
    })),

  toggleAudience: (audienceName) =>
    set((state) => {
      const next = state.audiences.map((a) =>
        a.name === audienceName ? { ...a, selected: !a.selected } : a,
      )
      const est = computeEstimates(state.selectedKeywords, state.dailyBudget, next)
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
      const est = computeEstimates(state.selectedKeywords, state.dailyBudget, state.audiences)
      return est
    }),

  markDecisionsMade: () => set({ decisionsMade: true, campaignStatus: "active" }),

  resetCampaign: () => {
    const est = computeEstimates(DEFAULT_KEYWORDS, 50, DEFAULT_AUDIENCES)
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
      decisionsMade:        false,
    })
  },
}))

export default useGoogleAdsStore
