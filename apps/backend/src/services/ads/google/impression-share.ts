export interface ImpressionShareOutput {
  impressionShare: number;
  lostISBudget: number;
  lostISRank: number;
}

/**
 * Calculates share metrics indicating why potential ad reach was missed (Budget constraints vs Rank quality)
 */
export function calculateImpressionShare(
  actualImpressions: number,
  potentialImpressions: number,
  totalCost: number,
  dailyBudget: number
): ImpressionShareOutput {
  if (potentialImpressions <= 0) {
    return {
      impressionShare: 0.0,
      lostISBudget: 0.0,
      lostISRank: 0.0,
    };
  }

  const is = Math.min(1.0, actualImpressions / potentialImpressions);
  const totalLost = 1.0 - is;

  if (totalLost <= 0) {
    return {
      impressionShare: 1.0,
      lostISBudget: 0.0,
      lostISRank: 0.0,
    };
  }

  // Estimate lost due to budget
  let lostISBudget = 0.0;
  if (dailyBudget > 0) {
    const utilization = totalCost / dailyBudget;
    if (utilization >= 0.98) {
      lostISBudget = totalLost * 0.85; // highly budget limited
    } else if (utilization >= 0.8) {
      lostISBudget = totalLost * 0.4;
    } else if (utilization >= 0.5) {
      lostISBudget = totalLost * 0.15;
    }
  }

  const lostISRank = Math.max(0.0, totalLost - lostISBudget);

  return {
    impressionShare: parseFloat(is.toFixed(4)),
    lostISBudget: parseFloat(lostISBudget.toFixed(4)),
    lostISRank: parseFloat(lostISRank.toFixed(4)),
  };
}
