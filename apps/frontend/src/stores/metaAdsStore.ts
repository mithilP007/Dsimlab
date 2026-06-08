import { create } from "zustand"
import apiClient from "@/lib/api"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

export type MetaObjective = "awareness" | "traffic" | "engagement" | "conversions" | "sales"
export type CreativeType = "image" | "video" | "carousel"
export type AudienceType = "core" | "custom" | "lookalike"

export interface MetaCreative {
  id: string
  type: CreativeType
  headline: string
  primaryText: string
  callToAction: string
  mediaQuality: number // 0–100
}

export interface MetaAudience {
  name: string
  selected: boolean
  size: number      // in millions
  type: AudienceType
  description: string
}

export interface MetaPlacements {
  feed: boolean
  stories: boolean
  reels: boolean
  marketplace: boolean
  rightColumn: boolean
  audienceNetwork: boolean
  messenger: boolean
}

export type PlacementKey = keyof MetaPlacements

// ─── Objective descriptions ───────────────────────────────────────────────────

export const OBJECTIVE_META: Record<MetaObjective, { label: string; description: string }> = {
  awareness:   { label: "Awareness",   description: "Maximise reach and brand recall among your target audience." },
  traffic:     { label: "Traffic",     description: "Drive the most clicks to your website or landing page." },
  engagement:  { label: "Engagement",  description: "Get more likes, comments, shares, and post interactions." },
  conversions: { label: "Conversions", description: "Optimise for valuable actions like sign-ups or purchases." },
  sales:       { label: "Sales",       description: "Find people most likely to buy your product right now." },
}

// ─── Placement metadata ───────────────────────────────────────────────────────

export interface PlacementMeta {
  label: string
  description: string
  estimatedCpm: number
  platforms: string
}

export const PLACEMENT_META: Record<PlacementKey, PlacementMeta> = {
  feed:            { label: "Feed",             description: "Appears in Facebook & Instagram main feeds", platforms: "FB + IG",    estimatedCpm: 9.80  },
  stories:         { label: "Stories",          description: "Full-screen vertical in Stories",            platforms: "FB + IG",    estimatedCpm: 7.50  },
  reels:           { label: "Reels",            description: "In-stream Reels placements",                 platforms: "FB + IG",    estimatedCpm: 6.20  },
  marketplace:     { label: "Marketplace",      description: "Shown in Facebook Marketplace browse",       platforms: "Facebook",   estimatedCpm: 7.90  },
  rightColumn:     { label: "Right Column",     description: "Desktop-only sidebar placement",             platforms: "Facebook",   estimatedCpm: 3.40  },
  audienceNetwork: { label: "Audience Network", description: "External apps & websites",                  platforms: "External",   estimatedCpm: 4.10  },
  messenger:       { label: "Messenger",        description: "Inbox & Messenger Stories",                  platforms: "Messenger",  estimatedCpm: 8.60  },
}

// ─── Default audiences ────────────────────────────────────────────────────────

const DEFAULT_AUDIENCES: MetaAudience[] = [
  { name: "Footwear & Apparel Shoppers",    type: "core",      selected: true,  size: 42.3, description: "People interested in shoes, fashion, and athletic wear" },
  { name: "Sports & Fitness Enthusiasts",   type: "core",      selected: false, size: 28.6, description: "Active users interested in running, gym, and outdoor sports" },
  { name: "Luxury Goods Buyers",            type: "core",      selected: false, size: 11.2, description: "High-income users browsing premium lifestyle products" },
  { name: "Parents (Kids 0–12)",            type: "core",      selected: false, size: 19.8, description: "Parents who frequently shop for children's products" },
  { name: "Young Adults (18–24)",           type: "core",      selected: true,  size: 35.1, description: "College-age audience with high social media engagement" },
  { name: "Eco-Conscious Consumers",        type: "core",      selected: false, size: 8.7,  description: "Users who prefer sustainable and ethical brands" },
  { name: "Website Visitors (30-day)",      type: "custom",    selected: false, size: 0.8,  description: "Users who visited your site in the last 30 days" },
  { name: "Email List Upload",              type: "custom",    selected: false, size: 0.3,  description: "Customers from your CRM email database" },
  { name: "Lookalike: Top Buyers (1%)",     type: "lookalike", selected: false, size: 2.1,  description: "Matches your best customers — highest intent" },
  { name: "Lookalike: Site Visitors (5%)",  type: "lookalike", selected: false, size: 10.5, description: "Broader match to recent website visitors" },
]

// ─── Default creative ─────────────────────────────────────────────────────────

const DEFAULT_CREATIVE: MetaCreative = {
  id: "cr1",
  type: "image",
  headline: "Buy Premium Shoes Online",
  primaryText: "Step into comfort. Shop our latest collection of premium athletic footwear built for performance and style.",
  callToAction: "Shop Now",
  mediaQuality: 80,
}

// ─── Helper function ─────────────────────────────────────────────────────────

