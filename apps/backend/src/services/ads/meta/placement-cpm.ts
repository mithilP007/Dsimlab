export function getPlacementBaseCPM(placement: string): number {
  const p = placement.toLowerCase();
  if (p.includes('feed')) return 14.50;
  if (p.includes('stories')) return 9.50;
  if (p.includes('reels')) return 16.00;
  return 11.00; // default auto-placement
}

/**
 * Calculates Meta Ads CPM based on placement selection, interest competitiveness, and participant counts
 */
export function calculateMetaCPM(
  placement: string,
  audienceInterest: string,
  activeCompetitors: number
): number {
  const baseCPM = getPlacementBaseCPM(placement);

  // Audience interest multiplier based on competitive demand
  let audienceMultiplier = 1.0;
  const interest = audienceInterest.toLowerCase();
  
  if (interest.includes('business') || interest.includes('ceo') || interest.includes('founder')) {
    audienceMultiplier = 1.6;
  } else if (interest.includes('tech') || interest.includes('gadgets') || interest.includes('gaming')) {
    audienceMultiplier = 1.25;
  } else if (interest.includes('fashion') || interest.includes('lifestyle')) {
    audienceMultiplier = 1.1;
  } else if (interest.includes('general') || interest.includes('all')) {
    audienceMultiplier = 0.8;
  }

  // Bid intensity multiplier based on competitor volume
  const competitorFactor = 1.0 + (activeCompetitors * 0.08);

  const cpm = baseCPM * audienceMultiplier * competitorFactor;
  return parseFloat(Math.max(1.0, cpm).toFixed(2));
}
