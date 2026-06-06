import { prisma } from '../../db/client';

export interface AggregationReport {
  simulationId: string;
  totals: {
    organicImpressions: number;
    organicClicks: number;
    organicConversions: number;
    googleImpressions: number;
    googleClicks: number;
    googleCost: number;
    googleConversions: number;
    metaImpressions: number;
    metaClicks: number;
    metaCost: number;
    metaConversions: number;
    revenue: number;
    spend: number;
  };
  averages: {
    roundCompositeIndex: number;
    roundPercentileRank: number;
  };
  roundBreakdowns: any[];
}

/**
 * Aggregates daily metrics and score histories for simulation analytics
 */
export async function aggregateSimulationReport(simulationId: string): Promise<AggregationReport> {
  const metrics = await prisma.dailyMetric.findMany({
    where: { simulationId },
  });

  const scores = await prisma.scoreBreakdown.findMany({
    where: { simulationId },
    orderBy: { round: 'asc' },
  });

  const totals = {
    organicImpressions: 0,
    organicClicks: 0,
    organicConversions: 0,
    googleImpressions: 0,
    googleClicks: 0,
    googleCost: 0,
    googleConversions: 0,
    metaImpressions: 0,
    metaClicks: 0,
    metaCost: 0,
    metaConversions: 0,
    revenue: 0,
    spend: 0,
  };

  metrics.forEach(m => {
    totals.organicImpressions += m.organicImpressions;
    totals.organicClicks += m.organicClicks;
    totals.organicConversions += m.organicConversions;
    totals.googleImpressions += m.googleImpressions;
    totals.googleClicks += m.googleClicks;
    totals.googleCost += m.googleCost;
    totals.googleConversions += m.googleConversions;
    totals.metaImpressions += m.metaImpressions;
    totals.metaClicks += m.metaClicks;
    totals.metaCost += m.metaCost;
    totals.metaConversions += m.metaConversions;
    totals.revenue += m.revenue;
  });

  // Fetch decisions to sum up backlink spend
  const decisions = await prisma.decision.findMany({
    where: { simulationId }
  });
  const backlinkSpend = decisions.reduce((sum, d) => sum + d.seoBacklinkBudget, 0);
  totals.spend = totals.googleCost + totals.metaCost + backlinkSpend;

  const totalScore = scores.reduce((sum, s) => sum + s.compositeIndex, 0);
  const totalPercentile = scores.reduce((sum, s) => sum + s.percentileRank, 0);

  return {
    simulationId,
    totals: {
      ...totals,
      googleCost: parseFloat(totals.googleCost.toFixed(2)),
      metaCost: parseFloat(totals.metaCost.toFixed(2)),
      spend: parseFloat(totals.spend.toFixed(2)),
      revenue: parseFloat(totals.revenue.toFixed(2)),
    },
    averages: {
      roundCompositeIndex: scores.length > 0 ? parseFloat((totalScore / scores.length).toFixed(2)) : 0.0,
      roundPercentileRank: scores.length > 0 ? parseFloat((totalPercentile / scores.length).toFixed(1)) : 100.0,
    },
    roundBreakdowns: scores.map(s => ({
      round: s.round,
      seoScore: s.seoScore,
      googleAdsScore: s.googleAdsScore,
      metaAdsScore: s.metaAdsScore,
      budgetScore: s.budgetScore,
      revenueScore: s.revenueScore,
      compositeIndex: s.compositeIndex,
      percentileRank: s.percentileRank,
    })),
  };
}
