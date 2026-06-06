export interface PacedMetrics {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
}

/**
 * Paces daily ad delivery by scaling clicks, impressions, and costs to match budget boundaries
 */
export function paceDailyBudget(
  dailyBudget: number,
  simulatedMetrics: PacedMetrics
): PacedMetrics {
  if (dailyBudget <= 0) {
    return { impressions: 0, clicks: 0, cost: 0.0, conversions: 0 };
  }

  if (simulatedMetrics.cost <= dailyBudget) {
    return simulatedMetrics;
  }

  // Scale down metrics to match budget ceiling
  const scaleFactor = dailyBudget / simulatedMetrics.cost;

  return {
    impressions: Math.round(simulatedMetrics.impressions * scaleFactor),
    clicks: Math.round(simulatedMetrics.clicks * scaleFactor),
    cost: parseFloat(dailyBudget.toFixed(2)),
    conversions: Math.round(simulatedMetrics.conversions * scaleFactor),
  };
}
