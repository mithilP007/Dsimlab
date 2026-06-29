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
import { calculateStrategicConsistency, checkCertificateEligibility } from '../certificate/eligibility';
import { createNotification, logActivity } from '../../utils/audit';
import { validateAdPolicy } from '../ads/policy-validator';
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

  const scenarioDiff = sim.class.scenario.difficulty || 'medium';

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

  // Policy & Budget Hard Violations Check
  const totalAllocatedBudget = googleCampaigns.reduce((sum: number, c: any) => sum + (c.budget || 0), 0) +
                               metaCampaigns.reduce((sum: number, c: any) => sum + (c.budget || 0), 0) +
                               (decision.seoBacklinkBudget || 0);

  if (totalAllocatedBudget > sim.class.scenario.budgetPerRound) {
    await prisma.hardViolation.create({
      data: {
        simulationId,
        roundNumber: currentRound,
        type: 'BUDGET_EXCEEDED',
        severity: 'BLOCKING',
        message: `Total allocated budget of $${totalAllocatedBudget.toFixed(2)} exceeds the allowed round budget of $${sim.class.scenario.budgetPerRound.toFixed(2)}.`
      }
    });
  }

  // Call policy validator for Google Ads campaigns
  const googleSoftViolationsCount: Record<string, number> = {};
  for (const camp of googleCampaigns) {
    const violations = validateAdPolicy(camp, 'GOOGLE_ADS');
    let softCount = 0;
    for (const v of violations) {
      if (v.severity === 'BLOCKING') {
        await prisma.hardViolation.create({
          data: {
            simulationId,
            roundNumber: currentRound,
            studentId: sim.userId,
            type: v.type,
            severity: 'BLOCKING',
            message: `[Google Ads: ${camp.name}] ${v.message}`,
            source: 'GOOGLE_ADS'
          }
        });
        await logActivity(sim.userId, 'HARD_POLICY_VIOLATION', `Hard violation: ${v.message} in Google Ads campaign "${camp.name}"`);
      } else {
        softCount++;
        await logActivity(sim.userId, 'SOFT_POLICY_WARNING', `Soft warning: ${v.message} in Google Ads campaign "${camp.name}"`);
      }
    }
    googleSoftViolationsCount[camp.name] = softCount;
  }

  // Call policy validator for Meta Ads campaigns
  const metaSoftViolationsCount: Record<string, number> = {};
  for (const camp of metaCampaigns) {
    const violations = validateAdPolicy(camp, 'META_ADS');
    let softCount = 0;
    for (const v of violations) {
      if (v.severity === 'BLOCKING') {
        await prisma.hardViolation.create({
          data: {
            simulationId,
            roundNumber: currentRound,
            studentId: sim.userId,
            type: v.type,
            severity: 'BLOCKING',
            message: `[Meta Ads: ${camp.name}] ${v.message}`,
            source: 'META_ADS'
          }
        });
        await logActivity(sim.userId, 'HARD_POLICY_VIOLATION', `Hard violation: ${v.message} in Meta Ads campaign "${camp.name}"`);
      } else {
        softCount++;
        await logActivity(sim.userId, 'SOFT_POLICY_WARNING', `Soft warning: ${v.message} in Meta Ads campaign "${camp.name}"`);
      }
    }
    metaSoftViolationsCount[camp.name] = softCount;
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

  // Define Platform Variables with default values
  let contentQualityScore = 5.0;
  let relevanceScore = 0.85;
  let technicalHealthScore = 80.0;
  let internalLinkScore = 50.0;
  let studentDA = 15;
  let studentPA = 15;
  let totalOrganicImpressions = 0;
  let totalOrganicClicks = 0;
  let totalOrganicConversions = 0;
  const keywordsRanks: number[] = [];

  let googleImpressions = 0;
  let googleClicks = 0;
  let googleCost = 0;
  let googleConversions = 0;

  let metaImpressions = 0;
  let metaClicks = 0;
  let metaCost = 0;
  let metaConversions = 0;

  const allowed = sim.class?.scenario?.allowedPlatforms
    ? JSON.parse(sim.class.scenario.allowedPlatforms)
    : ["SEO", "GOOGLE_ADS", "META_ADS"];
  const hasSEO = allowed.includes("SEO");
  const hasGoogle = allowed.includes("GOOGLE_ADS");
  const hasMeta = allowed.includes("META_ADS");

  // Fetch previous SEO decisions
  const prevDecisions = await prisma.decision.findMany({
    where: { simulationId, round: { lt: currentRound } }
  });

  // 3. Run SEO Engine if enabled
  if (hasSEO) {
    const focusKeyword = keywords[0] || 'digital marketing';
    const metaTitle = decision.seoMetaTitle || '';
    const metaDescription = decision.seoMetaDescription || '';
    const bodyContent = decision.seoBodyContent || '';

    contentQualityScore = decision.seoContentQuality || 5.0; // Base: 1 to 10
    relevanceScore = 0.85; // Baseline

    if (focusKeyword) {
      const focusLower = focusKeyword.toLowerCase();
      const titleLower = metaTitle.toLowerCase();
      const descLower = metaDescription.toLowerCase();
      const bodyLower = bodyContent.toLowerCase();

      let keywordHits = 0;
      if (titleLower.includes(focusLower)) {
        keywordHits += 1;
        contentQualityScore = Math.min(10, contentQualityScore + 1.0);
      }
      if (descLower.includes(focusLower)) {
        keywordHits += 1;
        contentQualityScore = Math.min(10, contentQualityScore + 1.0);
      }

      // Body keyword density
      if (bodyContent.length > 0) {
        const wordCount = bodyContent.split(/\s+/).length || 1;
        const occurrences = (bodyLower.match(new RegExp(focusLower.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g')) || []).length;
        const density = occurrences / wordCount;
        if (density >= 0.01 && density <= 0.03) {
          contentQualityScore = Math.min(10, contentQualityScore + 2.0);
        } else if (density > 0.05) {
          contentQualityScore = Math.max(1, contentQualityScore - 1.0); // Penalty for keyword stuffing
        }
      }

      // Title and description optimal length rewards
      if (metaTitle.length >= 50 && metaTitle.length <= 60) {
        contentQualityScore = Math.min(10, contentQualityScore + 0.5);
      }
      if (metaDescription.length >= 120 && metaDescription.length <= 160) {
        contentQualityScore = Math.min(10, contentQualityScore + 0.5);
      }

      relevanceScore = Math.min(1.0, 0.4 + (keywordHits * 0.2) + (contentQualityScore * 0.04));
    }

    // Technical Health & HTML check
    technicalHealthScore = 80.0; // Default baseline
    let hasSitemap = true, hasRobots = true, hasSsl = true, isMobileFriendly = true, hasAltTags = false, hasSchema = false;

    if (decision.seoTechnicalConfig) {
      try {
        const tc = JSON.parse(decision.seoTechnicalConfig);
        hasSitemap = tc.hasSitemap ?? true;
        hasRobots = tc.hasRobots ?? true;
        hasSsl = tc.hasSsl ?? true;
        isMobileFriendly = tc.isMobileFriendly ?? true;
        hasAltTags = tc.hasAltTags ?? false;
        hasSchema = tc.hasSchema ?? false;

        let techChecklistScore = 0;
        if (hasSitemap) techChecklistScore += 10;
        if (hasRobots) techChecklistScore += 10;
        if (hasSsl) techChecklistScore += 20;
        if (isMobileFriendly) techChecklistScore += 20;
        if (hasAltTags) techChecklistScore += 10;
        if (hasSchema) techChecklistScore += 10;

        technicalHealthScore = 20.0 + techChecklistScore;
      } catch(e) {}
    }

    // HTML Validation & Sanitization check on manual bodyContent
    if (bodyContent.trim().startsWith('<')) {
      const tags = (bodyContent.match(/<\/?([a-zA-Z1-6]+)(?=>|\s)/g) || []);
      const stack: string[] = [];
      let unmatchedCount = 0;
      for (const tag of tags) {
        if (tag.startsWith('</')) {
          const tagName = tag.substring(2);
          if (stack.length > 0 && stack[stack.length - 1] === tagName) {
            stack.pop();
          } else {
            unmatchedCount++;
          }
        } else {
          const tagName = tag.substring(1);
          if (!['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tagName.toLowerCase())) {
            stack.push(tagName);
          }
        }
      }
      const htmlIssuesCount = unmatchedCount + stack.length;
      if (htmlIssuesCount > 0) {
        technicalHealthScore = Math.max(10, technicalHealthScore - Math.min(30, htmlIssuesCount * 5));
      }

      const deprecatedTags = ['center', 'font', 'frame', 'frameset', 'big', 'strike', 'tt'];
      deprecatedTags.forEach(tag => {
        if (bodyContent.toLowerCase().includes(`<${tag}`) || bodyContent.toLowerCase().includes(`</${tag}>`)) {
          technicalHealthScore = Math.max(10, technicalHealthScore - 5);
        }
      });
    }

    // Internal linking stability
    const internalLinks = decision.seoInternalLinks || 0;
    const anchorText = decision.seoAnchorText || '';
    internalLinkScore = 50.0;
    let rankingStabilityMultiplier = 1.0;

    if (internalLinks === 0) {
      internalLinkScore = 10.0;
      rankingStabilityMultiplier = 1.5; // High volatility/instability
    } else if (internalLinks >= 1 && internalLinks <= 3) {
      internalLinkScore = 85.0;
      rankingStabilityMultiplier = 0.9;
    } else if (internalLinks > 3 && internalLinks <= 5) {
      internalLinkScore = 100.0;
      rankingStabilityMultiplier = 0.8;
    } else {
      internalLinkScore = 70.0;
      rankingStabilityMultiplier = 1.1;
    }

    if (anchorText && focusKeyword && anchorText.toLowerCase().includes(focusKeyword.toLowerCase())) {
      internalLinkScore = Math.min(100, internalLinkScore + 10);
      rankingStabilityMultiplier = Math.max(0.7, rankingStabilityMultiplier - 0.1);
    }

    // Authority Growth Compounding & Decay
    const baseDA = 15;
    const backlinkQuality = decision.seoBacklinkQuality || 1;
    const backlinkBudget = decision.seoBacklinkBudget || 0.0;
    
    studentDA = baseDA;
    if (currentRound > 1 && prevDecisions.length > 0) {
      let sequentialDA = baseDA;
      for (let r = 1; r < currentRound; r++) {
        const rd = prevDecisions.find(pd => pd.round === r);
        if (rd) {
          if (rd.seoBacklinkBudget === 0) {
            sequentialDA = Math.max(10, sequentialDA - 1);
          } else {
            const rQuality = rd.seoBacklinkQuality || 1;
            const rGrowth = (rd.seoBacklinkBudget * rQuality) / 500;
            sequentialDA = Math.min(100, sequentialDA + rGrowth);
          }
        }
      }
      studentDA = sequentialDA;
    }

    if (backlinkBudget === 0) {
      studentDA = Math.max(10, studentDA - 1);
    } else {
      const currentGrowth = (backlinkBudget * backlinkQuality) / 500;
      studentDA = Math.min(100, studentDA + currentGrowth);
    }

    studentPA = calculatePageAuthority(contentQualityScore, studentDA);

    // Cumulative Backlink spend
    const cumulativeBacklinkSpend = prevDecisions.reduce((sum, d) => sum + d.seoBacklinkBudget, 0) + decision.seoBacklinkBudget;

    let consecutiveSEOActiveRounds = 0;
    for (let r = currentRound - 1; r >= 1; r--) {
      const prevDec = prevDecisions.find(pd => pd.round === r);
      if (prevDec && prevDec.seoBacklinkBudget > 0) {
        consecutiveSEOActiveRounds++;
      } else {
        break;
      }
    }

    // Pre-seed competitors for SEO evaluation scaled by scenario difficulty path
    const compScale = scenarioDiff === 'easy' ? 0.75 : (scenarioDiff === 'hard' ? 1.25 : 1.0);
    const competitorsSEO = [
      { name: 'Alpha Agency', pageAuthority: Math.round(55 * compScale), domainAuthority: Math.round(60 * compScale) },
      { name: 'Direct Market Corp', pageAuthority: Math.round(40 * compScale), domainAuthority: Math.round(45 * compScale) },
      { name: 'Slick Digital', pageAuthority: Math.round(25 * compScale), domainAuthority: Math.round(30 * compScale) },
    ];

    const baseConversionRate = 0.025; // 2.5% benchmark
    const seoCTR = impacts.seoCTR * (platformMods ? platformMods.SEO : 1.0);
    const seoCVR = baseConversionRate * impacts.conversionRate * mc.conversionIntent;

    // Compute organic metrics per targeted keyword
    keywords.forEach(kw => {
      let searchVolume = (500 + (kw.length * 150)) * mc.demandIndex * mc.seasonalImpact;
      if (searchVolume > 8000) searchVolume = 8000;

      let difficulty = (kw.length * 7) % 80 + 10;
      if (scenarioDiff === 'easy') {
        difficulty = Math.max(10, difficulty * 0.7);
      } else if (scenarioDiff === 'hard') {
        difficulty = Math.min(100, difficulty * 1.3);
      }


      const rank = calculateOrganicRank({
        keyword: kw,
        pageAuthority: studentPA,
        domainAuthority: studentDA,
        relevanceScore,
        competitors: competitorsSEO,
        keywordDifficulty: difficulty,
        contentQuality: contentQualityScore,
        backlinkBudget: decision.seoBacklinkBudget,
        technicalScore: technicalHealthScore,
        previousBehavior: {
          cumulativeBacklinkSpend,
          consecutiveSEOActiveRounds
        },
        round: currentRound
      }, random);

      keywordsRanks.push(rank);

      const volatility = random.nextFloat(1.0 - (0.15 * rankingStabilityMultiplier), 1.0 + (0.15 * rankingStabilityMultiplier));
      const traffic = calculateOrganicTraffic({
        rank,
        searchVolume: Math.round(searchVolume * seoCTR * volatility),
        conversionRate: seoCVR,
      });

      totalOrganicImpressions += traffic.impressions;
      totalOrganicClicks += traffic.clicks;
      totalOrganicConversions += traffic.conversions;
    });
  }

  // 4. Run Google Ads Engine if enabled
  if (hasGoogle) {
    const baseConversionRate = 0.025;
    const rivalBidScale = scenarioDiff === 'easy' ? 0.7 : (scenarioDiff === 'hard' ? 1.3 : 1.0);
    const rivalQsScale = scenarioDiff === 'easy' ? 0.8 : (scenarioDiff === 'hard' ? 1.2 : 1.0);

    const searchCampaigns = googleCampaigns.filter((c: any) => !c.campaignType || c.campaignType === 'Search');
    const displayCampaigns = googleCampaigns.filter((c: any) => c.campaignType === 'Display');
    const videoCampaigns = googleCampaigns.filter((c: any) => c.campaignType === 'Video');
    const shoppingCampaigns = googleCampaigns.filter((c: any) => c.campaignType === 'Shopping');

    const googleAdvertisers = searchCampaigns.flatMap((campaign: any) => {
      const dailyCampaignBudget = campaign.budget / 30.0;
      const cKeywords = campaign.keywords || [];
      const obj = campaign.objective || 'Sales';
      const type = campaign.campaignType || 'Search';
      const bidStrategy = campaign.biddingStrategy || 'Manual CPC';
      const negKws = campaign.negativeKeywords || [];
      const adCopy = campaign.adCopy || { headline1: '', headline2: '', headline3: '', description1: '', description2: '' };
      const landingPage = campaign.landingPage || { pageRelevance: 5, mobileFriendly: 5, pageSpeed: 5, trustSignals: 5, offerClarity: 5, conversionReadiness: 5 };

      return cKeywords.map((kwBid: any) => {
        const mockRivals = [
          { id: 'rival-1', name: 'Rival A', bid: random.nextFloat(0.5, 2.5) * rivalBidScale, qualityScore: Math.min(10, Math.max(1, Math.round(random.nextInt(4, 9) * rivalQsScale))), dailyBudget: dailyCampaignBudget * 1.2 },
          { id: 'rival-2', name: 'Rival B', bid: random.nextFloat(0.8, 3.0) * rivalBidScale, qualityScore: Math.min(10, Math.max(1, Math.round(random.nextInt(5, 8) * rivalQsScale))), dailyBudget: dailyCampaignBudget * 0.8 },
        ];

        let qs = calculateQualityScore(adCopy, kwBid.word, landingPage);

        const campaignSoftCount = googleSoftViolationsCount[campaign.name] || 0;
        if (campaignSoftCount > 0) {
          qs = Math.max(1, qs - (2.0 * campaignSoftCount));
        }

        const extensions = campaign.extensions || {};
        const validSitelinks = (extensions.sitelinks || []).filter((s: any) => s && s.title && s.title.trim().length > 0);
        const validCallouts = (extensions.callouts || []).filter((c: any) => typeof c === 'string' && c.trim().length > 0);
        const validStructuredSnippets = (extensions.structuredSnippets || []).filter((c: any) => typeof c === 'string' && c.trim().length > 0);
        const hasPromo = extensions.promotion && extensions.promotion.item && extensions.promotion.item.trim().length > 0;
        const hasLead = extensions.leadForm && extensions.leadForm.title && extensions.leadForm.title.trim().length > 0;
        const hasCall = extensions.callExtension && extensions.callExtension.trim().length > 0;

        let qsBonus = (validSitelinks.length * 0.25) + (validCallouts.length * 0.125) + (validStructuredSnippets.length * 0.125);
        if (hasPromo) qsBonus += 0.25;
        if (hasLead) qsBonus += 0.25;
        if (hasCall) qsBonus += 0.125;

        qs = Math.min(10, qs + qsBonus);

        let ctrModifier = 1.0 + (validSitelinks.length * 0.02) + (validCallouts.length * 0.01) + (validStructuredSnippets.length * 0.01);
        if (hasPromo) ctrModifier += 0.02;
        if (hasLead) ctrModifier += 0.02;
        if (hasCall) ctrModifier += 0.01;

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
          campaignType: type,
          biddingStrategy: bidStrategy,
          negativeKeywordsCount: negKws.length,
          landingPageExperience: (landingPage.pageRelevance + landingPage.mobileFriendly + landingPage.pageSpeed + landingPage.trustSignals + landingPage.offerClarity + landingPage.conversionReadiness) / 6,
          ctrModifier
        };

        const auctionResults = runGoogleAuction(
          kwBid.word,
          1500,
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

    // --- DISPLAY CAMPAIGNS ---
    displayCampaigns.forEach((campaign: any) => {
      const dailyBudget = (campaign.budget || 0) / 30.0;
      const audiences = campaign.audiences || [];
      const audienceMatchScore = Math.min(1.0, 0.5 + (audiences.length * 0.1));

      for (let day = 1; day <= 30; day++) {
        const cpm = random.nextFloat(1.5, 4.5) * (1 - 0.1 * mc.demandIndex);
        const impressions = Math.floor((dailyBudget / Math.max(cpm, 0.01)) * 1000 * audienceMatchScore);
        const ctr = random.nextFloat(0.0035, 0.0065) * (mc.demandIndex + 0.5);
        const clicks = Math.floor(impressions * ctr);
        const cost = Math.min(dailyBudget, (impressions / 1000) * cpm) * impacts.googleCPC;
        const cvr = random.nextFloat(0.003, 0.015) * mc.conversionIntent;
        const conversions = Math.floor(clicks * cvr);

        googleImpressions += impressions;
        googleClicks += clicks;
        googleCost += cost;
        googleConversions += conversions;
      }
    });

    // --- VIDEO CAMPAIGNS ---
    videoCampaigns.forEach((campaign: any) => {
      const dailyBudget = (campaign.budget || 0) / 30.0;
      const targetCpv = campaign.targetCpvBid || 0.05;

      for (let day = 1; day <= 30; day++) {
        const baseImpressions = Math.floor((dailyBudget / Math.max(targetCpv, 0.01)) * 1.4);
        const viewRate = random.nextFloat(0.60, 0.80);
        const views = Math.floor(baseImpressions * viewRate);
        const cost = Math.min(dailyBudget, views * targetCpv) * impacts.googleCPC;
        const clickRate = random.nextFloat(0.005, 0.02);
        const clicks = Math.floor(views * clickRate);
        const cvr = random.nextFloat(0.005, 0.02) * mc.conversionIntent;
        const conversions = Math.floor(clicks * cvr);

        googleImpressions += baseImpressions;
        googleClicks += clicks;
        googleCost += cost;
        googleConversions += conversions;
      }
    });

    // --- SHOPPING CAMPAIGNS ---
    shoppingCampaigns.forEach((campaign: any) => {
      const dailyBudget = (campaign.budget || 0) / 30.0;
      const productFeeds = campaign.productFeeds || [];
      if (productFeeds.length === 0) return;
      const perProductDailyBudget = dailyBudget / productFeeds.length;

      for (let day = 1; day <= 30; day++) {
        productFeeds.forEach((product: any) => {
          const productBid = product.bid || 0.5;
          const impressions = Math.floor(random.nextInt(300, 900) * (productBid / 2.0));
          const ctr = random.nextFloat(0.02, 0.07) * mc.conversionIntent;
          const clicks = Math.floor(impressions * ctr);
          const cpc = random.nextFloat(productBid * 0.7, productBid * 1.2);
          const cost = Math.min(perProductDailyBudget, clicks * cpc) * impacts.googleCPC;
          const cvr = random.nextFloat(0.01, 0.04) * mc.conversionIntent;
          const conversions = Math.floor(clicks * cvr);

          googleImpressions += impressions;
          googleClicks += clicks;
          googleCost += cost;
          googleConversions += conversions;
        });
      }
    });
  }

  // 5. Run Meta Ads Engine if enabled
  if (hasMeta) {
    const baseConversionRate = 0.025;
    const audienceSizes = {
      'business-owners': 1000000,
      'tech-enthusiasts': 1500000,
      'fashion-lifestyle': 2000000,
      'general-broad': 3500000,
    };

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
      } catch (e) {}
    }

    const totalMetaBudgetCeiling = metaCampaigns.reduce((sum: number, c: any) => sum + (c.budget || 0), 0);

    const metaAdvertisers = metaCampaigns.map((camp: any) => {
      const adCopy = camp.creative || { headline: '', primaryText: '', callToAction: '', mediaQuality: 80 };
      const avgQuality = adCopy.mediaQuality || 80;
      let creativeQuality = Math.max(1, Math.min(10, Math.round(avgQuality / 10))) || 8;

      const campaignSoftCount = metaSoftViolationsCount[camp.name] || 0;
      if (campaignSoftCount > 0) {
        creativeQuality = Math.max(1, creativeQuality - (2 * campaignSoftCount));
      }

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
        const dailyCostWithImpact = studentRes.cost * impacts.metaCPM * (scenarioDiff === 'easy' ? 0.8 : (scenarioDiff === 'hard' ? 1.2 : 1.0));
        const remainingBudget = totalMetaBudgetCeiling - metaCost;
        metaCost += Math.min(dailyCostWithImpact, Math.max(0, remainingBudget));
        metaConversions += studentRes.conversions;
      }
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

  let reflectionQualityScore = 75.0;
  if (currentRound > 1) {
    const cp = await prisma.checkpointValidation.findFirst({
      where: {
        simulationId,
        roundNumber: currentRound - 1,
      }
    });
    if (cp) {
      reflectionQualityScore = cp.reflectionQualityScore;
    }
  }

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
    metaImpressions,
    reflectionQualityScore
  });

  const compositeIndex = calculateCompositeIndex(dimensionScores, allowed);

  // Write Score Breakdown to DB
  const allDecisions = await prisma.decision.findMany({
    where: { simulationId },
    orderBy: { round: 'asc' },
  });
  const strategicConsistency = calculateStrategicConsistency(allDecisions, allowed);

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

  // Evaluate achievements, rank changes, and certification eligibility
  await evaluateRoundAchievementsAndNotifications(sim.classId, sim.userId, currentRound);

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

/**
 * Evaluates round achievements, rank movements, and certification eligibility to push notifications.
 */
async function evaluateRoundAchievementsAndNotifications(classId: string | null, userId: string, round: number): Promise<void> {
  const sim = await prisma.simulationState.findFirst({
    where: { userId },
    include: {
      scoreBreakdowns: {
        orderBy: { round: 'desc' }
      }
    }
  });
  if (!sim) return;

  const latestBreakdown = sim.scoreBreakdowns.find(sb => sb.round === round);
  if (!latestBreakdown) return;

  let currentRank = 1;
  const prevRound = round - 1;

  if (classId) {
    const classSimulations = await prisma.simulationState.findMany({
      where: { classId },
      include: {
        scoreBreakdowns: {
          orderBy: { round: 'desc' }
        }
      },
      orderBy: { score: 'desc' }
    });

    currentRank = classSimulations.findIndex(s => s.userId === userId) + 1;

    if (prevRound >= 1) {
      const prevScores = classSimulations.map(simState => {
        const pb = simState.scoreBreakdowns.find(b => b.round === prevRound);
        return {
          userId: simState.userId,
          score: pb ? pb.compositeIndex : 0
        };
      }).sort((a, b) => b.score - a.score);

      const prevRankIndex = prevScores.findIndex(x => x.userId === userId);
      if (prevRankIndex !== -1) {
        const prevRank = prevRankIndex + 1;
        const rankDiff = prevRank - currentRank;
        if (rankDiff > 0) {
          await createNotification(
            userId,
            'success',
            'Rank Increase',
            `Climbed ${rankDiff} places to Rank #${currentRank} in your class!`,
            'System',
            '/leaderboard'
          );
        } else if (rankDiff < 0) {
          await createNotification(
            userId,
            'warning',
            'Rank Drop',
            `Dropped ${Math.abs(rankDiff)} places to Rank #${currentRank} in your class. Adjust your strategies!`,
            'System',
            '/leaderboard'
          );
        }
      }
    }
  }

  // Achievements Calculation
  const achievementsToUnlock: { title: string; message: string }[] = [];

  // Top Performer: Rank = 1
  if (classId && currentRank === 1) {
    achievementsToUnlock.push({
      title: 'Top Performer',
      message: 'Reached #1 spot on the classroom standings board!'
    });
  }

  // SEO Expert: seoScore >= 90
  if (latestBreakdown.seoScore >= 90) {
    achievementsToUnlock.push({
      title: 'SEO Expert',
      message: `Achieved an outstanding SEO score of ${latestBreakdown.seoScore}% in a round.`
    });
  }

  // Ads Strategist: Google Ads or Meta Ads score >= 90
  if (latestBreakdown.googleAdsScore >= 90 || latestBreakdown.metaAdsScore >= 90) {
    achievementsToUnlock.push({
      title: 'Ads Strategist',
      message: `Achieved an Ads campaign score of 90%+ in a round.`
    });
  }

  // ROI Master: efficiencyRoi >= 85
  if (latestBreakdown.efficiencyRoi >= 85) {
    achievementsToUnlock.push({
      title: 'ROI Master',
      message: `Maximized ROI Efficiency above 85% with disciplined budget deployment.`
    });
  }

  // Fast Learner: score improvement >= 15 compared to previous round
  const prevBreakdown = sim.scoreBreakdowns.find(sb => sb.round === prevRound);
  if (prevBreakdown && (latestBreakdown.compositeIndex - prevBreakdown.compositeIndex >= 15)) {
    achievementsToUnlock.push({
      title: 'Fast Learner',
      message: `Improved overall composite score by ${Math.round(latestBreakdown.compositeIndex - prevBreakdown.compositeIndex)} points in a single round!`
    });
  }

  // Consistency Champion: strategicConsistency >= 85
  if (latestBreakdown.strategicConsistency >= 85) {
    achievementsToUnlock.push({
      title: 'Consistency Champion',
      message: `Maintained exceptionally high strategic alignment and budget stability (85%+).`
    });
  }

  // Adaptive Marketer: adaptability >= 85
  if (latestBreakdown.adaptability >= 85) {
    achievementsToUnlock.push({
      title: 'Adaptive Marketer',
      message: `Successfully adjusted strategy to navigate volatility and competitor spikes.`
    });
  }

  // Fetch existing achievement notifications to avoid duplicates
  const existingAchievements = await prisma.notification.findMany({
    where: {
      userId,
      type: 'achievement'
    },
    select: { title: true }
  });
  const unlockedTitles = new Set(existingAchievements.map(ea => ea.title.replace('Achievement Unlocked: ', '')));

  for (const ach of achievementsToUnlock) {
    if (!unlockedTitles.has(ach.title)) {
      await createNotification(
        userId,
        'achievement',
        `Achievement Unlocked: ${ach.title}`,
        ach.message,
        'System',
        '/progress'
      );
    }
  }

  // Certification Eligibility check
  const check = await checkCertificateEligibility(sim.id);
  if (check.eligible) {
    const existingCertNotice = await prisma.notification.findFirst({
      where: {
        userId,
        title: 'Certification Eligible'
      }
    });
    if (!existingCertNotice) {
      await createNotification(
        userId,
        'achievement',
        'Certification Eligible',
        'Congratulations! You have met all requirements for a pass certificate. Claim it now in your Progress Dashboard.',
        'System',
        '/progress'
      );
    }
  }

  // Standard Round Completed notice
  await createNotification(
    userId,
    'success',
    'Round Completed',
    `Round ${round} calculations are finished. Review your analytics dashboard!`,
    'System',
    '/simulation/results'
  );
}
