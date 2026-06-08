import { TrendSignal } from './trend-normalizer';

export interface MarketConditionSnapshotInput {
  simulationId: string;
  roundNumber: number;
  signals: TrendSignal[];
}

export interface MarketConditionSnapshotOutput {
  simulationId: string;
  roundNumber: number;
  demandIndex: number;
  competitionIndex: number;
  cpcPressure: number;
  cpmPressure: number;
  conversionIntent: number;
  seasonalImpact: number;
  newsImpact: number;
  socialBuzzImpact: number;
  platformModifiers: any;
}

export class MarketSignalBuilder {
  /**
   * Translates TrendSignals into a MarketConditionSnapshot
   */
  buildMarketConditions(input: MarketConditionSnapshotInput): MarketConditionSnapshotOutput {
    const { simulationId, roundNumber, signals } = input;

    if (signals.length === 0) {
      return {
        simulationId,
        roundNumber,
        demandIndex: 1.0,
        competitionIndex: 1.0,
        cpcPressure: 1.0,
        cpmPressure: 1.0,
        conversionIntent: 1.0,
        seasonalImpact: 1.0,
        newsImpact: 1.0,
        socialBuzzImpact: 1.0,
        platformModifiers: { SEO: 1.0, GOOGLE_ADS: 1.0, META_ADS: 1.0 }
      };
    }

    // Averages
    const avgTrendScore = signals.reduce((sum, s) => sum + s.trendScore, 0) / signals.length;
    const avgCompetitionScore = signals.reduce((sum, s) => sum + s.competitionScore, 0) / signals.length;
    const avgSeasonalScore = signals.reduce((sum, s) => sum + s.seasonalScore, 0) / signals.length;
    const avgNewsImpactScore = signals.reduce((sum, s) => sum + s.newsImpactScore, 0) / signals.length;
    const avgSocialBuzzScore = signals.reduce((sum, s) => sum + (s.socialBuzzScore || 0), 0) / signals.length;

    // Averages of audience intent conversion impacts
    const intentSum = signals.reduce((sum, s) => {
      if (s.audienceIntent === 'HIGH') return sum + 1.3;
      if (s.audienceIntent === 'MEDIUM') return sum + 1.0;
      return sum + 0.8;
    }, 0);
    const conversionIntent = parseFloat((intentSum / signals.length).toFixed(2));

    // Averages of CPC/CPM suggested pressures
    // Base benchmarks: CPC base is 1.5, CPM base is 10.0
    const suggestedCpcMinAvg = signals.reduce((sum, s) => sum + s.suggestedCpcRange.min, 0) / signals.length;
    const suggestedCpmMinAvg = signals.reduce((sum, s) => sum + s.suggestedCpmRange.min, 0) / signals.length;

    const cpcPressure = parseFloat(Math.min(2.5, Math.max(0.4, suggestedCpcMinAvg / 1.5)).toFixed(2));
    const cpmPressure = parseFloat(Math.min(2.5, Math.max(0.4, suggestedCpmMinAvg / 10.0)).toFixed(2));

    // Map scores to multipliers
    const demandIndex = parseFloat(Math.min(2.0, Math.max(0.5, avgTrendScore / 50.0)).toFixed(2));
    const competitionIndex = parseFloat(Math.min(2.0, Math.max(0.5, avgCompetitionScore / 50.0)).toFixed(2));

    // Seasonal: 0-100 mapped to 0.7 - 1.3
    const seasonalImpact = parseFloat((0.7 + (avgSeasonalScore / 100) * 0.6).toFixed(2));

    // News: -100 to +100 mapped to 0.7 - 1.3
    const newsImpact = parseFloat((1.0 + (avgNewsImpactScore / 100) * 0.3).toFixed(2));

    // Social Buzz: 0-100 mapped to 0.7 - 1.3
    const socialBuzzImpact = parseFloat((0.7 + (avgSocialBuzzScore / 100) * 0.6).toFixed(2));

    // Platform-specific coefficients
    const seoModifier = parseFloat(Math.min(1.8, Math.max(0.5, (demandIndex * 1.2) - (competitionIndex * 0.4))).toFixed(2));
    const googleAdsModifier = parseFloat(Math.min(1.8, Math.max(0.5, (demandIndex * 1.0) * seasonalImpact)).toFixed(2));
    const metaAdsModifier = parseFloat(Math.min(1.8, Math.max(0.5, (demandIndex * 0.9) * newsImpact * socialBuzzImpact)).toFixed(2));

    const platformModifiers = {
      SEO: seoModifier,
      GOOGLE_ADS: googleAdsModifier,
      META_ADS: metaAdsModifier
    };

    return {
      simulationId,
      roundNumber,
      demandIndex,
      competitionIndex,
      cpcPressure,
      cpmPressure,
      conversionIntent,
      seasonalImpact,
      newsImpact,
      socialBuzzImpact,
      platformModifiers
    };
  }
}

export const marketSignalBuilder = new MarketSignalBuilder();
