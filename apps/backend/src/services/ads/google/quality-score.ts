export interface AdCopy {
  title: string;
  description: string;
}

/**
 * Calculates a Google Quality Score (1 to 10) based on copy relevance and landing page experience.
 */
export function calculateQualityScore(
  adCopy: AdCopy,
  keyword: string,
  landingPageQuality: number // scale 1-10
): number {
  let score = 5; // Start at middle base

  const keywordLower = keyword.toLowerCase();
  const titleLower = adCopy.title.toLowerCase();
  const descLower = adCopy.description.toLowerCase();
  const combinedCopy = `${titleLower} ${descLower}`;

  // 1. Ad Relevance Evaluation
  if (titleLower.includes(keywordLower)) {
    score += 2; // Keyword in title is highly relevant
  } else if (descLower.includes(keywordLower)) {
    score += 1.5;
  } else {
    // Check for partial term overlap
    const terms = keywordLower.split(/\s+/).filter(t => t.length > 1);
    const matches = terms.filter(term => combinedCopy.includes(term));
    if (matches.length > 0) {
      score += (matches.length / terms.length) * 1.0;
    } else {
      score -= 1.0; // poor relevance
    }
  }

  // 2. Landing Page Experience (bound to SEO content quality)
  if (landingPageQuality >= 8.0) {
    score += 2.0;
  } else if (landingPageQuality >= 5.0) {
    score += 1.0;
  } else if (landingPageQuality < 3.0) {
    score -= 1.5;
  }

  // 3. Bounded between 1 and 10
  return Math.min(10, Math.max(1, Math.round(score)));
}
