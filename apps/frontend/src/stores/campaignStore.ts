import { create } from "zustand"

// ─── Keyword Data ────────────────────────────────────────────────────────────

export type KeywordCategory = "High Intent" | "Informational" | "Branded" | "Long-tail"

export interface Keyword {
  id: string
  name: string
  searchVolume: number
  difficulty: number // 1–100
  cpc: number
  category: KeywordCategory
}

export const AVAILABLE_KEYWORDS: Keyword[] = [
  { id: "kw1",  name: "buy custom shoes online",         searchVolume: 12400, difficulty: 72, cpc: 2.80, category: "High Intent" },
  { id: "kw2",  name: "affordable running sneakers",      searchVolume: 8900,  difficulty: 58, cpc: 1.95, category: "High Intent" },
  { id: "kw3",  name: "order sneakers with free shipping", searchVolume: 5600, difficulty: 61, cpc: 2.40, category: "High Intent" },
  { id: "kw4",  name: "best deals on athletic footwear",   searchVolume: 4300, difficulty: 55, cpc: 1.70, category: "High Intent" },
  { id: "kw5",  name: "what is keyword density",          searchVolume: 22000, difficulty: 34, cpc: 0.40, category: "Informational" },
  { id: "kw6",  name: "how to improve page speed",        searchVolume: 18500, difficulty: 29, cpc: 0.55, category: "Informational" },
  { id: "kw7",  name: "how does backlink building work",  searchVolume: 14200, difficulty: 31, cpc: 0.60, category: "Informational" },
  { id: "kw8",  name: "what is domain authority",         searchVolume: 11000, difficulty: 27, cpc: 0.45, category: "Informational" },
  { id: "kw9",  name: "SimpLab simulation platform",      searchVolume: 3200,  difficulty: 18, cpc: 0.30, category: "Branded" },
  { id: "kw10", name: "SimpLab digital marketing course", searchVolume: 2100,  difficulty: 15, cpc: 0.25, category: "Branded" },
  { id: "kw11", name: "SimpLab SEO training tool",        searchVolume: 1400,  difficulty: 12, cpc: 0.20, category: "Branded" },
  { id: "kw12", name: "SimpLab for universities",         searchVolume: 900,   difficulty: 10, cpc: 0.18, category: "Branded" },
  { id: "kw13", name: "eco friendly vegan running shoes for women", searchVolume: 1800, difficulty: 44, cpc: 1.20, category: "Long-tail" },
  { id: "kw14", name: "wide fit athletic sneakers for flat feet",   searchVolume: 2400, difficulty: 39, cpc: 1.50, category: "Long-tail" },
  { id: "kw15", name: "lightweight trail shoes for beginners",      searchVolume: 3100, difficulty: 42, cpc: 1.35, category: "Long-tail" },
  { id: "kw16", name: "best minimalist shoes for long distance running", searchVolume: 2700, difficulty: 47, cpc: 1.60, category: "Long-tail" },
  { id: "kw17", name: "custom embroidered sneakers bulk order",     searchVolume: 1100, difficulty: 38, cpc: 2.10, category: "Long-tail" },
  { id: "kw18", name: "school uniform shoes wholesale supplier",    searchVolume: 1600, difficulty: 52, cpc: 1.80, category: "Long-tail" },
  { id: "kw19", name: "buy orthopedic walking shoes online",        searchVolume: 4800, difficulty: 63, cpc: 2.20, category: "High Intent" },
  { id: "kw20", name: "professional dress shoes under $100",        searchVolume: 6200, difficulty: 66, cpc: 2.55, category: "High Intent" },
]

// ─── Backlink Opportunity Data ───────────────────────────────────────────────

export type BacklinkType = "Guest Post" | "Directory" | "Editorial" | "Partnership"

export interface BacklinkOpportunity {
  id: string
  sourceName: string
  domainAuthority: number
  cost: number
  type: BacklinkType
}

export const BACKLINK_OPPORTUNITIES: BacklinkOpportunity[] = [
  { id: "bl1", sourceName: "MarketingInsider Blog",    domainAuthority: 78, cost: 180, type: "Guest Post" },
  { id: "bl2", sourceName: "SneakerHeads Directory",   domainAuthority: 45, cost: 60,  type: "Directory" },
  { id: "bl3", sourceName: "TechCrunch Sports",        domainAuthority: 92, cost: 350, type: "Editorial" },
  { id: "bl4", sourceName: "FitLife Partnership Hub",  domainAuthority: 61, cost: 220, type: "Partnership" },
  { id: "bl5", sourceName: "ShoeReview.net",           domainAuthority: 53, cost: 90,  type: "Directory" },
  { id: "bl6", sourceName: "AthleticWeekly Feature",   domainAuthority: 82, cost: 290, type: "Guest Post" },
  { id: "bl7", sourceName: "EcoFashion Coalition",     domainAuthority: 67, cost: 150, type: "Partnership" },
  { id: "bl8", sourceName: "RunnerWorld Editorial",    domainAuthority: 88, cost: 400, type: "Editorial" },
]

