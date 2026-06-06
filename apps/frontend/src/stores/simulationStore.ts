import { create } from "zustand"
import apiClient from "@/lib/api"
import { toast } from "sonner"

// ─── Status Types ─────────────────────────────────────────────────────────────

/**
 * SimulationStatus mirrors the backend state machine values.
 * Backend values: INITIALIZED | DECISION_OPEN | LOCKED | PROCESSING | RESULTS_READY | SCORE_LOCKED | COMPLETED
 * We map these to simpler frontend tokens.
 */
export type SimulationStatus =
  | "decision-open"
  | "locked"
  | "processing"
  | "results-ready"
  | "completed"

function mapBackendStatus(backendStatus: string): SimulationStatus {
  switch (backendStatus.toUpperCase()) {
    case "INITIALIZED":
    case "DECISION_OPEN":
      return "decision-open"
    case "LOCKED":
      return "locked"
    case "PROCESSING":
      return "processing"
    case "RESULTS_READY":
    case "SCORE_LOCKED":
      return "results-ready"
    case "COMPLETED":
      return "completed"
    default:
      return "decision-open"
  }
}

// ─── State Interface ──────────────────────────────────────────────────────────

interface SimulationState {
  // Session identifiers returned from backend
  simulationId: string | null
  classId: string | null

  // Progress
  currentRound: number
  totalRounds: number

  // State machine
  status: SimulationStatus
  isLoading: boolean
  error: string | null

  // Legacy shape kept so existing components compile without edits
  campaignName: string
  budget: number
  currentDay: number
  totalDays: number
  decisionsSaved: boolean

  // ─── Actions ──────────────────────────────────────────────────────────────

  /** Boot or resume the simulation for the current user's class */
  initSimulation: () => Promise<void>

  /** Fetch the live simulation state from /api/v1/simulation/state */
  fetchState: () => Promise<void>

  /**
   * Submit current decisions and advance the simulation round.
   * The backend processes the math and emits a round:complete WS event.
   */
  advanceDay: () => Promise<void>

  /** Manually override status (used by useSocket round:complete handler) */
  setStatus: (status: SimulationStatus) => void

  /** Mark decisions as saved locally before submitting */
  saveDecisions: () => void

  /** Lock decisions before advancing */
  lockDecisions: () => void

  /** Hard reset (e.g., on logout) */
  resetSimulation: () => void

  // Legacy setters kept for compilation
  setCampaignName: (name: string) => void
  setBudget: (budget: number) => void
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useSimulationStore = create<SimulationState>((set, get) => ({
  simulationId: null,
  classId: null,
  currentRound: 1,
  totalRounds: 30,
  status: "decision-open",
  isLoading: false,
  error: null,

  // Legacy fields
  campaignName: "",
  budget: 0,
  currentDay: 1,
  totalDays: 30,
  decisionsSaved: false,

  // ─── Initialise ──────────────────────────────────────────────────────────

  initSimulation: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await apiClient.post("/v1/simulation/start")
      set({
        simulationId: data.simulationId,
        currentRound: data.currentRound ?? 1,
        status: mapBackendStatus(data.status ?? "DECISION_OPEN"),
        currentDay: data.currentRound ?? 1,
      })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to initialise simulation."
      set({ error: msg })
      toast.error(msg)
    } finally {
      set({ isLoading: false })
    }
  },

  // ─── Fetch State ─────────────────────────────────────────────────────────

  fetchState: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await apiClient.get("/v1/simulation/state")
      const state = data.state
      set({
        simulationId: state.id,
        classId: state.classId,
        currentRound: state.currentRound ?? 1,
        status: mapBackendStatus(state.status ?? "DECISION_OPEN"),
        currentDay: state.currentRound ?? 1,
        // Pull totalRounds from associated scenario if available
        totalRounds: state.class?.scenario?.durationDays ?? 30,
        totalDays: state.class?.scenario?.durationDays ?? 30,
        // Legacy campaign fields
        campaignName: state.class?.scenario?.title ?? "",
        budget: state.class?.scenario?.startingBudget ?? 0,
      })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to load simulation state."
      set({ error: msg })
    } finally {
      set({ isLoading: false })
    }
  },

  // ─── Advance Day ─────────────────────────────────────────────────────────

  advanceDay: async () => {
    const { simulationId, status } = get()
    if (!simulationId) {
      toast.error("No active simulation found. Please start a simulation first.")
      return
    }
    if (status === "locked" || status === "processing") {
      toast.info("Please wait – the round is being processed.")
      return
    }

    set({ isLoading: true, status: "locked", error: null })
    try {
      await apiClient.post("/v1/simulation/advance")
      // The round:complete WebSocket event will update status via useSocket
      set({ status: "processing", decisionsSaved: false })
      toast.info("Decisions submitted! Processing round…")
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to advance simulation round."
      set({ error: msg, status: "decision-open" })
      toast.error(msg)
    } finally {
      set({ isLoading: false })
    }
  },

  // ─── Misc ────────────────────────────────────────────────────────────────

  setStatus: (status) => set({ status }),
  saveDecisions: () => set({ decisionsSaved: true }),
  lockDecisions: () => set({ status: "locked" }),

  resetSimulation: () =>
    set({
      simulationId: null,
      classId: null,
      currentRound: 1,
      totalRounds: 30,
      status: "decision-open",
      isLoading: false,
      error: null,
      campaignName: "",
      budget: 0,
      currentDay: 1,
      totalDays: 30,
      decisionsSaved: false,
    }),

  // Legacy setters
  setCampaignName: (name) => set({ campaignName: name }),
  setBudget: (budget) => set({ budget }),
}))
