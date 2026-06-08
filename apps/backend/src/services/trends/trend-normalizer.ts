export interface TrendSignal {
  keyword: string;
  industry: string;
  location: string;
  trendScore: number;        // 0-100
  competitionScore: number;  // 0-100
  seasonalScore: number;     // 0-100
  newsImpactScore: number;   // -100 to +100
  socialBuzzScore: number;   // 0-100
  audienceIntent: "LOW" | "MEDIUM" | "HIGH";
  suggestedCpcRange: {
    min: number;
    max: number;
  };
  suggestedCpmRange: {
    min: number;
    max: number;
  };
  confidence: number;        // 0-1
  sources: Array<{
    name: string;
    url?: string;
    fetchedAt: string;
  }>;
}

/**
 * Normalizes different trend score indicators into a standard range
 */
export function normalizeTrendSignals(
  keyword: string,
  industry: string,
  location: string,
  googleSearchVolume: number, // raw estimate
  newsMentions: number,       // count of news articles
  socialBuzzVolume: number,   // social mentions count
  sources: Array<{ name: string; url?: string; fetchedAt: string }>
): TrendSignal {
  // 1. Calculate trendScore (0-100) based on Google search volume and social buzz
  // Map Google volume (e.g. 0 to 10000+) to score
  const googleWeight = Math.min(100, (googleSearchVolume / 8000) * 100);
  const socialWeight = Math.round(Math.min(100, (socialBuzzVolume / 50) * 100));
  const trendScore = Math.round((googleWeight * 0.6) + (socialWeight * 0.4));

  // 2. Competition Score (0-100)
  // Higher news mentions and search volume suggest higher competition
  const baseComp = Math.min(100, (newsMentions * 10) + (googleSearchVolume / 200));
  // Keep within standard difficulty range 10-95
  const competitionScore = Math.max(10, Math.min(95, Math.round(baseComp)));

  // 3. Seasonal Score (0-100)
  // Derive deterministically from keyword characteristics + current date
  const month = new Date().getMonth(); // 0-11
  // Simple deterministic seasonal wave: peaks in winter holiday or mid-summer depending on keyword length
  const keywordHash = keyword.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const peakMonth = keywordHash % 12;
  const distance = Math.min(Math.abs(month - peakMonth), 12 - Math.abs(month - peakMonth));
  const seasonalScore = Math.round(100 - (distance * 8.33));

  // 4. News Impact Score (-100 to +100)
  // Higher news mentions usually mean trend impact. We'll compute it positive or negative based on keyword sentiment/presence of regulatory terms.
  const isRegulatory = keyword.includes('policy') || keyword.includes('law') || keyword.includes('tax') || keyword.includes('economic');
  const newsImpactScore = Math.min(100, Math.max(-100, Math.round(newsMentions * 8 * (isRegulatory ? -1 : 1))));

  // 5. Audience Intent ("LOW" | "MEDIUM" | "HIGH")
  let audienceIntent: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  const intentScore = (trendScore * 0.5) + (socialWeight * 0.5);
  if (intentScore > 65) {
    audienceIntent = "HIGH";
  } else if (intentScore > 30) {
    audienceIntent = "MEDIUM";
  }

  // 6. CPC Range based on keyword properties and competition
  const cleanKeyword = keyword.toLowerCase();
  let baseCpc = 1.25;
  if (cleanKeyword.includes('software') || cleanKeyword.includes('crm') || cleanKeyword.includes('b2b')) {
    baseCpc = 4.50;
  } else if (cleanKeyword.includes('marketing') || cleanKeyword.includes('agency')) {
    baseCpc = 3.20;
  } else if (cleanKeyword.includes('shoes') || cleanKeyword.includes('fashion') || cleanKeyword.includes('store')) {
    baseCpc = 0.85;
  }

  // Scale CPC with competition
  const cpcMin = parseFloat((baseCpc * (0.8 + (competitionScore / 200))).toFixed(2));
  const cpcMax = parseFloat((cpcMin * 1.5).toFixed(2));

  // 7. CPM Range
  const baseCpm = baseCpc * 4.5;
  const cpmMin = parseFloat((baseCpm * (0.9 + (trendScore / 300))).toFixed(2));
  const cpmMax = parseFloat((cpmMin * 1.6).toFixed(2));

  // 8. Confidence: higher if we have more sources and matches
  const confidence = parseFloat(Math.min(1.0, 0.4 + (sources.length * 0.2)).toFixed(2));

  return {
    keyword,
    industry,
    location,
    trendScore,
    competitionScore,
    seasonalScore,
    newsImpactScore,
    socialBuzzScore: socialWeight,
    audienceIntent,
    suggestedCpcRange: { min: cpcMin, max: cpcMax },
    suggestedCpmRange: { min: cpmMin, max: cpmMax },
    confidence,
    sources
  };
}
