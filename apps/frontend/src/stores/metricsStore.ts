import { create } from "zustand"
import api from "@/lib/api"

export interface DailyMetric {
  id: string
  simulationId: string
  round: number
  day: number
  organicImpressions: number
  organicClicks: number
  organicCTR: number
  organicConversions: number
  googleImpressions: number
  googleClicks: number
  googleCost: number
  googleConversions: number
  metaImpressions: number
  metaClicks: number
  metaCost: number
  metaConversions: number
  revenue: number
  createdAt: string
}

interface MetricsState {
  metrics: DailyMetric[]
  isLoading: boolean
  fetchDailyMetrics: (simulationId: string) => Promise<DailyMetric[]>
}

export const useMetricsStore = create<MetricsState>((set) => ({
  metrics: [],
  isLoading: false,

  fetchDailyMetrics: async (simulationId) => {
    set({ isLoading: true })
    try {
      const res = await api.get<{ success: boolean; metrics: DailyMetric[] }>(`/api/simulations/${simulationId}/metrics`)
      const metrics = res.data?.metrics || []
      set({ metrics, isLoading: false })
      return metrics
    } catch (err) {
      console.error("Failed to fetch daily metrics:", err)
      set({ isLoading: false })
      return []
    }
  },
}))

export default useMetricsStore
