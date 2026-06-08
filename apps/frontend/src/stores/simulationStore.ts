import { create } from "zustand"
import api from "@/lib/api"
import { toast } from "sonner"

export type SimulationStatus =
  | "INITIALIZED"
  | "DECISION_OPEN"
  | "LOCKED"
  | "PROCESSING"
  | "RESULTS_READY"
  | "SCORE_LOCKED"
  | "COMPLETED"

export interface SimulationDetails {
  id: string
  userId: string
  classId: string
  currentRound: number
  status: SimulationStatus
  isCompleted: boolean
  cumulativeSpend: number
  cumulativeRevenue: number
  score: number
}

interface SimulationState {
  activeSimulation: SimulationDetails | null
  currentDay: number
  totalDays: number
  status: SimulationStatus
  decisionsSaved: boolean
  isLoading: boolean
  loadingMessage: string | null
  metrics: any[]
  snapshots: any[]

  // Action methods
  fetchLatestState: (simulationId?: string) => Promise<SimulationDetails | null>
  startSimulation: () => Promise<SimulationDetails | null>
  submitDecisions: (decisions: any) => Promise<any>
  advanceSimulation: () => Promise<void>
  fetchMetrics: () => Promise<any[]>
  fetchSnapshots: () => Promise<any[]>
  setStatus: (status: SimulationStatus) => void
  setIsLoading: (loading: boolean, message?: string | null) => void
  resetSimulation: () => void

  // Keep these for typescript compilation compatibility with existing files
  campaignName: string
  budget: number
  setCampaignName: (name: string) => void
  setBudget: (budget: number) => void
  saveDecisions: () => Promise<void>
  lockDecisions: () => void
  advanceDay: () => void
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  activeSimulation: null,
  currentDay: 1,
  totalDays: 10, // Default max rounds
  status: "INITIALIZED",
  decisionsSaved: false,
  isLoading: false,
  loadingMessage: null,
  metrics: [],
  snapshots: [],

  campaignName: "Digital Campaign",
  budget: 5000,
  setCampaignName: (name) => set({ campaignName: name }),
  setBudget: (budget) => set({ budget }),
  lockDecisions: () => set({ status: "LOCKED" }),
  advanceDay: () => {},

  saveDecisions: async () => {
    // Gather SEO decisions
    const campaignStore = (await import('./campaignStore')).useCampaignStore.getState();
    const googleStore = (await import('./googleAdsStore')).useGoogleAdsStore.getState();
    const metaStore = (await import('./metaAdsStore')).useMetaAdsStore.getState();
    const { AVAILABLE_KEYWORDS } = await import('./campaignStore');

    const seoTargetKeywords = campaignStore.selectedKeywords.map(
      (id) => AVAILABLE_KEYWORDS.find((k) => k.id === id)?.name || id
    );
    const seoContentQuality = Math.max(1, Math.min(10, Math.round(campaignStore.onPageScore / 10))) || 5;
    const seoBacklinkBudget = campaignStore.budgetSpent || 0;

    // Google campaigns
    const googleCampaigns = [{
      name: googleStore.campaignName,
      budget: googleStore.totalBudget,
      objective: googleStore.objective || 'Sales',
      campaignType: googleStore.campaignType || 'Search',
      biddingStrategy: googleStore.biddingStrategy || 'Manual CPC',
      negativeKeywords: googleStore.negativeKeywords || [],
      adCopy: googleStore.adCopies[0] || { headline1: '', headline2: '', headline3: '', description1: '', description2: '' },
      landingPage: googleStore.landingPage || { pageRelevance: 5, mobileFriendly: 5, pageSpeed: 5, trustSignals: 5, offerClarity: 5, conversionReadiness: 5 },
      keywords: googleStore.selectedKeywords.map((k) => ({
        word: k.keyword,
        bid: k.bid,
        matchType: k.matchType || 'broad',
      })),
      devices: googleStore.devices,
      locations: googleStore.locations.filter(l => l.selected).map(l => l.name)
    }];

    // Meta campaigns
    const activeAudience = metaStore.audiences.find((a) => a.selected);
    let audienceInterest = "general-broad";
    if (activeAudience) {
      const name = activeAudience.name.toLowerCase();
      if (name.includes("footwear") || name.includes("fashion") || name.includes("sports") || name.includes("fitness")) {
        audienceInterest = "fashion-lifestyle";
      } else if (name.includes("business") || name.includes("email") || name.includes("CRM") || name.includes("lookalike") || name.includes("visitor")) {
        audienceInterest = "business-owners";
      } else if (name.includes("tech") || name.includes("technology")) {
        audienceInterest = "tech-enthusiasts";
      }
    }

    const activePlacement = Object.keys(metaStore.placements).find(
      (k) => (metaStore.placements as any)[k]
    ) || "auto";

    const avgQuality = metaStore.creatives.length
      ? metaStore.creatives.reduce((sum, c) => sum + c.mediaQuality, 0) / metaStore.creatives.length
      : 80;
    const creativeQuality = Math.max(1, Math.min(10, Math.round(avgQuality / 10))) || 8;

    const metaCampaigns = [{
      name: metaStore.campaignName,
      budget: metaStore.totalBudget,
      audienceInterest,
      bidType: "LOWEST_COST",
      bidAmount: 0,
      placement: activePlacement,
      creativeQuality,
      creative: metaStore.creatives[0] || { headline: '', primaryText: '', callToAction: '', mediaQuality: 80 },
      objective: metaStore.objective || 'sales',
    }];

    const payload = {
      seoTargetKeywords,
      seoContentQuality,
      seoBacklinkBudget,
      googleCampaigns,
      metaCampaigns,
    };

    try {
      await get().submitDecisions(payload);
      campaignStore.markDecisionsMade();
      googleStore.markDecisionsMade();
      metaStore.markDecisionsMade();
    } catch (error) {
      console.error("Failed to save decisions:", error);
      throw error;
    }
  },

