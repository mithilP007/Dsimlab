import { describe, it, expect } from 'vitest';
import { calculateQualityScore } from '../../src/services/ads/google/quality-score';
import { runGoogleAuction } from '../../src/services/ads/google/auction';
import { paceDailyBudget } from '../../src/services/ads/google/budget-pacer';
import { SeededRandom } from '../../src/utils/deterministic-random';

describe('Google Ads Auction Unit Tests', () => {
  it('should evaluate Google Quality Score reflecting keyword copy match', () => {
    const goodCopy = {
      title: 'Top Corporate CRM Software System',
      description: 'Get the best analytics dashboard for scaling enterprise sales automation.',
    };
    const badCopy = {
      title: 'General business tool',
      description: 'Online services provider.',
    };

    const qsHigh = calculateQualityScore(goodCopy, 'crm software', 8.5);
    const qsLow = calculateQualityScore(badCopy, 'crm software', 2.0);

    expect(qsHigh).toBeGreaterThan(qsLow);
    expect(qsHigh).toBeLessThanOrEqual(10);
    expect(qsLow).toBeGreaterThanOrEqual(1);
  });

  it('should run Generalized Second Price auction and sort bidders by AdRank', () => {
    const random = new SeededRandom('google-auction-test-seed');
    const advertisers = [
      { id: 'student', name: 'Student', bid: 2.50, qualityScore: 8, dailyBudget: 100.0 },
      { id: 'competitor-1', name: 'Competitor 1', bid: 4.50, qualityScore: 3, dailyBudget: 100.0 },
    ];

    const results = runGoogleAuction('crm software', 1000, advertisers, 0.02, random);

    expect(results[0].id).toBe('student');
    expect(results[0].position).toBe(1);
    expect(results[0].actualCPC).toBeLessThanOrEqual(2.50);
    expect(results[0].actualCPC).toBeGreaterThan(1.50);
  });

  it('should scale impressions, clicks, conversions, and costs to match daily budgets', () => {
    const dailyBudget = 50.0;
    const highCostMetrics = {
      impressions: 1500,
      clicks: 120,
      cost: 120.0,
      conversions: 8,
    };

    const paced = paceDailyBudget(dailyBudget, highCostMetrics);

    expect(paced.cost).toBeCloseTo(dailyBudget, 2);
    expect(paced.clicks).toBeLessThan(highCostMetrics.clicks);
    expect(paced.impressions).toBeLessThan(highCostMetrics.impressions);
  });
});
