import { create } from "zustand"

export type SimulationStatus =
  | "decision-open"
  | "locked"
  | "processing"
  | "results-ready"
  | "completed"

interface SimulationState {
  // Existing state fields (for compilation safety)
  campaignName: string
  budget: number
  setCampaignName: (name: string) => void
  setBudget: (budget: number) => void

  // New Simulation Engine state fields
  currentDay: number
  totalDays: number
  status: SimulationStatus
  decisionsSaved: boolean

  // New Actions
  saveDecisions: () => void
  lockDecisions: () => void
  advanceDay: () => void
  setStatus: (status: SimulationStatus) => void
  resetSimulation: () => void
}

export const useSimulationStore = create<SimulationState>((set) => ({
  // Existing state initializers
  campaignName: "Summer Launch Campaign",
  budget: 5000,
  setCampaignName: (name) => set({ campaignName: name }),
  setBudget: (budget) => set({ budget }),

  // New initializers
  currentDay: 1,
  totalDays: 30,
  status: "decision-open",
  decisionsSaved: false,

  // Action implementations
  saveDecisions: () => set({ decisionsSaved: true }),
  lockDecisions: () => set({ status: "locked" }),
  advanceDay: () =>
    set((state) => {
      const nextDay = state.currentDay + 1
      if (nextDay > state.totalDays) {
        return {
          currentDay: state.totalDays,
          status: "completed",
          decisionsSaved: false,
        }
      }
      return {
        currentDay: nextDay,
        status: "decision-open",
        decisionsSaved: false,
      }
    }),
  setStatus: (status) => set({ status }),
  resetSimulation: () =>
    set({
      currentDay: 1,
      totalDays: 30,
      status: "decision-open",
      decisionsSaved: false,
    }),
}))