  fetchLatestState: async (simulationId) => {
    try {
      const id = simulationId || get().activeSimulation?.id;
      if (!id) {
        // Fallback: fetch active state from GET /api/v1/simulation/state
        const res = await api.get<{ success: boolean; state: any }>('/api/v1/simulation/state');
        if (res.data?.success && res.data.state) {
          const state = res.data.state;
          const mapped: SimulationDetails = {
            id: state.id,
            userId: state.userId,
            classId: state.classId,
            currentRound: state.currentRound,
            status: state.status as SimulationStatus,
            isCompleted: state.isCompleted,
            cumulativeSpend: state.cumulativeSpend,
            cumulativeRevenue: state.cumulativeRevenue,
            score: state.score,
          };
          set({
            activeSimulation: mapped,
            status: mapped.status,
            currentDay: mapped.currentRound,
          });
          return mapped;
        }
        return null;
      }
      
      const res = await api.get<SimulationDetails>(`/api/simulations/${id}`);
      const data = res.data;
      set({
        activeSimulation: data,
        status: data.status,
        currentDay: data.currentRound,
      });
      return data;
    } catch (error) {
      console.error("Failed to fetch simulation state:", error);
      return null;
    }
  },

  startSimulation: async () => {
    try {
      get().setIsLoading(true, "Starting simulation...");
      const res = await api.post<SimulationDetails>('/api/simulations');
      const data = res.data;
      set({
        activeSimulation: data,
        status: data.status,
        currentDay: data.currentRound,
        isLoading: false,
        loadingMessage: null
      });
      toast.success("Simulation started successfully!");
      return data;
    } catch (error: any) {
      get().setIsLoading(false);
      toast.error(error.response?.data?.error || "Failed to start simulation");
      return null;
    }
  },

  submitDecisions: async (decisions) => {
    const simId = get().activeSimulation?.id;
    if (!simId) {
      toast.error("No active simulation selected");
      throw new Error("No active simulation");
    }
    try {
      get().setIsLoading(true, "Submitting decisions...");
      const res = await api.post(`/api/simulations/${simId}/decisions`, decisions);
      set({ status: "LOCKED", decisionsSaved: true });
      get().setIsLoading(false);
      toast.success("Decisions submitted successfully!");
      return res.data;
    } catch (error: any) {
      get().setIsLoading(false);
      toast.error(error.response?.data?.error || "Failed to submit decisions");
      throw error;
    }
  },

  advanceSimulation: async () => {
    const simId = get().activeSimulation?.id;
    if (!simId) {
      toast.error("No active simulation selected");
      return;
    }
    try {
      // Set loading message and block UI until WebSocket round:complete triggers
      set({ isLoading: true, loadingMessage: "Processing round..." });
      await api.post(`/api/simulations/${simId}/advance`);
    } catch (error: any) {
      set({ isLoading: false, loadingMessage: null });
      toast.error(error.response?.data?.error || "Failed to advance simulation round");
    }
  },

  fetchMetrics: async () => {
    const simId = get().activeSimulation?.id;
    if (!simId) return [];
    try {
      const res = await api.get<{ success: boolean; metrics: any[] }>(`/api/simulations/${simId}/metrics`);
      const metrics = res.data?.metrics || [];
      set({ metrics });
      return metrics;
    } catch (error) {
      console.error("Failed to fetch daily metrics:", error);
      return [];
    }
  },

  fetchSnapshots: async () => {
    const simId = get().activeSimulation?.id;
    if (!simId) return [];
    try {
      const res = await api.get<{ success: boolean; snapshots: any[] }>(`/api/simulations/${simId}/snapshots`);
      const snapshots = res.data?.snapshots || [];
      set({ snapshots });
      return snapshots;
    } catch (error) {
      console.error("Failed to fetch round snapshots:", error);
      return [];
    }
  },

  setStatus: (status) => set({ status }),
  setIsLoading: (loading, message = null) => set({ isLoading: loading, loadingMessage: message }),
  resetSimulation: () => {
    set({
      activeSimulation: null,
      currentDay: 1,
      status: "INITIALIZED",
      decisionsSaved: false,
      metrics: [],
      snapshots: [],
    });
  },
}))
export default useSimulationStore;
