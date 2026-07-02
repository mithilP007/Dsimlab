import { create } from "zustand";
import apiClient from "@/lib/api";
import { toast } from "sonner";

export interface CampaignRun {
  id: string;
  userId: string;
  scenarioId: string;
  classId: string | null;
  durationDays: number;
  currentDay: number;
  status: "INITIALIZED" | "ACTIVE" | "COMPLETED";
  startedAt: string;
  endsAt: string;
  lastProcessedAt: string | null;
  nextProcessingAt: string;
  scenario?: {
    name: string;
    description: string;
    industry: string;
    targetKPI: string;
    dailyBudgetCap: number;
  };
}

export interface DailyDecision {
  id: string;
  campaignRunId: string;
  dayNumber: number;
  seoSettingsJson: {
    targetKeywords: string[];
    contentQuality: number;
    backlinkBudget: number;
    metaTitle?: string;
    metaDescription?: string;
    h1Header?: string;
    bodyContent?: string;
  };
  googleAdsSettingsJson: {
    campaigns: any[];
  };
  metaAdsSettingsJson: {
    campaigns: any[];
  };
  budgetJson: {
    totalAllocated: number;
  };
}

export interface DailyResult {
  id: string;
  campaignRunId: string;
  dayNumber: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpa: number;
  conversions: number;
  revenue: number;
  spend: number;
  roas: number;
  seoTraffic: number;
  seoRank: number;
  authorityScore: number;
  metaReach: number;
  metaEngagement: number;
  googleAdsScore: number;
  metaAdsScore: number;
  seoScore: number;
  compositeScore: number;
  generatedAt: string;
  trendSnapshot?: {
    source: string;
    confidenceScore: number;
  };
}

interface DailyCampaignState {
  activeRun: CampaignRun | null;
  loading: boolean;
  results: DailyResult[];
  recommendations: any[];
  currentDecision: DailyDecision | null;

  fetchState: () => Promise<void>;
  startCampaign: () => Promise<void>;
  saveDecision: (
    dayNumber: number,
    seoSettings: any,
    googleAdsSettings: any,
    metaAdsSettings: any
  ) => Promise<boolean>;
  fetchResults: (campaignRunId: string) => Promise<void>;
  fetchRecommendations: (campaignRunId: string, dayNumber: number) => Promise<void>;
  fastForward: () => Promise<void>;
}

export const useDailyCampaignStore = create<DailyCampaignState>((set, get) => ({
  activeRun: null,
  loading: false,
  results: [],
  recommendations: [],
  currentDecision: null,

  fetchState: async () => {
    set({ loading: true });
    try {
      const res = await apiClient.get<{ success: boolean; run: CampaignRun }>("/api/v1/campaign/state");
      if (res.data?.success && res.data.run) {
        set({ activeRun: res.data.run });
      }
    } catch (err: any) {
      console.warn("No active campaign run loaded", err.response?.data?.message);
      set({ activeRun: null });
    } finally {
      set({ loading: false });
    }
  },

  startCampaign: async () => {
    set({ loading: true });
    try {
      const res = await apiClient.post<{ success: boolean; campaignRunId: string }>("/api/v1/campaign/start");
      if (res.data?.success) {
        toast.success("Daily campaign initialized!");
        const { fetchState } = get();
        await fetchState();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to start campaign");
    } finally {
      set({ loading: false });
    }
  },

  saveDecision: async (dayNumber, seoSettings, googleAdsSettings, metaAdsSettings) => {
    const { activeRun } = get();
    if (!activeRun) {
      toast.error("No active campaign run found.");
      return false;
    }

    set({ loading: true });
    try {
      const res = await apiClient.post<{ success: boolean; decision: DailyDecision }>("/api/v1/campaign/decision", {
        campaignRunId: activeRun.id,
        dayNumber,
        seoSettings,
        googleAdsSettings,
        metaAdsSettings,
      });

      if (res.data?.success) {
        toast.success(`Decisions submitted for Day ${dayNumber}!`);
        set({ currentDecision: res.data.decision });
        return true;
      }
      return false;
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save decisions");
      return false;
    } finally {
      set({ loading: false });
    }
  },

  fetchResults: async (campaignRunId) => {
    try {
      const res = await apiClient.get<{ success: boolean; results: DailyResult[] }>(
        `/api/v1/campaign/results?campaignRunId=${campaignRunId}`
      );
      if (res.data?.success) {
        set({ results: res.data.results });
      }
    } catch (err: any) {
      console.error("Failed to load results", err);
    }
  },

  fetchRecommendations: async (campaignRunId, dayNumber) => {
    try {
      const res = await apiClient.get<{ success: boolean; recommendations: any[] }>(
        `/api/v1/campaign/recommendations?campaignRunId=${campaignRunId}&dayNumber=${dayNumber}`
      );
      if (res.data?.success) {
        set({ recommendations: res.data.recommendations });
      }
    } catch (err: any) {
      console.error("Failed to load recommendations", err);
    }
  },

  fastForward: async () => {
    const { activeRun } = get();
    if (!activeRun) return;

    set({ loading: true });
    try {
      const res = await apiClient.post<{ success: boolean; currentDay: number; status: string }>(
        "/api/v1/campaign/fast-forward",
        {
          campaignRunId: activeRun.id,
        }
      );
      if (res.data?.success) {
        toast.success(`Fast-forward completed. Campaign is now on Day ${res.data.currentDay}.`);
        const { fetchState, fetchResults } = get();
        await fetchState();
        await fetchResults(activeRun.id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fast-forward");
    } finally {
      set({ loading: false });
    }
  },
}));
