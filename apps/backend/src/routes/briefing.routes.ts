import { FastifyInstance } from 'fastify';
import { requireAuth, AuthenticatedRequest } from '../auth/middleware';
import { prisma } from '../db/client';
import { NotFoundError } from '../utils/errors';

/**
 * Student Briefing Routes
 * GET /api/v1/briefing  — Returns the scenario briefing for the student's active class/simulation
 * GET /api/v1/briefing/scenario/:scenarioId — Returns briefing for a specific scenario (Instructor preview)
 */
export async function briefingRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/briefing
   * Returns the scenario briefing content tailored for the authenticated student.
   * Includes scenario metadata, objectives, constraints, allowed platforms & campaign types.
   */
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const userId = authReq.user!.id;
    const classId = authReq.user!.classId;

    // For individual learners, find their latest active campaign run's scenario
    let scenario: any = null;

    if (classId) {
      // College students: get scenario through their class
      const cls = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          scenario: true,
        }
      });
      if (!cls) {
        throw new NotFoundError('Active class not found.');
      }
      scenario = cls.scenario;
    } else {
      // Individual learner: find their latest active/completed campaign run
      const run = await prisma.campaignRun.findFirst({
        where: {
          userId,
          status: { in: ['ACTIVE', 'COMPLETED'] },
        },
        orderBy: { createdAt: 'desc' },
        include: { scenario: true }
      });

      if (!run) {
        return reply.status(200).send({
          success: true,
          briefing: null,
          message: 'No active simulation found. Start a new simulation to receive your briefing.'
        });
      }
      scenario = run.scenario;
    }

    if (!scenario) {
      throw new NotFoundError('No scenario associated with your simulation.');
    }

    // Parse JSON stored fields safely
    const safeJsonParse = (str: string | null | undefined, fallback: any = []) => {
      try {
        return str ? JSON.parse(str) : fallback;
      } catch {
        return fallback;
      }
    };

    const briefing = {
      scenarioId: scenario.id,
      name: scenario.name,
      description: scenario.description,
      industry: scenario.industry,
      difficulty: scenario.difficulty,
      targetKPI: scenario.targetKPI,
      location: scenario.location || 'Global',
      maxRounds: scenario.maxRounds,
      budgetPerRound: scenario.budgetPerRound,
      totalBudget: scenario.totalBudget || scenario.budgetPerRound * scenario.maxRounds,
      durationDays: scenario.durationDays,
      // Gating Config
      allowedPlatforms: safeJsonParse(scenario.allowedPlatforms, ['SEO', 'GOOGLE_ADS', 'META_ADS']),
      allowedCampaignTypes: safeJsonParse(scenario.allowedCampaignTypes, ['Search', 'Display', 'Video', 'Shopping']),
      allowedGoogleObjectives: safeJsonParse(scenario.allowedGoogleObjectives, ['Sales', 'Leads', 'Website Traffic', 'Brand Awareness']),
      allowedMetaObjectives: safeJsonParse(scenario.allowedMetaObjectives, ['Awareness', 'Traffic', 'Engagement', 'Leads', 'Sales']),
      allowedBiddingStrategies: safeJsonParse(scenario.allowedBiddingStrategies, ['Manual CPC', 'Maximize Clicks', 'Maximize Conversions']),
      checkpointRequired: scenario.checkpointRequired ?? true,
      certificateEnabled: scenario.certificateEnabled ?? true,
      aiHintsEnabled: scenario.aiHintsEnabled ?? true,
      // Market simulation settings
      marketVolatility: scenario.marketVolatility || 1.0,
      dataMode: scenario.dataMode || 'REAL_TIME_TREND_SIMULATION',
      // Scoring weights for transparency
      scoringWeights: safeJsonParse(scenario.scoringWeights, {
        alignment: 0.2,
        budget: 0.1,
        optimization: 0.2,
        keywordAudience: 0.2,
        creative: 0.15,
        roi: 0.15
      }),
      // Learning objectives (generated from scenario fields)
      objectives: generateObjectives(scenario),
    };

    return reply.status(200).send({
      success: true,
      briefing
    });
  });

  /**
   * GET /api/v1/briefing/scenario/:scenarioId
   * Returns briefing for a specific scenario (Instructor/Admin use)
   */
  fastify.get('/scenario/:scenarioId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { scenarioId } = request.params as { scenarioId: string };

    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId }
    });

    if (!scenario) {
      throw new NotFoundError('Scenario not found.');
    }

    const safeJsonParse = (str: string | null | undefined, fallback: any = []) => {
      try {
        return str ? JSON.parse(str) : fallback;
      } catch {
        return fallback;
      }
    };

    return reply.status(200).send({
      success: true,
      scenario: {
        ...scenario,
        allowedPlatformsParsed: safeJsonParse(scenario.allowedPlatforms),
        allowedCampaignTypesParsed: safeJsonParse(scenario.allowedCampaignTypes),
        allowedGoogleObjectivesParsed: safeJsonParse(scenario.allowedGoogleObjectives),
        allowedMetaObjectivesParsed: safeJsonParse(scenario.allowedMetaObjectives),
        allowedBiddingStrategiesParsed: safeJsonParse(scenario.allowedBiddingStrategies),
        scoringWeightsParsed: safeJsonParse(scenario.scoringWeights, {}),
      }
    });
  });
}

/**
 * Generates human-readable learning objectives from scenario parameters
 */
function generateObjectives(scenario: any): string[] {
  const objectives: string[] = [];

  const safeJsonParse = (str: string | null | undefined, fallback: any = []) => {
    try { return str ? JSON.parse(str) : fallback; } catch { return fallback; }
  };

  const allowedPlatforms: string[] = safeJsonParse(scenario.allowedPlatforms, ['SEO', 'GOOGLE_ADS', 'META_ADS']);

  if (allowedPlatforms.includes('SEO')) {
    objectives.push(`Optimize organic search presence for the ${scenario.industry} industry`);
  }
  if (allowedPlatforms.includes('GOOGLE_ADS')) {
    const allowedTypes: string[] = safeJsonParse(scenario.allowedCampaignTypes, ['Search']);
    objectives.push(`Run Google Ads campaigns (${allowedTypes.join(', ')}) to drive targeted traffic`);
  }
  if (allowedPlatforms.includes('META_ADS')) {
    objectives.push('Run Meta (Facebook/Instagram) campaigns for audience engagement and brand reach');
  }

  objectives.push(`Maximize ${scenario.targetKPI} within a budget of $${scenario.budgetPerRound} per round over ${scenario.maxRounds} rounds`);
  objectives.push('Analyze market conditions, trends, and competitor behavior to refine your strategy');

  if (scenario.checkpointRequired) {
    objectives.push('Submit round justifications at each checkpoint to demonstrate strategic thinking');
  }
  if (scenario.certificateEnabled) {
    objectives.push('Achieve eligibility for a simulation completion certificate by meeting performance requirements');
  }

  return objectives;
}