export function computeStrength(c: MetaCreative): number {
  let score = 0
  score += Math.min(40, (c.primaryText.length / 125) * 40)
  score += Math.min(20, (c.headline.length / 40) * 20)
  score += c.callToAction ? 10 : 0
  score += (c.mediaQuality / 100) * 30
  return Math.round(score)
}

interface Estimates {
  estimatedReach: number
  estimatedImpressions: number
  estimatedCpc: number
  estimatedCtr: number
  estimatedConversions: number
}

function computeEstimates(
  audiences: MetaAudience[],
  placements: MetaPlacements,
  dailyBudget: number,
  creatives: MetaCreative[],
  objective: MetaObjective,
): Estimates {
  const activePlacements = Object.values(placements).filter(Boolean).length
  const selectedAudiences = audiences.filter((a) => a.selected)

  if (activePlacements === 0 || selectedAudiences.length === 0 || dailyBudget === 0) {
    return {
      estimatedReach: 0,
      estimatedImpressions: 0,
      estimatedCpc: 0,
      estimatedCtr: 0,
      estimatedConversions: 0,
    }
  }

  // 1. Objective-driven base CPM and conversion rate (CVR)
  let baseCpm = 9.80
  let baseCvr = 0.015
  if (objective === "sales") {
    baseCpm = 16.50
    baseCvr = 0.048
  } else if (objective === "conversions") {
    baseCpm = 14.00
    baseCvr = 0.038
  } else if (objective === "traffic") {
    baseCpm = 8.50
    baseCvr = 0.018
  } else if (objective === "engagement") {
    baseCpm = 6.00
    baseCvr = 0.007
  } else if (objective === "awareness") {
    baseCpm = 4.50
    baseCvr = 0.003
  }

  // 2. Placements factor
  // Sum CPM and quality weights
  let totalCpm = 0
  let totalQuality = 0
  const placementEntries = Object.entries(placements) as [PlacementKey, boolean][]
  placementEntries.forEach(([key, active]) => {
    if (active) {
      // Scale placement CPM relative to objective base CPM
      const scale = baseCpm / 9.80
      totalCpm += PLACEMENT_META[key].estimatedCpm * scale
      
      // Rate quality
      if (key === "feed") totalQuality += 1.25
      else if (key === "stories") totalQuality += 1.05
      else if (key === "reels") totalQuality += 1.15
      else if (key === "marketplace") totalQuality += 0.90
      else if (key === "rightColumn") totalQuality += 0.50
      else if (key === "audienceNetwork") totalQuality += 0.40
      else if (key === "messenger") totalQuality += 0.60
    }
  })

  const avgCpm = totalCpm / activePlacements
  const placementQuality = totalQuality / activePlacements

  // 3. Creative Strength Multiplier
  const avgCreativeStrength = creatives.length
    ? creatives.reduce((s, c) => s + computeStrength(c), 0) / creatives.length
    : 50
  const creativeMultiplier = 0.5 + (avgCreativeStrength / 100) * 1.0

  // 4. Audience Quality Factor
  let audienceQuality = 1.0
  const totalAudienceSize = selectedAudiences.reduce((s, a) => s + a.size, 0) // millions
  if (selectedAudiences.length > 0) {
    let sumQuality = 0
    selectedAudiences.forEach((a) => {
      if (a.type === "custom" || a.name.includes("1%")) sumQuality += 1.6
      else if (a.type === "lookalike") sumQuality += 1.2
      else sumQuality += 0.9
    })
    audienceQuality = sumQuality / selectedAudiences.length
  }

  // 5. Calculate Final Estimates
  const impressions = Math.round((dailyBudget / avgCpm) * 1000)
  const reach = Math.round(Math.min(totalAudienceSize * 1_000_000, impressions * 0.75))
  
  // Base CTR = 1.2% for Meta feed ads
  const ctr = parseFloat(Math.min(10, Math.max(0.1, 1.2 * creativeMultiplier * placementQuality * audienceQuality)).toFixed(2))
  const clicks = Math.round(impressions * (ctr / 100))
  const cpc = clicks > 0 ? parseFloat((dailyBudget / clicks).toFixed(2)) : 0

  // Conversions (Leads)
  const finalCvr = baseCvr * creativeMultiplier * placementQuality * audienceQuality
  const conversions = Math.round(clicks * finalCvr)

  return {
    estimatedReach: reach,
    estimatedImpressions: impressions,
    estimatedCpc: cpc,
    estimatedCtr: ctr,
    estimatedConversions: conversions,
  }
}

// ─── Store Interface ──────────────────────────────────────────────────────────

interface MetaAdsState {
  campaignName: string
  objective: MetaObjective
  dailyBudget: number
  totalBudget: number
  budgetSpent: number
  creatives: MetaCreative[]
  audiences: MetaAudience[]
  placements: MetaPlacements
  estimatedReach: number
  estimatedImpressions: number
  estimatedCpc: number
  estimatedCtr: number
  estimatedConversions: number
  decisionsMade: boolean
  isSubmitting: boolean

