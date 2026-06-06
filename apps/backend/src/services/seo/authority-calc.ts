/**
 * Calculates Domain Authority (1-100) based on cumulative backlink investment
 */
export function calculateDomainAuthority(backlinkBudget: number, currentDA: number = 10): number {
  if (backlinkBudget <= 0) return currentDA;
  // Logarithmic growth for domain authority based on budget spent
  const increase = Math.log2((backlinkBudget / 50) + 1) * 3;
  const nextDA = Math.min(100, currentDA + increase);
  return parseFloat(nextDA.toFixed(2));
}

/**
 * Calculates Page Authority (1-100) based on content quality and Domain Authority
 */
export function calculatePageAuthority(contentQuality: number, domainAuthority: number): number {
  // Content quality (1-10) weighted heavily for page-level relevance, backed by domain authority
  const pa = (contentQuality * 7) + (domainAuthority * 0.3);
  return parseFloat(Math.min(100, Math.max(1, pa)).toFixed(2));
}
