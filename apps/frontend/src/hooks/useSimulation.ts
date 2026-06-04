import { useSimulationStore } from "@/stores/simulationStore"

export function useSimulation() {
  const campaignName = useSimulationStore((state) => state.campaignName)
  const budget = useSimulationStore((state) => state.budget)
  const setCampaignName = useSimulationStore((state) => state.setCampaignName)
  const setBudget = useSimulationStore((state) => state.setBudget)

  return {
    campaignName,
    budget,
    setCampaignName,
    setBudget,
  }
}
