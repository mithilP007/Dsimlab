import { describe, it, expect } from 'vitest';
import { calculateDomainAuthority, calculatePageAuthority } from '../../src/services/seo/authority-calc';
import { calculateOrganicRank } from '../../src/services/seo/ranking-engine';
import { calculateOrganicTraffic } from '../../src/services/seo/traffic-model';
import { SeededRandom } from '../../src/utils/deterministic-random';

describe('SEO Simulation Engine Unit Tests', () => {
  it('should grow Domain Authority logarithmically with backlink budget', () => {
    const initialDA = 15.0;
    const daAfterSmallSpend = calculateDomainAuthority(100.0, initialDA);
    const daAfterLargeSpend = calculateDomainAuthority(1000.0, initialDA);

    expect(daAfterSmallSpend).toBeGreaterThan(initialDA);
    expect(daAfterLargeSpend).toBeGreaterThan(daAfterSmallSpend);
    expect(daAfterLargeSpend).toBeLessThanOrEqual(100.0);
  });

  it('should compute Page Authority incorporating content quality and DA', () => {
    const paLowQuality = calculatePageAuthority(2.0, 30.0);
    const paHighQuality = calculatePageAuthority(9.0, 30.0);

    expect(paHighQuality).toBeGreaterThan(paLowQuality);
    expect(paHighQuality).toBeLessThanOrEqual(100.0);
  });

  it('should rank keyword position deterministic based on authority strengths', () => {
    const random = new SeededRandom('fixed-test-seed');
    const inputsHigh = {
      keyword: 'best erp software 1',
      pageAuthority: 85.0,
      domainAuthority: 80.0,
      relevanceScore: 0.95,
      competitors: [
        { name: 'Omni CRM Solutions', pageAuthority: 65, domainAuthority: 70 },
      ],
    };

    const rankHigh = calculateOrganicRank(inputsHigh, random);
    expect(rankHigh).toBeGreaterThanOrEqual(1);
    expect(rankHigh).toBeLessThanOrEqual(5);
  });

  it('should calculate clicks and conversions from search traffic position CTR', () => {
    const organicStats = calculateOrganicTraffic({
      rank: 1,
      searchVolume: 2000,
      conversionRate: 0.02,
    });

    expect(organicStats.impressions).toBe(2000);
    expect(organicStats.clicks).toBeCloseTo(2000 * 0.312, 0);
    expect(organicStats.conversions).toBeGreaterThan(5);
  });
});
