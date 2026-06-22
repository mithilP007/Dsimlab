export interface PerformanceInput {
  seoKeywordsRanks: number[]; // Array of keyword positions
  googleAdsCost: number;
  googleAdsRevenue: number;
  metaAdsCost: number;
  metaAdsRevenue: number;
  allocatedRoundBudget: number;
  totalRoundSpend: number;
  totalRoundRevenue: number;
  decision?: any;
  scenario?: any;
  marketCondition?: any;
  prevDecisions?: any[];
  prevScoreBreakdowns?: any[];
  googleConversions?: number;
  metaConversions?: number;
  googleClicks?: number;
  metaClicks?: number;
  googleImpressions?: number;
  metaImpressions?: number;
  reflectionQualityScore?: number;
}

export interface DimensionScores {
  seoScore: number;
  googleAdsScore: number;
  metaAdsScore: number;
  budgetScore: number;
  revenueScore: number;
  strategicAlignment: number;
  efficiencyRoi: number;
  budgetDiscipline: number;
  riskManagement: number;
  adaptability: number;
}

/**
 * Evaluates performance across 10 specific dimensions, each outputting a score out of 100.
 */
export function calculateDimensionScores(input: PerformanceInput): DimensionScores {
  // 1. SEO Score: base on average keyword rank position
  // Average rank 1.0 -> score 100; Average rank >= 50 -> score 10.
  let seoScore = 10.0;
  if (input.seoKeywordsRanks.length > 0) {
    const sum = input.seoKeywordsRanks.reduce((acc, rank) => acc + rank, 0);
    const avgRank = sum / input.seoKeywordsRanks.length;
    seoScore = Math.max(10.0, 100.0 - (avgRank - 1.0) * 1.8);
  }

  // 2. Google Ads Score: Base on return on ad spend (ROAS)
  let googleAdsScore = 0.0;
  if (input.googleAdsCost > 0) {
    const roas = input.googleAdsRevenue / input.googleAdsCost;
    googleAdsScore = Math.min(100.0, Math.max(0.0, (roas / 3.0) * 100.0));
  } else if (input.allocatedRoundBudget > 0) {
    googleAdsScore = 0.0;
  } else {
    googleAdsScore = 50.0; // neutral if no budget allocated
  }

  // 3. Meta Ads Score: Base on ROAS
  let metaAdsScore = 0.0;
  if (input.metaAdsCost > 0) {
    const roas = input.metaAdsRevenue / input.metaAdsCost;
    metaAdsScore = Math.min(100.0, Math.max(0.0, (roas / 3.0) * 100.0));
  } else if (input.allocatedRoundBudget > 0) {
    metaAdsScore = 0.0;
  } else {
    metaAdsScore = 50.0;
  }

  // 4. Budget Score: Precision of budget utilization
  let budgetScore = 100.0;
  if (input.allocatedRoundBudget > 0) {
    const utilization = input.totalRoundSpend / input.allocatedRoundBudget;
    const diff = Math.abs(1.0 - utilization);
    budgetScore = Math.max(0.0, 100.0 - (diff * 200.0));
  }

  // 5. Revenue Score: revenue volume scaling
  const benchmarkRevenue = 12000.0;
  const revenueScore = Math.min(100.0, (input.totalRoundRevenue / benchmarkRevenue) * 100.0);

  // Parse campaigns from decision
  let googleCampaigns: any[] = [];
  let metaCampaigns: any[] = [];
  if (input.decision) {
    try {
      googleCampaigns = typeof input.decision.googleCampaigns === 'string'
        ? JSON.parse(input.decision.googleCampaigns)
        : input.decision.googleCampaigns || [];
      metaCampaigns = typeof input.decision.metaCampaigns === 'string'
        ? JSON.parse(input.decision.metaCampaigns)
        : input.decision.metaCampaigns || [];
    } catch (e) {
      // ignore
    }
  }

  // 6. Strategic Alignment (objective match + targeting fit + ad copy intent)
  const targetKPI = input.scenario?.targetKPI || 'revenue';
  let objectiveMatch = 100.0;
  let targetMatch = 100.0;
  let adCopyIntentMatch = 100.0;

  // Evaluate Google Ads Objective Alignment
  googleCampaigns.forEach((camp: any) => {
    const obj = camp.objective || 'Sales';
    if (targetKPI === 'revenue' && !['Sales', 'Leads'].includes(obj)) {
      objectiveMatch -= 15.0;
    } else if (targetKPI === 'clicks' && !['Website Traffic', 'Brand Awareness'].includes(obj)) {
      objectiveMatch -= 15.0;
    } else if (targetKPI === 'conversions' && !['Sales', 'Leads', 'App Promotion'].includes(obj)) {
      objectiveMatch -= 15.0;
    }

    // Evaluate targeting locations (Google Ads)
    const targetedLocations = camp.locations || [];
    const allowedLocationsStr = input.scenario?.targetLocations || '["Global"]';
    try {
      const allowedLocations: string[] = JSON.parse(allowedLocationsStr);
      if (targetedLocations.length > 0 && allowedLocations.length > 0 && !allowedLocations.includes('Global')) {
        const hasValidLocation = targetedLocations.some((loc: string) => allowedLocations.includes(loc));
        if (!hasValidLocation) targetMatch -= 20.0;
      }
    } catch (e) {
      // ignore
    }

    // Evaluate Ad Copy Intent
    const adCopy = camp.adCopy || {};
    const headlineText = `${adCopy.headline1 || ''} ${adCopy.headline2 || ''} ${adCopy.headline3 || ''}`.toLowerCase();
    const transactionalKeywords = ['buy', 'shop', 'sale', 'discount', 'get', 'save', 'order', 'off'];
    const hasTransactional = transactionalKeywords.some(w => headlineText.includes(w));
    if (['Sales', 'Leads'].includes(obj) && !hasTransactional) {
      adCopyIntentMatch -= 20.0;
    }
  });

  // Evaluate Meta Ads Objective Alignment
  metaCampaigns.forEach((camp: any) => {
    const obj = (camp.objective || 'sales').toLowerCase();
    if (targetKPI === 'revenue' && !['sales', 'leads'].includes(obj)) {
      objectiveMatch -= 15.0;
    } else if (targetKPI === 'clicks' && !['traffic', 'engagement'].includes(obj)) {
      objectiveMatch -= 15.0;
    } else if (targetKPI === 'conversions' && !['sales', 'leads'].includes(obj)) {
      objectiveMatch -= 15.0;
    }

    // Evaluate creative text intent
    const creative = camp.creative || {};
    const creativeText = `${creative.headline || ''} ${creative.primaryText || ''}`.toLowerCase();
    const transactionalKeywords = ['buy', 'shop', 'sale', 'discount', 'get', 'save', 'order', 'off'];
    const hasTransactional = transactionalKeywords.some(w => creativeText.includes(w));
    if (['sales', 'leads'].includes(obj) && !hasTransactional) {
      adCopyIntentMatch -= 20.0;
    }
  });

  objectiveMatch = Math.max(30.0, Math.min(100.0, objectiveMatch));
  targetMatch = Math.max(30.0, Math.min(100.0, targetMatch));
  adCopyIntentMatch = Math.max(30.0, Math.min(100.0, adCopyIntentMatch));
  const strategicAlignment = objectiveMatch * 0.4 + targetMatch * 0.3 + adCopyIntentMatch * 0.3;

  // 7. Budget Discipline
  let budgetDiscipline = 100.0;
  if (input.allocatedRoundBudget > 0) {
    const utilization = input.totalRoundSpend / input.allocatedRoundBudget;
    if (utilization > 1.0) {
      budgetDiscipline = Math.max(10.0, 100.0 - (utilization - 1.0) * 200.0);
    } else if (utilization < 0.9) {
      budgetDiscipline = Math.max(10.0, 100.0 - (0.9 - utilization) * 100.0);
    }
  }

  // 8. ROI / Efficiency
  let roasScore = 0.0;
  let cpaScore = 0.0;
  const totalSpend = input.googleAdsCost + input.metaAdsCost;
  const totalPaidRevenue = input.googleAdsRevenue + input.metaAdsRevenue;
  const totalConversions = (input.googleConversions || 0) + (input.metaConversions || 0);

  if (totalSpend > 0) {
    const roas = totalPaidRevenue / totalSpend;
    if (roas >= 4.0) roasScore = 100.0;
    else if (roas >= 1.0) roasScore = (roas / 4.0) * 100.0;
    else roasScore = roas * 20.0;

    const cpa = totalSpend / (totalConversions || 1);
    if (cpa <= 15.0) cpaScore = 100.0;
    else cpaScore = Math.max(10.0, 100.0 - (cpa - 15.0) * 2.0);
  } else {
    roasScore = 50.0; // neutral if no ad spend
    cpaScore = 50.0;
  }
  const efficiencyRoi = roasScore * 0.6 + cpaScore * 0.4;

  // 9. Risk Management (Audience Over-saturation & Creative Fatigue)
  let riskManagement = 100.0;

  // Deduct for too high frequency in Meta Ads
  if (input.metaImpressions && input.metaImpressions > 0 && input.metaClicks) {
    const frequency = input.metaImpressions / Math.max(1, input.metaImpressions * 0.6); // proxy reach
    if (frequency > 2.5) {
      riskManagement -= 15.0;
    }
  }

  // Deduct if Google budget is set too high compared to suggestions
  googleCampaigns.forEach((camp: any) => {
    if (camp.budget > 1000) {
      riskManagement -= 10.0;
    }
  });

  // Deduct if ads run without negative keywords
  const googleNegCount = googleCampaigns.reduce((acc, c) => acc + (c.negativeKeywords || []).length, 0);
  if (googleCampaigns.length > 0 && googleNegCount === 0) {
    riskManagement -= 15.0;
  }

  riskManagement = Math.max(10.0, riskManagement);

  // 10. Adaptability (Responses to news/trends, and strategy modifications after poor performance)
  let adaptability = 75.0;
  const prevScores = input.prevScoreBreakdowns || [];
  if (prevScores.length > 0) {
    const lastScore = prevScores[prevScores.length - 1];
    const prevDecs = input.prevDecisions || [];
    const lastDec = prevDecs[prevDecs.length - 1];

    if (lastScore.compositeIndex < 70.0 && lastDec && input.decision) {
      // Check if student adjusted budget, keywords, or creative
      const budgetChanged = lastDec.seoBacklinkBudget !== input.decision.seoBacklinkBudget ||
        lastDec.googleCampaigns !== input.decision.googleCampaigns ||
        lastDec.metaCampaigns !== input.decision.metaCampaigns;

      if (budgetChanged) {
        adaptability = 95.0; // proactive changes
      } else {
        adaptability = 40.0; // failed to adjust strategy after poor results
      }
    } else {
      // Trend alignment: evaluate if targeted keywords match market trends
      let keywordTrendMatchCount = 0;
      let totalGoogleKws = 0;
      googleCampaigns.forEach((c: any) => {
        const keywords = c.keywords || [];
        totalGoogleKws += keywords.length;
        keywords.forEach((k: any) => {
          // If trend normalizer has trend score for the word
          const signals = input.marketCondition?.signals ? JSON.parse(input.marketCondition.signals) : [];
          const matchedSignal = signals.find((s: any) => s.keyword.toLowerCase() === k.word.toLowerCase());
          if (matchedSignal && matchedSignal.trendScore > 0.6) {
            keywordTrendMatchCount++;
          }
        });
      });

      if (totalGoogleKws > 0) {
        const trendRatio = keywordTrendMatchCount / totalGoogleKws;
        adaptability = 60.0 + (trendRatio * 40.0);
      } else {
        adaptability = 80.0;
      }
    }
  }

  if (input.reflectionQualityScore !== undefined) {
    adaptability = (adaptability * 0.7) + (input.reflectionQualityScore * 0.3);
  }

  return {
    seoScore: parseFloat(seoScore.toFixed(2)),
    googleAdsScore: parseFloat(googleAdsScore.toFixed(2)),
    metaAdsScore: parseFloat(metaAdsScore.toFixed(2)),
    budgetScore: parseFloat(budgetScore.toFixed(2)),
    revenueScore: parseFloat(revenueScore.toFixed(2)),
    strategicAlignment: parseFloat(strategicAlignment.toFixed(2)),
    efficiencyRoi: parseFloat(efficiencyRoi.toFixed(2)),
    budgetDiscipline: parseFloat(budgetDiscipline.toFixed(2)),
    riskManagement: parseFloat(riskManagement.toFixed(2)),
    adaptability: parseFloat(adaptability.toFixed(2)),
  };
}

