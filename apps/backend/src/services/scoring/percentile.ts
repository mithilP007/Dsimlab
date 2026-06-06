/**
 * Computes a student's percentile rank (0.0 to 100.0) compared to their class cohort.
 */
export function calculatePercentile(studentScore: number, allCohortScores: number[]): number {
  if (allCohortScores.length <= 1) {
    return 100.0; // Alone in class, default top percentile
  }

  let lessThan = 0;
  let equalTo = 0;

  allCohortScores.forEach(score => {
    if (score < studentScore) {
      lessThan++;
    } else if (score === studentScore) {
      equalTo++;
    }
  });

  // Statistical standard formula: Percentile = (L + 0.5 * E) / N * 100
  const percentile = ((lessThan + 0.5 * equalTo) / allCohortScores.length) * 100.0;
  return parseFloat(percentile.toFixed(1));
}
