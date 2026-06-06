export function getOrganicCTR(rank: number): number {
  if (rank <= 0) return 0.0;
  if (rank === 1) return 0.312;
  if (rank === 2) return 0.156;
  if (rank === 3) return 0.098;
  if (rank === 4) return 0.070;
  if (rank === 5) return 0.051;
  if (rank === 6) return 0.039;
  if (rank === 7) return 0.031;
  if (rank === 8) return 0.024;
  if (rank === 9) return 0.019;
  if (rank === 10) return 0.014;
  
  // Page 2 CTRs
  if (rank <= 20) return 0.007;
  // Page 3-5 CTRs
  if (rank <= 50) return 0.002;
  // Beyond Page 5
  return 0.0005;
}

export interface TrafficInput {
  rank: number;
  searchVolume: number;
  conversionRate: number; // default base conversion rate (e.g. 0.02)
}

export interface TrafficOutput {
  impressions: number;
  clicks: number;
  conversions: number;
}

/**
 * Calculates organic metrics based on keyword ranking and search volumes
 */
export function calculateOrganicTraffic(input: TrafficInput): TrafficOutput {
  const impressions = Math.max(0, input.searchVolume);
  const ctr = getOrganicCTR(input.rank);
  const clicks = Math.round(impressions * ctr);
  const conversions = Math.round(clicks * input.conversionRate);

  return {
    impressions,
    clicks,
    conversions,
  };
}
