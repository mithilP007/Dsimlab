import { prisma } from '../../db/client';

export interface RoundSnapshot {
  simulationId: string;
  round: number;
  seoDecisions: {
    keywords: string[];
    contentQuality: number;
    backlinkBudget: number;
  } | null;
  googleCampaigns: any[] | null;
  metaCampaigns: any[] | null;
  dailyMetrics: any[];
  scores: {
    seo: number;
    google: number;
    meta: number;
    budget: number;
    revenue: number;
    composite: number;
  } | null;
  events: any[];
}

/**
 * Aggregates all database parameters for a particular simulation round into an archived snapshot object
 */
export async function captureRoundSnapshot(
  simulationId: string,
  round: number
): Promise<RoundSnapshot> {
  const decision = await prisma.decision.findUnique({
    where: {
      simulationId_round: { simulationId, round },
    },
  });

  const dailyMetrics = await prisma.dailyMetric.findMany({
    where: { simulationId, round },
    orderBy: { day: 'asc' },
  });

  const scoreBreakdown = await prisma.scoreBreakdown.findUnique({
    where: {
      simulationId_round: { simulationId, round },
    },
  });

  const events = await prisma.marketEvent.findMany({
    where: { simulationId, round },
  });

  let seoDecisions = null;
  let googleCampaigns = null;
  let metaCampaigns = null;

  if (decision) {
    try {
      seoDecisions = {
        keywords: JSON.parse(decision.seoTargetKeywords),
        contentQuality: decision.seoContentQuality,
        backlinkBudget: decision.seoBacklinkBudget,
      };
      googleCampaigns = JSON.parse(decision.googleCampaigns);
      metaCampaigns = JSON.parse(decision.metaCampaigns);
    } catch (e) {
      // JSON parse fallback
    }
  }

  return {
    simulationId,
    round,
    seoDecisions,
    googleCampaigns,
    metaCampaigns,
    dailyMetrics,
    scores: scoreBreakdown ? {
      seo: scoreBreakdown.seoScore,
      google: scoreBreakdown.googleAdsScore,
      meta: scoreBreakdown.metaAdsScore,
      budget: scoreBreakdown.budgetScore,
      revenue: scoreBreakdown.revenueScore,
      composite: scoreBreakdown.compositeIndex,
    } : null,
    events,
  };
}
