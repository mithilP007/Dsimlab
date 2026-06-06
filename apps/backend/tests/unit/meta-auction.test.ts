import { describe, it, expect } from 'vitest';
import { calculateMetaCPM } from '../../src/services/ads/meta/placement-cpm';
import { calculateReachAndFrequency } from '../../src/services/ads/meta/reach-model';
import { calculateCTRDecay } from '../../src/services/ads/meta/fatigue-model';
import { runMetaAuction } from '../../src/services/ads/meta/auction';
import { SeededRandom } from '../../src/utils/deterministic-random';

describe('Meta Ads Auction Unit Tests', () => {
  it('should calculate CPM based on placement type and audience demand', () => {
    const cpmReelsHighDemand = calculateMetaCPM('reels', 'business-owners', 3);
    const cpmFeedLowDemand = calculateMetaCPM('stories', 'general-broad', 0);

    expect(cpmReelsHighDemand).toBeGreaterThan(cpmFeedLowDemand);
  });

  it('should calculate diminishing reach and increasing frequency', () => {
    const size = 50000;
    const { reach, frequency } = calculateReachAndFrequency(10000, size);
    
    expect(reach).toBeLessThanOrEqual(10000);
    expect(frequency).toBeCloseTo(10000 / reach, 2);
  });

  it('should apply exponential decay for high frequency exposures and decay slower for better creatives', () => {
    const decayLowQuality = calculateCTRDecay(3.5, 2.0);
    const decayHighQuality = calculateCTRDecay(3.5, 9.0);

    expect(decayLowQuality).toBeLessThan(1.0);
    expect(decayHighQuality).toBeGreaterThan(decayLowQuality);
  });

  it('should calculate Meta Ads delivery, CPMs, and conversions in auction simulations', () => {
    const random = new SeededRandom('meta-auction-test-seed');
    const advertisers = [
      {
        id: 'student',
        name: 'Student Social',
        budget: 150.0,
        audienceInterest: 'business-owners',
        bidType: 'LOWEST_COST',
        bidAmount: 0.0,
        placement: 'stories',
        creativeQuality: 8,
      },
    ];

    const audienceSizes = {
      'business-owners': 800000,
    };

    const results = runMetaAuction(advertisers, audienceSizes, 0.02, random);

    expect(results[0].id).toBe('student');
    expect(results[0].impressions).toBeGreaterThan(0);
    expect(results[0].reach).toBeGreaterThan(0);
    expect(results[0].clicks).toBeGreaterThan(0);
    expect(results[0].cost).toBeCloseTo(150.0, 2);
  });
});
