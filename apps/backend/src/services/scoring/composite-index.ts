import { DimensionScores } from './dimensions';

/**
 * Calculates the overall weighted performance index out of 100
 */
export function calculateCompositeIndex(scores: DimensionScores): number {
  const weights = {
    seo: 0.20,      // Organic visibility
    google: 0.25,   // Paid Search efficiency
    meta: 0.25,     // Paid Social efficiency
    budget: 0.10,   // Strategic budgeting
    revenue: 0.20,  // Scale of business growth
  };

  const composite =
    (scores.seoScore * weights.seo) +
    (scores.googleAdsScore * weights.google) +
    (scores.metaAdsScore * weights.meta) +
    (scores.budgetScore * weights.budget) +
    (scores.revenueScore * weights.revenue);

  return parseFloat(composite.toFixed(2));
}
