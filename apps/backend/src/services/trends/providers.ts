import crypto from 'crypto';
import { prisma } from '../../db/client';
import { googleTrendsClient } from './google-trends-client';
import { newsTrendsClient } from './news-trends-client';
import { socialTrendsClient } from './social-trends-client';
import { logger } from '../../utils/logger';

export interface NormalizedTrendSignal {
  trendDate: string;           // ISO String
  industry: string;
  location: string;
  keywords: string[];
  audience: string;
  channel: string;             // "SEO" | "GOOGLE_ADS" | "META_ADS"
  competitionIndex: number;    // 0.0 to 10.0
  demandIndex: number;         // 0.0 to 10.0
  cpcIndex: number;            // Normalized CPC multiplier/value
  cpmIndex: number;            // Normalized CPM multiplier/value
  seasonalityIndex: number;    // 0.0 to 2.0
  trendMomentum: number;       // -1.0 to 1.0
  source: string;              // "GOOGLE_KEYWORD_TREND" | "GOOGLE_TRENDS" | "META_TREND" | "INTERNAL_HISTORICAL" | "FALLBACK"
  confidenceScore: number;     // 0.0 to 1.0
  rawPayloadHash: string;      // SHA256 of raw response
}

function computeHash(payload: any): string {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

export interface TrendProviderInput {
  scenarioName: string;
  industry: string;
  location: string;
  keywords: string[];
  campaignRunId?: string;
  dayNumber?: number;
}

export interface ITrendProvider {
  name: string;
  fetchTrend(input: TrendProviderInput): Promise<NormalizedTrendSignal[]>;
}

export class GoogleKeywordTrendProvider implements ITrendProvider {
  name = 'GOOGLE_KEYWORD_TREND';

  async fetchTrend(input: TrendProviderInput): Promise<NormalizedTrendSignal[]> {
    const { industry, location, keywords } = input;
    logger.info({ industry, location, keywords }, 'GoogleKeywordTrendProvider fetching data');

    const signals: NormalizedTrendSignal[] = [];

    for (const kw of keywords) {
      const googleRes = await googleTrendsClient.fetchGoogleTrend(kw, location);
      const hash = computeHash(googleRes);

      // Map googleRes count / searchVolumeEstimate (e.g. 200 to 8000) to demand index
      const demandVal = Math.min(10.0, Math.max(1.0, googleRes.searchVolumeEstimate / 800));
      const competitionVal = Math.min(10.0, Math.max(1.0, (kw.length * 7) % 8 + 2));
      const cpcEstimate = 0.5 + (demandVal * 0.4);

      signals.push({
        trendDate: new Date().toISOString(),
        industry,
        location,
        keywords: [kw],
        audience: 'search-users',
        channel: 'GOOGLE_ADS',
        competitionIndex: parseFloat(competitionVal.toFixed(2)),
        demandIndex: parseFloat(demandVal.toFixed(2)),
        cpcIndex: parseFloat(cpcEstimate.toFixed(2)),
        cpmIndex: parseFloat((cpcEstimate * 4.5).toFixed(2)),
        seasonalityIndex: 1.0,
        trendMomentum: 0.1,
        source: this.name,
        confidenceScore: 0.85,
        rawPayloadHash: hash,
      });
    }

    return signals;
  }
}

export class GoogleTrendsProvider implements ITrendProvider {
  name = 'GOOGLE_TRENDS';

  async fetchTrend(input: TrendProviderInput): Promise<NormalizedTrendSignal[]> {
    const { industry, location, keywords } = input;
    logger.info({ industry, location, keywords }, 'GoogleTrendsProvider fetching news trends');

    const signals: NormalizedTrendSignal[] = [];

    for (const kw of keywords) {
      const newsSignal = await newsTrendsClient.fetchNewsSignal(kw, location);
      const hash = computeHash(newsSignal);

      const demandVal = Math.min(10.0, Math.max(1.0, newsSignal.mentions * 1.5));
      const competitionVal = Math.min(10.0, Math.max(1.0, newsSignal.mentions * 1.2));

      signals.push({
        trendDate: new Date().toISOString(),
        industry,
        location,
        keywords: [kw],
        audience: 'general-public',
        channel: 'SEO',
        competitionIndex: parseFloat(competitionVal.toFixed(2)),
        demandIndex: parseFloat(demandVal.toFixed(2)),
        cpcIndex: 1.0,
        cpmIndex: 1.0,
        seasonalityIndex: 1.0,
        trendMomentum: 0.05,
        source: this.name,
        confidenceScore: 0.75,
        rawPayloadHash: hash,
      });
    }

    return signals;
  }
}

export class MetaTrendProvider implements ITrendProvider {
  name = 'META_TREND';

  async fetchTrend(input: TrendProviderInput): Promise<NormalizedTrendSignal[]> {
    const { industry, location, keywords } = input;
    logger.info({ industry, location, keywords }, 'MetaTrendProvider fetching social signals');

    const signals: NormalizedTrendSignal[] = [];

    for (const kw of keywords) {
      const socialSignal = await socialTrendsClient.fetchSocialTrend(kw, location);
      const hash = computeHash(socialSignal);

      const demandVal = Math.min(10.0, Math.max(1.0, socialSignal.socialBuzzVolume / 5));
      const cpmVal = 5.0 + (demandVal * 1.5);

      signals.push({
        trendDate: new Date().toISOString(),
        industry,
        location,
        keywords: [kw],
        audience: 'social-media-users',
        channel: 'META_ADS',
        competitionIndex: parseFloat((5.0 + demandVal * 0.4).toFixed(2)),
        demandIndex: parseFloat(demandVal.toFixed(2)),
        cpcIndex: parseFloat((cpmVal / 6).toFixed(2)),
        cpmIndex: parseFloat(cpmVal.toFixed(2)),
        seasonalityIndex: 1.0,
        trendMomentum: 0.15,
        source: this.name,
        confidenceScore: 0.8,
        rawPayloadHash: hash,
      });
    }

    return signals;
  }
}

export class InternalHistoricalProvider implements ITrendProvider {
  name = 'INTERNAL_HISTORICAL';

  async fetchTrend(input: TrendProviderInput): Promise<NormalizedTrendSignal[]> {
    const { industry, location, keywords } = input;
    logger.info({ industry, location }, 'InternalHistoricalProvider loading historical baselines');

    // Retrieve previous metrics to establish a baseline
    const pastResults = await prisma.dailyMetric.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    const hash = computeHash(pastResults);
    const avgClicks = pastResults.length > 0
      ? pastResults.reduce((sum, r) => sum + r.googleClicks + r.metaClicks, 0) / pastResults.length
      : 100;

    const baselineDemand = Math.min(10.0, Math.max(1.0, avgClicks / 50));

    return [{
      trendDate: new Date().toISOString(),
      industry,
      location,
      keywords,
      audience: 'historical-cohort',
      channel: 'SEO',
      competitionIndex: 5.0,
      demandIndex: parseFloat(baselineDemand.toFixed(2)),
      cpcIndex: 1.0,
      cpmIndex: 5.0,
      seasonalityIndex: 1.0,
      trendMomentum: 0.0,
      source: this.name,
      confidenceScore: 0.9,
      rawPayloadHash: hash,
    }];
  }
}

export class FallbackTrendProvider implements ITrendProvider {
  name = 'FALLBACK';

  async fetchTrend(input: TrendProviderInput): Promise<NormalizedTrendSignal[]> {
    const { industry, location, keywords } = input;
    logger.warn({ industry, location }, 'FallbackTrendProvider triggered');

    const mockPayload = {
      note: 'deterministic fallback data',
      industry,
      location,
      keywords,
      timestamp: new Date().toISOString(),
    };
    const hash = computeHash(mockPayload);

    // Deterministic fallback calculations based on keyword lengths
    const keywordLenSum = keywords.reduce((sum, kw) => sum + kw.length, 0) || 10;
    const baseDemand = 4.0 + (keywordLenSum % 5);

    const signals: NormalizedTrendSignal[] = [];

    const channels: Array<"SEO" | "GOOGLE_ADS" | "META_ADS"> = ['SEO', 'GOOGLE_ADS', 'META_ADS'];
    for (const channel of channels) {
      signals.push({
        trendDate: new Date().toISOString(),
        industry,
        location,
        keywords,
        audience: 'fallback-audience',
        channel,
        competitionIndex: 5.0,
        demandIndex: parseFloat(baseDemand.toFixed(2)),
        cpcIndex: channel === 'GOOGLE_ADS' ? 2.5 : 1.0,
        cpmIndex: channel === 'META_ADS' ? 12.0 : 5.0,
        seasonalityIndex: 1.0,
        trendMomentum: 0.0,
        source: this.name,
        confidenceScore: 0.5,
        rawPayloadHash: hash,
      });
    }

    return signals;
  }
}

export async function getDailyMarketTrends(input: TrendProviderInput): Promise<NormalizedTrendSignal[]> {
  const providers = {
    keyword: new GoogleKeywordTrendProvider(),
    trends: new GoogleTrendsProvider(),
    meta: new MetaTrendProvider(),
    historical: new InternalHistoricalProvider(),
    fallback: new FallbackTrendProvider()
  };

  const results: NormalizedTrendSignal[] = [];

  // Attempt live trend queries
  try {
    const keywordTrends = await providers.keyword.fetchTrend(input);
    results.push(...keywordTrends);
  } catch (err) {
    logger.error(err, 'GoogleKeywordTrendProvider query failed');
  }

  try {
    const googleNewsTrends = await providers.trends.fetchTrend(input);
    results.push(...googleNewsTrends);
  } catch (err) {
    logger.error(err, 'GoogleTrendsProvider query failed');
  }

  try {
    const metaTrends = await providers.meta.fetchTrend(input);
    results.push(...metaTrends);
  } catch (err) {
    logger.error(err, 'MetaTrendProvider query failed');
  }

  // Fallback if no live trend results were collected
  if (results.length === 0) {
    logger.warn('All live trend providers failed. Fetching fallback data.');
    const fallbackTrends = await providers.fallback.fetchTrend(input);
    results.push(...fallbackTrends);
  }

  return results;
}

