export interface AdCopy {
  headline1?: string;
  headline2?: string;
  headline3?: string;
  description1?: string;
  description2?: string;
  headlines?: string[];
  descriptions?: string[];
}

export interface LandingPageQuality {
  pageRelevance: number;      // 1-10
  mobileFriendly: number;     // 1-10
  pageSpeed: number;          // 1-10
  trustSignals: number;       // 1-10
  offerClarity: number;       // 1-10
  conversionReadiness: number; // 1-10
}

/**
 * Calculates a Google Quality Score (1 to 10) based on copy relevance and landing page experience.
 */
export function calculateQualityScore(
  adCopy: AdCopy,
  keyword: string,
  lp: LandingPageQuality,
  relevanceMultiplier: number = 1.0
): number {
  let score = 5; // Start at middle base

  const keywordLower = keyword.toLowerCase();
  
  // Extract headlines and descriptions from either format
  const headlines = adCopy.headlines || [adCopy.headline1 || '', adCopy.headline2 || '', adCopy.headline3 || ''];
  const descriptions = adCopy.descriptions || [adCopy.description1 || '', adCopy.description2 || ''];
  
  const combinedCopy = [...headlines, ...descriptions].join(' ').toLowerCase();

  // 1. Ad Relevance Evaluation
  let matches = 0;
  headlines.forEach((hl, i) => {
    const hlLower = hl.toLowerCase();
    if (hlLower.includes(keywordLower)) {
      matches += i === 0 ? 2.5 : 1.5;
    }
  });
  descriptions.forEach(desc => {
    const descLower = desc.toLowerCase();
    if (descLower.includes(keywordLower)) {
      matches += 1.0;
    }
  });

  if (matches > 0) {
    score += matches;
  } else {
    // Check for partial term overlap
    const terms = keywordLower.split(/\s+/).filter(t => t.length > 1);
    const termMatches = terms.filter(term => combinedCopy.includes(term));
    if (termMatches.length > 0) {
      score += (termMatches.length / terms.length) * 2.0;
    } else {
      score -= 1.5; // poor relevance
    }
  }

  // 2. Landing Page Experience
  const avgLp = (lp.pageRelevance + lp.mobileFriendly + lp.pageSpeed + lp.trustSignals + lp.offerClarity + lp.conversionReadiness) / 6;
  if (avgLp >= 8.5) {
    score += 2.5;
  } else if (avgLp >= 7.0) {
    score += 1.5;
  } else if (avgLp >= 5.0) {
    score += 0.5;
  } else if (avgLp < 4.0) {
    score -= 2.0;
  }

  // 3. Expected CTR factor
  const totalHeadlines = headlines.filter(h => h.trim().length > 0).length;
  const totalDescriptions = descriptions.filter(d => d.trim().length > 0).length;
  if (totalHeadlines >= 3 && totalDescriptions >= 2) {
    score += 0.5;
  }

  // Apply scenario relevance multiplier
  score *= relevanceMultiplier;

  // Bounded between 1 and 10
  return Math.min(10, Math.max(1, Math.round(score)));
}
