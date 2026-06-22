import { prisma } from '../../db/client';
import { SeededRandom } from '../../utils/deterministic-random';
import { logger } from '../../utils/logger';
import { calculateDomainAuthority, calculatePageAuthority } from '../seo/authority-calc';
import { calculateOrganicRank } from '../seo/ranking-engine';
import { calculateOrganicTraffic } from '../seo/traffic-model';
import { calculateQualityScore } from '../ads/google/quality-score';
import { runGoogleAuction } from '../ads/google/auction';
import { paceDailyBudget } from '../ads/google/budget-pacer';
import { runMetaAuction } from '../ads/meta/auction';
import { calculateDimensionScores } from '../scoring/dimensions';
import { calculateCompositeIndex } from '../scoring/composite-index';
import { calculatePercentile } from '../scoring/percentile';
import { getDailyMarketTrends, NormalizedTrendSignal } from '../trends/providers';
import { createNotification, logActivity } from '../../utils/audit';
import { validateAdPolicy } from '../ads/policy-validator';

export async function processDailySimulationStep(campaignRunId: string): Promise<any> {
  logger.info({ campaignRunId }, 'Starting daily simulation step processing');

  const run = await prisma.campaignRun.findUnique({
    where: { id: campaignRunId },
    include: {
      user: true,
      scenario: true,
      assignment: true,
      class: {
        include: {
          students: true,
        },
      },
      decisions: {
        orderBy: { dayNumber: 'desc' },
      },
    },
  });

  if (!run) {
    throw new Error('Campaign run not found.');
  }

  if (run.status !== 'ACTIVE') {
    throw new Error(`Campaign run status is ${run.status}. Cannot process daily step.`);
  }

  const currentDay = run.currentDay;
  const totalDays = run.durationDays;

  // 1. Fetch student's decision for today.
  let decision = run.decisions.find(d => d.dayNumber === currentDay);
  if (!decision) {
    // Fallback: copy previous day's decision or create defaults
    const previousDecision = run.decisions.find(d => d.dayNumber === currentDay - 1);
    decision = await prisma.dailyCampaignDecision.create({
      data: {
        campaignRunId,
        userId: run.userId,
        dayNumber: currentDay,
        seoSettingsJson: previousDecision?.seoSettingsJson ?? {
          targetKeywords: ['digital marketing', 'business growth'],
          contentQuality: 5.0,
          backlinkBudget: 10.0,
          metaTitle: 'SimLab E-Store',
          metaDescription: 'Shop SimLab premium items',
          h1Header: 'SimLab Digital Shop',
          bodyContent: 'SimLab products for everyone.',
        },
        googleAdsSettingsJson: previousDecision?.googleAdsSettingsJson ?? { campaigns: [] },
        metaAdsSettingsJson: previousDecision?.metaAdsSettingsJson ?? { campaigns: [] },
        budgetJson: previousDecision?.budgetJson ?? { totalAllocated: run.assignment?.dailyBudgetCap ?? run.scenario.dailyBudgetCap },
        submittedAt: new Date(),
        lockedAt: new Date(),
      },
    });
  }

  // Parse Settings JSON safely
  const seoSettings = decision.seoSettingsJson as any;
  const googleAdsSettings = decision.googleAdsSettingsJson as any;
  const metaAdsSettings = decision.metaAdsSettingsJson as any;

  // Find matching simulationState
  const simState = await prisma.simulationState.findFirst({
    where: { userId: run.userId, classId: run.classId }
  });
  const simStateId = simState?.id || campaignRunId;

  // Policy & Budget Hard Violations Check
  const totalAllocatedBudget = (googleAdsSettings.campaigns || []).reduce((sum: number, c: any) => sum + (c.budget || 0), 0) +
                               (metaAdsSettings.campaigns || []).reduce((sum: number, c: any) => sum + (c.budget || 0), 0) +
                               (seoSettings.backlinkBudget || 0);

  const scenarioBudgetCap = run.assignment?.dailyBudgetCap ?? run.scenario.dailyBudgetCap;
  if (totalAllocatedBudget > scenarioBudgetCap) {
    await prisma.hardViolation.create({
      data: {
        simulationId: simStateId,
        roundNumber: currentDay,
        type: 'BUDGET_EXCEEDED',
        severity: 'CRITICAL',
        message: `Daily campaign spend of $${totalAllocatedBudget.toFixed(2)} exceeds the allowed daily cap of $${scenarioBudgetCap.toFixed(2)}.`
      }
    });
  }

  // Call policy validator for Google Ads campaigns
  const googleSoftViolationsCount: Record<string, number> = {};
  for (const camp of googleAdsSettings.campaigns || []) {
    const violations = validateAdPolicy(camp, 'GOOGLE_ADS');
    let softCount = 0;
    for (const v of violations) {
      if (v.severity === 'BLOCKING') {
        await prisma.hardViolation.create({
          data: {
            simulationId: simStateId,
            roundNumber: currentDay,
            studentId: run.userId,
            type: v.type,
            severity: 'BLOCKING',
            message: `[Google Ads: ${camp.name}] ${v.message}`,
            source: 'GOOGLE_ADS'
          }
        });
        await logActivity(run.userId, 'HARD_POLICY_VIOLATION', `Hard violation: ${v.message} in Google Ads campaign "${camp.name}"`);
      } else {
        softCount++;
        await logActivity(run.userId, 'SOFT_POLICY_WARNING', `Soft warning: ${v.message} in Google Ads campaign "${camp.name}"`);
      }
    }
    googleSoftViolationsCount[camp.name] = softCount;
  }

  // Call policy validator for Meta Ads campaigns
  const metaSoftViolationsCount: Record<string, number> = {};
  for (const camp of metaAdsSettings.campaigns || []) {
    const violations = validateAdPolicy(camp, 'META_ADS');
    let softCount = 0;
    for (const v of violations) {
      if (v.severity === 'BLOCKING') {
        await prisma.hardViolation.create({
          data: {
            simulationId: simStateId,
            roundNumber: currentDay,
            studentId: run.userId,
            type: v.type,
            severity: 'BLOCKING',
            message: `[Meta Ads: ${camp.name}] ${v.message}`,
            source: 'META_ADS'
          }
        });
        await logActivity(run.userId, 'HARD_POLICY_VIOLATION', `Hard violation: ${v.message} in Meta Ads campaign "${camp.name}"`);
      } else {
        softCount++;
        await logActivity(run.userId, 'SOFT_POLICY_WARNING', `Soft warning: ${v.message} in Meta Ads campaign "${camp.name}"`);
      }
    }
    metaSoftViolationsCount[camp.name] = softCount;
  }

  // Extract unique keywords targeted
  const seoKeywords = seoSettings.targetKeywords || [];
  const googleKeywords: string[] = [];
  (googleAdsSettings.campaigns || []).forEach((c: any) => {
    (c.keywords || []).forEach((k: any) => {
      if (k.word && !googleKeywords.includes(k.word)) {
        googleKeywords.push(k.word);
      }
    });
  });

  const allKeywords = Array.from(new Set([...seoKeywords, ...googleKeywords, run.scenario.industry]));

  // 2. Fetch/Create Trend Snapshot for today
  let trendSnapshot = await prisma.trendSnapshot.findFirst({
    where: { campaignRunId, dayNumber: currentDay },
  });

  let trendSignals: NormalizedTrendSignal[] = [];

  if (!trendSnapshot) {
    try {
      trendSignals = await getDailyMarketTrends({
        scenarioName: run.scenario.name,
        industry: run.scenario.industry,
        location: run.scenario.location,
        keywords: allKeywords,
        campaignRunId,
        dayNumber: currentDay,
      });
    } catch (err) {
      logger.error(err, 'Failed to fetch daily market trends. Using fallback provider directly.');
      // Execute fallback provider directly
      const { FallbackTrendProvider } = await import('../trends/providers');
      const fallbackProvider = new FallbackTrendProvider();
      trendSignals = await fallbackProvider.fetchTrend({
        scenarioName: run.scenario.name,
        industry: run.scenario.industry,
        location: run.scenario.location,
        keywords: allKeywords,
      });
    }

    const confidence = trendSignals.length > 0
      ? trendSignals.reduce((sum, s) => sum + s.confidenceScore, 0) / trendSignals.length
      : 1.0;

    trendSnapshot = await prisma.trendSnapshot.create({
      data: {
        campaignRunId,
        scenarioId: run.scenarioId,
        dayNumber: currentDay,
        industry: run.scenario.industry,
        location: run.scenario.location,
        source: trendSignals.length > 0 ? trendSignals[0].source : 'FALLBACK',
        confidenceScore: confidence,
        trendDataJson: JSON.stringify(trendSignals),
        rawPayloadJson: JSON.stringify(trendSignals.map(s => s.rawPayloadHash)),
        fetchedAt: new Date(),
      },
    });
  } else {
    trendSignals = JSON.parse(trendSnapshot.trendDataJson as string);
  }

  // Define unique seed: classId/runId + dayNumber
  const seed = `${run.classId || run.id}-${currentDay}`;
  const random = new SeededRandom(seed);

  // 3. Map trend indicators to Market Conditions
  const demandIndex = trendSignals.reduce((sum, s) => sum + s.demandIndex, 0) / (trendSignals.length || 1);
  const competitionIndex = trendSignals.reduce((sum, s) => sum + s.competitionIndex, 0) / (trendSignals.length || 1);
  const cpcPressure = trendSignals.reduce((sum, s) => sum + s.cpcIndex, 0) / (trendSignals.length || 1);
  const cpmPressure = trendSignals.reduce((sum, s) => sum + s.cpmIndex, 0) / (trendSignals.length || 1);
  const seasonalityIndex = trendSignals.reduce((sum, s) => sum + s.seasonalityIndex, 0) / (trendSignals.length || 1);
  const trendMomentum = trendSignals.reduce((sum, s) => sum + s.trendMomentum, 0) / (trendSignals.length || 1);

  const mc = {
    demandIndex: demandIndex * (1 + trendMomentum),
    competitionIndex,
    cpcPressure,
    cpmPressure,
    conversionIntent: 1.0 + (trendMomentum * 0.5),
    seasonalImpact: seasonalityIndex,
    newsImpact: 1.0,
    socialBuzzImpact: 1.0,
    platformModifiers: { SEO: 1.0, GOOGLE_ADS: 1.0, META_ADS: 1.0 },
  };

  // 4. Run SEO daily simulation
  const baseDA = 15;
  const prevDecisions = run.decisions.filter(d => d.dayNumber < currentDay);
  const cumulativeBacklinkSpend = prevDecisions.reduce((sum, d) => sum + ((d.seoSettingsJson as any).backlinkBudget || 0), 0) + (seoSettings.backlinkBudget || 0);
  const studentDA = calculateDomainAuthority(cumulativeBacklinkSpend, baseDA);
  const studentPA = calculatePageAuthority(seoSettings.contentQuality || 5.0, studentDA);

  let consecutiveSEOActiveRounds = 0;
  for (let d = currentDay - 1; d >= 1; d--) {
    const prevDec = prevDecisions.find(pd => pd.dayNumber === d);
    if (prevDec && (prevDec.seoSettingsJson as any).backlinkBudget > 0) {
      consecutiveSEOActiveRounds++;
    } else {
      break;
    }
  }

  const competitorsSEO = [
    { name: 'Direct Competitor X', pageAuthority: 45, domainAuthority: 50 },
    { name: 'SEO Authority Hub', pageAuthority: 60, domainAuthority: 65 },
  ];

  let organicImpressions = 0;
  let organicClicks = 0;
  let organicConversions = 0;
  const seoKeywordsRanks: number[] = [];

  seoKeywords.forEach((kw: string) => {
    let searchVolume = (400 + (kw.length * 120)) * mc.demandIndex * mc.seasonalImpact;
    if (searchVolume > 5000) searchVolume = 5000;

    const difficulty = (kw.length * 8) % 70 + 20;

    const rank = calculateOrganicRank({
      keyword: kw,
      pageAuthority: studentPA,
      domainAuthority: studentDA,
      relevanceScore: 0.85,
      competitors: competitorsSEO,
      keywordDifficulty: difficulty,
      contentQuality: seoSettings.contentQuality || 5.0,
      backlinkBudget: seoSettings.backlinkBudget || 0.0,
      technicalScore: 80.0,
      previousBehavior: {
        cumulativeBacklinkSpend,
        consecutiveSEOActiveRounds,
      },
      round: currentDay,
    }, random);

    seoKeywordsRanks.push(rank);

    const traffic = calculateOrganicTraffic({
      rank,
      searchVolume: Math.round(searchVolume * 0.15),
      conversionRate: 0.025 * mc.conversionIntent,
    });

    organicImpressions += traffic.impressions;
    organicClicks += traffic.clicks;
    organicConversions += traffic.conversions;
  });

  // 5. Run Google Ads daily simulation
  let googleImpressions = 0;
  let googleClicks = 0;
  let googleCost = 0;
  let googleConversions = 0;

  const googleAdvertisers = (googleAdsSettings.campaigns || []).flatMap((campaign: any) => {
    const dailyCampaignBudget = campaign.budget || 0;
    const cKeywords = campaign.keywords || [];
    const obj = campaign.objective || 'Sales';
    const bidStrategy = campaign.biddingStrategy || 'Manual CPC';
    const adCopy = campaign.adCopy || { headline1: 'Get ' + run.scenario.name, headline2: 'Best deals online', headline3: 'Shop now', description1: 'Quality products', description2: 'Fast shipping' };
    const landingPage = campaign.landingPage || { pageRelevance: 7, mobileFriendly: 8, pageSpeed: 7, trustSignals: 8, offerClarity: 7, conversionReadiness: 8 };

    return cKeywords.map((kwBid: any) => {
      const mockRivals = [
        { id: 'rival-1', name: 'Rival Brand A', bid: random.nextFloat(0.5, 2.5), qualityScore: random.nextInt(4, 9), dailyBudget: dailyCampaignBudget * 1.2 },
        { id: 'rival-2', name: 'Rival Brand B', bid: random.nextFloat(0.8, 3.0), qualityScore: random.nextInt(5, 8), dailyBudget: dailyCampaignBudget * 0.8 },
      ];

      let qs = calculateQualityScore(adCopy, kwBid.word, landingPage);

      // Apply soft violations penalty (Quality Score reduction)
      const campaignSoftCount = googleSoftViolationsCount[campaign.name] || 0;
      if (campaignSoftCount > 0) {
        qs = Math.max(1, qs - (2.0 * campaignSoftCount));
      }

      // Extensions modifier
      const extensions = campaign.extensions || {};
      const validSitelinks = (extensions.sitelinks || []).filter((s: any) => s && s.title && s.title.trim().length > 0);
      const validCallouts = (extensions.callouts || []).filter((c: any) => typeof c === 'string' && c.trim().length > 0);
      const validStructuredSnippets = (extensions.structuredSnippets || []).filter((c: any) => typeof c === 'string' && c.trim().length > 0);
      const hasPromo = extensions.promotion && extensions.promotion.item && extensions.promotion.item.trim().length > 0;
      const hasLead = extensions.leadForm && extensions.leadForm.title && extensions.leadForm.title.trim().length > 0;
      const hasCall = extensions.callExtension && extensions.callExtension.trim().length > 0;

      // Sitelinks: up to 4, +0.25 Quality Score each, +2% CTR multiplier each
      // Callouts: up to 4, +0.125 Quality Score each, +1% CTR multiplier each
      // Structured snippets: up to 4, +0.125 Quality Score each, +1% CTR multiplier each
      // Promotion: if present/valid, +0.25 Quality Score, +2% CTR multiplier
      // Lead form: if present/valid, +0.25 Quality Score, +2% CTR multiplier
      // Call extension: if present/valid, +0.125 Quality Score, +1% CTR multiplier
      let qsBonus = (validSitelinks.length * 0.25) + (validCallouts.length * 0.125) + (validStructuredSnippets.length * 0.125);
      if (hasPromo) qsBonus += 0.25;
      if (hasLead) qsBonus += 0.25;
      if (hasCall) qsBonus += 0.125;

      qs = Math.min(10, qs + qsBonus);

      let ctrModifier = 1.0 + (validSitelinks.length * 0.02) + (validCallouts.length * 0.01) + (validStructuredSnippets.length * 0.01);
      if (hasPromo) ctrModifier += 0.02;
      if (hasLead) ctrModifier += 0.02;
      if (hasCall) ctrModifier += 0.01;

      // Penalize CTR slightly for soft violations
      if (campaignSoftCount > 0) {
        ctrModifier = Math.max(0.5, ctrModifier - (0.1 * campaignSoftCount));
      }

      const studentBidder = {
        id: 'student',
        name: 'Student Campaign',
        bid: kwBid.bid || 1.0,
        qualityScore: qs,
        dailyBudget: dailyCampaignBudget,
        matchType: kwBid.matchType || 'broad',
        objective: obj,
        campaignType: 'Search',
        biddingStrategy: bidStrategy,
        negativeKeywordsCount: (campaign.negativeKeywords || []).length,
        landingPageExperience: (landingPage.pageRelevance + landingPage.mobileFriendly + landingPage.pageSpeed + landingPage.trustSignals + landingPage.offerClarity + landingPage.conversionReadiness) / 6,
        ctrModifier
      };

      const auctionResults = runGoogleAuction(
        kwBid.word,
        800, // Daily search volume baseline
        [studentBidder, ...mockRivals],
        0.025 * mc.conversionIntent,
        random,
        mc as any
      );

      const studentRes = auctionResults.find(r => r.id === 'student');
      if (studentRes) {
        return {
          ...studentRes,
          dailyCampaignBudget,
        };
      }
      return null;
    }).filter(Boolean);
  });

  googleAdvertisers.forEach((res: any) => {
    // Daily auction output is already paced per day
    const paced = paceDailyBudget(res.dailyCampaignBudget, {
      impressions: res.impressions,
      clicks: res.clicks,
      cost: res.cost * (res.cpcPressure || 1.0),
      conversions: res.conversions,
    });

    googleImpressions += paced.impressions;
    googleClicks += paced.clicks;
    googleCost += paced.cost;
    googleConversions += paced.conversions;
  });

  // 6. Run Meta Ads daily simulation
  let metaImpressions = 0;
  let metaClicks = 0;
  let metaCost = 0;
  let metaConversions = 0;

  const audienceSizes = {
    'business-owners': 800000,
    'tech-enthusiasts': 1200000,
    'fashion-lifestyle': 1500000,
    'general-broad': 3000000,
  };

  let isSameCreative = false;
  if (currentDay > 1 && prevDecisions.length > 0) {
    const lastDec = prevDecisions[prevDecisions.length - 1];
    try {
      const prevMeta = (lastDec.metaAdsSettingsJson as any).campaigns?.[0];
      const currMeta = metaAdsSettings.campaigns?.[0];
      if (prevMeta && currMeta && prevMeta.creative && currMeta.creative) {
        isSameCreative = (prevMeta.creative.headline === currMeta.creative.headline &&
                          prevMeta.creative.primaryText === currMeta.creative.primaryText);
      }
    } catch (e) {
      // ignore
    }
  }

  const metaAdvertisers = (metaAdsSettings.campaigns || []).map((camp: any) => {
    const adCopy = camp.creative || { headline: 'Discover ' + run.scenario.name, primaryText: 'Shop the future today.' };
    let creativeQuality = Math.max(1, Math.min(10, Math.round((camp.creativeQuality || 80) / 10))) || 8;

    // Apply soft violations penalty
    const campaignSoftCount = metaSoftViolationsCount[camp.name] || 0;
    if (campaignSoftCount > 0) {
      creativeQuality = Math.max(1, creativeQuality - (2 * campaignSoftCount));
    }

    return {
      id: 'student',
      name: camp.name,
      budget: camp.budget || 0,
      audienceInterest: camp.audienceInterest || 'general-broad',
      bidType: camp.bidType || 'LOWEST_COST',
      bidAmount: camp.bidAmount || 0,
      placement: camp.placement || 'auto',
      creativeQuality,
      objective: camp.objective || 'sales',
      isSameCreative,
      roundNumber: currentDay,
    };
  });

  const totalMetaBudget = (metaAdsSettings.campaigns || []).reduce((sum: number, c: any) => sum + (c.budget || 0), 0);

  if (metaAdvertisers.length > 0) {
    const results = runMetaAuction(
      metaAdvertisers,
      audienceSizes,
      0.025 * mc.conversionIntent,
      random,
      mc as any
    );

    const studentRes = results.find(r => r.id === 'student');
    if (studentRes) {
      metaImpressions = studentRes.impressions;
      metaClicks = studentRes.clicks;
      metaCost = Math.min(studentRes.cost, totalMetaBudget);
      metaConversions = studentRes.conversions;
    }
  }

  // 7. Collate Financial Totals
  const dailySpend = (seoSettings.backlinkBudget || 0) + googleCost + metaCost;
  const totalConversions = organicConversions + googleConversions + metaConversions;
  const averagePricePoint = 100.0; // Benchmark revenue price point
  const dailyRevenue = totalConversions * averagePricePoint;

  const totalGoogleConversions = googleConversions;
  const totalMetaConversions = metaConversions;

  // 8. Perform Scoring using calculateDimensionScores
  // Map daily totals to DimensionScores
  const dailyScores = calculateDimensionScores({
    seoKeywordsRanks,
    googleAdsCost: googleCost,
    googleAdsRevenue: totalGoogleConversions * averagePricePoint,
    metaAdsCost: metaCost,
    metaAdsRevenue: totalMetaConversions * averagePricePoint,
    allocatedRoundBudget: run.assignment?.dailyBudgetCap ?? run.scenario.dailyBudgetCap,
    totalRoundSpend: dailySpend,
    totalRoundRevenue: dailyRevenue,
    decision,
    scenario: run.scenario,
    marketCondition: { signals: JSON.stringify(trendSignals) },
    prevDecisions,
    prevScoreBreakdowns: [], // Simulating independent day scores
    googleConversions: totalGoogleConversions,
    metaConversions: totalMetaConversions,
    googleClicks,
    metaClicks,
    googleImpressions,
    metaImpressions,
  });

  const compositeScore = calculateCompositeIndex(dailyScores);

  // 9. Save Daily Campaign Result
  const result = await prisma.dailyCampaignResult.create({
    data: {
      campaignRunId,
      userId: run.userId,
      dayNumber: currentDay,
      trendSnapshotId: trendSnapshot.id,
      impressions: organicImpressions + googleImpressions + metaImpressions,
      clicks: organicClicks + googleClicks + metaClicks,
      ctr: (organicImpressions + googleImpressions + metaImpressions) > 0
        ? (organicClicks + googleClicks + metaClicks) / (organicImpressions + googleImpressions + metaImpressions)
        : 0.0,
      cpc: (googleClicks + metaClicks) > 0 ? (googleCost + metaCost) / (googleClicks + metaClicks) : 0.0,
      cpa: totalConversions > 0 ? dailySpend / totalConversions : 0.0,
      conversions: totalConversions,
      revenue: dailyRevenue,
      spend: dailySpend,
      roas: dailySpend > 0 ? dailyRevenue / dailySpend : 0.0,
      seoTraffic: organicClicks,
      seoRank: seoKeywordsRanks.length > 0 ? Math.round(seoKeywordsRanks.reduce((s, r) => s + r, 0) / seoKeywordsRanks.length) : 0,
      authorityScore: studentDA,
      metaReach: Math.round(metaImpressions * 0.7),
      metaEngagement: Math.round(metaClicks * 1.5),
      googleAdsScore: dailyScores.googleAdsScore,
      metaAdsScore: dailyScores.metaAdsScore,
      seoScore: dailyScores.seoScore,
      compositeScore,
      generatedAt: new Date(),
    },
  });

  // 10. Generate Tomorrow's Action Recommendations
  const recommendations = [];
  if (dailyScores.seoScore < 75) {
    recommendations.push({
      campaignRunId,
      dayNumber: currentDay,
      recommendationType: 'SEO',
      message: 'Your organic search ranking is low. Focus on increasing your Backlink Budget and optimizing Content Quality to improve domain authority.',
      priority: 'HIGH',
      expectedImpact: 'Improves Domain Authority (+5 DA) and Google Search Traffic.',
    });
  }

  if (googleCost > 0 && dailyScores.googleAdsScore < 60) {
    recommendations.push({
      campaignRunId,
      dayNumber: currentDay,
      recommendationType: 'GOOGLE_ADS',
      message: 'Google Ads ROAS is below benchmark. Audit your Ad Headline relevancy and lower bid limits on non-converting keywords.',
      priority: 'HIGH',
      expectedImpact: 'Reduces Google CPC and improves Conversion Intent.',
    });
  }

  if (metaCost > 0 && dailyScores.metaAdsScore < 60) {
    recommendations.push({
      campaignRunId,
      dayNumber: currentDay,
      recommendationType: 'META_ADS',
      message: 'Creative fatigue detected. Update your Meta Ads ad text and primary graphics to revive CTR.',
      priority: 'MEDIUM',
      expectedImpact: 'Increases Meta Click-Through-Rate (+0.5% CTR).',
    });
  }

  if (dailySpend > run.scenario.dailyBudgetCap) {
    recommendations.push({
      campaignRunId,
      dayNumber: currentDay,
      recommendationType: 'BUDGET',
      message: 'Daily spend exceeded the scenario cap. Optimize bid strategies to maintain continuous ad exposure.',
      priority: 'HIGH',
      expectedImpact: 'Ensures optimal daily budget pacing and avoids mid-day outages.',
    });
  }

  // Fallback default recommendation
  if (recommendations.length === 0) {
    recommendations.push({
      campaignRunId,
      dayNumber: currentDay,
      recommendationType: 'BUDGET',
      message: 'Your campaigns are performing optimally. Continue monitoring query trends and adapt budgets accordingly.',
      priority: 'LOW',
      expectedImpact: 'Maintains steady performance scores.',
    });
  }

  await Promise.all(
    recommendations.map(rec =>
      prisma.dailyCampaignRecommendation.create({
        data: rec,
      })
    )
  );

  // 11. Evaluate Completion or Advance Day
  const isFinalDay = currentDay === totalDays;
  const nextStatus = isFinalDay ? 'COMPLETED' : 'ACTIVE';

  let nextProcessingAt = new Date(Date.now() + 24 * 3600 * 1000);
  if (run.assignment?.dailyProcessingTime) {
    const [hours, minutes] = run.assignment.dailyProcessingTime.split(':').map(Number);
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(hours, minutes, 0, 0);
    nextProcessingAt = nextDay;
  }

  const updatedRun = await prisma.campaignRun.update({
    where: { id: campaignRunId },
    data: {
      currentDay: isFinalDay ? currentDay : currentDay + 1,
      status: nextStatus,
      lastProcessedAt: new Date(),
      nextProcessingAt,
    },
  });

  // Calculate final score if campaign completed
  if (isFinalDay) {
    const allResults = await prisma.dailyCampaignResult.findMany({
      where: { campaignRunId },
    });
    const finalScore = allResults.reduce((sum, r) => sum + r.compositeScore, 0) / (allResults.length || 1);

    logger.info({ campaignRunId, finalScore }, 'Daily campaign completed successfully!');

    // Trigger completion notifications
    await createNotification(
      run.userId,
      'achievement',
      'Daily Campaign Completed',
      `Congratulations! You finished your ${totalDays}-day marketing campaign with a final score of ${finalScore.toFixed(1)}%.`,
      'System',
      '/campaign/timeline'
    );

    if (run.assignmentId) {
      await prisma.scenarioAssignmentStudent.updateMany({
        where: { assignmentId: run.assignmentId, studentId: run.userId },
        data: { status: 'COMPLETED', completedAt: new Date() }
      });
    }
  }

  // Notify student
  await createNotification(
    run.userId,
    'success',
    'Daily Processing Complete',
    `Day ${currentDay} metrics have been simulated. Review your daily report now!`,
    'System',
    `/campaign/results/day/${currentDay}`
  );

  // Update cohort leaderboard if classId exists
  if (run.classId) {
    const aggregatedResults = await prisma.dailyCampaignResult.aggregate({
      where: { campaignRunId },
      _avg: { compositeScore: true },
      _sum: { spend: true, revenue: true }
    });
    const finalScoreVal = aggregatedResults._avg.compositeScore || compositeScore;
    const finalSpend = aggregatedResults._sum.spend || 0;
    const finalRevenue = aggregatedResults._sum.revenue || 0;

    await prisma.simulationState.updateMany({
      where: { userId: run.userId, classId: run.classId },
      data: {
        score: finalScoreVal,
        cumulativeSpend: finalSpend,
        cumulativeRevenue: finalRevenue,
        status: isFinalDay ? 'SCORE_LOCKED' : 'DECISION_OPEN',
        isCompleted: isFinalDay,
      }
    });
  }

  return {
    success: true,
    dayProcessed: currentDay,
    compositeScore,
    isCompleted: isFinalDay,
    resultId: result.id,
  };
}
