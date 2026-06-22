import { SeededRandom } from '../../../utils/deterministic-random';

export interface Advertiser {
  id: string;
  name: string;
  bid: number;
  qualityScore: number;
  dailyBudget: number;
  // Upgraded details for student
  matchType?: string;
  objective?: string;
  campaignType?: string;
  biddingStrategy?: string;
  negativeKeywordsCount?: number;
  deviceAdjustments?: { desktop: number; mobile: number; tablet: number };
  landingPageExperience?: number; // 1-10 average
  ctrModifier?: number;
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
  // Diagnostic metrics
  ctr: number;
  cvr: number;
  cpa: number;
  roas: number;
  impressionShare: number;
  lostISBudget: number;
  lostISRank: number;
  topImpressionRate: number;
}

/**
 * Runs a realistic Google Ads auction based on student decisions, trends, and GSP math.
 */
export function runGoogleAuction(
  _keyword: string,
  dailySearchVolume: number,
  advertisers: Advertiser[],
  conversionRate: number,
  random: SeededRandom,
  marketCondition?: {
    demandIndex: number;
    competitionIndex: number;
    cpcPressure: number;
    conversionIntent: number;
    seasonalImpact: number;
    newsImpact: number;
  }
): GoogleAuctionResult[] {
  const demand = marketCondition ? marketCondition.demandIndex : 1.0;
  const competition = marketCondition ? marketCondition.competitionIndex : 1.0;
  const cpcInflator = marketCondition ? marketCondition.cpcPressure : 1.0;
  const cvrIntent = marketCondition ? marketCondition.conversionIntent : 1.0;
  const seasonal = marketCondition ? marketCondition.seasonalImpact : 1.0;

  // 1. Pre-process advertisers (specifically student strategy weights)
  const processedAdvertisers = advertisers.map(adv => {
    let activeBid = adv.bid;
    let qs = adv.qualityScore;
    
    // Scale competitor bids based on market volatility & pressure
    if (adv.id !== 'student') {
      activeBid = adv.bid * competition * cpcInflator;
    } else {
      // Bidding strategy effects
      if (adv.biddingStrategy === 'Maximize Clicks') {
        // Automatically set bid closer to sweet spot
        activeBid = Math.min(adv.bid, 2.0);
      } else if (adv.biddingStrategy === 'Maximize Conversions' || adv.biddingStrategy === 'Target CPA') {
        // Optimize bid for conversions
        activeBid = adv.bid * 1.1;
      }
    }

    // Small deterministic random noise
    const noise = random.nextFloat(-0.02, 0.02);
    const adRank = Math.max(0, activeBid * qs + noise);

    return {
      ...adv,
      bid: activeBid,
      qualityScore: qs,
      adRank
    };
  });

  // 2. Sort descending by Ad Rank to establish position
  processedAdvertisers.sort((a, b) => b.adRank - a.adRank);

  // 3. Compute results
  const positionShares = [0.85, 0.55, 0.35, 0.18, 0.08]; // Impression share by rank
  const results: GoogleAuctionResult[] = [];

  for (let i = 0; i < processedAdvertisers.length; i++) {
    const current = processedAdvertisers[i];
    const next = processedAdvertisers[i + 1];
    
    // GSP Pricing: Next AdRank / Current QualityScore + $0.01
    let actualCPC = 0.15 * cpcInflator; 
    if (next) {
      actualCPC = (next.adRank / current.qualityScore) + 0.01;
    } else {
      actualCPC = Math.max(0.15 * cpcInflator, current.bid * 0.4);
    }

    // Bounding CPC by current bid and floor
    actualCPC = Math.min(current.bid, Math.max(0.01, actualCPC));
    actualCPC = parseFloat(actualCPC.toFixed(2));

    const position = i + 1;
    const baseShare = i < positionShares.length ? positionShares[i] : 0.02;

    // Base expected CTR based on position
    let baseCTR = 0.09 / (position + 0.1); // Position 1: ~8.1%, Position 2: ~4.2%, etc.
    let qsMultiplier = 0.5 + (current.qualityScore / 10.0); // QS 10: 1.5x, QS 1: 0.6x
    let expectedCTR = baseCTR * qsMultiplier;
    if (current.ctrModifier) {
      expectedCTR *= current.ctrModifier;
    }

    // Objective modifiers
    let cvrBoost = 1.0;
    if (current.id === 'student') {
      if (current.objective === 'Sales' || current.objective === 'Leads') {
        cvrBoost = 1.25;
        expectedCTR *= 0.9; // higher intent but slightly lower general CTR
      } else if (current.objective === 'Website Traffic') {
        expectedCTR *= 1.3;
        cvrBoost = 0.75;
      } else if (current.objective === 'Brand Awareness') {
        expectedCTR *= 1.1;
        cvrBoost = 0.4;
      }
    }

    // Match type modifiers
    let matchTypeVolModifier = 1.0;
    if (current.id === 'student') {
      const match = current.matchType ? current.matchType.toLowerCase() : 'phrase';
      if (match === 'broad') {
        matchTypeVolModifier = 1.6; // high impressions
        expectedCTR *= 0.65; // low CTR
      } else if (match === 'exact') {
        matchTypeVolModifier = 0.45; // low impressions
        expectedCTR *= 1.45; // high CTR
        cvrBoost *= 1.25; // high conversion rate
      }
    }

    // Negative keywords modifier (lowers wasted spend, boosts CTR)
    if (current.id === 'student' && current.negativeKeywordsCount && current.negativeKeywordsCount > 0) {
      const negativeBonus = Math.min(0.2, current.negativeKeywordsCount * 0.03);
      expectedCTR *= (1 + negativeBonus);
      cvrBoost *= (1 + negativeBonus * 0.5);
      matchTypeVolModifier *= (1 - negativeBonus * 0.5); // slightly filters volume
    }

    // Determine final impressions and clicks
    const totalQueryVolume = dailySearchVolume * demand * seasonal * matchTypeVolModifier;
    let impressions = Math.round(totalQueryVolume * baseShare);
    let rawClicks = impressions * expectedCTR;

    // Budget constraints and pacing
    const maxClicksSupported = current.dailyBudget / Math.max(0.01, actualCPC);
    let clicks = Math.round(Math.min(rawClicks, maxClicksSupported));
    let cost = parseFloat((clicks * actualCPC).toFixed(2));

    // Handle out of budget scaling
    if (clicks < rawClicks) {
      impressions = Math.round(impressions * (clicks / rawClicks));
    }

    // Conversions
    const baseCvr = conversionRate * cvrIntent * cvrBoost;
    let conversions = Math.round(clicks * baseCvr);

    // Impression shares
    const impressionShare = Math.min(100, Math.round(baseShare * 100));
    
    // Lost Impression Share due to Budget
    let lostISBudget = 0;
    if (rawClicks > maxClicksSupported) {
      lostISBudget = Math.round((1 - (maxClicksSupported / rawClicks)) * (100 - impressionShare));
    }
    
    // Lost Impression Share due to Rank
    const maxPossibleRank = 10 * 10;
    const rankPct = current.adRank / maxPossibleRank;
    const lostISRank = Math.max(0, Math.round((1 - rankPct) * (100 - impressionShare - lostISBudget)));

    // Top impression rate
    const topImpressionRate = position === 1 ? 95 : position === 2 ? 75 : position === 3 ? 50 : 20;

    const finalCTR = impressions > 0 ? (clicks / impressions) : 0;
    const finalCVR = clicks > 0 ? (conversions / clicks) : 0;

    // CPA and ROAS
    const cpa = conversions > 0 ? parseFloat((cost / conversions).toFixed(2)) : 0.0;
    const averagePricePoint = 120.0;
    const revenue = conversions * averagePricePoint;
    const roas = cost > 0 ? parseFloat((revenue / cost).toFixed(2)) : 0.0;

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
      ctr: finalCTR,
      cvr: finalCVR,
      cpa,
      roas,
      impressionShare,
      lostISBudget,
      lostISRank,
      topImpressionRate
    });
  }

  return results;
}
