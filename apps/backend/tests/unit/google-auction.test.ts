import { describe, it, expect } from 'vitest';
import { calculateQualityScore } from '../../src/services/ads/google/quality-score';
import { runGoogleAuction } from '../../src/services/ads/google/auction';
import { paceDailyBudget } from '../../src/services/ads/google/budget-pacer';
import { SeededRandom } from '../../src/utils/deterministic-random';

describe('Google Ads Auction Unit Tests', () => {
  it('should evaluate Google Quality Score reflecting keyword copy match', () => {
    const goodCopy = {
      headline1: 'Top Corporate CRM Software System',
      headline2: 'Free CRM Software Demo',
      headline3: 'Sales Automation System',
      description1: 'Get the best analytics dashboard for scaling enterprise sales automation.',
      description2: 'Secure checkout and fast setup. Learn more today.',
    };
    const badCopy = {
      headline1: 'General business tool',
      headline2: 'Business tool info',
      headline3: 'General dashboard',
      description1: 'Online services provider.',
      description2: 'General details here.',
    };

    const lpHigh = {
      pageRelevance: 9,
      mobileFriendly: 9,
      pageSpeed: 9,
      trustSignals: 9,
      offerClarity: 9,
      conversionReadiness: 9
    };
    const lpLow = {
      pageRelevance: 2,
      mobileFriendly: 2,
      pageSpeed: 2,
      trustSignals: 2,
      offerClarity: 2,
      conversionReadiness: 2
    };

    const qsHigh = calculateQualityScore(goodCopy, 'crm software', lpHigh);
    const qsLow = calculateQualityScore(badCopy, 'crm software', lpLow);

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
