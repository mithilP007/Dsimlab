export interface PerformanceInput {
  seoKeywordsRanks: number[]; // Array of keyword positions
  googleAdsCost: number;
  googleAdsRevenue: number;
  metaAdsCost: number;
  metaAdsRevenue: number;
  allocatedRoundBudget: number;
  totalRoundSpend: number;
  totalRoundRevenue: number;
}

export interface DimensionScores {
  seoScore: number;
  googleAdsScore: number;
  metaAdsScore: number;
  budgetScore: number;
  revenueScore: number;
  strategicAlignment: number;
  efficiencyRoi: number;
  budgetDiscipline: number;
  riskManagement: number;
  adaptability: number;
}

/**
 * Evaluates performance across 5 specific dimensions, each outputting a score out of 100.
 */
export function calculateDimensionScores(input: PerformanceInput): DimensionScores {
  // 1. SEO Score: base on average keyword rank position
  // Average rank 1.0 -> score 100; Average rank >= 50 -> score 10.
  let seoScore = 10.0;
  if (input.seoKeywordsRanks.length > 0) {
    const sum = input.seoKeywordsRanks.reduce((acc, rank) => acc + rank, 0);
    const avgRank = sum / input.seoKeywordsRanks.length;
    seoScore = Math.max(10.0, 100.0 - (avgRank - 1.0) * 1.8);
  }

  // 2. Google Ads Score: Base on return on ad spend (ROAS)
  // ROAS = Revenue / Cost. ROAS of 3.0 gives score 100. ROAS of 1.0 gives 33.3.
  let googleAdsScore = 0.0;
  if (input.googleAdsCost > 0) {
    const roas = input.googleAdsRevenue / input.googleAdsCost;
    googleAdsScore = Math.min(100.0, Math.max(0.0, (roas / 3.0) * 100.0));
  } else if (input.allocatedRoundBudget > 0) {
    // Penalize if there was budget, but they didn't run Google Ads
    googleAdsScore = 0.0;
  } else {
    googleAdsScore = 50.0; // neutral if no budget allocated
  }

  // 3. Meta Ads Score: Base on ROAS
  let metaAdsScore = 0.0;
  if (input.metaAdsCost > 0) {
    const roas = input.metaAdsRevenue / input.metaAdsCost;
    metaAdsScore = Math.min(100.0, Math.max(0.0, (roas / 3.0) * 100.0));
  } else if (input.allocatedRoundBudget > 0) {
    metaAdsScore = 0.0;
  } else {
    metaAdsScore = 50.0;
  }

  // 4. Budget Score: Precision of budget utilization
  // Over-spending or under-spending cuts score.
  let budgetScore = 100.0;
  if (input.allocatedRoundBudget > 0) {
    const utilization = input.totalRoundSpend / input.allocatedRoundBudget;
    const diff = Math.abs(1.0 - utilization);
    // Lose 2 points for every 1% deviation from target budget
    budgetScore = Math.max(0.0, 100.0 - (diff * 200.0));
  }

  // 5. Revenue Score: revenue volume scaling
  // Baseline target benchmark of $12,000 for a perfect score
  const benchmarkRevenue = 12000.0;
  const revenueScore = Math.min(100.0, (input.totalRoundRevenue / benchmarkRevenue) * 100.0);

  return {
    seoScore: parseFloat(seoScore.toFixed(2)),
    googleAdsScore: parseFloat(googleAdsScore.toFixed(2)),
    metaAdsScore: parseFloat(metaAdsScore.toFixed(2)),
    budgetScore: parseFloat(budgetScore.toFixed(2)),
    revenueScore: parseFloat(revenueScore.toFixed(2)),
    strategicAlignment: parseFloat(seoScore.toFixed(2)),
    efficiencyRoi: parseFloat(((googleAdsScore + metaAdsScore) / 2).toFixed(2)),
    budgetDiscipline: parseFloat(budgetScore.toFixed(2)),
    riskManagement: parseFloat(Math.max(0.0, 100.0 - (input.googleAdsCost > 0 && input.googleAdsRevenue === 0 ? 30 : 0) - (input.metaAdsCost > 0 && input.metaAdsRevenue === 0 ? 30 : 0)).toFixed(2)),
    adaptability: parseFloat(Math.min(100.0, revenueScore * 1.1).toFixed(2)),
  };
}