  setCampaignName: (name: string) => void
  setObjective: (objective: MetaObjective) => void
  setDailyBudget: (budget: number) => void
  addCreative: (creative: Omit<MetaCreative, "id">) => void
  removeCreative: (id: string) => void
  updateCreative: (id: string, updates: Partial<Omit<MetaCreative, "id">>) => void
  toggleAudience: (audienceName: string) => void
  togglePlacement: (placement: PlacementKey) => void
  calculateEstimates: () => void
  markDecisionsMade: () => void
  resetCampaign: () => void

  /**
   * Submit Meta Ads campaign configurations to the backend for the current round.
   * POST /api/v1/meta-ads/decision
   */
  submitDecisions: () => Promise<void>
}

// ─── Store ────────────────────────────────────────────────────────────────────

let idCounter = 2

const defaultPlacements: MetaPlacements = {
  feed: true,
  stories: true,
  reels: false,
  marketplace: false,
  rightColumn: false,
  audienceNetwork: false,
  messenger: false,
}

const initial = computeEstimates(DEFAULT_AUDIENCES, defaultPlacements, 30, [DEFAULT_CREATIVE], "sales")

export const useMetaAdsStore = create<MetaAdsState>((set, get) => ({
  campaignName: "Footwear Meta Ads Campaign",
  objective: "sales",
  dailyBudget: 30,
  totalBudget: 900,
  budgetSpent: 0,
  creatives: [DEFAULT_CREATIVE],
  audiences: DEFAULT_AUDIENCES,
  placements: { ...defaultPlacements },
  ...initial,
  decisionsMade: false,
  isSubmitting: false,

  setCampaignName: (name) => set({ campaignName: name }),

  setObjective: (objective) => {
    set({ objective })
    get().calculateEstimates()
  },

  setDailyBudget: (budget) => {
    set({ dailyBudget: budget, totalBudget: budget * 30 })
    get().calculateEstimates()
  },

  addCreative: (creative) => {
    const id = `cr${idCounter++}`
    set((s) => ({ creatives: [...s.creatives, { ...creative, id }] }))
    get().calculateEstimates()
  },

  removeCreative: (id) => {
    set((s) => ({ creatives: s.creatives.filter((c) => c.id !== id) }))
    get().calculateEstimates()
  },

  updateCreative: (id, updates) => {
    set((s) => ({
      creatives: s.creatives.map((c) => c.id === id ? { ...c, ...updates } : c),
    }))
    get().calculateEstimates()
  },

  toggleAudience: (audienceName) => {
    set((s) => ({
      audiences: s.audiences.map((a) =>
        a.name === audienceName ? { ...a, selected: !a.selected } : a,
      ),
    }))
    get().calculateEstimates()
  },

  togglePlacement: (placement) => {
    const cur = get().placements
    const active = Object.values(cur).filter(Boolean).length
    if (cur[placement] && active <= 1) return // keep at least 1
    set((s) => ({ placements: { ...s.placements, [placement]: !s.placements[placement] } }))
    get().calculateEstimates()
  },

  calculateEstimates: () => {
    const s = get()
    const est = computeEstimates(s.audiences, s.placements, s.dailyBudget, s.creatives, s.objective)
    set(est)
  },

  markDecisionsMade: () => set({ decisionsMade: true }),

  submitDecisions: async () => {
    const { campaignName, dailyBudget, audiences, placements, creatives } = get()
    const selectedAudiences = audiences.filter((a) => a.selected)

    if (selectedAudiences.length === 0) {
      toast.error("Select at least one audience before submitting Meta Ads decisions.")
      return
    }

    // Pick the primary placement
    const primaryPlacement = Object.entries(placements)
      .filter(([, active]) => active)
      .map(([key]) => key)[0] ?? "feed"

    // Use best creative quality score
    const bestCreativeQuality = creatives.length
      ? Math.round(creatives.reduce((s, c) => s + computeStrength(c), 0) / creatives.length / 10)
      : 5

    set({ isSubmitting: true })
    try {
      await apiClient.post("/v1/meta-ads/decision", {
        campaigns: [
          {
            name: campaignName,
            budget: dailyBudget,
            audienceInterest: selectedAudiences.map((a) => a.name).join(", "),
            bidType: "LOWEST_COST",
            bidAmount: 0,
            placement: primaryPlacement,
            creativeQuality: Math.max(1, Math.min(10, bestCreativeQuality)),
          },
        ],
      })
      set({ decisionsMade: true })
      toast.success("Meta Ads decisions saved to the simulation!")
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to save Meta Ads decisions."
      toast.error(msg)
    } finally {
      set({ isSubmitting: false })
    }
  },

  resetCampaign: () => {
    const pl = { ...defaultPlacements }
    const est = computeEstimates(DEFAULT_AUDIENCES, pl, 30, [DEFAULT_CREATIVE], "sales")
    set({
      campaignName: "Footwear Meta Ads Campaign",
      objective: "sales",
      dailyBudget: 30,
      totalBudget: 900,
      budgetSpent: 0,
      creatives: [DEFAULT_CREATIVE],
      audiences: DEFAULT_AUDIENCES,
      placements: pl,
      ...est,
      decisionsMade: false,
    })
  },
}))

export default useMetaAdsStore
