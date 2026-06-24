import { DimensionScores } from './dimensions';

/**
 * Calculates the overall weighted performance index out of 100
 */
export function calculateCompositeIndex(scores: DimensionScores, allowedPlatforms?: string[]): number {
  const baseWeights: Record<string, number> = {
    seo: 0.20,      // Organic visibility
    google: 0.25,   // Paid Search efficiency
    meta: 0.25,     // Paid Social efficiency
    budget: 0.10,   // Strategic budgeting
    revenue: 0.20,  // Scale of business growth
  };

  const platforms = allowedPlatforms && allowedPlatforms.length > 0
    ? allowedPlatforms
    : ['SEO', 'GOOGLE_ADS', 'META_ADS'];

  const activeWeights: Record<string, number> = {
    budget: baseWeights.budget,
    revenue: baseWeights.revenue,
  };

  if (platforms.includes('SEO')) {
    activeWeights.seo = baseWeights.seo;
  }
  if (platforms.includes('GOOGLE_ADS')) {
    activeWeights.google = baseWeights.google;
  }
  if (platforms.includes('META_ADS')) {
    activeWeights.meta = baseWeights.meta;
  }

  // Sum of active weights
  const sum = Object.values(activeWeights).reduce((a, b) => a + b, 0);

  // Scaled weights
  const seoWeight = activeWeights.seo ? activeWeights.seo / sum : 0;
  const googleWeight = activeWeights.google ? activeWeights.google / sum : 0;
  const metaWeight = activeWeights.meta ? activeWeights.meta / sum : 0;
  const budgetWeight = activeWeights.budget / sum;
  const revenueWeight = activeWeights.revenue / sum;

  const composite =
    (scores.seoScore * seoWeight) +
    (scores.googleAdsScore * googleWeight) +
    (scores.metaAdsScore * metaWeight) +
    (scores.budgetScore * budgetWeight) +
    (scores.revenueScore * revenueWeight);

  return parseFloat(composite.toFixed(2));
}

