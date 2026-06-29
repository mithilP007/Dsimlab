import { FastifyInstance } from 'fastify';
import { requireAuth, AuthenticatedRequest } from '../auth/middleware';
import { prisma } from '../db/client';
import { ValidationError, ForbiddenError, NotFoundError } from '../utils/errors';
import { processSimulationRound } from '../services/simulation/engine';
import { checkCertificateEligibility } from '../services/certificate/eligibility';
import { generateCertificatePDF } from '../services/certificate/generator';
import crypto from 'crypto';

async function logAudit(userId: string, action: string, details: string) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details
      }
    });
  } catch (err) {
    // silent catch to protect main flows
  }
}

export async function sandboxRoutes(fastify: FastifyInstance) {
  // Pre-handler auth guard for all sandbox routes
  fastify.addHook('preHandler', requireAuth);

  // Helper validation guard to ensure only ADMIN (Super Admin) or INDIVIDUAL (Individual Learner) users can use sandbox
  const checkRole = (request: AuthenticatedRequest) => {
    const role = request.user!.role;
    if (role !== 'INDIVIDUAL' && role !== 'ADMIN') {
      throw new ForbiddenError('Only Individual Learners or Administrators can access sandbox mode.');
    }
  };

  /**
   * GET /api/v1/sandbox/options
   */
  fastify.get('/options', async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    checkRole(authReq);

    const presetScenarios = await prisma.scenario.findMany({
      where: { scenarioType: { not: 'custom' } }
    });

    return reply.status(200).send({
      success: true,
      simulationTypes: ["FULL", "SEO", "GOOGLE_ADS", "META_ADS", "DISPLAY", "VIDEO", "SHOPPING"],
      learningPaths: ["beginner", "intermediate", "advanced", "custom"],
      difficulties: ["easy", "medium", "hard"],
      kpis: ["revenue", "conversions", "clicks", "ctr"],
      locations: ["Global", "US", "EU", "APAC"],
      presetScenarios: presetScenarios.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        industry: s.industry,
        difficulty: s.difficulty,
        allowedPlatforms: JSON.parse(s.allowedPlatforms || '[]')
      }))
    });
  });

  /**
   * POST /api/v1/sandbox/scenario/custom
   */
  fastify.post('/scenario/custom', async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    checkRole(authReq);
    const userId = authReq.user!.id;

    const {
      scenarioName,
      industry,
      targetAudience,
      location,
      totalBudget,
      dailyBudget,
      campaignDuration,
      simulationRounds,
      seoEnabled,
      googleAdsEnabled,
      metaAdsEnabled,
      displayVideoShoppingEnabled,
      difficulty,
      targetKPI,
      checkpointRequired,
      certificateEnabled,
      timingRule
    } = request.body as any;

    if (!scenarioName || !industry) {
      throw new ValidationError('Scenario name and industry are required.');
    }

    const allowedPlatforms = [];
    if (seoEnabled) allowedPlatforms.push('SEO');
    if (googleAdsEnabled) allowedPlatforms.push('GOOGLE_ADS');
    if (metaAdsEnabled) allowedPlatforms.push('META_ADS');

    const allowedCampaignTypes = ['Search'];
    if (displayVideoShoppingEnabled) {
      allowedCampaignTypes.push('Display', 'Video', 'Shopping');
    }

    const customScenario = await prisma.scenario.create({
      data: {
        name: scenarioName,
        description: `Custom Sandbox Scenario for ${targetAudience || 'General Audiences'} in ${location || 'Global'}.`,
        industry,
        startRound: 1,
        maxRounds: parseInt(simulationRounds) || 10,
        budgetPerRound: parseFloat(totalBudget) || 5000.0,
        baselineOrganicTraffic: 1000,
        targetKPI: targetKPI || 'revenue',
        location: location || 'Global',
        durationDays: parseInt(campaignDuration) || 30,
        dailyBudgetCap: parseFloat(dailyBudget) || 150.0,
        allowedPlatforms: JSON.stringify(allowedPlatforms),
        allowedCampaignTypes: JSON.stringify(allowedCampaignTypes),
        checkpointRequired: checkpointRequired ?? true,
        difficulty: difficulty || 'medium',
        certificateEnabled: certificateEnabled ?? true,
        trendRefreshFrequency: timingRule || 'instant', // We store timingRule (instant, 24h, custom_X) here
        scenarioType: 'custom'
      }
    });

    await logAudit(userId, 'scenario created', `Created custom scenario: ${scenarioName}`);

    return reply.status(201).send({
      success: true,
      scenarioId: customScenario.id
    });
  });

  /**
   * POST /api/v1/sandbox/start
   */
  fastify.post('/start', async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    checkRole(authReq);
    const userId = authReq.user!.id;
    const { scenarioId } = request.body as any;

    if (!scenarioId) {
      throw new ValidationError('Scenario ID is required to start simulation.');
    }

    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId }
    });

    if (!scenario) {
      throw new NotFoundError('Scenario not found.');
    }

    // 1. Resolve private Sandbox Instructor account
    let inst = await prisma.user.findFirst({
      where: { email: 'sandbox-instructor@simulation.com' }
    });
    if (!inst) {
      inst = await prisma.user.create({
        data: {
          email: 'sandbox-instructor@simulation.com',
          name: 'Sandbox Instructor',
          emailVerified: true,
          role: 'INSTRUCTOR',
          status: 'active'
        }
      });
    }

    // 2. Resolve private Sandbox Class unique to this user
    const inviteCode = `SANDBOX-${userId}`;
    let cls = await prisma.class.findUnique({
      where: { inviteCode }
    });

    if (cls) {
      cls = await prisma.class.update({
        where: { id: cls.id },
        data: { scenarioId }
      });
    } else {
      cls = await prisma.class.create({
        data: {
          name: `Sandbox - ${authReq.user!.name}`,
          inviteCode,
          instructorId: inst.id,
          scenarioId
        }
      });
    }

    // 3. Link user to sandbox class
    await prisma.user.update({
      where: { id: userId },
      data: { classId: cls.id }
    });

    // 4. Delete existing SimulationState & dependencies
    await prisma.simulationState.deleteMany({
      where: { userId, classId: cls.id }
    });

    // 5. Create fresh SimulationState
    const state = await prisma.simulationState.create({
      data: {
        userId,
        classId: cls.id,
        currentRound: 1,
        status: 'DECISION_OPEN',
        isCompleted: false
      }
    });

    // 6. Initialize progress record
    await prisma.studentSimulationProgress.upsert({
      where: { simulationId: state.id },
      update: {
        currentDay: 1,
        totalDays: scenario.durationDays,
        status: 'DECISION_OPEN',
        completedAt: null,
        nextResultAt: null
      },
      create: {
        simulationId: state.id,
        currentDay: 1,
        totalDays: scenario.durationDays,
        status: 'DECISION_OPEN'
      }
    });

    await logAudit(userId, 'simulation started', `Started sandbox simulation. Scenario: ${scenario.name}`);

    return reply.status(201).send({
      success: true,
      simulationId: state.id,
      status: state.status,
      currentRound: state.currentRound
    });
  });

  /**
   * GET /api/v1/sandbox/state
   */
  fastify.get('/state', async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    checkRole(authReq);
    const userId = authReq.user!.id;

    const inviteCode = `SANDBOX-${userId}`;
    const cls = await prisma.class.findUnique({
      where: { inviteCode }
    });

    if (!cls) {
      return reply.status(200).send({
        success: true,
        hasState: false,
        state: null
      });
    }

    const state = await prisma.simulationState.findFirst({
      where: { userId, classId: cls.id },
      include: {
        class: {
          include: {
            scenario: true
          }
        }
      }
    });

    if (!state) {
      return reply.status(200).send({
        success: true,
        hasState: false,
        state: null
      });
    }

    // Get the progress record
    const progress = await prisma.studentSimulationProgress.findUnique({
      where: { simulationId: state.id }
    });

    return reply.status(200).send({
      success: true,
      hasState: true,
      state,
      progress
    });
  });

  /**
   * POST /api/v1/sandbox/decision
   */
  fastify.post('/decision', async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    checkRole(authReq);
    const userId = authReq.user!.id;

    const {
      seoTargetKeywords,
      seoContentQuality,
      seoBacklinkBudget,
      googleCampaigns,
      metaCampaigns
    } = request.body as any;

    const inviteCode = `SANDBOX-${userId}`;
    const cls = await prisma.class.findUnique({
      where: { inviteCode }
    });

    if (!cls) {
      throw new NotFoundError('No active sandbox classroom found. Please start a sandbox simulation first.');
    }

    const sim = await prisma.simulationState.findFirst({
      where: { userId, classId: cls.id }
    });

    if (!sim) {
      throw new NotFoundError('No active sandbox simulation found.');
    }

    if (sim.status !== 'DECISION_OPEN') {
      throw new ValidationError('Simulation is not open for decisions.');
    }

    const decision = await prisma.decision.upsert({
      where: {
        simulationId_round: {
          simulationId: sim.id,
          round: sim.currentRound
        }
      },
      update: {
        seoTargetKeywords: JSON.stringify(seoTargetKeywords || []),
        seoContentQuality: parseFloat(seoContentQuality) || 5.0,
        seoBacklinkBudget: parseFloat(seoBacklinkBudget) || 0.0,
        googleCampaigns: JSON.stringify(googleCampaigns || []),
        metaCampaigns: JSON.stringify(metaCampaigns || []),
        submitted: true
      },
      create: {
        simulationId: sim.id,
        round: sim.currentRound,
        seoTargetKeywords: JSON.stringify(seoTargetKeywords || []),
        seoContentQuality: parseFloat(seoContentQuality) || 5.0,
        seoBacklinkBudget: parseFloat(seoBacklinkBudget) || 0.0,
        googleCampaigns: JSON.stringify(googleCampaigns || []),
        metaCampaigns: JSON.stringify(metaCampaigns || []),
        submitted: true
      }
    });

    await logAudit(userId, 'decision submitted', `Submitted decisions for Round ${sim.currentRound}`);

    return reply.status(200).send({
      success: true,
      decision
    });
  });

  /**
   * POST /api/v1/sandbox/run
   */
  fastify.post('/run', async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    checkRole(authReq);
    const userId = authReq.user!.id;

    const inviteCode = `SANDBOX-${userId}`;
    const cls = await prisma.class.findUnique({
      where: { inviteCode },
      include: { scenario: true }
    });

    if (!cls) {
      throw new NotFoundError('No active sandbox classroom found.');
    }

    const sim = await prisma.simulationState.findFirst({
      where: { userId, classId: cls.id }
    });

    if (!sim) {
      throw new NotFoundError('No active sandbox simulation found.');
    }

    if (sim.status !== 'DECISION_OPEN') {
      throw new ValidationError('Simulation is not in DECISION_OPEN status.');
    }

    // Verify decision exists
    const decision = await prisma.decision.findUnique({
      where: {
        simulationId_round: {
          simulationId: sim.id,
          round: sim.currentRound
        }
      }
    });

    if (!decision || !decision.submitted) {
      throw new ValidationError('Decisions must be submitted before running simulation.');
    }

    // Calculate waitHours
    let waitHours = 0;
    if (authReq.user!.role === 'INDIVIDUAL') {
      const activeSub = await prisma.subscription.findFirst({
        where: { userId, status: 'active' },
        include: { plan: true }
      });
      const duration = activeSub?.plan?.durationDays || 30;
      // 15 days plan -> 12 hours wait per round, 30 days -> 24 hours wait
      waitHours = duration === 15 ? 12 : 24;
    } else if (authReq.user!.role === 'ADMIN') {
      // Check custom scenario timing rule
      const timingRule = cls.scenario.trendRefreshFrequency || 'instant';
      if (timingRule === '24h') {
        waitHours = 24;
      } else if (timingRule.startsWith('custom_')) {
        waitHours = parseInt(timingRule.replace('custom_', '')) || 0;
      }
    }

    if (waitHours > 0) {
      const nextResultAt = new Date(Date.now() + waitHours * 3600 * 1000);

      // Lock state to PROCESSING
      await prisma.simulationState.update({
        where: { id: sim.id },
        data: { status: 'PROCESSING' }
      });

      const progress = await prisma.studentSimulationProgress.update({
        where: { simulationId: sim.id },
        data: {
          status: 'PROCESSING',
          lastSubmittedAt: new Date(),
          nextResultAt
        }
      });

      await logAudit(userId, 'run scheduled', `Scheduled sandbox round ${sim.currentRound} with ${waitHours}h delay.`);

      return reply.status(200).send({
        success: true,
        instant: false,
        nextResultAt,
        progress
      });
    } else {
      // Instant run
      await prisma.simulationState.update({
        where: { id: sim.id },
        data: { status: 'LOCKED' } // engine expects LOCKED
      });

      const result = await processSimulationRound(sim.id);

      await logAudit(userId, 'report generated', `Processed sandbox simulation round ${sim.currentRound} instantly.`);

      return reply.status(200).send({
        success: true,
        instant: true,
        result
      });
    }
  });

  /**
   * POST /api/v1/sandbox/fast-forward
   */
  fastify.post('/fast-forward', async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    checkRole(authReq);
    const userId = authReq.user!.id;

    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenError('Fast-forward is disabled in production.');
    }

    const inviteCode = `SANDBOX-${userId}`;
    const cls = await prisma.class.findUnique({
      where: { inviteCode }
    });

    if (!cls) {
      throw new NotFoundError('No sandbox classroom found.');
    }

    const sim = await prisma.simulationState.findFirst({
      where: { userId, classId: cls.id }
    });

    if (!sim) {
      throw new NotFoundError('No active sandbox simulation found.');
    }

    // Advance instantly by forcing status to LOCKED
    await prisma.simulationState.update({
      where: { id: sim.id },
      data: { status: 'LOCKED' }
    });

    const result = await processSimulationRound(sim.id);

    await logAudit(userId, 'report generated', `Fast-forwarded and processed round ${sim.currentRound}.`);

    return reply.status(200).send({
      success: true,
      result
    });
  });

  /**
   * GET /api/v1/sandbox/report
   */
  fastify.get('/report', async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    checkRole(authReq);
    const userId = authReq.user!.id;

    const inviteCode = `SANDBOX-${userId}`;
    const cls = await prisma.class.findUnique({
      where: { inviteCode }
    });

    if (!cls) {
      throw new NotFoundError('No sandbox simulation classroom found.');
    }

    const state = await prisma.simulationState.findFirst({
      where: { userId, classId: cls.id },
      include: {
        class: {
          include: {
            scenario: true
          }
        }
      }
    });

    if (!state) {
      throw new NotFoundError('No sandbox simulation state found.');
    }

    const metrics = await prisma.dailyMetric.findMany({
      where: { simulationId: state.id },
      orderBy: { day: 'asc' }
    });

    const breakdowns = await prisma.scoreBreakdown.findMany({
      where: { simulationId: state.id },
      orderBy: { round: 'asc' }
    });

    // Compute totals
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalCost = 0;
    let totalConversions = 0;
    let totalRevenue = 0;

    for (const m of metrics) {
      totalImpressions += m.googleImpressions + m.metaImpressions;
      totalClicks += m.googleClicks + m.metaClicks;
      totalCost += m.googleCost + m.metaCost;
      totalConversions += m.googleConversions + m.metaConversions;
      totalRevenue += m.revenue;
    }

    const summary = {
      impressions: totalImpressions,
      clicks: totalClicks,
      cost: totalCost,
      conversions: totalConversions,
      revenue: totalRevenue,
      spend: totalCost,
      roas: totalCost > 0 ? parseFloat((totalRevenue / totalCost).toFixed(2)) : 0,
      cpc: totalClicks > 0 ? parseFloat((totalCost / totalClicks).toFixed(2)) : 0,
      ctr: totalImpressions > 0 ? parseFloat((totalClicks / totalImpressions).toFixed(4)) : 0,
      cpa: totalConversions > 0 ? parseFloat((totalCost / totalConversions).toFixed(2)) : 0,
      score: state.score,
      adaptability: breakdowns[breakdowns.length - 1]?.adaptability || 50
    };

    return reply.status(200).send({
      success: true,
      metrics,
      breakdowns,
      summary
    });
  });

  /**
   * GET /api/v1/sandbox/certificate/check
   */
  fastify.get('/certificate/check', async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    checkRole(authReq);
    const userId = authReq.user!.id;

    const inviteCode = `SANDBOX-${userId}`;
    const cls = await prisma.class.findUnique({
      where: { inviteCode }
    });

    if (!cls) {
      return reply.status(200).send({
        success: true,
        eligible: false,
        reasons: ['No active sandbox simulation setup.']
      });
    }

    const state = await prisma.simulationState.findFirst({
      where: { userId, classId: cls.id }
    });

    if (!state) {
      return reply.status(200).send({
        success: true,
        eligible: false,
        reasons: ['No sandbox simulation state found.']
      });
    }

    const eligibility = await checkCertificateEligibility(state.id);

    return reply.status(200).send({
      success: true,
      ...eligibility
    });
  });

  /**
   * POST /api/v1/sandbox/certificate/generate
   */
  fastify.post('/certificate/generate', async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    checkRole(authReq);
    const userId = authReq.user!.id;

    const inviteCode = `SANDBOX-${userId}`;
    const cls = await prisma.class.findUnique({
      where: { inviteCode }
    });

    if (!cls) {
      throw new NotFoundError('No sandbox classroom found.');
    }

    const sim = await prisma.simulationState.findFirst({
      where: { userId, classId: cls.id },
      include: { user: true, class: { include: { scenario: true } } }
    });

    if (!sim) {
      throw new NotFoundError('Simulation state not found.');
    }

    const eligibility = await checkCertificateEligibility(sim.id);
    if (!eligibility.eligible) {
      throw new ValidationError(`User is not eligible for a certificate. Reasons: ${eligibility.reasons.join(', ')}`);
    }

    // Check if certificate already exists
    let cert = await prisma.certificate.findFirst({
      where: { simulationId: sim.id }
    });

    const skills = ["SEO Optimization", "PPC Bidding Strategy", "Meta Ads Audiences", "ROAS Scaling", "Budget Pacing"];

    if (cert) {
      return reply.status(200).send({
        success: true,
        certificate: cert,
        downloadUrl: cert.pdfUrl
      });
    }

    const year = new Date().getFullYear();
    const random4 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const hash = crypto.createHash('sha256').update(sim.user.name + sim.id).digest('hex').substring(0, 8).toUpperCase();
    const verificationId = `DMSL-${year}-${random4}-${hash}`;

    const verificationHash = crypto.createHash('sha256').update(verificationId).digest('hex');
    const downloadUrl = `/api/certificates/${sim.id}/download`;

    // Generate the PDF
    await generateCertificatePDF(
      sim.user.name,
      sim.class.scenario.industry,
      eligibility.band,
      skills,
      verificationId,
      new Date()
    );

    cert = await prisma.certificate.create({
      data: {
        simulationId: sim.id,
        userId: sim.userId,
        recipientName: sim.user.name,
        verificationHash,
        verificationId,
        compositeScore: eligibility.compositeScore,
        pdfUrl: downloadUrl,
        band: eligibility.band,
        skills: JSON.stringify(skills)
      }
    });

    await logAudit(userId, 'certificate generated', `Generated certificate ${verificationId} with band ${eligibility.band}`);

    return reply.status(201).send({
      success: true,
      certificate: cert,
      downloadUrl
    });
  });
}
