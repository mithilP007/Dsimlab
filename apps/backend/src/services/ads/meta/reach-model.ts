export interface ReachOutput {
  reach: number;
  frequency: number;
}

/**
 * Computes unique reach and average ad exposure frequency using standard exponential reach curves
 */
export function calculateReachAndFrequency(
  impressions: number,
  audienceSize: number
): ReachOutput {
  if (audienceSize <= 0 || impressions <= 0) {
    return { reach: 0, frequency: 0.0 };
  }

  // Reach follows diminishing returns: AudienceSize * (1 - e^(-Impressions / AudienceSize))
  const reachFraction = 1.0 - Math.exp(-impressions / audienceSize);
  const reach = Math.round(audienceSize * reachFraction);
  const frequency = impressions / Math.max(1, reach);

  return {
    reach: Math.max(1, reach),
    frequency: parseFloat(frequency.toFixed(2)),
  };
}