const BACKLINK_TOTAL_BUDGET = 1000

// ─── Store Interface ─────────────────────────────────────────────────────────

interface CampaignState {
  // Keyword state
  selectedKeywords: string[]

  // Score components (0–100 each)
  onPageScore: number
  technicalScore: number
  backlinkScore: number
  totalSeoScore: number

  // Budget
  budgetSpent: number

  // Backlink selections
  selectedBacklinks: string[]

  // Decisions
  decisionsMade: boolean

  // ─── Actions ───────────────────────────────────────────────────────────────
  toggleKeyword: (keywordId: string) => void
  setOnPageScore: (score: number) => void
  setTechnicalScore: (score: number) => void
  setBacklinkScore: (score: number) => void
  calculateTotalScore: () => void
  toggleBacklink: (backlinkId: string) => void
  markDecisionsMade: () => void
  resetCampaign: () => void
}

// ─── Score calculation helper ────────────────────────────────────────────────

function computeTotalScore(
  onPage: number,
  technical: number,
  backlink: number,
): number {
  // Weighted: 40% on-page, 35% technical, 25% backlinks
  return Math.round(onPage * 0.4 + technical * 0.35 + backlink * 0.25)
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useCampaignStore = create<CampaignState>((set, get) => ({
  selectedKeywords: ["kw1", "kw9", "kw13"], // 3 pre-selected
  onPageScore: 0,
  technicalScore: 0,
  backlinkScore: 0,
  totalSeoScore: 0,
  budgetSpent: 0,
  selectedBacklinks: [],
  decisionsMade: false,

  toggleKeyword: (keywordId) =>
    set((state) => {
      const exists = state.selectedKeywords.includes(keywordId)
      if (!exists && state.selectedKeywords.length >= 10) return state
      const next = exists
        ? state.selectedKeywords.filter((k) => k !== keywordId)
        : [...state.selectedKeywords, keywordId]
      return { selectedKeywords: next }
    }),

  setOnPageScore: (score) => {
    set({ onPageScore: score })
    const { technicalScore, backlinkScore } = get()
    set({ totalSeoScore: computeTotalScore(score, technicalScore, backlinkScore) })
  },

  setTechnicalScore: (score) => {
    set({ technicalScore: score })
    const { onPageScore, backlinkScore } = get()
    set({ totalSeoScore: computeTotalScore(onPageScore, score, backlinkScore) })
  },

  setBacklinkScore: (score) => {
    set({ backlinkScore: score })
    const { onPageScore, technicalScore } = get()
    set({ totalSeoScore: computeTotalScore(onPageScore, technicalScore, score) })
  },

  calculateTotalScore: () => {
    const { onPageScore, technicalScore, backlinkScore } = get()
    set({ totalSeoScore: computeTotalScore(onPageScore, technicalScore, backlinkScore) })
  },

  toggleBacklink: (backlinkId) =>
    set((state) => {
      const exists = state.selectedBacklinks.includes(backlinkId)
      const opp = BACKLINK_OPPORTUNITIES.find((b) => b.id === backlinkId)
      if (!opp) return state

      let nextSelected: string[]
      let nextBudget: number

      if (exists) {
        nextSelected = state.selectedBacklinks.filter((b) => b !== backlinkId)
        nextBudget = state.budgetSpent - opp.cost
      } else {
        if (state.budgetSpent + opp.cost > BACKLINK_TOTAL_BUDGET) return state
        nextSelected = [...state.selectedBacklinks, backlinkId]
        nextBudget = state.budgetSpent + opp.cost
      }

      // Backlink score = % of budget used (capped at 100)
      const backlinkScore = Math.min(
        100,
        Math.round((nextBudget / BACKLINK_TOTAL_BUDGET) * 100),
      )
      const total = computeTotalScore(
        state.onPageScore,
        state.technicalScore,
        backlinkScore,
      )

      return {
        selectedBacklinks: nextSelected,
        budgetSpent: nextBudget,
        backlinkScore,
        totalSeoScore: total,
      }
    }),

  markDecisionsMade: () => set({ decisionsMade: true }),

  resetCampaign: () =>
    set({
      selectedKeywords: ["kw1", "kw9", "kw13"],
      onPageScore: 0,
      technicalScore: 0,
      backlinkScore: 0,
      totalSeoScore: 0,
      budgetSpent: 0,
      selectedBacklinks: [],
      decisionsMade: false,
    }),
}))

export default useCampaignStore
