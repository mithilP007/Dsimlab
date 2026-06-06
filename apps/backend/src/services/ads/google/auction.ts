import { SeededRandom } from '../../../utils/deterministic-random';

export interface Advertiser {
  id: string;
  name: string;
  bid: number;
  qualityScore: number;
  dailyBudget: number;
}

export interface GoogleAuctionResult {
  id: string;
  name: string;
  position: number;
  adRank: number;
  actualCPC: number;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
}

/**
 * Runs a Generalized Second Price (GSP) search auction model for a set of keyword bids
 */
export function runGoogleAuction(
  _keyword: string,
  dailySearchVolume: number,
  advertisers: Advertiser[],
  conversionRate: number,
  random: SeededRandom
): GoogleAuctionResult[] {
  // 1. Calculate Ad Rank (Bid * Quality Score)
  const ranked = advertisers.map(adv => {
    // Add small random noise to break absolute ties
    const noise = random.nextFloat(-0.01, 0.01);
    const adRank = Math.max(0, adv.bid * adv.qualityScore + noise);
    return {
      ...adv,
      adRank,
    };
  });

  // 2. Sort descending by Ad Rank
  ranked.sort((a, b) => b.adRank - a.adRank);

  // 3. Compute position and GSP price mechanics
  const positionShares = [0.85, 0.55, 0.35, 0.18, 0.08]; // Impression share by rank
  const results: GoogleAuctionResult[] = [];

  for (let i = 0; i < ranked.length; i++) {
    const current = ranked[i];
    const next = ranked[i + 1];
    
    // GSP Pricing: Next AdRank / Current QualityScore + $0.01
    let actualCPC = 0.15; // default reserve floor price
    if (next) {
      actualCPC = (next.adRank / current.qualityScore) + 0.01;
    } else {
      actualCPC = Math.max(0.15, current.bid * 0.4);
    }

    // Ensure CPC is bounded by the user's maximum bid and is at least 0.01
    actualCPC = Math.min(current.bid, Math.max(0.01, actualCPC));
    actualCPC = parseFloat(actualCPC.toFixed(2));

    const position = i + 1;
    const baseShare = i < positionShares.length ? positionShares[i] : 0.02;
    
    // Calculate CTR based on placement position and Quality Score influence
    const baseCTR = 0.08 / (position + 0.2); // Position 1: ~6.6%, Position 2: ~3.6%, etc.
    const qsMultiplier = 0.5 + (current.qualityScore / 10.0); // QS 10 gives 1.5x CTR, QS 1 gives 0.6x
    const expectedCTR = baseCTR * qsMultiplier;

    // Simulate metrics
    const impressions = Math.round(dailySearchVolume * baseShare);
    const rawClicks = impressions * expectedCTR;

    // Apply budget limitation
    const maxClicksSupported = current.dailyBudget / Math.max(0.01, actualCPC);
    const clicks = Math.round(Math.min(rawClicks, maxClicksSupported));
    const cost = parseFloat((clicks * actualCPC).toFixed(2));
    const conversions = Math.round(clicks * conversionRate);

    results.push({
      id: current.id,
      name: current.name,
      position,
      adRank: current.adRank,
      actualCPC,
      impressions,
      clicks,
      cost,
      conversions,
    });
  }

  return results;
}
