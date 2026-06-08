import { describe, it, expect } from 'vitest';
import { normalizeTrendSignals } from '../../src/services/trends/trend-normalizer';
import { marketSignalBuilder } from '../../src/services/trends/market-signal-builder';
import { runGoogleAuction } from '../../src/services/ads/google/auction';
import { runMetaAuction } from '../../src/services/ads/meta/auction';
import { SeededRandom } from '../../src/utils/deterministic-random';

describe('Real-Time Trend Simulation Unit Tests', () => {
  
  it('should normalize Google, news, and social signals into standard TrendSignal formats', () => {
    const signal = normalizeTrendSignals(
      'crm software',
      'Technology',
      'Global',
      5000, // google search volume estimate
      4,    // news mentions
      20,   // social buzz
      [{ name: 'Google News', url: 'https://news.google.com', fetchedAt: new Date().toISOString() }]
    );

    expect(signal.keyword).toBe('crm software');
    expect(signal.trendScore).toBeGreaterThan(0);
    expect(signal.trendScore).toBeLessThanOrEqual(100);
    expect(signal.competitionScore).toBeGreaterThan(0);
    expect(signal.audienceIntent).toBeDefined();
    expect(signal.suggestedCpcRange.min).toBeGreaterThan(0);
    expect(signal.suggestedCpmRange.min).toBeGreaterThan(0);
  });

  it('should translate TrendSignals into deterministic MarketCondition snapshots with correct bounds', () => {
    const signals = [
      normalizeTrendSignals('sales tracking', 'Technology', 'Global', 8000, 10, 50, []),
      normalizeTrendSignals('crm tools', 'Technology', 'Global', 4000, 2, 10, [])
    ];

    const mc = marketSignalBuilder.buildMarketConditions({
      simulationId: 'test-sim-id',
      roundNumber: 1,
      signals
    });

    expect(mc.simulationId).toBe('test-sim-id');
    expect(mc.roundNumber).toBe(1);
    expect(mc.demandIndex).toBeGreaterThanOrEqual(0.5);
    expect(mc.demandIndex).toBeLessThanOrEqual(2.0);
    expect(mc.competitionIndex).toBeGreaterThanOrEqual(0.5);
    expect(mc.competitionIndex).toBeLessThanOrEqual(2.0);
    expect(mc.cpcPressure).toBeGreaterThanOrEqual(0.4);
    expect(mc.cpcPressure).toBeLessThanOrEqual(2.5);
    expect(mc.cpmPressure).toBeGreaterThanOrEqual(0.4);
    expect(mc.cpmPressure).toBeLessThanOrEqual(2.5);
  });

  it('should adjust Google Ads GSP auction metrics based on market conditions', () => {
    const random = new SeededRandom('google-auction-market-test');
    const advertisers = [
      { id: 'student', name: 'Student', bid: 3.50, qualityScore: 8, dailyBudget: 100.0 },
      { id: 'competitor', name: 'Competitor', bid: 2.50, qualityScore: 6, dailyBudget: 100.0 }
    ];

    const mcHighDemand = {
      demandIndex: 1.8,
      competitionIndex: 1.5,
      cpcPressure: 1.6,
      cpmPressure: 1.5,
      conversionIntent: 1.4,
      seasonalImpact: 1.2,
      newsImpact: 1.0
    };

    const mcLowDemand = {
      demandIndex: 0.6,
      competitionIndex: 0.7,
      cpcPressure: 0.5,
      cpmPressure: 0.6,
      conversionIntent: 0.8,
      seasonalImpact: 0.8,
      newsImpact: 1.0
    };

    // Run auction with high demand/high cpc pressure
    const resultsHigh = runGoogleAuction(
      'crm software',
      1000, // base volume
      advertisers,
      0.02, // base CVR
      random,
      mcHighDemand
    );

    // Run auction with low demand/low cpc pressure
    const resultsLow = runGoogleAuction(
      'crm software',
      1000,
      advertisers,
      0.02,
      random,
      mcLowDemand
    );

    const studentHigh = resultsHigh.find(r => r.id === 'student')!;
    const studentLow = resultsLow.find(r => r.id === 'student')!;

    // High demand should pressure actual CPC up, increase impressions, and increase conversions
    expect(studentHigh.impressions).toBeGreaterThan(studentLow.impressions);
  });

  it('should adjust Meta Ads auction CPC, impressions, and click multipliers based on market conditions', () => {
    const random = new SeededRandom('meta-auction-market-test');
    const advertisers = [
      {
        id: 'student',
        name: 'Meta Lead Gen',
        budget: 100.0,
        audienceInterest: 'business-owners',
        placement: 'feed',
        creativeQuality: 8,
        bidType: 'LOWEST_COST',
        bidAmount: 0
      }
    ];

    const mcHigh = {
      demandIndex: 1.8,
      competitionIndex: 1.5,
      cpcPressure: 1.6,
      cpmPressure: 1.7, // CPM high
      conversionIntent: 1.4,
      seasonalImpact: 1.2,
      newsImpact: 1.3
    };

    const mcLow = {
      demandIndex: 0.5,
      competitionIndex: 0.6,
      cpcPressure: 0.5,
      cpmPressure: 0.4, // CPM low
      conversionIntent: 0.8,
      seasonalImpact: 0.7,
      newsImpact: 0.8
    };

    const resultHigh = runMetaAuction(advertisers, { 'business-owners': 500000 }, 0.02, random, mcHigh);
    const resultLow = runMetaAuction(advertisers, { 'business-owners': 500000 }, 0.02, random, mcLow);

    // CPM pressure should cause high demand CPM to be significantly higher than low demand CPM
    expect(resultHigh[0].cost).toBeCloseTo(100.0, 1);
    expect(resultLow[0].cost).toBeCloseTo(100.0, 1);
    expect(resultHigh[0].impressions).toBeLessThan(resultLow[0].impressions); // Higher CPM means fewer impressions for same budget
  });
});
