import { SeededRandom } from '../../../utils/deterministic-random';
import { calculateMetaCPM } from './placement-cpm';
import { calculateReachAndFrequency } from './reach-model';
import { calculateCTRDecay } from './fatigue-model';

export interface MetaAdvertiser {
  id: string;
  name: string;
  budget: number; // daily budget
  audienceInterest: string;
  bidType: string; // LOWEST_COST, BID_CAP, COST_CAP
  bidAmount: number;
  placement: string;
  creativeQuality: number; // 1-10
  objective?: string;
  budgetType?: string;
  isSameCreative?: boolean;
  roundNumber?: number;
  relevanceMultiplier?: number;
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
  cpm: number;
  ctr: number;
  cvr: number;
  fatigueScore: number;
  audienceSaturation: number;
  learningPhase: boolean;
  engagementRate: number;
  relevanceRanking: "Below Average" | "Average" | "Above Average";
}

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
    const relevance = adv.relevanceMultiplier !== undefined ? adv.relevanceMultiplier : 1.0;
    
    // 1. Calculate CPM based on placement
    const competitorsCount = advertisers.filter(a => a.id !== adv.id && a.audienceInterest === adv.audienceInterest).length;
    let baseCpm = calculateMetaCPM(adv.placement, adv.audienceInterest, competitorsCount);
    
    // Advantage+ placements discount CPM by 15% due to wider optimization
    if (adv.placement.toLowerCase() === 'advantage+' || adv.placement.toLowerCase() === 'auto') {
      baseCpm *= 0.85;
    }

    let cpm = parseFloat((baseCpm * cpmPressure * competition * (1 + (newsImpact - 1) * 0.15)).toFixed(2));

    // Objective modifiers to CPM
    let cpmMultiplier = 1.0;
    let ctrMultiplier = 1.0;
    let cvrMultiplier = 1.0;

    if (adv.objective) {
      const obj = adv.objective.toLowerCase();
      if (obj === 'awareness') {
        cpmMultiplier = 0.55; 
        ctrMultiplier = 0.5; 
        cvrMultiplier = 0.2;
      } else if (obj === 'traffic') {
        cpmMultiplier = 0.9;
        ctrMultiplier = 1.4; 
        cvrMultiplier = 0.75;
      } else if (obj === 'engagement') {
        cpmMultiplier = 0.75;
        ctrMultiplier = 1.15;
        cvrMultiplier = 0.45;
      } else if (obj === 'sales') {
        cpmMultiplier = 1.45; 
        ctrMultiplier = 0.8; 
        cvrMultiplier = 1.5; 
      } else if (obj === 'leads') {
        cpmMultiplier = 1.25;
        ctrMultiplier = 0.9;
        cvrMultiplier = 1.25;
      }
    }
    cpm = parseFloat((cpm * cpmMultiplier).toFixed(2));

    // Relevance penalty increases CPM
    if (relevance < 0.6) {
      cpm *= 1.35; // 35% higher CPM cost
    }

    // 2. Deliver Impressions based on daily budget and bidding checks
    let impressions = 0;
    if (adv.budget > 0) {
      let deliveryScale = 1.0;
      // BID_CAP and COST_CAP limitations
      if ((adv.bidType === 'BID_CAP' || adv.bidType === 'COST_CAP') && adv.bidAmount > 0) {
        const costPerImp = cpm / 1000;
        if (adv.bidAmount < costPerImp * 1.5) {
          deliveryScale = Math.max(0.01, adv.bidAmount / (costPerImp * 1.5));
        }
      }
      impressions = Math.round((adv.budget / cpm) * 1000 * deliveryScale);
    }

    // 3. Unique Reach & Frequency calculation
    const targetAudienceSize = audienceSizes[adv.audienceInterest] || 600000;
    const { reach, frequency } = calculateReachAndFrequency(impressions, targetAudienceSize);

    // 4. CTR Fatigue and Creative Quality Score
    let fatigueFactor = calculateCTRDecay(frequency, adv.creativeQuality);
    
    // Round-over-round fatigue penalty if creative hasn't changed
    if (adv.isSameCreative) {
      fatigueFactor = Math.max(0.1, fatigueFactor * 0.65);
    }

    const baselineCTR = 0.007 + (adv.creativeQuality * 0.003) + random.nextFloat(-0.0005, 0.0005);
    const finalCTR = Math.max(0.0008, baselineCTR * fatigueFactor * ctrMultiplier * relevance);

    // 5. Clicks and conversions
    const clicks = Math.round(impressions * finalCTR);
    
    // Cost calculation
    let cost = adv.budget;
    if (impressions === 0) {
      cost = 0;
    } else if (adv.bidType === 'BID_CAP' || adv.bidType === 'COST_CAP') {
      const maxPossibleCost = (impressions / 1000) * cpm;
      cost = parseFloat(Math.min(adv.budget, maxPossibleCost).toFixed(2));
    }

    // Learning phase effect
    const isLearning = adv.budget > 0 && adv.budget < 18.0;
    const learningPenalty = isLearning ? 0.6 : 1.0;

    // Conversions
    const qualityCVRBoost = 0.75 + (adv.creativeQuality / 10.0) * 0.5;
    const cvr = baseConversionRate * qualityCVRBoost * cvrIntent * socialBuzz * cvrMultiplier * learningPenalty * relevance;
    const conversions = Math.round(clicks * cvr);

    const averageCPC = clicks > 0 ? parseFloat((cost / clicks).toFixed(2)) : 0.0;
    const audienceSaturation = Math.min(100, Math.round((reach / targetAudienceSize) * 100));
    
    let relevanceRanking: "Below Average" | "Average" | "Above Average" = "Average";
    if (adv.creativeQuality >= 8 && fatigueFactor > 0.8 && relevance >= 0.8) {
      relevanceRanking = "Above Average";
    } else if (adv.creativeQuality <= 4 || fatigueFactor < 0.35 || relevance < 0.6) {
      relevanceRanking = "Below Average";
    }

    const engagementRate = parseFloat((finalCTR * 2.9).toFixed(4));

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
