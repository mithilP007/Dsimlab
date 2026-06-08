import { prisma } from '../../db/client';
import { SeededRandom } from '../../utils/deterministic-random';
import { logger } from '../../utils/logger';
import { SimulationError } from '../../utils/errors';
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
import { rollForEvents } from '../events/trigger';
import { calculateEventImpacts } from '../events/impact';
import { advanceRoundState, validateStateTransition, SimulationStatus } from './state-machine';
import { captureRoundSnapshot } from './snapshot';
import { calculateStrategicConsistency } from '../certificate/eligibility';
import { trendClient } from '../trends/trend-client';
import { marketSignalBuilder } from '../trends/market-signal-builder';

/**
 * Orchestrates advancing a simulation round for a student
 */
export async function processSimulationRound(simulationId: string): Promise<any> {
  logger.info({ simulationId }, 'Starting simulation round processing');

  const sim = await prisma.simulationState.findUnique({
    where: { id: simulationId },
    include: {
      class: {
        include: {
          scenario: true,
          students: true,
        },
      },
      decisions: {
        orderBy: { round: 'desc' },
        take: 1,
      },
    },
  });

  if (!sim) {
    throw new SimulationError('Simulation state not found.');
  }

  if (sim.status !== 'LOCKED') {
    throw new SimulationError('Simulation is not locked. Cannot process round.');
  }

  // Validate and transition LOCKED -> PROCESSING
  validateStateTransition(SimulationStatus.LOCKED, SimulationStatus.PROCESSING);
  await prisma.simulationState.update({
    where: { id: simulationId },
    data: { status: 'PROCESSING' }
  });

  const currentRound = sim.currentRound;
  if (sim.isCompleted) {
    throw new SimulationError('Simulation is already completed.');
  }

  // Find decisions for the current round
  let decision = sim.decisions.find(d => d.round === currentRound);
  if (!decision) {
    // Fallback default decisions if student failed to submit in time
    decision = await prisma.decision.create({
      data: {
        simulationId,
        round: currentRound,
        seoTargetKeywords: JSON.stringify(['digital marketing', 'business growth']),
        seoContentQuality: 5.0,
        seoBacklinkBudget: 100.0,
        googleCampaigns: JSON.stringify([]),
        metaCampaigns: JSON.stringify([]),
        submitted: true,
      },
    });
  }

  // Define unique seed: classId + round, so all classmates share same scenario conditions
  const seed = `${sim.classId}-${currentRound}`;
  const random = new SeededRandom(seed);

  // 1. Roll market events
  const rolledEvents = rollForEvents(random);
  
  // Find manually triggered events by instructor
  const existingEvents = await prisma.marketEvent.findMany({
    where: { simulationId, round: currentRound }
  });

  // Combine them, ensuring no duplicates by name
  const allEvents = [...existingEvents];
  rolledEvents.forEach(evt => {
    if (!allEvents.some(e => e.name === evt.name)) {
      allEvents.push({
        id: evt.id,
        simulationId,
        round: currentRound,
        name: evt.name,
        description: evt.description,
        type: evt.type,
        impactMultiplier: evt.impactMultiplier,
        createdAt: new Date()
      } as any);
    }
  });

  // Save new rolled events to DB
  const newEventsToSave = rolledEvents.filter(te => !existingEvents.some(ee => ee.name === te.name));
  await Promise.all(
    newEventsToSave.map(evt =>
      prisma.marketEvent.create({
        data: {
          simulationId,
          round: currentRound,
          name: evt.name,
          description: evt.description,
          type: evt.type,
          impactMultiplier: evt.impactMultiplier,
        },
      })
    )
  );

  const impacts = calculateEventImpacts(allEvents);

  // 2. Parse Decisions
  let keywords: string[] = [];
  let googleCampaigns: any[] = [];
  let metaCampaigns: any[] = [];

  try {
    keywords = JSON.parse(decision.seoTargetKeywords);
    googleCampaigns = JSON.parse(decision.googleCampaigns);
    metaCampaigns = JSON.parse(decision.metaCampaigns);
  } catch (err) {
    logger.error({ err }, 'Error parsing decision inputs');
  }

  // Gather all unique keywords across SEO and Google Ads for the search trend API
  const googleKeywords: string[] = [];
  googleCampaigns.forEach((c: any) => {
    if (c.keywords) {
      c.keywords.forEach((k: any) => {
        if (k.word && !googleKeywords.includes(k.word)) {
          googleKeywords.push(k.word);
        }
      });
    }
  });
  
  const combinedKeywords = Array.from(new Set([
    ...keywords,
    ...googleKeywords,
    sim.class.scenario.industry
  ]));

  // Fetch/Build Real-Time Trend & Market Condition Snapshots
  const scenario = sim.class.scenario;
  let trendSnapshot = await prisma.trendSnapshot.findFirst({
    where: { simulationId, roundNumber: currentRound }
  });

  let marketCondition = await prisma.marketConditionSnapshot.findFirst({
    where: { simulationId, roundNumber: currentRound }
  });

  if (!trendSnapshot || scenario.refreshTrendEveryRound) {
    const trendSignals = await trendClient.fetchTrends({
      scenarioName: scenario.name,
      industry: scenario.industry,
      location: scenario.location || 'Global',
      keywords: combinedKeywords,
      platforms: ['SEO', 'GOOGLE_ADS', 'META_ADS'],
      date: new Date()
    });

    const confidence = trendSignals.length > 0
      ? trendSignals.reduce((sum, s) => sum + s.confidence, 0) / trendSignals.length
      : 1.0;

    if (trendSnapshot) {
      trendSnapshot = await prisma.trendSnapshot.update({
        where: { id: trendSnapshot.id },
        data: {
          signals: JSON.stringify(trendSignals),
          sources: JSON.stringify(trendSignals.flatMap(s => s.sources)),
          confidence,
          fetchedAt: new Date()
        }
      });
    } else {
      trendSnapshot = await prisma.trendSnapshot.create({
        data: {
          simulationId,
          roundNumber: currentRound,
          scenarioId: scenario.id,
          industry: scenario.industry,
          location: scenario.location || 'Global',
          platform: 'SEO,GOOGLE_ADS,META_ADS',
          signals: JSON.stringify(trendSignals),
          sources: JSON.stringify(trendSignals.flatMap(s => s.sources)),
          confidence,
          fetchedAt: new Date()
        }
      });
    }

    const marketConditionData = marketSignalBuilder.buildMarketConditions({
      simulationId,
      roundNumber: currentRound,
      signals: trendSignals
    });

    if (marketCondition) {
      marketCondition = await prisma.marketConditionSnapshot.update({
        where: { id: marketCondition.id },
        data: {
          demandIndex: marketConditionData.demandIndex,
          competitionIndex: marketConditionData.competitionIndex,
          cpcPressure: marketConditionData.cpcPressure,
          cpmPressure: marketConditionData.cpmPressure,
          conversionIntent: marketConditionData.conversionIntent,
          seasonalImpact: marketConditionData.seasonalImpact,
          newsImpact: marketConditionData.newsImpact,
          platformModifiers: JSON.stringify(marketConditionData.platformModifiers)
        }
      });
    } else {
      marketCondition = await prisma.marketConditionSnapshot.create({
        data: {
          simulationId,
          roundNumber: currentRound,
          demandIndex: marketConditionData.demandIndex,
          competitionIndex: marketConditionData.competitionIndex,
          cpcPressure: marketConditionData.cpcPressure,
          cpmPressure: marketConditionData.cpmPressure,
          conversionIntent: marketConditionData.conversionIntent,
          seasonalImpact: marketConditionData.seasonalImpact,
          newsImpact: marketConditionData.newsImpact,
          platformModifiers: JSON.stringify(marketConditionData.platformModifiers)
        }
      });
    }
  }

  // At this point marketCondition is guaranteed to exist (created in block above)
  // Provide a safe typed fallback in case it is still null (e.g. on first run race condition)
  const mc = marketCondition ?? {
    demandIndex: 1.0,
    competitionIndex: 1.0,
    cpcPressure: 1.0,
    cpmPressure: 1.0,
    conversionIntent: 1.0,
    seasonalImpact: 1.0,
    newsImpact: 1.0,
    platformModifiers: '{"SEO":1.0,"GOOGLE_ADS":1.0,"META_ADS":1.0}'
  };

  // Parse platform modifiers
  const platformMods = typeof mc.platformModifiers === 'string'
    ? JSON.parse(mc.platformModifiers as string)
    : (mc.platformModifiers as any);

  // Compute DA and PA
  const baseDA = 15; // Starting DA benchmark
  // Fetch previous SEO decisions to count cumulative backlink spend
  const prevDecisions = await prisma.decision.findMany({
    where: { simulationId, round: { lt: currentRound } }
  });
  const cumulativeBacklinkSpend = prevDecisions.reduce((sum, d) => sum + d.seoBacklinkBudget, 0) + decision.seoBacklinkBudget;
  const studentDA = calculateDomainAuthority(cumulativeBacklinkSpend, baseDA);
  const studentPA = calculatePageAuthority(decision.seoContentQuality, studentDA);

  // Calculate consecutive active rounds for compounding bonus
  let consecutiveSEOActiveRounds = 0;
  for (let r = currentRound - 1; r >= 1; r--) {
    const prevDec = prevDecisions.find(pd => pd.round === r);
    if (prevDec && prevDec.seoBacklinkBudget > 0) {
      consecutiveSEOActiveRounds++;
    } else {
      break;
    }
  }

  // 3. Simulated SEO Rankings & Traffic
  // Pre-seed competitors for SEO evaluation
  const competitorsSEO = [
    { name: 'Alpha Agency', pageAuthority: 55, domainAuthority: 60 },
    { name: 'Direct Market Corp', pageAuthority: 40, domainAuthority: 45 },
    { name: 'Slick Digital', pageAuthority: 25, domainAuthority: 30 },
  ];

  const baseConversionRate = 0.025; // 2.5% benchmark
  const seoCTR = impacts.seoCTR * (platformMods ? platformMods.SEO : 1.0);
  const seoCVR = baseConversionRate * impacts.conversionRate * mc.conversionIntent;

  let totalOrganicImpressions = 0;
  let totalOrganicClicks = 0;
  let totalOrganicConversions = 0;
  const keywordsRanks: number[] = [];

  // Compute organic metrics per targeted keyword
  keywords.forEach(kw => {
    // Deterministic search volumes based on hash, scaled by demand index and seasonal impact
    let searchVolume = (500 + (kw.length * 150)) * mc.demandIndex * mc.seasonalImpact;
    if (searchVolume > 8000) searchVolume = 8000;

    const difficulty = (kw.length * 7) % 80 + 10;

    const rank = calculateOrganicRank({
      keyword: kw,
      pageAuthority: studentPA,
      domainAuthority: studentDA,
      relevanceScore: 0.85, // Mock relevance factor
      competitors: competitorsSEO,
      keywordDifficulty: difficulty,
      contentQuality: decision.seoContentQuality,
      backlinkBudget: decision.seoBacklinkBudget,
      technicalScore: 85.0,
      previousBehavior: {
        cumulativeBacklinkSpend,
        consecutiveSEOActiveRounds
      },
      round: currentRound
    }, random);

    keywordsRanks.push(rank);

    const traffic = calculateOrganicTraffic({
      rank,
      searchVolume: Math.round(searchVolume * seoCTR),
      conversionRate: seoCVR,
    });

    totalOrganicImpressions += traffic.impressions;
    totalOrganicClicks += traffic.clicks;
    totalOrganicConversions += traffic.conversions;
  });

  // 4. Google Ads simulated auction
  let googleImpressions = 0;
  let googleClicks = 0;
  let googleCost = 0;
  let googleConversions = 0;

  // Import Advertiser type from Google auction module
  const googleAdvertisers = googleCampaigns.flatMap((campaign: any) => {
    const dailyCampaignBudget = campaign.budget / 30.0; // round covers 30 days
    const cKeywords = campaign.keywords || [];
    const obj = campaign.objective || 'Sales';
    const type = campaign.campaignType || 'Search';
    const bidStrategy = campaign.biddingStrategy || 'Manual CPC';
    const negKws = campaign.negativeKeywords || [];
    const adCopy = campaign.adCopy || { headline1: '', headline2: '', headline3: '', description1: '', description2: '' };
    const landingPage = campaign.landingPage || { pageRelevance: 5, mobileFriendly: 5, pageSpeed: 5, trustSignals: 5, offerClarity: 5, conversionReadiness: 5 };

    return cKeywords.map((kwBid: any) => {
      // Mock rival bidders
      const mockRivals = [
        { id: 'rival-1', name: 'Rival A', bid: random.nextFloat(0.5, 2.5), qualityScore: random.nextInt(4, 9), dailyBudget: dailyCampaignBudget * 1.2 },
        { id: 'rival-2', name: 'Rival B', bid: random.nextFloat(0.8, 3.0), qualityScore: random.nextInt(5, 8), dailyBudget: dailyCampaignBudget * 0.8 },
      ];

      const qs = calculateQualityScore(adCopy, kwBid.word, landingPage);

      const studentBidder = {
        id: 'student',
        name: 'Student Campaign',
        bid: kwBid.bid || 1.0,
        qualityScore: qs,
        dailyBudget: dailyCampaignBudget,
        matchType: kwBid.matchType || 'broad',
        objective: obj,
        campaignType: type,
        biddingStrategy: bidStrategy,
        negativeKeywordsCount: negKws.length,
        landingPageExperience: (landingPage.pageRelevance + landingPage.mobileFriendly + landingPage.pageSpeed + landingPage.trustSignals + landingPage.offerClarity + landingPage.conversionReadiness) / 6
      };

      const auctionResults = runGoogleAuction(
        kwBid.word,
        1500, // baseline keyword daily search volume
        [studentBidder, ...mockRivals],
        baseConversionRate * impacts.conversionRate,
        random,
        mc
      );

      const studentRes = auctionResults.find(r => r.id === 'student');
      if (studentRes) {
        return {
          ...studentRes,
          dailyCampaignBudget
        };
      }
      return null;
    }).filter(Boolean);
  });

  googleAdvertisers.forEach((res: any) => {
    // Pace daily metrics to 30 days using dailyCampaignBudget
    const dailyPaced = paceDailyBudget(res.dailyCampaignBudget, {
      impressions: res.impressions,
      clicks: res.clicks,
      cost: res.cost * impacts.googleCPC,
      conversions: res.conversions,
    });

    googleImpressions += dailyPaced.impressions * 30;
    googleClicks += dailyPaced.clicks * 30;
    googleCost += dailyPaced.cost * 30;
    googleConversions += dailyPaced.conversions * 30;
  });

  // 5. Meta Ads auction modeling
  let metaImpressions = 0;
  let metaClicks = 0;
  let metaCost = 0;
  let metaConversions = 0;

  const audienceSizes = {
    'business-owners': 1000000,
    'tech-enthusiasts': 1500000,
    'fashion-lifestyle': 2000000,
    'general-broad': 3500000,
  };

  // Check creative fatigue compared to previous round
  let isSameCreative = false;
  if (currentRound > 1 && prevDecisions.length > 0) {
    const lastDec = prevDecisions[prevDecisions.length - 1];
    try {
      const prevMeta = JSON.parse(lastDec.metaCampaigns)[0];
      const currMeta = metaCampaigns[0];
      if (prevMeta && currMeta && prevMeta.creative && currMeta.creative) {
        isSameCreative = (prevMeta.creative.headline === currMeta.creative.headline &&
                          prevMeta.creative.primaryText === currMeta.creative.primaryText);
      }
    } catch (e) {
      // ignore
    }
  }

  // Total meta campaign budget ceiling (sum of all campaign budgets for the round)
  const totalMetaBudgetCeiling = metaCampaigns.reduce((sum: number, c: any) => sum + (c.budget || 0), 0);

  const metaAdvertisers = metaCampaigns.map((camp: any) => {
    const adCopy = camp.creative || { headline: '', primaryText: '', callToAction: '', mediaQuality: 80 };
    const avgQuality = adCopy.mediaQuality || 80;
    const creativeQuality = Math.max(1, Math.min(10, Math.round(avgQuality / 10))) || 8;

    return {
      id: 'student',
      name: camp.name,
      budget: camp.budget / 30.0,
      audienceInterest: camp.audienceInterest || 'general-broad',
      bidType: camp.bidType || 'LOWEST_COST',
      bidAmount: camp.bidAmount || 0,
      placement: camp.placement || 'auto',
      creativeQuality,
      objective: camp.objective || 'sales',
      isSameCreative,
      roundNumber: currentRound
    };
  });

  // Runs meta auctions daily
  for (let day = 1; day <= 30; day++) {
    const results = runMetaAuction(
      metaAdvertisers,
      audienceSizes,
      baseConversionRate * impacts.conversionRate,
      random,
      mc
    );

    const studentRes = results.find(r => r.id === 'student');
    if (studentRes) {
      metaImpressions += studentRes.impressions;
      metaClicks += studentRes.clicks;
      // Apply CPM impact but cap total spend against campaign budget ceiling
      const dailyCostWithImpact = studentRes.cost * impacts.metaCPM;
      const remainingBudget = totalMetaBudgetCeiling - metaCost;
      metaCost += Math.min(dailyCostWithImpact, Math.max(0, remainingBudget));
      metaConversions += studentRes.conversions;
    }
  }

  // 6. Collate daily metrics (write time-series daily metrics to DB)
  const averagePricePoint = 120.0; // Selling price point of simulation item
  const dailyMetricsPromises = [];

  for (let d = 1; d <= 30; d++) {
    // Add small day-to-day random variance
    const dailyOrganicClicks = Math.round((totalOrganicClicks / 30) * random.nextFloat(0.85, 1.15));
    const dailyOrganicImpressions = Math.round((totalOrganicImpressions / 30) * random.nextFloat(0.9, 1.1));
    const dailyOrganicConversions = Math.round((totalOrganicConversions / 30) * random.nextFloat(0.8, 1.2));

    const dailyGoogleClicks = Math.round((googleClicks / 30) * random.nextFloat(0.85, 1.15));
    const dailyGoogleImpressions = Math.round((googleImpressions / 30) * random.nextFloat(0.9, 1.1));
    const dailyGoogleCost = parseFloat(((googleCost / 30) * random.nextFloat(0.9, 1.1)).toFixed(2));
    const dailyGoogleConversions = Math.round((googleConversions / 30) * random.nextFloat(0.8, 1.2));

    const dailyMetaClicks = Math.round((metaClicks / 30) * random.nextFloat(0.85, 1.15));
    const dailyMetaImpressions = Math.round((metaImpressions / 30) * random.nextFloat(0.9, 1.1));
    const dailyMetaCost = parseFloat(((metaCost / 30) * random.nextFloat(0.9, 1.1)).toFixed(2));
    const dailyMetaConversions = Math.round((metaConversions / 30) * random.nextFloat(0.8, 1.2));

    const totalConversions = dailyOrganicConversions + dailyGoogleConversions + dailyMetaConversions;
    const dailyRevenue = totalConversions * averagePricePoint;

    dailyMetricsPromises.push(
      prisma.dailyMetric.create({
        data: {
          simulationId,
          round: currentRound,
          day: d,
          organicImpressions: dailyOrganicImpressions,
          organicClicks: dailyOrganicClicks,
          organicCTR: dailyOrganicImpressions > 0 ? (dailyOrganicClicks / dailyOrganicImpressions) : 0,
          organicConversions: dailyOrganicConversions,
          googleImpressions: dailyGoogleImpressions,
          googleClicks: dailyGoogleClicks,
          googleCost: dailyGoogleCost,
          googleConversions: dailyGoogleConversions,
          metaImpressions: dailyMetaImpressions,
          metaClicks: dailyMetaClicks,
          metaCost: dailyMetaCost,
          metaConversions: dailyMetaConversions,
          revenue: dailyRevenue,
        },
      })
    );
  }

  await Promise.all(dailyMetricsPromises);

  // 7. Calculate Financial Totals & Scores
  const roundSpend = decision.seoBacklinkBudget + googleCost + metaCost;
  const roundRevenue = (totalOrganicConversions + googleConversions + metaConversions) * averagePricePoint;

  const prevScoreBreakdowns = await prisma.scoreBreakdown.findMany({
    where: { simulationId, round: { lt: currentRound } },
    orderBy: { round: 'asc' }
  });

  const dimensionScores = calculateDimensionScores({
    seoKeywordsRanks: keywordsRanks,
    googleAdsCost: googleCost,
    googleAdsRevenue: googleConversions * averagePricePoint,
    metaAdsCost: metaCost,
    metaAdsRevenue: metaConversions * averagePricePoint,
    allocatedRoundBudget: sim.class.scenario.budgetPerRound,
    totalRoundSpend: roundSpend,
    totalRoundRevenue: roundRevenue,
    decision,
    scenario: sim.class.scenario,
    marketCondition: mc,
    prevDecisions,
    prevScoreBreakdowns,
    googleConversions,
    metaConversions,
    googleClicks,
    metaClicks,
    googleImpressions,
    metaImpressions
  });

  const compositeIndex = calculateCompositeIndex(dimensionScores);

  // Write Score Breakdown to DB
  const allDecisions = await prisma.decision.findMany({
    where: { simulationId },
    orderBy: { round: 'asc' },
  });
  const strategicConsistency = calculateStrategicConsistency(allDecisions);

  await prisma.scoreBreakdown.create({
    data: {
      simulationId,
      round: currentRound,
      seoScore: dimensionScores.seoScore,
      googleAdsScore: dimensionScores.googleAdsScore,
      metaAdsScore: dimensionScores.metaAdsScore,
      budgetScore: dimensionScores.budgetScore,
      revenueScore: dimensionScores.revenueScore,
      strategicAlignment: dimensionScores.strategicAlignment,
      efficiencyRoi: dimensionScores.efficiencyRoi,
      budgetDiscipline: dimensionScores.budgetDiscipline,
      riskManagement: dimensionScores.riskManagement,
      adaptability: dimensionScores.adaptability,
      strategicConsistency,
      compositeIndex,
      percentileRank: 100.0, // Placeholder, updated in post-processing percentiles
    },
  });

  // Capture round snapshot and save it to the DB (insert-only)
  const snapshotData = await captureRoundSnapshot(simulationId, currentRound);
  await prisma.roundSnapshot.create({
    data: {
      simulationId,
      round: currentRound,
      data: JSON.stringify(snapshotData)
    }
  });

  // 8. Advance Simulation State machine
  const nextState = advanceRoundState(
    {
      currentRound: sim.currentRound,
      isCompleted: sim.isCompleted,
      cumulativeSpend: sim.cumulativeSpend,
      cumulativeRevenue: sim.cumulativeRevenue,
      score: sim.score,
    },
    sim.class.scenario.maxRounds,
    roundSpend,
    roundRevenue,
    compositeIndex
  );

  // Validate and transition PROCESSING -> RESULTS_READY
  validateStateTransition(SimulationStatus.PROCESSING, SimulationStatus.RESULTS_READY);

  // Validate and transition RESULTS_READY -> DECISION_OPEN or SCORE_LOCKED
  const finalStatus = nextState.isCompleted ? SimulationStatus.SCORE_LOCKED : SimulationStatus.DECISION_OPEN;
  validateStateTransition(SimulationStatus.RESULTS_READY, finalStatus);

  await prisma.simulationState.update({
    where: { id: simulationId },
    data: {
      currentRound: nextState.currentRound,
      isCompleted: nextState.isCompleted,
      cumulativeSpend: nextState.cumulativeSpend,
      cumulativeRevenue: nextState.cumulativeRevenue,
      score: nextState.score,
      status: finalStatus,
    },
  });

  // Update StudentSimulationProgress record
  await prisma.studentSimulationProgress.upsert({
    where: { simulationId },
    update: {
      currentDay: nextState.currentRound,
      status: finalStatus === 'SCORE_LOCKED' ? 'COMPLETED' : 'DECISION_OPEN',
      completedAt: finalStatus === 'SCORE_LOCKED' ? new Date() : null
    },
    create: {
      simulationId,
      currentDay: nextState.currentRound,
      totalDays: sim.class.scenario.durationDays,
      status: finalStatus === 'SCORE_LOCKED' ? 'COMPLETED' : 'DECISION_OPEN',
      completedAt: finalStatus === 'SCORE_LOCKED' ? new Date() : null
    }
  });

  // 9. Update percentiles cohort
  await recalculateCohortPercentiles(sim.classId, currentRound);

  logger.info({ simulationId, round: currentRound }, 'Simulation round advanced successfully');

  return {
    success: true,
    simulationId,
    roundAdvanced: currentRound,
    nextRound: nextState.currentRound,
    isCompleted: nextState.isCompleted,
    compositeIndex,
  };
}

/**
 * Calculates and updates percentile rankings for all active students in a cohort class
 */
async function recalculateCohortPercentiles(classId: string, round: number): Promise<void> {
  const classSimulations = await prisma.simulationState.findMany({
    where: { classId },
    include: {
      scoreBreakdowns: {
        where: { round },
      },
    },
  });

  const scores = classSimulations
    .map(s => s.scoreBreakdowns.find(sb => sb.round === round)?.compositeIndex)
    .filter((score): score is number => score !== undefined);

  await Promise.all(
    classSimulations.map(async sim => {
      const breakdown = sim.scoreBreakdowns.find(sb => sb.round === round);
      if (breakdown) {
        const percentile = calculatePercentile(breakdown.compositeIndex, scores);
        await prisma.scoreBreakdown.update({
          where: { id: breakdown.id },
          data: { percentileRank: percentile },
        });
      }
    })
  );
}
