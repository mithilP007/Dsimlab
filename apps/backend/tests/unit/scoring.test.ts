import { describe, it, expect } from 'vitest';
import { calculateDimensionScores } from '../../src/services/scoring/dimensions';
import { calculateCompositeIndex } from '../../src/services/scoring/composite-index';
import { calculatePercentile } from '../../src/services/scoring/percentile';

describe('Scoring & Rankings Unit Tests', () => {
  it('should calculate dimensional performance scores out of 100', () => {
    const dimensions = calculateDimensionScores({
      seoKeywordsRanks: [1, 2, 8],
      googleAdsCost: 200.0,
      googleAdsRevenue: 600.0,
      metaAdsCost: 300.0,
      metaAdsRevenue: 450.0,
      allocatedRoundBudget: 1000.0,
      totalRoundSpend: 1000.0,
      totalRoundRevenue: 1050.0,
    });

    expect(dimensions.seoScore).toBeGreaterThan(80.0);
    expect(dimensions.googleAdsScore).toBeCloseTo(100.0, 1);
    expect(dimensions.metaAdsScore).toBeCloseTo(50.0, 1);
    expect(dimensions.budgetScore).toBe(100.0);
  });

  it('should compile composite scores using exact weights', () => {
    const composite = calculateCompositeIndex({
      seoScore: 90.0,
      googleAdsScore: 80.0,
      metaAdsScore: 70.0,
      budgetScore: 100.0,
      revenueScore: 50.0,
    });

    expect(composite).toBe(75.5);
  });

  it('should calculate statistical percentiles in class cohorts', () => {
    const scoresList = [55, 65, 75, 85, 95];
    const topPercentile = calculatePercentile(95, scoresList);
    const bottomPercentile = calculatePercentile(55, scoresList);
    const midPercentile = calculatePercentile(75, scoresList);

    expect(topPercentile).toBe(90.0);
    expect(bottomPercentile).toBe(10.0);
    expect(midPercentile).toBe(50.0);
  });
});
