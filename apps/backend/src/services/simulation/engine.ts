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
  const seoCTR = impacts.seoCTR;
  const seoCVR = baseConversionRate * impacts.conversionRate;

  let totalOrganicImpressions = 0;
  let totalOrganicClicks = 0;
  let totalOrganicConversions = 0;
  const keywordsRanks: number[] = [];

  // Compute organic metrics per targeted keyword
  keywords.forEach(kw => {
    // Deterministic search volumes based on hash
    let searchVolume = 500 + (kw.length * 150);
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

  // Compile Google bids
  interface Bidder {
    id: string;
    name: string;
    bid: number;
    qualityScore: number;
    dailyBudget: number;
  }

  googleCampaigns.forEach((campaign: any) => {
    const dailyCampaignBudget = campaign.budget / 30.0; // round covers 30 days
    const cKeywords = campaign.keywords || [];

    cKeywords.forEach((kwBid: any) => {
      // Mock rival bidders
      const mockRivals: Bidder[] = [
        { id: 'rival-1', name: 'Rival A', bid: random.nextFloat(0.5, 2.5), qualityScore: random.nextInt(4, 9), dailyBudget: dailyCampaignBudget * 1.2 },
        { id: 'rival-2', name: 'Rival B', bid: random.nextFloat(0.8, 3.0), qualityScore: random.nextInt(5, 8), dailyBudget: dailyCampaignBudget * 0.8 },
      ];

      const qs = calculateQualityScore({
        title: campaign.name,
        description: 'Premium quality digital advertising services.',
      }, kwBid.word, decision.seoContentQuality);

      const studentBidder: Bidder = {
        id: 'student',
        name: 'Student Campaign',
        bid: kwBid.bid,
        qualityScore: qs,
        dailyBudget: dailyCampaignBudget,
      };

      const auctionResults = runGoogleAuction(
        kwBid.word,
        1500, // baseline keyword daily search volume
        [studentBidder, ...mockRivals],
        baseConversionRate * impacts.conversionRate,
        random
      );

      const studentResult = auctionResults.find(r => r.id === 'student');
      if (studentResult) {
        // Pace daily metrics to 30 days
        const dailyPaced = paceDailyBudget(dailyCampaignBudget, {
          impressions: studentResult.impressions,
          clicks: studentResult.clicks,
          cost: studentResult.actualCPC * studentResult.clicks * impacts.googleCPC,
          conversions: studentResult.conversions,
        });

        googleImpressions += dailyPaced.impressions * 30;
        googleClicks += dailyPaced.clicks * 30;
        googleCost += dailyPaced.cost * 30;
        googleConversions += dailyPaced.conversions * 30;
      }
    });
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

  const metaAdvertisers = metaCampaigns.map((camp: any) => ({
    id: 'student',
    name: camp.name,
    budget: camp.budget / 30.0,
    audienceInterest: camp.audienceInterest || 'general-broad',
    bidType: camp.bidType || 'LOWEST_COST',
    bidAmount: camp.bidAmount || 0,
    placement: camp.placement || 'auto',
    creativeQuality: camp.creativeQuality || 6,
  }));

  // Runs meta auctions daily
  for (let day = 1; day <= 30; day++) {
    const results = runMetaAuction(
      metaAdvertisers,
      audienceSizes,
      baseConversionRate * impacts.conversionRate,
      random
    );

    const studentRes = results.find(r => r.id === 'student');
    if (studentRes) {
      metaImpressions += studentRes.impressions;
      metaClicks += studentRes.clicks;
      metaCost += studentRes.cost * impacts.metaCPM;
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

  const dimensionScores = calculateDimensionScores({
    seoKeywordsRanks: keywordsRanks,
    googleAdsCost: googleCost,
    googleAdsRevenue: googleConversions * averagePricePoint,
    metaAdsCost: metaCost,
    metaAdsRevenue: metaConversions * averagePricePoint,
    allocatedRoundBudget: sim.class.scenario.budgetPerRound,
    totalRoundSpend: roundSpend,
    totalRoundRevenue: roundRevenue,
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
