import { SeededRandom } from '../../../utils/deterministic-random';
import { calculateMetaCPM } from './placement-cpm';
import { calculateReachAndFrequency } from './reach-model';
import { calculateCTRDecay } from './fatigue-model';

export interface MetaAdvertiser {
  id: string;
  name: string;
  budget: number; // daily budget
  audienceInterest: string;
  bidType: string; // LOWEST_COST, BID_CAP
  bidAmount: number;
  placement: string;
  creativeQuality: number; // 1-10
  // Upgraded parameters
  objective?: string;
  budgetType?: string;
  isSameCreative?: boolean; // to track creative fatigue round-over-round
  roundNumber?: number;
}

export interface MetaAuctionResult {
  id: string;
  name: string;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  cost: number;
  conversions: number;
  averageCPC: number;
  // Advanced metrics
  cpm: number;
  ctr: number;
  cvr: number;
  fatigueScore: number;
  audienceSaturation: number;
  learningPhase: boolean;
  engagementRate: number;
  relevanceRanking: "Below Average" | "Average" | "Above Average";
}

/**
 * Calculates Meta Ads outcomes (CPM, reach distribution, fatigue CTR, clicks, cost) for a cohort
 */
export function runMetaAuction(
  advertisers: MetaAdvertiser[],
  audienceSizes: Record<string, number>,
  baseConversionRate: number,
  random: SeededRandom,
  marketCondition?: {
    demandIndex: number;
    competitionIndex: number;
    cpmPressure: number;
    conversionIntent: number;
    seasonalImpact: number;
    newsImpact: number;
    socialBuzzImpact?: number;
  }
): MetaAuctionResult[] {
  const cpmPressure = marketCondition ? marketCondition.cpmPressure : 1.0;
  const competition = marketCondition ? marketCondition.competitionIndex : 1.0;
  const cvrIntent = marketCondition ? marketCondition.conversionIntent : 1.0;
  const newsImpact = marketCondition ? marketCondition.newsImpact : 1.0;
  const socialBuzz = marketCondition?.socialBuzzImpact !== undefined ? marketCondition.socialBuzzImpact : 1.0;

  const results: MetaAuctionResult[] = [];

  advertisers.forEach(adv => {
    // 1. Calculate CPM
    const competitorsCount = advertisers.filter(a => a.id !== adv.id && a.audienceInterest === adv.audienceInterest).length;
    const baseCpm = calculateMetaCPM(adv.placement, adv.audienceInterest, competitorsCount);
    // Platform CPM is scaled by cpmPressure, competition, and news volatility
    let cpm = parseFloat((baseCpm * cpmPressure * competition * (1 + (newsImpact - 1) * 0.2)).toFixed(2));

    // Objective modifiers to CPM (Brand Awareness CPM is cheaper, Conversions/Sales CPM is more expensive)
    let cpmMultiplier = 1.0;
    let ctrMultiplier = 1.0;
    let cvrMultiplier = 1.0;

    if (adv.objective) {
      const obj = adv.objective.toLowerCase();
      if (obj === 'awareness') {
        cpmMultiplier = 0.6; // low cost impressions
        ctrMultiplier = 0.55; // low CTR
        cvrMultiplier = 0.25;
      } else if (obj === 'traffic') {
        cpmMultiplier = 0.95;
        ctrMultiplier = 1.35; // optimized for clicks
        cvrMultiplier = 0.8;
      } else if (obj === 'engagement') {
        cpmMultiplier = 0.8;
        ctrMultiplier = 1.1;
        cvrMultiplier = 0.5;
      } else if (obj === 'sales') {
        cpmMultiplier = 1.5; // highly targeted, expensive CPM
        ctrMultiplier = 0.85; // lower CTR but higher intent
        cvrMultiplier = 1.45; // high conversion rate
      } else if (obj === 'leads') {
        cpmMultiplier = 1.3;
        ctrMultiplier = 0.95;
        cvrMultiplier = 1.2;
      }
    }
    cpm = parseFloat((cpm * cpmMultiplier).toFixed(2));

    // 2. Deliver Impressions based on daily budget
    let impressions = 0;
    if (adv.budget > 0) {
      let deliveryScale = 1.0;
      // BID_CAP limitations
      if (adv.bidType === 'BID_CAP' && adv.bidAmount < (cpm / 1000) * 1.4) {
        deliveryScale = Math.max(0.05, adv.bidAmount / ((cpm / 1000) * 1.4));
      }
      impressions = Math.round((adv.budget / cpm) * 1000 * deliveryScale);
    }

    // 3. Unique Reach & Frequency calculation
    const targetAudienceSize = audienceSizes[adv.audienceInterest] || 500000;
    const { reach, frequency } = calculateReachAndFrequency(impressions, targetAudienceSize);

    // 4. CTR Fatigue and Creative Quality Score
    // Decaying CTR based on creative quality, frequency, and whether the creative was changed
    let fatigueFactor = calculateCTRDecay(frequency, adv.creativeQuality);
    
    // Round-over-round fatigue penalty if creative hasn't changed
    if (adv.isSameCreative) {
      fatigueFactor = Math.max(0.15, fatigueFactor * 0.7);
    }

    const baselineCTR = 0.006 + (adv.creativeQuality * 0.0028) + random.nextFloat(-0.0008, 0.0008);
    const finalCTR = Math.max(0.001, baselineCTR * fatigueFactor * ctrMultiplier);

    // 5. Clicks and conversions
    const clicks = Math.round(impressions * finalCTR);
    
    // Cost calculation
    let cost = adv.budget;
    if (impressions === 0) {
      cost = 0;
    } else if (adv.bidType === 'BID_CAP') {
      const maxPossibleCost = (impressions / 1000) * cpm;
      cost = parseFloat(Math.min(adv.budget, maxPossibleCost).toFixed(2));
    }

    // Learning phase effect (if daily budget is low < $15 or campaign runs for first few days, conversions drop)
    const isLearning = adv.budget > 0 && adv.budget < 15.0;
    const learningPenalty = isLearning ? 0.65 : 1.0;

    // Conversions scaled by interest, quality boost, social buzz, and learning phase
    const qualityCVRBoost = 0.8 + (adv.creativeQuality / 10.0) * 0.45;
    const cvr = baseConversionRate * qualityCVRBoost * cvrIntent * socialBuzz * cvrMultiplier * learningPenalty;
    const conversions = Math.round(clicks * cvr);

    const averageCPC = clicks > 0 ? parseFloat((cost / clicks).toFixed(2)) : 0.0;

    // Saturation and relevance metrics
    const audienceSaturation = Math.min(100, Math.round((reach / targetAudienceSize) * 100));
    
    let relevanceRanking: "Below Average" | "Average" | "Above Average" = "Average";
    if (adv.creativeQuality >= 8 && fatigueFactor > 0.8) {
      relevanceRanking = "Above Average";
    } else if (adv.creativeQuality <= 4 || fatigueFactor < 0.4) {
      relevanceRanking = "Below Average";
    }

    const engagementRate = parseFloat((finalCTR * 2.8).toFixed(4));

    results.push({
      id: adv.id,
      name: adv.name,
      impressions,
      reach,
      frequency,
      clicks,
      cost,
      conversions,
      averageCPC,
      cpm,
      ctr: finalCTR,
      cvr,
      fatigueScore: parseFloat(fatigueFactor.toFixed(2)),
      audienceSaturation,
      learningPhase: isLearning,
      engagementRate,
      relevanceRanking
    });
  });

  return results;
}
