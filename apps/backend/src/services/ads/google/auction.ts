import { SeededRandom } from '../../../utils/deterministic-random';

export interface Advertiser {
  id: string;
  name: string;
  bid: number;
  qualityScore: number;
  dailyBudget: number;
  matchType?: string;
  objective?: string;
  campaignType?: string;
  biddingStrategy?: string;
  negativeKeywordsCount?: number;
  deviceAdjustments?: { desktop: number; mobile: number; tablet: number };
  landingPageExperience?: number; // 1-10 average
  ctrModifier?: number;
  keywordIntent?: string; // informational, commercial, transactional, navigational
  adStrength?: string; // Poor, Average, Good, Excellent
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
  ctr: number;
  cvr: number;
  cpa: number;
  roas: number;
  impressionShare: number;
  lostISBudget: number;
  lostISRank: number;
  topImpressionRate: number;
  adStrength?: string;
}

export function runGoogleAuction(
  keyword: string,
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

  // 1. Process bids and Ad Rank
  const processedAdvertisers = advertisers.map(adv => {
    let activeBid = adv.bid;
    let qs = adv.qualityScore;
    
    // Scale competitor bids
    if (adv.id !== 'student') {
      activeBid = adv.bid * competition * cpcInflator;
    } else {
      // Bidding strategy effects
      if (adv.biddingStrategy === 'Maximize Clicks') {
        activeBid = Math.min(adv.bid, 2.5);
      } else if (adv.biddingStrategy === 'Maximize Conversions' || adv.biddingStrategy === 'Target CPA' || adv.biddingStrategy === 'Target ROAS') {
        activeBid = adv.bid * 1.15;
      }
    }

    const noise = random.nextFloat(-0.01, 0.01);
    const adRank = Math.max(0, activeBid * qs + noise);

    return {
      ...adv,
      bid: activeBid,
      qualityScore: qs,
      adRank
    };
  });

  // Sort descending by Ad Rank to establish position
  processedAdvertisers.sort((a, b) => b.adRank - a.adRank);

  const positionShares = [0.88, 0.58, 0.38, 0.20, 0.08];
  const results: GoogleAuctionResult[] = [];

  for (let i = 0; i < processedAdvertisers.length; i++) {
    const current = processedAdvertisers[i];
    const next = processedAdvertisers[i + 1];
    
    // GSP Pricing: Next AdRank / Current QualityScore + $0.01
    let actualCPC = 0.15 * cpcInflator; 
    if (next) {
      actualCPC = (next.adRank / current.qualityScore) + 0.01;
    } else {
      actualCPC = Math.max(0.15 * cpcInflator, current.bid * 0.45);
    }

    actualCPC = Math.min(current.bid, Math.max(0.01, actualCPC));
    actualCPC = parseFloat(actualCPC.toFixed(2));

    const position = i + 1;
    const baseShare = i < positionShares.length ? positionShares[i] : 0.03;

    // Base expected CTR
    let baseCTR = 0.095 / (position + 0.1); 
    let qsMultiplier = 0.45 + (current.qualityScore / 10.0) * 1.1; 
    let expectedCTR = baseCTR * qsMultiplier;
    if (current.ctrModifier) {
      expectedCTR *= current.ctrModifier;
    }

    // Objective modifiers
    let cvrBoost = 1.0;
    if (current.id === 'student') {
      if (current.objective === 'Sales' || current.objective === 'Leads') {
        cvrBoost = 1.3;
        expectedCTR *= 0.95;
      } else if (current.objective === 'Website Traffic') {
        expectedCTR *= 1.35;
        cvrBoost = 0.7;
      } else if (current.objective === 'Brand Awareness') {
        expectedCTR *= 1.15;
        cvrBoost = 0.35;
      }
    }

    // Intent modifiers
    if (current.id === 'student' && current.keywordIntent) {
      const intent = current.keywordIntent.toLowerCase();
      if (intent === 'transactional') {
        cvrBoost *= 1.5; // converts much better
        expectedCTR *= 1.1;
      } else if (intent === 'informational') {
        cvrBoost *= 0.5; // low conversion intent
        expectedCTR *= 0.85;
      }
    }

    // Match type modifiers
    let matchTypeVolModifier = 1.0;
    if (current.id === 'student') {
      const match = current.matchType ? current.matchType.toLowerCase() : 'phrase';
      if (match === 'broad') {
        matchTypeVolModifier = 1.8;
        expectedCTR *= 0.6;
      } else if (match === 'exact') {
        matchTypeVolModifier = 0.4;
        expectedCTR *= 1.5;
        cvrBoost *= 1.3;
      }
    }

    // Negative keywords modifier
    if (current.id === 'student' && current.negativeKeywordsCount && current.negativeKeywordsCount > 0) {
      const negativeBonus = Math.min(0.25, current.negativeKeywordsCount * 0.04);
      expectedCTR *= (1 + negativeBonus);
      cvrBoost *= (1 + negativeBonus * 0.6);
      matchTypeVolModifier *= (1 - negativeBonus * 0.4); 
    }

    // Determine final impressions and clicks
    const totalQueryVolume = dailySearchVolume * demand * seasonal * matchTypeVolModifier;
    let impressions = Math.round(totalQueryVolume * baseShare);
    let rawClicks = impressions * expectedCTR;

    // Budget constraints
    const maxClicksSupported = current.dailyBudget / Math.max(0.01, actualCPC);
    let clicks = Math.round(Math.min(rawClicks, maxClicksSupported));
    let cost = parseFloat((clicks * actualCPC).toFixed(2));

    if (clicks < rawClicks) {
      impressions = Math.round(impressions * (clicks / rawClicks));
    }

    // Conversions
    const baseCvr = conversionRate * cvrIntent * cvrBoost;
    let conversions = Math.round(clicks * baseCvr);

    // Impression share
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

    const topImpressionRate = position === 1 ? 96 : position === 2 ? 78 : position === 3 ? 55 : 22;

    const finalCTR = impressions > 0 ? (clicks / impressions) : 0;
    const finalCVR = clicks > 0 ? (conversions / clicks) : 0;

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
      topImpressionRate,
      adStrength: current.adStrength
    });
  }

  return results;
}
