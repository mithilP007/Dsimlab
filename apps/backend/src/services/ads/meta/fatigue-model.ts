/**
 * Calculates a CTR fatigue decay multiplier based on campaign frequency and creative quality
 */
export function calculateCTRDecay(frequency: number, creativeQuality: number): number {
  if (frequency <= 1.2) {
    return 1.0;
  }

  // Decay factor k: creative quality (1-10) reduces fatigue speed
  // Quality 10 -> k = 0.04 (slow decay), Quality 1 -> k = 0.35 (rapid decay)
  const k = Math.max(0.03, 0.4 - (creativeQuality * 0.035));
  
  const decay = Math.exp(-k * (frequency - 1.2));
  
  // Cap minimum multiplier at 15% of original performance
  return parseFloat(Math.max(0.15, decay).toFixed(4));
}
