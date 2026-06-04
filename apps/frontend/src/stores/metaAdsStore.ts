import { create } from "zustand"

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
  // Core
  { name: "Footwear & Apparel Shoppers",    type: "core",      selected: true,  size: 42.3, description: "People interested in shoes, fashion, and athletic wear" },
  { name: "Sports & Fitness Enthusiasts",   type: "core",      selected: false, size: 28.6, description: "Active users interested in running, gym, and outdoor sports" },
  { name: "Luxury Goods Buyers",            type: "core",      selected: false, size: 11.2, description: "High-income users browsing premium lifestyle products" },
  { name: "Parents (Kids 0–12)",            type: "core",      selected: false, size: 19.8, description: "Parents who frequently shop for children's products" },
  { name: "Young Adults (18–24)",           type: "core",      selected: true,  size: 35.1, description: "College-age audience with high social media engagement" },
  { name: "Eco-Conscious Consumers",        type: "core",      selected: false, size: 8.7,  description: "Users who prefer sustainable and ethical brands" },
  // Custom
  { name: "Website Visitors (30-day)",      type: "custom",    selected: false, size: 0.8,  description: "Users who visited your site in the last 30 days" },
  { name: "Email List Upload",              type: "custom",    selected: false, size: 0.3,  description: "Customers from your CRM email database" },
  // Lookalike
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

// ─── Estimates ────────────────────────────────────────────────────────────────

function computeStrength(c: MetaCreative): number {
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
): Estimates {
  const activePlacements = Object.values(placements).filter(Boolean).length
  const selectedAudiences = audiences.filter((a) => a.selected)

  if (activePlacements === 0 || selectedAudiences.length === 0 || dailyBudget === 0) {
    return { estimatedReach: 0, estimatedImpressions: 0, estimatedCpc: 0, estimatedCtr: 0, estimatedConversions: 0 }
  }

  const avgCpm =
    (Object.entries(placements) as [PlacementKey, boolean][])
      .filter(([, v]) => v)
      .reduce((s, [k]) => s + PLACEMENT_META[k].estimatedCpm, 0) / activePlacements

  const totalAudienceSize = selectedAudiences.reduce((s, a) => s + a.size, 0) // millions
  const avgCreativeStrength = creatives.length
    ? creatives.reduce((s, c) => s + computeStrength(c), 0) / creatives.length
    : 0

  const impressions = Math.round((dailyBudget / avgCpm) * 1000)
  const reach = Math.round(Math.min(totalAudienceSize * 1_000_000, impressions * 0.7))
  const ctr = parseFloat((1.2 + (avgCreativeStrength / 100) * 1.8).toFixed(2))
  const clicks = Math.round(impressions * (ctr / 100))
  const cpc = clicks > 0 ? parseFloat((dailyBudget / clicks).toFixed(2)) : 0
  const conversions = Math.round(clicks * 0.032)

  return { estimatedReach: reach, estimatedImpressions: impressions, estimatedCpc: cpc, estimatedCtr: ctr, estimatedConversions: conversions }
}

// ─── Store ────────────────────────────────────────────────────────────────────

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
}

let idCounter = 2

const defaultPlacements: MetaPlacements = {
  feed: true, stories: true, reels: false,
  marketplace: false, rightColumn: false,
  audienceNetwork: false, messenger: false,
}

const initial = computeEstimates(DEFAULT_AUDIENCES, defaultPlacements, 30, [DEFAULT_CREATIVE])

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

  setCampaignName: (name) => set({ campaignName: name }),

  setObjective: (objective) => set({ objective }),

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
    const est = computeEstimates(s.audiences, s.placements, s.dailyBudget, s.creatives)
    set(est)
  },

  markDecisionsMade: () => set({ decisionsMade: true }),

  resetCampaign: () => {
    const pl = { ...defaultPlacements }
    const est = computeEstimates(DEFAULT_AUDIENCES, pl, 30, [DEFAULT_CREATIVE])
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

export { computeStrength }
export default useMetaAdsStore
