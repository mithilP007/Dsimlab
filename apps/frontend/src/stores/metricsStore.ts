import { create } from "zustand"
import apiClient from "@/lib/api"
import { toast } from "sonner"

// ─── Interfaces ───────────────────────────────────────────────────────────────

/**
 * DailyMetric mirrors the Prisma DailyMetric model returned by
 * GET /api/v1/metrics
 */
export interface DailyMetric {
  id: string
  simulationId: string
  round: number
  day: number
  seoOrganicClicks: number
  seoOrganicImpressions: number
  googleClicks: number
  googleImpressions: number
  googleCost: number
  googleConversions: number
  metaClicks: number
  metaImpressions: number
  metaCost: number
  metaConversions: number
  revenue: number
  profit: number
  compositeScore: number
  percentileRank: number
}

// ─── State Interface ──────────────────────────────────────────────────────────

interface MetricsState {
  metrics: DailyMetric[]
  isLoading: boolean
  error: string | null

  /**
   * Load all daily metric records for the current user's simulation.
   * Optionally filter by round number.
   * GET /api/v1/metrics?round=<n>
   */
  fetchMetrics: (round?: number) => Promise<void>

  /** Clear metrics data on logout or simulation reset */
  clearMetrics: () => void
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useMetricsStore = create<MetricsState>((set) => ({
  metrics: [],
  isLoading: false,
  error: null,

  fetchMetrics: async (round?: number) => {
    set({ isLoading: true, error: null })
    try {
      const params = round !== undefined ? { round } : {}
      const { data } = await apiClient.get("/v1/metrics", { params })
      set({ metrics: data.metrics ?? [] })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to load daily metrics."
      set({ error: msg })
      toast.error(msg)
    } finally {
      set({ isLoading: false })
    }
  },

  clearMetrics: () => set({ metrics: [], error: null }),
}))

export default useMetricsStore
