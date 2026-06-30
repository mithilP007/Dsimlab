export interface SandboxRecommendation {
  type: string;
  recommendation: string;
}

export function generateSandboxRecommendations(
  mode: string,
  decision: any,
  metrics: any[],
  summary: any,
  relevanceScore: number
): string[] {
  const recommendations: string[] = [];

  // 0. Scenario Relevance Warning
  if (relevanceScore < 0.6) {
    recommendations.push(
      "Warning: Your keywords or ad copy do not match the scenario industry. Adjust your settings to align with the scenario theme to remove the relevance penalty."
    );
  }

  const latestMetric = metrics[metrics.length - 1];

  if (mode === 'GOOGLE_ADS') {
    // 1. Quality Score check
    if (summary.score < 70) {
      recommendations.push(
        "Identify keywords with low Quality Scores (< 6) and align your headlines and landing page copy to improve ad relevance."
      );
    }
    // 2. Budget limits
    if (latestMetric && latestMetric.googleImpressions > 0) {
      const lostBudget = summary.lostISBudget || 0;
      const lostRank = summary.lostISRank || 0;
      
      if (lostBudget > 20) {
        recommendations.push(
          "Your campaigns are limited by budget. Raise your daily budget to capture lost impression share, provided your ROAS is healthy."
        );
      }
      if (lostRank > 20) {
        recommendations.push(
          "You are losing impression share due to low Ad Rank. Increase your Max CPC bid or write more engaging ad headlines."
        );
      }
    }
    // 3. Negative keywords
    let hasNegatives = false;
    try {
      const negs = JSON.parse(decision.googleCampaigns || '[]')[0]?.negativeKeywords || [];
      hasNegatives = negs.length > 0;
    } catch (e) {}
    if (!hasNegatives) {
      recommendations.push(
        "Add negative keywords (e.g., 'free', 'cheap') to filter out irrelevant searches and protect your daily budget."
      );
    }
    // 4. Broad Match intent spill
    let isBroad = false;
    try {
      const kws = JSON.parse(decision.googleCampaigns || '[]')[0]?.adGroups?.[0]?.keywords || [];
      isBroad = kws.some((k: any) => k.matchType === 'broad' || k.matchType === 'Broad');
    } catch (e) {}
    if (isBroad && summary.roas < 2.0) {
      recommendations.push(
        "Broad match keywords are attracting low-intent clicks. Switch high-spend keywords to Phrase or Exact match types."
      );
    }
    // 5. CTR Check
    if (summary.ctr < 0.03 && summary.impressions > 0) {
      recommendations.push(
        "Your CTR is below the 3% benchmark. Refine your headlines, use display paths, and add structured callouts or promotion assets."
      );
    }

  } else if (mode === 'META_ADS') {
    let freq = 1.0;
    let sat = 0;
    if (latestMetric) {
      freq = summary.frequency || 1.0;
      sat = summary.audienceSaturation || 0;
    }

    // 1. Creative fatigue / Frequency check
    if (freq > 3.0) {
      recommendations.push(
        "Ad frequency exceeds 3.0, triggering creative fatigue and CTR decay. Upload fresh creatives or test a different copy angle (e.g., social proof or urgency)."
      );
    }
    // 2. Audience narrowness
    let isNarrow = false;
    let target = 'all';
    try {
      const adSet = JSON.parse(decision.metaCampaigns || '[]')[0]?.adSets?.[0];
      target = adSet?.targeting?.interests || '';
      isNarrow = target.split(',').length < 2 && sat > 40;
    } catch (e) {}
    if (isNarrow) {
      recommendations.push(
        "Your audience targeting is highly narrow, causing fast ad fatigue. Expand interest behaviors or utilize Advantage+ placements."
      );
    }
    // 3. Audience too broad
    if (summary.ctr < 0.006 && summary.impressions > 5000 && !isNarrow) {
      recommendations.push(
        "Your CTR is low. Your target audience might be too broad; narrow down by age, gender, or specific detailed interests."
      );
    }
    // 4. Learning phase
    let budget = 0;
    try {
      budget = JSON.parse(decision.metaCampaigns || '[]')[0]?.adSets?.[0]?.dailyBudget || 0;
    } catch (e) {}
    if (budget > 0 && budget < 20) {
      recommendations.push(
        "Your daily budget is low, keeping your campaign in the learning phase. Increase budget to unlock full delivery optimization."
      );
    }

  } else if (mode === 'SEO') {
    let techScore = 80;
    try {
      const tc = JSON.parse(decision.seoTechnicalConfig || '{}');
      let score = 20;
      if (tc.hasSsl) score += 20;
      if (tc.hasSitemap) score += 20;
      if (tc.hasRobots) score += 20;
      if (tc.isMobileFriendly) score += 20;
      techScore = score;
    } catch (e) {}

    // 1. Technical Health check
    if (techScore < 75) {
      recommendations.push(
        "Resolve indexing and crawling barriers: configure robots.txt, deploy an XML sitemap, and install an SSL certificate."
      );
    }
    // 2. Core Web Vitals
    let lcp = 1.5;
    try {
      const wv = JSON.parse(decision.seoCoreWebVitals || '{}');
      lcp = wv.lcp || 1.5;
    } catch (e) {}
    if (lcp > 2.5) {
      recommendations.push(
        "Page load time (LCP) is above 2.5s. Optimize images, minify CSS/JS scripts, and fix Core Web Vitals warnings."
      );
    }
    // 3. Content Optimization
    const metaTitle = decision.seoMetaTitle || '';
    const metaDescription = decision.seoMetaDescription || '';
    if (metaTitle.length < 40 || metaTitle.length > 60) {
      recommendations.push(
        "Optimize title tag length: keep meta titles between 50 and 60 characters for best SERP display."
      );
    }
    if (metaDescription.length < 110 || metaDescription.length > 160) {
      recommendations.push(
        "Optimize meta description length: keep descriptions between 120 and 160 characters to improve organic CTR."
      );
    }
    // 4. Anchor text and internal link quality
    const internalLinks = decision.seoInternalLinks || 0;
    if (internalLinks === 0) {
      recommendations.push(
        "Add internal links to orphan pages. Distribute link juice and crawl visibility across key pages."
      );
    }
    // 5. Backlink Strategy
    const backlinkQuality = decision.seoBacklinkQuality || 1;
    if (backlinkQuality === 1 && summary.roas < 1.0) {
      recommendations.push(
        "Low-quality directory links carry high spam risk. Invest in higher authority guest posts or context-relevant referrals."
      );
    }
  }

  // Fallback defaults
  if (recommendations.length === 0) {
    recommendations.push(
      "Outstanding performance! Continue monitoring daily trends and budget allocations to maximize ROAS."
    );
  }

  return recommendations;
}
