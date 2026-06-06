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
}

/**
 * Calculates Meta Ads outcomes (CPM, reach distribution, fatigue CTR, clicks, cost) for a cohort
 */
export function runMetaAuction(
  advertisers: MetaAdvertiser[],
  audienceSizes: Record<string, number>, // interest key -> population count
  baseConversionRate: number,
  random: SeededRandom
): MetaAuctionResult[] {
  const results: MetaAuctionResult[] = [];

  advertisers.forEach(adv => {
    // 1. Calculate CPM
    const competitorsCount = advertisers.filter(a => a.id !== adv.id && a.audienceInterest === adv.audienceInterest).length;
    const cpm = calculateMetaCPM(adv.placement, adv.audienceInterest, competitorsCount);

    // 2. Calculate impressions bought by the daily budget: Impressions = (Budget / CPM) * 1000
    let impressions = 0;
    if (adv.budget > 0) {
      // In manual BID_CAP mode, if bid is below a floor, delivery is reduced
      let deliveryScale = 1.0;
      if (adv.bidType === 'BID_CAP' && adv.bidAmount < (cpm / 1000) * 1.5) {
        deliveryScale = Math.max(0.1, adv.bidAmount / ((cpm / 1000) * 1.5));
      }
      impressions = Math.round((adv.budget / cpm) * 1000 * deliveryScale);
    }

    // 3. Calculate unique Reach & Frequency
    const targetAudienceSize = audienceSizes[adv.audienceInterest] || 450000;
    const { reach, frequency } = calculateReachAndFrequency(impressions, targetAudienceSize);

    // 4. Calculate CTR based on Creative Quality & decay fatigue
    // Baseline: quality 10 gives 3.5%, quality 1 gives 0.8%
    const baseCTR = 0.005 + (adv.creativeQuality * 0.003) + random.nextFloat(-0.001, 0.001);
    const decay = calculateCTRDecay(frequency, adv.creativeQuality);
    const ctr = Math.max(0.001, baseCTR * decay);

    // 5. Clicks, actual cost, and conversions
    const clicks = Math.round(impressions * ctr);
    
    // Meta ads usually spends the exact daily budget allocated, scaled down only by delivery index
    let cost = adv.budget;
    if (impressions === 0) {
      cost = 0;
    } else if (adv.bidType === 'BID_CAP') {
      // Scale actual spend if delivery was throttled
      const maxPossibleCost = (impressions / 1000) * cpm;
      cost = parseFloat(Math.min(adv.budget, maxPossibleCost).toFixed(2));
    }
    
    // Apply creative conversion impact: higher quality creatives lift conversion rate slightly
    const qualityCVRBoost = 0.8 + (adv.creativeQuality / 10.0) * 0.4; // 0.8x to 1.2x multiplier
    const conversions = Math.round(clicks * baseConversionRate * qualityCVRBoost);

    const averageCPC = clicks > 0 ? parseFloat((cost / clicks).toFixed(2)) : 0.0;

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
    });
  });

  return results;
}
