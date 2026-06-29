import { FastifyInstance } from 'fastify';
import { requireAuth, requireRole, AuthenticatedRequest } from '../auth/middleware';
import { UserRole } from '../auth/roles';
import { prisma } from '../db/client';
import { z } from 'zod';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { processSimulationRound } from '../services/simulation/engine';
import { validateStateTransition, SimulationStatus } from '../services/simulation/state-machine';
import { searchKeywordBenchmarks } from '../seed/benchmarks';
import { notifyRoundComplete } from '../websocket/handlers/round-complete';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { generateCertificatePDF } from '../services/certificate/generator';
import { checkCertificateEligibility } from '../services/certificate/eligibility';
import { EVENTS_REGISTRY } from '../services/events/registry';
import { generateInsight, InsightPlatform } from '../services/ai/ollama-client';
import { scheduleRoundAdvancement } from '../jobs/queue';
import { trendClient } from '../services/trends/trend-client';
import { marketSignalBuilder } from '../services/trends/market-signal-builder';
import { config } from '../config';
import { logActivity, createNotification } from '../utils/audit';


export async function apiContractRoutes(fastify: FastifyInstance) {
  // ==========================================
  // 1. Simulation APIs
  // ==========================================

  /**
   * POST /api/simulations
   * Creates a simulation for the user
   */
  fastify.post('/api/simulations', {
    preHandler: [requireAuth],
    schema: {
      description: 'Creates a simulation state for the student user',
      tags: ['Simulation'],
      security: [{ cookieAuth: [] }],
      response: {
        200: {
          description: 'Existing simulation state returned',
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            classId: { type: 'string', nullable: true },
            status: { type: 'string' },
            currentRound: { type: 'number' },
            isCompleted: { type: 'boolean' }
          }
        },
        201: {
          description: 'Simulation state created successfully',
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            classId: { type: 'string', nullable: true },
            status: { type: 'string' },
            currentRound: { type: 'number' },
            isCompleted: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const classId = authReq.user!.classId;

    if (!classId) {
      throw new ValidationError('You must join a class cohort before starting a simulation.');
    }

    const existingState = await prisma.simulationState.findFirst({
      where: {
        userId: authReq.user!.id,
        classId: classId,
      },
    });

    if (existingState) {
      return reply.status(200).send(existingState);
    }

    const newState = await prisma.simulationState.create({
      data: {
        userId: authReq.user!.id,
        classId: classId,
        currentRound: 1,
        isCompleted: false,
        status: 'INITIALIZED',
      },
    });

    // Fetch class and scenario to set total duration days
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: { scenario: true }
    });
    const totalDays = cls?.scenario.durationDays || 30;

    await prisma.studentSimulationProgress.create({
      data: {
        simulationId: newState.id,
        currentDay: 1,
        totalDays,
        status: 'DECISION_OPEN'
      }
    });

    // Validate and transition INITIALIZED -> DECISION_OPEN
    validateStateTransition(SimulationStatus.INITIALIZED, SimulationStatus.DECISION_OPEN);
    const updatedState = await prisma.simulationState.update({
      where: { id: newState.id },
      data: { status: 'DECISION_OPEN' }
    });

    return reply.status(201).send(updatedState);
  });

  /**
   * GET /api/simulations
   * Gets all simulation states based on user role
   */
  fastify.get('/api/simulations', {
    preHandler: [requireAuth],
    schema: {
      description: 'Get all simulation states based on user role',
      tags: ['Simulation'],
      security: [{ cookieAuth: [] }],
      response: {
        200: {
          description: 'Simulation states list',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              classId: { type: 'string', nullable: true },
              status: { type: 'string' },
              currentRound: { type: 'number' },
              isCompleted: { type: 'boolean' },
              cumulativeSpend: { type: 'number', nullable: true },
              cumulativeRevenue: { type: 'number', nullable: true },
              score: { type: 'number', nullable: true }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { role, id: userId, classId } = authReq.user!;
    const userRole = role ? role.toUpperCase().replace('-', '_') : '';

    let simulations: any[] = [];

    try {
      if (userRole === UserRole.ADMIN || userRole === 'ADMIN') {
        simulations = await prisma.simulationState.findMany({
          orderBy: { createdAt: 'desc' }
        });
      } else if (userRole === UserRole.INSTRUCTOR || userRole === 'INSTRUCTOR') {
        simulations = await prisma.simulationState.findMany({
          where: {
            class: {
              instructorId: userId
            }
          },
          orderBy: { createdAt: 'desc' }
        });
      } else if (userRole === 'STUDENT_COLLEGE') {
        if (classId) {
          const enrollment = await prisma.classEnrollment.findFirst({
            where: { studentId: userId, classId }
          });
          if (enrollment && enrollment.status === 'ACTIVE') {
            simulations = await prisma.simulationState.findMany({
              where: {
                userId,
                classId
              },
              orderBy: { createdAt: 'desc' }
            });
          }
        }
      } else if (userRole === 'INDIVIDUAL') {
        simulations = await prisma.simulationState.findMany({
          where: {
            userId
          },
          orderBy: { createdAt: 'desc' }
        });
      }
      
      const mapped = (simulations || []).map(sim => ({
        id: sim.id,
        userId: sim.userId,
        classId: sim.classId || null,
        status: sim.status || 'INITIALIZED',
        currentRound: sim.currentRound ?? 1,
        isCompleted: !!sim.isCompleted,
        cumulativeSpend: sim.cumulativeSpend ?? 0.0,
        cumulativeRevenue: sim.cumulativeRevenue ?? 0.0,
        score: sim.score ?? 0.0
      }));

      return reply.status(200).send(mapped);
    } catch (err) {
      return reply.status(200).send([]);
    }
  });

  /**
   * POST /api/simulations/setup-sandbox
   * Sets up or resets a sandbox simulation with a chosen path (beginner, intermediate, advanced)
   */
  fastify.post('/api/simulations/setup-sandbox', {
    preHandler: [requireAuth],
    schema: {
      description: 'Sets up or resets a sandbox simulation with a chosen path',
      tags: ['Simulation'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        required: ['path'],
        properties: {
          path: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
          simulationType: { type: 'string', enum: ['SEO', 'GOOGLE_ADS', 'META_ADS', 'FULL'] }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            simulationId: { type: 'string' },
            status: { type: 'string' },
            currentRound: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const userId = authReq.user!.id;
    const { path, simulationType = 'FULL' } = request.body as { 
      path: 'beginner' | 'intermediate' | 'advanced';
      simulationType?: 'SEO' | 'GOOGLE_ADS' | 'META_ADS' | 'FULL';
    };

    // Define scenario details based on path
    let baseScenarioName = 'Global SaaS Marketing Challenge';
    let difficulty = 'medium';
    let budgetPerRound = 5000.0;
    let baselineOrganicTraffic = 1500;
    let targetKPI = 'revenue';
    let maxRounds = 10;
    let description = 'Acquire corporate customers for a collaborative cloud CRM tool in a competitive B2B space.';
    let industry = 'B2B Software';

    if (path === 'beginner') {
      baseScenarioName = 'Beginner SaaS Marketing Challenge';
      difficulty = 'easy';
      budgetPerRound = 8000.0;
      baselineOrganicTraffic = 2000;
      targetKPI = 'revenue';
      maxRounds = 10;
      description = 'A guided, high-budget sandbox track for learning core SEO and search ad campaign bidding strategy basics.';
      industry = 'B2B Software';
    } else if (path === 'advanced') {
      baseScenarioName = 'Advanced Fashion E-Commerce Blitz';
      difficulty = 'hard';
      budgetPerRound = 3500.0;
      baselineOrganicTraffic = 1000;
      targetKPI = 'conversions';
      maxRounds = 8;
      description = 'Scale traffic and conversions for a sustainable apparel brand in a highly volatile consumer fashion environment.';
      industry = 'Apparel E-Commerce';
    }

    // Determine allowed platforms
    let allowedPlatforms = '["SEO", "GOOGLE_ADS", "META_ADS"]';
    if (simulationType === 'SEO') {
      allowedPlatforms = '["SEO"]';
    } else if (simulationType === 'GOOGLE_ADS') {
      allowedPlatforms = '["GOOGLE_ADS"]';
    } else if (simulationType === 'META_ADS') {
      allowedPlatforms = '["META_ADS"]';
    }

    // Find or create the private scenario in the database for this specific user
    const privateScenarioName = `${path}_${simulationType}_${userId}`;
    let scenario = await prisma.scenario.findFirst({
      where: { name: privateScenarioName }
    });

    if (!scenario) {
      scenario = await prisma.scenario.create({
        data: {
          name: privateScenarioName,
          description,
          industry,
          startRound: 1,
          maxRounds,
          budgetPerRound,
          baselineOrganicTraffic,
          targetKPI,
          difficulty,
          allowedPlatforms
        }
      });
    } else {
      // Refresh the details to ensure they match current path and simulationType
      scenario = await prisma.scenario.update({
        where: { id: scenario.id },
        data: {
          description,
          industry,
          maxRounds,
          budgetPerRound,
          baselineOrganicTraffic,
          targetKPI,
          difficulty,
          allowedPlatforms
        }
      });
    }

    // Create private sandbox instructor if not exists
    let instructor = await prisma.user.findFirst({ where: { role: 'INSTRUCTOR' } });
    if (!instructor) {
      instructor = await prisma.user.create({
        data: {
          email: 'sandbox-instructor@simulation.com',
          emailVerified: true,
          name: 'Sandbox Instructor',
          role: 'INSTRUCTOR',
        }
      });
    }

    // Find or create private sandbox class cohort unique to this user
    const privateInviteCode = `SANDBOX-${userId}`;
    let sandboxClass = await prisma.class.findUnique({
      where: { inviteCode: privateInviteCode }
    });

    if (!sandboxClass) {
      sandboxClass = await prisma.class.create({
        data: {
          name: `Sandbox Cohort - ${authReq.user!.name}`,
          inviteCode: privateInviteCode,
          instructorId: instructor.id,
          scenarioId: scenario.id,
        }
      });
    } else {
      // Update private class to point to the private scenario
      sandboxClass = await prisma.class.update({
        where: { id: sandboxClass.id },
        data: { scenarioId: scenario.id }
      });
    }

    // Link user to their private sandbox class
    await prisma.user.update({
      where: { id: userId },
      data: { classId: sandboxClass.id }
    });

    // Delete any existing simulation state for this sandbox class so we start fresh
    await prisma.simulationState.deleteMany({
      where: { userId, classId: sandboxClass.id }
    });

    // Create fresh simulation state
    const newState = await prisma.simulationState.create({
      data: {
        userId,
        classId: sandboxClass.id,
        currentRound: 1,
        isCompleted: false,
        status: 'DECISION_OPEN',
      }
    });

    // Ensure student progress is initialized
    await prisma.studentSimulationProgress.upsert({
      where: { simulationId: newState.id },
      update: {
        currentDay: 1,
        totalDays: scenario.durationDays || 30,
        status: 'DECISION_OPEN'
      },
      create: {
        simulationId: newState.id,
        currentDay: 1,
        totalDays: scenario.durationDays || 30,
        status: 'DECISION_OPEN'
      }
    });

    return reply.status(200).send({
      success: true,
      simulationId: newState.id,
      status: newState.status,
      currentRound: newState.currentRound
    });
  });

  /**
   * GET /api/simulations/:id
   * Returns simulation state by ID
   */
  fastify.get('/api/simulations/:id', {
    preHandler: [requireAuth],
    schema: {
      description: 'Returns simulation state details by ID',
      tags: ['Simulation'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Simulation state details',
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            classId: { type: 'string', nullable: true },
            status: { type: 'string' },
            currentRound: { type: 'number' },
            isCompleted: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      id: z.string().uuid('Invalid Simulation ID format'),
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const sim = await prisma.simulationState.findUnique({
      where: { id: parsedParams.data.id },
      include: { progress: true },
    });

    if (!sim) {
      throw new NotFoundError('Simulation not found.');
    }

    // Owner or instructor check
    if (sim.userId !== authReq.user!.id && authReq.user!.role !== UserRole.INSTRUCTOR && authReq.user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Unauthorized to view this simulation state.');
    }

    return reply.status(200).send(sim);
  });

  /**
   * POST /api/simulations/:id/decisions
   * Saves SEO, Google Ads, and Meta Ads decisions in one unified call
   */
  fastify.post('/api/simulations/:id/decisions', {
    preHandler: [requireAuth],
    schema: {
      description: 'Saves SEO, Google Ads, and Meta Ads decisions in one unified call',
      tags: ['Simulation'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        properties: {
          seoTargetKeywords: { type: 'array', items: { type: 'string' } },
          seoContentQuality: { type: 'number', minimum: 1, maximum: 10 },
          seoBacklinkBudget: { type: 'number', minimum: 0 },
          googleCampaigns: { type: 'array', items: { type: 'object' } },
          metaCampaigns: { type: 'array', items: { type: 'object' } },
          seoMetaTitle: { type: 'string' },
          seoMetaDescription: { type: 'string' },
          seoBodyContent: { type: 'string' },
          seoUrlSlug: { type: 'string' },
          seoInternalLinks: { type: 'number' },
          seoAnchorText: { type: 'string' },
          seoBacklinkQuality: { type: 'number' },
          seoTechnicalConfig: { type: 'string' },
          seoCoreWebVitals: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'Decisions saved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            decision: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                simulationId: { type: 'string' },
                round: { type: 'number' },
                seoTargetKeywords: { type: 'array', items: { type: 'string' } },
                seoContentQuality: { type: 'number' },
                seoBacklinkBudget: { type: 'number' },
                googleCampaigns: { type: 'array', items: { type: 'object', additionalProperties: true } },
                metaCampaigns: { type: 'array', items: { type: 'object', additionalProperties: true } },
                seoMetaTitle: { type: 'string', nullable: true },
                seoMetaDescription: { type: 'string', nullable: true },
                seoBodyContent: { type: 'string', nullable: true },
                seoUrlSlug: { type: 'string', nullable: true },
                seoInternalLinks: { type: 'number', nullable: true },
                seoAnchorText: { type: 'string', nullable: true },
                seoBacklinkQuality: { type: 'number', nullable: true },
                seoTechnicalConfig: { type: 'string', nullable: true },
                seoCoreWebVitals: { type: 'string', nullable: true },
                submitted: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      id: z.string().uuid('Invalid Simulation ID format'),
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const sim = await prisma.simulationState.findUnique({
      where: { id: parsedParams.data.id },
      include: { class: { include: { scenario: true } } }
    });

    if (!sim) {
      throw new NotFoundError('Simulation not found.');
    }

    if (sim.userId !== authReq.user!.id) {
      throw new ForbiddenError('Unauthorized to modify decisions for this simulation.');
    }

    const bodySchema = z.object({
      seoTargetKeywords: z.array(z.string()).optional(),
      seoContentQuality: z.number().min(1).max(10).optional(),
      seoBacklinkBudget: z.number().nonnegative().optional(),
      googleCampaigns: z.array(z.any()).default([]),
      metaCampaigns: z.array(z.any()).default([]),
      seoMetaTitle: z.string().optional().nullable(),
      seoMetaDescription: z.string().optional().nullable(),
      seoBodyContent: z.string().optional().nullable(),
      seoUrlSlug: z.string().optional().nullable(),
      seoInternalLinks: z.number().optional().nullable(),
      seoAnchorText: z.string().optional().nullable(),
      seoBacklinkQuality: z.number().optional().nullable(),
      seoTechnicalConfig: z.string().optional().nullable(),
      seoCoreWebVitals: z.string().optional().nullable(),
    });

    const parsedBody = bodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      throw new ValidationError(parsedBody.error.errors[0].message);
    }

    const allowed = sim.class?.scenario?.allowedPlatforms
      ? JSON.parse(sim.class.scenario.allowedPlatforms)
      : ["SEO", "GOOGLE_ADS", "META_ADS"];

    // Dynamic Platform Validations
    if (allowed.includes("SEO")) {
      if (!parsedBody.data.seoTargetKeywords || parsedBody.data.seoTargetKeywords.length === 0) {
        throw new ValidationError("At least one target keyword is required for SEO.");
      }
      if (parsedBody.data.seoContentQuality === undefined || parsedBody.data.seoContentQuality === null) {
        throw new ValidationError("Content quality is required for SEO.");
      }
      if (parsedBody.data.seoBacklinkBudget === undefined || parsedBody.data.seoBacklinkBudget === null) {
        throw new ValidationError("Backlink budget is required for SEO.");
      }
    }

    // Default decisions if platform is disabled
    const finalSeoTargetKeywords = allowed.includes("SEO") ? parsedBody.data.seoTargetKeywords! : [];
    const finalSeoContentQuality = allowed.includes("SEO") ? parsedBody.data.seoContentQuality! : 5.0;
    const finalSeoBacklinkBudget = allowed.includes("SEO") ? parsedBody.data.seoBacklinkBudget! : 0.0;
    
    const finalGoogleCampaigns = allowed.includes("GOOGLE_ADS") ? parsedBody.data.googleCampaigns : [];
    const finalMetaCampaigns = allowed.includes("META_ADS") ? parsedBody.data.metaCampaigns : [];

    const finalSeoMetaTitle = allowed.includes("SEO") ? parsedBody.data.seoMetaTitle : null;
    const finalSeoMetaDescription = allowed.includes("SEO") ? parsedBody.data.seoMetaDescription : null;
    const finalSeoBodyContent = allowed.includes("SEO") ? parsedBody.data.seoBodyContent : null;
    const finalSeoUrlSlug = allowed.includes("SEO") ? parsedBody.data.seoUrlSlug : null;
    const finalSeoInternalLinks = allowed.includes("SEO") ? parsedBody.data.seoInternalLinks : 0;
    const finalSeoAnchorText = allowed.includes("SEO") ? parsedBody.data.seoAnchorText : null;
    const finalSeoBacklinkQuality = allowed.includes("SEO") ? parsedBody.data.seoBacklinkQuality : 1;
    const finalSeoTechnicalConfig = allowed.includes("SEO") ? parsedBody.data.seoTechnicalConfig : '{}';
    const finalSeoCoreWebVitals = allowed.includes("SEO") ? parsedBody.data.seoCoreWebVitals : '{}';

    const decision = await prisma.decision.upsert({
      where: {
        simulationId_round: {
          simulationId: sim.id,
          round: sim.currentRound
        }
      },
      update: {
        seoTargetKeywords: JSON.stringify(finalSeoTargetKeywords),
        seoContentQuality: finalSeoContentQuality,
        seoBacklinkBudget: finalSeoBacklinkBudget,
        googleCampaigns: JSON.stringify(finalGoogleCampaigns),
        metaCampaigns: JSON.stringify(finalMetaCampaigns),
        seoMetaTitle: finalSeoMetaTitle,
        seoMetaDescription: finalSeoMetaDescription,
        seoBodyContent: finalSeoBodyContent,
        seoUrlSlug: finalSeoUrlSlug,
        seoInternalLinks: finalSeoInternalLinks,
        seoAnchorText: finalSeoAnchorText,
        seoBacklinkQuality: finalSeoBacklinkQuality,
        seoTechnicalConfig: finalSeoTechnicalConfig,
        seoCoreWebVitals: finalSeoCoreWebVitals,
        submitted: true
      },
      create: {
        simulationId: sim.id,
        round: sim.currentRound,
        seoTargetKeywords: JSON.stringify(finalSeoTargetKeywords),
        seoContentQuality: finalSeoContentQuality,
        seoBacklinkBudget: finalSeoBacklinkBudget,
        googleCampaigns: JSON.stringify(finalGoogleCampaigns),
        metaCampaigns: JSON.stringify(finalMetaCampaigns),
        seoMetaTitle: finalSeoMetaTitle,
        seoMetaDescription: finalSeoMetaDescription,
        seoBodyContent: finalSeoBodyContent,
        seoUrlSlug: finalSeoUrlSlug,
        seoInternalLinks: finalSeoInternalLinks,
        seoAnchorText: finalSeoAnchorText,
        seoBacklinkQuality: finalSeoBacklinkQuality,
        seoTechnicalConfig: finalSeoTechnicalConfig,
        seoCoreWebVitals: finalSeoCoreWebVitals,
        submitted: true
      }
    });

    return reply.status(200).send({
      success: true,
      decision: {
        id: decision.id,
        round: decision.round,
        seoTargetKeywords: JSON.parse(decision.seoTargetKeywords),
        seoContentQuality: decision.seoContentQuality,
        seoBacklinkBudget: decision.seoBacklinkBudget,
        googleCampaigns: JSON.parse(decision.googleCampaigns),
        metaCampaigns: JSON.parse(decision.metaCampaigns),
        seoMetaTitle: decision.seoMetaTitle,
        seoMetaDescription: decision.seoMetaDescription,
        seoBodyContent: decision.seoBodyContent,
        seoUrlSlug: decision.seoUrlSlug,
        seoInternalLinks: decision.seoInternalLinks,
        seoAnchorText: decision.seoAnchorText,
        seoBacklinkQuality: decision.seoBacklinkQuality,
        seoTechnicalConfig: decision.seoTechnicalConfig,
        seoCoreWebVitals: decision.seoCoreWebVitals,
      }
    });
  });

  /**
   * POST /api/simulations/:id/advance
   * Locks and processes the round for the given simulation ID
   */
  fastify.post('/api/simulations/:id/advance', {
    preHandler: [requireAuth],
    schema: {
      description: 'Locks and processes the round for the given simulation ID',
      tags: ['Simulation'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Simulation round advanced successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            result: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                simulationId: { type: 'string' },
                roundAdvanced: { type: 'number' },
                nextRound: { type: 'number' },
                isCompleted: { type: 'boolean' },
                compositeIndex: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      id: z.string().uuid('Invalid Simulation ID format'),
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const sim = await prisma.simulationState.findUnique({
      where: { id: parsedParams.data.id },
    });

    if (!sim) {
      throw new NotFoundError('Simulation not found.');
    }

    if (sim.userId !== authReq.user!.id && authReq.user!.role !== UserRole.INSTRUCTOR && authReq.user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Unauthorized to advance this simulation.');
    }

    // Validate and transition DECISION_OPEN -> LOCKED
    validateStateTransition(sim.status as SimulationStatus, SimulationStatus.LOCKED);

    await prisma.simulationState.update({
      where: { id: sim.id },
      data: { status: 'LOCKED' }
    });

    const isDelayed = config.ROUND_PROCESSING_MODE === 'delayed';
    const delayMs = config.ROUND_DELAY_HOURS * 3600 * 1000;

    await prisma.studentSimulationProgress.upsert({
      where: { simulationId: sim.id },
      update: {
        status: 'LOCKED',
        lastSubmittedAt: new Date(),
        nextResultAt: isDelayed ? new Date(Date.now() + delayMs) : new Date()
      },
      create: {
        simulationId: sim.id,
        status: 'LOCKED',
        lastSubmittedAt: new Date(),
        nextResultAt: isDelayed ? new Date(Date.now() + delayMs) : new Date(),
        currentDay: sim.currentRound,
        totalDays: 30
      }
    });

    const queueResult = await scheduleRoundAdvancement(sim.id, sim.userId);

    return reply.status(200).send({
      success: true,
      result: queueResult.result || {
        success: true,
        simulationId: sim.id,
        roundAdvanced: sim.currentRound,
        nextRound: sim.currentRound + 1,
        isCompleted: false,
        compositeIndex: 0
      },
    });
  });


  /**
   * GET /api/simulations/:id/metrics
   * Returns DailyMetrics for the simulation
   */
  fastify.get('/api/simulations/:id/metrics', {
    preHandler: [requireAuth],
    schema: {
      description: 'Returns DailyMetrics for the simulation',
      tags: ['Simulation'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          round: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'List of daily metrics',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            metrics: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  simulationId: { type: 'string' },
                  round: { type: 'number' },
                  day: { type: 'number' },
                  organicImpressions: { type: 'number' },
                  organicClicks: { type: 'number' },
                  organicCTR: { type: 'number' },
                  organicConversions: { type: 'number' },
                  googleImpressions: { type: 'number' },
                  googleClicks: { type: 'number' },
                  googleCost: { type: 'number' },
                  googleConversions: { type: 'number' },
                  metaImpressions: { type: 'number' },
                  metaClicks: { type: 'number' },
                  metaCost: { type: 'number' },
                  metaConversions: { type: 'number' },
                  revenue: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      id: z.string().uuid('Invalid Simulation ID format'),
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const sim = await prisma.simulationState.findUnique({
      where: { id: parsedParams.data.id },
    });

    if (!sim) {
      throw new NotFoundError('Simulation not found.');
    }

    if (sim.userId !== authReq.user!.id && authReq.user!.role !== UserRole.INSTRUCTOR && authReq.user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Unauthorized to view metrics for this simulation.');
    }

    const querySchema = z.object({
      round: z.string().regex(/^\d+$/).transform(Number).optional()
    });

    const parsedQuery = querySchema.parse(request.query);

    const metrics = await prisma.dailyMetric.findMany({
      where: {
        simulationId: sim.id,
        ...(parsedQuery.round !== undefined ? { round: parsedQuery.round } : {})
      },
      orderBy: [{ round: 'asc' }, { day: 'asc' }]
    });

    return reply.status(200).send({
      success: true,
      metrics
    });
  });

  /**
   * GET /api/simulations/:id/snapshots
   * Returns all RoundSnapshot audit data for the simulation
   */
  fastify.get('/api/simulations/:id/snapshots', {
    preHandler: [requireAuth],
    schema: {
      description: 'Returns all RoundSnapshot audit data for the simulation',
      tags: ['Simulation'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'List of round snapshots',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            snapshots: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  round: { type: 'number' },
                  data: { type: 'object', additionalProperties: true },
                  createdAt: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      id: z.string().uuid('Invalid Simulation ID format'),
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const sim = await prisma.simulationState.findUnique({
      where: { id: parsedParams.data.id },
    });

    if (!sim) {
      throw new NotFoundError('Simulation not found.');
    }

    if (sim.userId !== authReq.user!.id && authReq.user!.role !== UserRole.INSTRUCTOR && authReq.user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Unauthorized to view snapshots for this simulation.');
    }

    const snapshots = await prisma.roundSnapshot.findMany({
      where: { simulationId: sim.id },
      orderBy: { round: 'asc' }
    });

    return reply.status(200).send({
      success: true,
      snapshots: snapshots.map(s => ({
        id: s.id,
        round: s.round,
        data: JSON.parse(s.data),
        createdAt: s.createdAt
      }))
    });
  });

  // ==========================================
  // 2. SEO routes
  // ==========================================

  /**
   * GET /api/seo/keywords
   * Returns keyword list with industry/search filters
   */
  fastify.get('/api/seo/keywords', {
    preHandler: [requireAuth],
    schema: {
      description: 'Returns keyword list with industry/search filters',
      tags: ['SEO'],
      security: [{ cookieAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          industry: { type: 'string' },
          search: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'Filtered list of keywords',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            keywords: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  keyword: { type: 'string' },
                  searchVolume: { type: 'number' },
                  difficulty: { type: 'number' },
                  cpc: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const querySchema = z.object({
      industry: z.string().optional(),
      search: z.string().optional(),
    });

    const parsedQuery = querySchema.parse(request.query);
    const keywords = searchKeywordBenchmarks(parsedQuery.search || '', 100);

    let filtered = keywords;
    if (parsedQuery.industry) {
      const cleanInd = parsedQuery.industry.toLowerCase();
      filtered = keywords.filter(k => k.keyword.includes(cleanInd));
    }

    return reply.status(200).send({
      success: true,
      keywords: filtered
    });
  });

  /**
   * GET /api/seo/metrics/:simulationId
   * Returns SEO metrics (DA, PA, keyword rankings) for the simulation
   */
  fastify.get('/api/seo/metrics/:simulationId', {
    preHandler: [requireAuth],
    schema: {
      description: 'Returns SEO metrics (DA, PA, keyword rankings) for the simulation',
      tags: ['SEO'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          simulationId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'SEO metrics',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            metrics: { type: 'object', additionalProperties: true }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      simulationId: z.string().uuid('Invalid Simulation ID format'),
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const sim = await prisma.simulationState.findUnique({
      where: { id: parsedParams.data.simulationId },
      include: {
        decisions: { orderBy: { round: 'desc' }, take: 1 },
      }
    });

    if (!sim) {
      throw new NotFoundError('Simulation not found.');
    }

    if (sim.userId !== authReq.user!.id && authReq.user!.role !== UserRole.INSTRUCTOR && authReq.user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Unauthorized.');
    }

    // Default stats if no decisions made
    const decision = sim.decisions[0];
    const keywords = decision ? JSON.parse(decision.seoTargetKeywords) : [];

    return reply.status(200).send({
      success: true,
      metrics: {
        simulationId: sim.id,
        currentRound: sim.currentRound,
        keywords,
        seoBacklinkBudget: decision?.seoBacklinkBudget || 0.0,
        seoContentQuality: decision?.seoContentQuality || 5.0,
      }
    });
  });

  // ==========================================
  // 3. Google Ads routes
  // ==========================================

  /**
   * GET /api/google-ads/benchmarks
   * Returns CPC/CTR benchmark data
   */
  fastify.get('/api/google-ads/benchmarks', {
    preHandler: [requireAuth],
    schema: {
      description: 'Returns Google Ads keyword benchmarks (average CPC, competition index)',
      tags: ['Google Ads'],
      security: [{ cookieAuth: [] }],
      response: {
        200: {
          description: 'Keyword benchmarks',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            benchmarks: { type: 'array', items: { type: 'object', additionalProperties: true } }
          }
        }
      }
    }
  }, async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      benchmarks: [
        { keyword: 'best crm software', averageCPC: 4.50, competition: 0.85 },
        { keyword: 'top sales dashboard', averageCPC: 3.20, competition: 0.65 },
        { keyword: 'enterprise marketing solution', averageCPC: 5.10, competition: 0.90 },
      ]
    });
  });

  /**
   * POST /api/google-ads/decisions
   * Aliases simulation decision submission specifically for Google Ads
   */
  fastify.post('/api/google-ads/decisions', {
    preHandler: [requireAuth],
    schema: {
      description: 'Saves Google Ads campaign decisions specifically',
      tags: ['Google Ads'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        required: ['simulationId', 'googleCampaigns'],
        properties: {
          simulationId: { type: 'string', format: 'uuid' },
          googleCampaigns: { type: 'array', items: { type: 'object' } }
        }
      },
      response: {
        200: {
          description: 'Google Ads decisions updated successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            decision: { type: 'object', additionalProperties: true }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const bodySchema = z.object({
      simulationId: z.string().uuid(),
      googleCampaigns: z.array(z.any()),
    });

    const parsedBody = bodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      throw new ValidationError(parsedBody.error.errors[0].message);
    }

    const sim = await prisma.simulationState.findUnique({
      where: { id: parsedBody.data.simulationId }
    });

    if (!sim) {
      throw new NotFoundError('Simulation not found.');
    }

    if (sim.userId !== authReq.user!.id) {
      throw new ForbiddenError('Unauthorized.');
    }

    const decision = await prisma.decision.upsert({
      where: {
        simulationId_round: {
          simulationId: sim.id,
          round: sim.currentRound
        }
      },
      update: {
        googleCampaigns: JSON.stringify(parsedBody.data.googleCampaigns),
      },
      create: {
        simulationId: sim.id,
        round: sim.currentRound,
        seoTargetKeywords: JSON.stringify([]),
        seoContentQuality: 5.0,
        seoBacklinkBudget: 0.0,
        googleCampaigns: JSON.stringify(parsedBody.data.googleCampaigns),
        metaCampaigns: JSON.stringify([])
      }
    });

    return reply.status(200).send({
      success: true,
      decision
    });
  });

  /**
   * GET /api/google-ads/metrics/:simulationId
   * Returns Google Ads metrics
   */
  fastify.get('/api/google-ads/metrics/:simulationId', {
    preHandler: [requireAuth],
    schema: {
      description: 'Returns aggregated Google Ads metrics for the simulation',
      tags: ['Google Ads'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          simulationId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Google Ads aggregated metrics',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            metrics: { type: 'object', additionalProperties: true }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      simulationId: z.string().uuid('Invalid Simulation ID format'),
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const sim = await prisma.simulationState.findUnique({
      where: { id: parsedParams.data.simulationId }
    });

    if (!sim) {
      throw new NotFoundError('Simulation not found.');
    }

    if (sim.userId !== authReq.user!.id && authReq.user!.role !== UserRole.INSTRUCTOR && authReq.user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Unauthorized.');
    }

    const metrics = await prisma.dailyMetric.findMany({
      where: { simulationId: parsedParams.data.simulationId },
      orderBy: { round: 'asc' }
    });

    const totalCost = metrics.reduce((sum, m) => sum + m.googleCost, 0);
    const totalClicks = metrics.reduce((sum, m) => sum + m.googleClicks, 0);
    const totalImpressions = metrics.reduce((sum, m) => sum + m.googleImpressions, 0);
    const totalConversions = metrics.reduce((sum, m) => sum + m.googleConversions, 0);

    return reply.status(200).send({
      success: true,
      metrics: {
        cost: totalCost,
        clicks: totalClicks,
        impressions: totalImpressions,
        conversions: totalConversions,
        averageCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) : 0,
      }
    });
  });

  // ==========================================
  // 4. Meta Ads routes
  // ==========================================

  /**
   * GET /api/meta-ads/audiences
   * Returns seeded interest audiences
   */
  fastify.get('/api/meta-ads/audiences', {
    preHandler: [requireAuth],
    schema: {
      description: 'Returns seeded Meta Ads target interest audiences and sizes',
      tags: ['Meta Ads'],
      security: [{ cookieAuth: [] }],
      response: {
        200: {
          description: 'Interest audiences list',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            audiences: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  size: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  }, async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      audiences: [
        { id: 'business-owners', name: 'Business Owners', size: 1000000 },
        { id: 'tech-enthusiasts', name: 'Tech Enthusiasts', size: 1500000 },
        { id: 'fashion-lifestyle', name: 'Fashion & Lifestyle', size: 2000000 },
        { id: 'general-broad', name: 'General Broad', size: 3500000 },
      ]
    });
  });

  /**
   * GET /api/meta-ads/placements
   * Returns CPM placement data
   */
  fastify.get('/api/meta-ads/placements', {
    preHandler: [requireAuth],
    schema: {
      description: 'Returns seeded Meta Ads placements and baseline CPM values',
      tags: ['Meta Ads'],
      security: [{ cookieAuth: [] }],
      response: {
        200: {
          description: 'Placements list',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            placements: { type: 'array', items: { type: 'object', additionalProperties: true } }
          }
        }
      }
    }
  }, async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      placements: [
        { id: 'feed', name: 'Facebook & Instagram Feeds', baseCPM: 12.50 },
        { id: 'stories', name: 'Stories (Facebook, Instagram)', baseCPM: 8.50 },
        { id: 'reels', name: 'Reels Overlay', baseCPM: 10.00 },
        { id: 'auto', name: 'Advantage+ Placements', baseCPM: 9.00 },
      ]
    });
  });

  /**
   * GET /api/meta-ads/metrics/:simulationId
   * Returns Meta Ads metrics
   */
  fastify.get('/api/meta-ads/metrics/:simulationId', {
    preHandler: [requireAuth],
    schema: {
      description: 'Returns aggregated Meta Ads metrics for the simulation',
      tags: ['Meta Ads'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          simulationId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Meta Ads aggregated metrics',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            metrics: { type: 'object', additionalProperties: true }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      simulationId: z.string().uuid('Invalid Simulation ID format'),
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const sim = await prisma.simulationState.findUnique({
      where: { id: parsedParams.data.simulationId }
    });

    if (!sim) {
      throw new NotFoundError('Simulation not found.');
    }

    if (sim.userId !== authReq.user!.id && authReq.user!.role !== UserRole.INSTRUCTOR && authReq.user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Unauthorized.');
    }

    const metrics = await prisma.dailyMetric.findMany({
      where: { simulationId: parsedParams.data.simulationId },
      orderBy: { round: 'asc' }
    });

    const totalCost = metrics.reduce((sum, m) => sum + m.metaCost, 0);
    const totalClicks = metrics.reduce((sum, m) => sum + m.metaClicks, 0);
    const totalImpressions = metrics.reduce((sum, m) => sum + m.metaImpressions, 0);
    const totalConversions = metrics.reduce((sum, m) => sum + m.metaConversions, 0);

    return reply.status(200).send({
      success: true,
      metrics: {
        cost: totalCost,
        clicks: totalClicks,
        impressions: totalImpressions,
        conversions: totalConversions,
        averageCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) : 0,
      }
    });
  });

  // ==========================================
  // 5. Instructor Class APIs
  // ==========================================

  /**
   * POST /api/classes
   * Creates a class room (Guarded by INSTRUCTOR / ADMIN role check)
   */
  fastify.post('/api/classes', {
    preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])],
    schema: {
      description: 'Creates a class room cohort',
      tags: ['Instructor'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'scenarioId'],
        properties: {
          name: { type: 'string', minLength: 1 },
          scenarioId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        201: {
          description: 'Class room created successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            class: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                inviteCode: { type: 'string' },
                instructorId: { type: 'string' },
                scenarioId: { type: 'string', nullable: true }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const bodySchema = z.object({
      name: z.string().min(1, 'Class name is required'),
      scenarioId: z.string().uuid('Invalid Scenario ID format'),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const scenario = await prisma.scenario.findUnique({
      where: { id: parsed.data.scenarioId }
    });

    if (!scenario) {
      throw new NotFoundError('Scenario template not found.');
    }

    const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    const newClass = await prisma.class.create({
      data: {
        name: parsed.data.name,
        inviteCode,
        instructorId: authReq.user!.id,
        scenarioId: parsed.data.scenarioId,
      }
    });

    return reply.status(201).send({
      success: true,
      class: newClass
    });
  });

  /**
   * GET /api/classes
   * Lists instructor's classes
   */
  fastify.get('/api/classes', {
    preHandler: [requireAuth],
    schema: {
      description: "Lists instructor's classes, or student's enrolled class",
      tags: ['Instructor'],
      security: [{ cookieAuth: [] }],
      response: {
        200: {
          description: 'Classes list',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            classes: { type: 'array', items: { type: 'object', additionalProperties: true } }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const role = authReq.user!.role;

    try {
      if (role === UserRole.ADMIN || role === 'ADMIN') {
        // Admin sees all classes
        const classes = await prisma.class.findMany({
          include: {
            scenario: true,
            instructor: {
              select: { id: true, name: true, email: true }
            },
            _count: { select: { students: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
        return reply.status(200).send({ success: true, classes });
      }

      if (role === UserRole.INSTRUCTOR || role === 'INSTRUCTOR') {
        const classes = await prisma.class.findMany({
          where: { instructorId: authReq.user!.id },
          include: {
            scenario: true,
            _count: { select: { students: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
        return reply.status(200).send({ success: true, classes });
      }

      // Student gets their enrolled class
      const classId = authReq.user!.classId;
      if (!classId) return reply.status(200).send({ success: true, classes: [] });

      const studentClass = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          scenario: true,
          instructor: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return reply.status(200).send({
        success: true,
        classes: studentClass ? [studentClass] : []
      });
    } catch (err) {
      return reply.status(200).send({ success: true, classes: [] });
    }
  });

  /**
   * GET /api/classes/:id/students
   * Returns students enrolled in the class room
   */
  fastify.get('/api/classes/:id/students', {
    preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])],
    schema: {
      description: 'Returns students enrolled in the class room',
      tags: ['Instructor'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'List of students',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            students: { type: 'array', items: { type: 'object', additionalProperties: true } }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const targetClass = await prisma.class.findUnique({
      where: { id: parsedParams.data.id }
    });

    if (!targetClass) {
      throw new NotFoundError('Class not found.');
    }

    if (targetClass.instructorId !== authReq.user!.id && authReq.user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Unauthorized to view this class.');
    }

    const students = await prisma.user.findMany({
      where: { classId: targetClass.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    return reply.status(200).send({
      success: true,
      students
    });
  });

  /**
   * POST /api/classes/:id/reset
   * Resets all student simulations in that class
   */
  fastify.post('/api/classes/:id/reset', {
    preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])],
    schema: {
      description: 'Resets all student simulations in that class room',
      tags: ['Instructor'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'All simulations reset',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const targetClass = await prisma.class.findUnique({
      where: { id: parsedParams.data.id }
    });

    if (!targetClass) {
      throw new NotFoundError('Class not found.');
    }

    if (targetClass.instructorId !== authReq.user!.id && authReq.user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Unauthorized.');
    }

    // Delete all simulation states for this class. Cascades will delete decisions, metrics, etc.
    await prisma.simulationState.deleteMany({
      where: { classId: targetClass.id }
    });

    return reply.status(200).send({
      success: true,
      message: 'All student simulations in this class have been reset successfully.'
    });
  });

  // ==========================================
  // 6. Scenario APIs
  // ==========================================

  /**
   * POST /api/scenarios
   * Creates scenario template
   */
  fastify.post('/api/scenarios', {
    preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])],
    schema: {
      description: 'Creates a new scenario template',
      tags: ['Scenario'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'description', 'industry', 'budgetPerRound'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          industry: { type: 'string' },
          budgetPerRound: { type: 'number' },
          startRound: { type: 'number' },
          maxRounds: { type: 'number' },
          baselineOrganicTraffic: { type: 'number' },
          targetKPI: { type: 'string', enum: ['revenue', 'clicks', 'conversions'] },
          allowedPlatforms: { type: 'string' }
        }
      },
      response: {
        201: {
          description: 'Scenario created successfully',
          type: 'object',
          additionalProperties: true
        }
      }
    }
  }, async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(1),
      description: z.string().min(1),
      industry: z.string().min(1),
      budgetPerRound: z.number().positive(),
      startRound: z.number().int().positive().default(1),
      maxRounds: z.number().int().positive().default(10),
      baselineOrganicTraffic: z.number().int().positive().default(1000),
      targetKPI: z.enum(['revenue', 'clicks', 'conversions']).default('revenue'),
      allowedPlatforms: z.string().optional()
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const scenario = await prisma.scenario.create({
      data: parsed.data
    });

    return reply.status(201).send(scenario);
  });

  /**
   * GET /api/scenarios
   * Lists scenarios
   */
  fastify.get('/api/scenarios', { preHandler: [requireAuth] }, async (_request, reply) => {
    let scenarios = await prisma.scenario.findMany({
      orderBy: { name: 'asc' }
    });
    
    if (scenarios.length === 0) {
      await prisma.scenario.createMany({
        data: [
          {
            name: 'Global SaaS Marketing Challenge',
            description: 'Acquire corporate customers for a collaborative cloud CRM tool in a competitive B2B space.',
            industry: 'B2B Software',
            startRound: 1,
            maxRounds: 10,
            budgetPerRound: 5000.0,
            baselineOrganicTraffic: 1500,
            targetKPI: 'revenue',
            difficulty: 'medium',
          },
          {
            name: 'Fashion Retail E-Commerce Blitz',
            description: 'Scale organic and paid social traffic for a sustainable custom apparel brand.',
            industry: 'Apparel E-Commerce',
            startRound: 1,
            maxRounds: 8,
            budgetPerRound: 3500.0,
            baselineOrganicTraffic: 3000,
            targetKPI: 'conversions',
            difficulty: 'medium',
          }
        ]
      });
      scenarios = await prisma.scenario.findMany({
        orderBy: { name: 'asc' }
      });
    }

    return reply.status(200).send(scenarios);
  });

  /**
   * GET /api/scenarios/:id
   * Returns details of a scenario
   */
  fastify.get('/api/scenarios/:id', {
    preHandler: [requireAuth],
    schema: {
      description: 'Returns details of a scenario template by ID',
      tags: ['Scenario'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Scenario details',
          type: 'object'
        }
      }
    }
  }, async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid()
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const scenario = await prisma.scenario.findUnique({
      where: { id: parsedParams.data.id }
    });

    if (!scenario) {
      throw new NotFoundError('Scenario not found.');
    }

    return reply.status(200).send(scenario);
  });

  /**
   * POST /api/scenarios/:id/assign
   * Assigns a scenario to a class
   */
  fastify.post('/api/scenarios/:id/assign', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      id: z.string().uuid()
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const bodySchema = z.object({
      classId: z.string().uuid()
    });

    const parsedBody = bodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      throw new ValidationError(parsedBody.error.errors[0].message);
    }

    const targetClass = await prisma.class.findUnique({
      where: { id: parsedBody.data.classId }
    });

    if (!targetClass) {
      throw new NotFoundError('Class not found.');
    }

    if (targetClass.instructorId !== authReq.user!.id && authReq.user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Unauthorized.');
    }

    const updatedClass = await prisma.class.update({
      where: { id: targetClass.id },
      data: { scenarioId: parsedParams.data.id }
    });

    return reply.status(200).send({
      success: true,
      class: updatedClass
    });
  });

  // ==========================================
  // 7. Audit APIs
  // ==========================================

  /**
   * GET /api/audit/simulations/:id/trail
   * Returns audit trail of decisions for the simulation
   */
  fastify.get('/api/audit/simulations/:id/trail', {
    preHandler: [requireAuth],
    schema: {
      description: 'Returns audit trail of decisions for the simulation',
      tags: ['Audit'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Audit trail decisions',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            decisions: { type: 'array', items: { type: 'object', additionalProperties: true } }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      id: z.string().uuid()
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const sim = await prisma.simulationState.findUnique({
      where: { id: parsedParams.data.id }
    });

    if (!sim) throw new NotFoundError('Simulation not found.');

    if (sim.userId !== authReq.user!.id && authReq.user!.role !== UserRole.INSTRUCTOR && authReq.user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Unauthorized.');
    }

    const decisions = await prisma.decision.findMany({
      where: { simulationId: sim.id },
      orderBy: { round: 'asc' }
    });

    return reply.status(200).send({
      success: true,
      decisions: decisions.map(d => ({
        round: d.round,
        seoTargetKeywords: JSON.parse(d.seoTargetKeywords),
        seoContentQuality: d.seoContentQuality,
        seoBacklinkBudget: d.seoBacklinkBudget,
        googleCampaigns: JSON.parse(d.googleCampaigns),
        metaCampaigns: JSON.parse(d.metaCampaigns),
        createdAt: d.createdAt
      }))
    });
  });

  /**
   * GET /api/audit/simulations/:id/states
   * Returns past states/snapshots
   */
  fastify.get('/api/audit/simulations/:id/states', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      id: z.string().uuid()
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const sim = await prisma.simulationState.findUnique({
      where: { id: parsedParams.data.id }
    });

    if (!sim) throw new NotFoundError('Simulation not found.');

    if (sim.userId !== authReq.user!.id && authReq.user!.role !== UserRole.INSTRUCTOR && authReq.user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Unauthorized.');
    }

    const snapshots = await prisma.roundSnapshot.findMany({
      where: { simulationId: sim.id },
      orderBy: { round: 'asc' }
    });

    return reply.status(200).send({
      success: true,
      states: snapshots.map(s => ({
        round: s.round,
        data: JSON.parse(s.data),
        createdAt: s.createdAt
      }))
    });
  });

  /**
   * GET /api/audit/scoring/:id/breakdown
   * Returns score breakdowns for the simulation
   */
  fastify.get('/api/audit/scoring/:id/breakdown', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      id: z.string().uuid()
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const sim = await prisma.simulationState.findUnique({
      where: { id: parsedParams.data.id }
    });

    if (!sim) throw new NotFoundError('Simulation not found.');

    if (sim.userId !== authReq.user!.id && authReq.user!.role !== UserRole.INSTRUCTOR && authReq.user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Unauthorized.');
    }

    const breakdowns = await prisma.scoreBreakdown.findMany({
      where: { simulationId: sim.id },
      orderBy: { round: 'asc' }
    });

    return reply.status(200).send({
      success: true,
      breakdowns
    });
  });

  /**
   * GET /api/audit/students/:studentId/comparison
   * Returns cohort comparison metrics for a student
   */
  fastify.get('/api/audit/students/:studentId/comparison', {
    preHandler: [requireAuth],
    schema: {
      description: 'Returns cohort comparison metrics for a student',
      tags: ['Audit'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          studentId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Student cohort comparison details',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            comparison: { type: 'object', additionalProperties: true }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      studentId: z.string().uuid()
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const studentId = parsedParams.data.studentId;

    if (studentId !== authReq.user!.id && authReq.user!.role !== UserRole.INSTRUCTOR && authReq.user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Unauthorized.');
    }

    const sim = await prisma.simulationState.findFirst({
      where: { userId: studentId },
      include: {
        scoreBreakdowns: { orderBy: { round: 'desc' }, take: 1 }
      }
    });

    if (!sim) {
      throw new NotFoundError('Simulation state not found for student.');
    }

    const cohortSims = await prisma.simulationState.findMany({
      where: { classId: sim.classId }
    });

    const studentScore = sim.score;
    const classScores = cohortSims.map(s => s.score);
    const classAverage = classScores.reduce((sum, val) => sum + val, 0) / classScores.length;

    return reply.status(200).send({
      success: true,
      comparison: {
        studentId,
        studentScore,
        classAverage: parseFloat(classAverage.toFixed(2)),
        percentile: sim.scoreBreakdowns?.[0]?.percentileRank || 100.0
      }
    });
  });

  // ==========================================
  // 8. Certification Routes
  // ==========================================

  fastify.get('/api/certificates/check-eligibility', {
    preHandler: [requireAuth],
    schema: {
      description: 'Checks certificate eligibility for the current simulation state (GET)',
      tags: ['Certificate'],
      security: [{ cookieAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          simulationId: { type: 'string', nullable: true }
        }
      },
      response: {
        200: {
          description: 'Certificate eligibility status',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            eligible: { type: 'boolean' },
            reasons: { type: 'array', items: { type: 'string' } },
            reason: { type: 'string', nullable: true },
            requirements: { type: 'array', items: { type: 'string' }, nullable: true },
            band: { type: 'string' },
            compositeScore: { type: 'number' },
            strategicConsistency: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    
    let simulationId: string | undefined;
    if (request.query && typeof request.query === 'object') {
      const query = request.query as any;
      simulationId = query.simulationId;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!simulationId || !uuidRegex.test(simulationId)) {
      const sim = await prisma.simulationState.findFirst({
        where: { userId: authReq.user!.id, classId: authReq.user!.classId || undefined }
      });
      if (!sim) {
        return reply.status(200).send({
          success: true,
          eligible: false,
          reasons: ['No completed simulation yet'],
          reason: 'No completed simulation yet',
          requirements: [],
          band: 'None',
          compositeScore: 0,
          strategicConsistency: 0
        });
      }
      simulationId = sim.id;
    }

    let check;
    try {
      check = await checkCertificateEligibility(simulationId);
    } catch (err) {
      check = {
        eligible: false,
        reasons: ['No completed simulation yet.'],
        band: 'None',
        compositeScore: 0,
        strategicConsistency: 0
      };
    }

    return reply.status(200).send({
      success: true,
      eligible: check.eligible,
      reasons: check.reasons || [],
      reason: check.reasons?.join(', ') || 'No completed simulation yet',
      requirements: check.reasons || [],
      band: check.band || 'None',
      compositeScore: check.compositeScore || 0,
      strategicConsistency: check.strategicConsistency || 0
    });
  });

  fastify.post('/api/certificates/check-eligibility', {
    preHandler: [requireAuth],
    preValidation: (request, reply, done) => {
      if (!request.body) {
        request.body = {};
      }
      done();
    },
    schema: {
      description: 'Checks certificate eligibility for the current simulation state',
      tags: ['Certificate'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        properties: {
          simulationId: { type: 'string', nullable: true }
        }
      },
      response: {
        200: {
          description: 'Certificate eligibility status',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            eligible: { type: 'boolean' },
            reasons: { type: 'array', items: { type: 'string' } },
            reason: { type: 'string', nullable: true },
            requirements: { type: 'array', items: { type: 'string' }, nullable: true },
            band: { type: 'string' },
            compositeScore: { type: 'number' },
            strategicConsistency: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    
    let simulationId: string | undefined;
    if (request.body && typeof request.body === 'object') {
      const body = request.body as any;
      simulationId = body.simulationId;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!simulationId || !uuidRegex.test(simulationId)) {
      const sim = await prisma.simulationState.findFirst({
        where: { userId: authReq.user!.id, classId: authReq.user!.classId || undefined }
      });
      if (!sim) {
        return reply.status(200).send({
          success: true,
          eligible: false,
          reasons: ['No completed simulation yet'],
          reason: 'No completed simulation yet',
          requirements: [],
          band: 'None',
          compositeScore: 0,
          strategicConsistency: 0
        });
      }
      simulationId = sim.id;
    }

    let check;
    try {
      check = await checkCertificateEligibility(simulationId);
    } catch (err) {
      check = {
        eligible: false,
        reasons: ['No completed simulation yet.'],
        band: 'None',
        compositeScore: 0,
        strategicConsistency: 0
      };
    }

    return reply.status(200).send({
      success: true,
      eligible: check.eligible,
      reasons: check.reasons || [],
      reason: check.reasons?.join(', ') || 'No completed simulation yet',
      requirements: check.reasons || [],
      band: check.band || 'None',
      compositeScore: check.compositeScore || 0,
      strategicConsistency: check.strategicConsistency || 0
    });
  });

  fastify.post('/api/certificates/issue', {
    preHandler: [requireAuth],
    schema: {
      description: 'Issues a certificate and generates PDF if student is eligible',
      tags: ['Certificate'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        properties: {
          simulationId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        201: {
          description: 'Certificate successfully issued',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            certificate: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                simulationId: { type: 'string' },
                userId: { type: 'string' },
                recipientName: { type: 'string' },
                issueDate: { type: 'string' },
                verificationHash: { type: 'string' },
                verificationId: { type: 'string' },
                compositeScore: { type: 'number' },
                pdfUrl: { type: 'string' },
                band: { type: 'string' },
                skills: { type: 'string' }
              }
            },
            downloadUrl: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    
    let simulationId: string | undefined;
    if (request.body && typeof request.body === 'object') {
      const body = request.body as any;
      simulationId = body.simulationId;
    }

    if (!simulationId) {
      const sim = await prisma.simulationState.findFirst({
        where: { userId: authReq.user!.id, classId: authReq.user!.classId || undefined }
      });
      if (!sim) {
        throw new NotFoundError('No active simulation state initialized.');
      }
      simulationId = sim.id;
    }

    const sim = await prisma.simulationState.findUnique({
      where: { id: simulationId },
      include: { user: true, class: { include: { scenario: true } } }
    });

    if (!sim) {
      throw new NotFoundError('Simulation not found.');
    }

    // Check eligibility
    const check = await checkCertificateEligibility(sim.id);
    if (!check.eligible) {
      throw new ValidationError(`Not eligible for certificate. Reasons: ${check.reasons.join(', ')}`);
    }

    // Transition status to COMPLETED if not already
    if (sim.status !== 'COMPLETED') {
      validateStateTransition(sim.status as SimulationStatus, SimulationStatus.COMPLETED);
      await prisma.simulationState.update({
        where: { id: sim.id },
        data: { status: 'COMPLETED', isCompleted: true }
      });
    }

    // Check if certificate already exists
    let cert = await prisma.certificate.findFirst({
      where: { simulationId: sim.id }
    });

    const getBandRank = (band: string): number => {
      const b = band.toUpperCase();
      if (b === 'PLATINUM') return 4;
      if (b === 'GOLD' || b === 'ADVANCED') return 3;
      if (b === 'SILVER' || b === 'PROFICIENT') return 2;
      return 1;
    };

    const skills = ["SEO Optimization", "PPC Bidding Strategy", "Meta Ads Audiences", "ROAS Scaling", "Budget Pacing"];

    if (cert) {
      const prevRank = getBandRank(cert.band);
      const newRank = getBandRank(check.band);
      if (newRank > prevRank) {
        // Upgrade!
        await generateCertificatePDF(
          sim.user.name,
          (sim as any).class.scenario.industry,
          check.band,
          skills,
          cert.verificationId || cert.verificationHash,
          new Date()
        );

        cert = await prisma.certificate.update({
          where: { id: cert.id },
          data: {
            compositeScore: check.compositeScore,
            band: check.band,
            issueDate: new Date()
          }
        });

        // Notify user about upgrade
        await createNotification(
          sim.userId,
          'achievement',
          'Certification Upgraded',
          `Congratulations! Your simulation certification has been upgraded to ${check.band} level!`,
          'System',
          '/certificate'
        );
      }

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
      (sim as any).class.scenario.industry,
      check.band,
      skills,
      verificationId,
      new Date()
    );

    cert = await prisma.certificate.create({
      data: {
        simulationId: sim.id,
        userId: sim.userId,
        recipientName: sim.user.name,
        issueDate: new Date(),
        verificationHash,
        verificationId,
        compositeScore: check.compositeScore,
        pdfUrl: downloadUrl,
        band: check.band,
        skills: JSON.stringify(skills)
      }
    });

    // Notify student about generation
    await createNotification(
      sim.userId,
      'success',
      'Certificate Generated',
      'Your professional pass certificate is ready! View it under Certificate Portal.',
      'System',
      '/certificate'
    );

    return reply.status(201).send({
      success: true,
      certificate: cert,
      downloadUrl: cert.pdfUrl
    });
  });

  fastify.get('/api/certificates/:id/download', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().min(1)
    });

    const parsedParams = paramsSchema.parse(request.params);
    const cert = await prisma.certificate.findFirst({
      where: {
        OR: [
          { simulationId: parsedParams.id },
          { id: parsedParams.id },
          { verificationId: parsedParams.id }
        ]
      },
      include: {
        simulation: {
          include: { class: { include: { scenario: true } } }
        }
      }
    });

    if (!cert) {
      throw new NotFoundError('Certificate not found.');
    }

    const filePath = path.join(process.cwd(), 'uploads', 'certificates', `${cert.verificationId}.pdf`);
    let pdfBuffer: Buffer;
    if (fs.existsSync(filePath)) {
      pdfBuffer = fs.readFileSync(filePath);
    } else {
      // Regenerate on-the-fly if file is missing
      pdfBuffer = await generateCertificatePDF(
        cert.recipientName,
        cert.simulation.class.scenario.industry,
        cert.band,
        JSON.parse(cert.skills),
        cert.verificationId!,
        cert.issueDate
      );
    }

    // Notify of download
    await createNotification(
      cert.userId,
      'info',
      'Certificate Downloaded',
      `You downloaded the certificate PDF for "${cert.recipientName}".`,
      'System',
      '/certificate'
    );

    return reply
      .status(200)
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="certificate_${cert.verificationId}.pdf"`)
      .send(pdfBuffer);
  });

  fastify.get('/api/certificates/verify/:verificationId', {
    schema: {
      description: 'Public validation route for certificate verification, exposes no private scores',
      tags: ['Certificate'],
      params: {
        type: 'object',
        required: ['verificationId'],
        properties: {
          verificationId: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'Certificate public validation result',
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            name: { type: 'string' },
            band: { type: 'string' },
            skills: { type: 'array', items: { type: 'string' } },
            issueDate: { type: 'string' },
            expirationDate: { type: 'string' },
            status: { type: 'string' },
            performanceSummary: { type: 'string' },
            verificationTimestamp: { type: 'string' },
            institution: { type: 'string' },
            reason: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const paramsSchema = z.object({
      verificationId: z.string().min(1)
    });

    const parsedParams = paramsSchema.parse(request.params);
    const cert = await prisma.certificate.findUnique({
      where: { verificationId: parsedParams.verificationId }
    });

    if (!cert) {
      return reply.status(200).send({
        valid: false,
        status: 'INVALID',
        reason: 'Certificate verification ID is invalid.'
      });
    }

    // Check expiration date
    const expirationDate = new Date(cert.issueDate);
    expirationDate.setFullYear(expirationDate.getFullYear() + 3);
    const isExpired = new Date() > expirationDate;

    // Check student user details (e.g. status)
    const user = await prisma.user.findUnique({
      where: { id: cert.userId }
    });

    const isRevoked = user?.status === 'suspended';

    let status = 'VERIFIED';
    let valid = true;
    let reason = '';

    if (isRevoked) {
      status = 'REVOKED';
      valid = false;
      reason = 'This certificate has been revoked by the institution.';
    } else if (isExpired) {
      status = 'EXPIRED';
      valid = false;
      reason = 'This certificate has expired.';
    }

    let skillsArray: string[] = [];
    try {
      skillsArray = JSON.parse(cert.skills);
    } catch {
      skillsArray = [];
    }

    // Log the verification request
    await logActivity(
      cert.userId,
      'CERTIFICATE_VERIFICATION',
      `Certificate ${cert.verificationId} verified publicly.`
    );

    // Notify student about verification view
    await createNotification(
      cert.userId,
      'info',
      'Certificate Verified',
      'Your certificate has been verified via the public verification portal.',
      'System',
      '/certificate'
    );

    return reply.status(200).send({
      valid,
      name: cert.recipientName,
      band: cert.band,
      skills: skillsArray,
      issueDate: cert.issueDate.toISOString(),
      expirationDate: expirationDate.toISOString(),
      status,
      performanceSummary: `Recipient demonstrated professional competence in simulated search optimization and ads deployment at ${cert.band} level.`,
      verificationTimestamp: new Date().toISOString(),
      institution: user?.institution || 'Digital Marketing Academy',
      reason
    });
  });

  /**
   * GET /api/certificates/:id
   * Authenticated route to get certificate details by simulationId, verificationId, or certificateId
   */
  fastify.get('/api/certificates/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      id: z.string().min(1)
    });

    const parsedParams = paramsSchema.parse(request.params);
    const cert = await prisma.certificate.findFirst({
      where: {
        OR: [
          { id: parsedParams.id },
          { simulationId: parsedParams.id },
          { verificationId: parsedParams.id }
        ]
      },
      include: {
        simulation: {
          include: { class: { include: { scenario: true } } }
        }
      }
    });

    if (!cert) {
      throw new NotFoundError('Certificate not found.');
    }

    const isOwner = cert.userId === authReq.user!.id;
    const isInstructor = authReq.user!.role === 'INSTRUCTOR';
    const isAdmin = authReq.user!.role === 'ADMIN';

    if (!isOwner && !isInstructor && !isAdmin) {
      throw new ValidationError('Unauthorized to view this certificate.');
    }

    return reply.status(200).send({
      success: true,
      certificate: cert
    });
  });

  fastify.post('/api/simulations/:id/approve', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid()
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const sim = await prisma.simulationState.findUnique({
      where: { id: parsedParams.data.id }
    });

    if (!sim) {
      throw new NotFoundError('Simulation not found.');
    }

    const updated = await prisma.simulationState.update({
      where: { id: sim.id },
      data: { instructorApproved: true }
    });

    return reply.status(200).send({
      success: true,
      message: 'Certificate eligibility approved by instructor successfully.',
      simulation: updated
    });
  });

  // ==========================================
  // 9. Report Routes
  // ==========================================

  fastify.get('/api/reports/:simulationId/seo', {
    preHandler: [requireAuth],
    schema: {
      description: 'Aggregates organic traffic and keywords targeted for reports',
      tags: ['Reports'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          simulationId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'SEO report aggregation',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            report: {
              type: 'object',
              properties: {
                totalOrganicTraffic: { type: 'number' },
                rankingImprovements: { type: 'number' },
                topKeywords: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      simulationId: z.string().uuid()
    });

    const parsedParams = paramsSchema.parse(request.params);
    const sim = await prisma.simulationState.findUnique({
      where: { id: parsedParams.simulationId },
      include: {
        decisions: { orderBy: { round: 'desc' } },
        scoreBreakdowns: { orderBy: { round: 'asc' } }
      }
    });

    if (!sim) throw new NotFoundError('Simulation not found.');
    if (sim.userId !== authReq.user!.id && authReq.user!.role !== UserRole.INSTRUCTOR && authReq.user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Unauthorized.');
    }

    const metrics = await prisma.dailyMetric.findMany({
      where: { simulationId: sim.id }
    });

    const totalOrganicTraffic = metrics.reduce((sum, m) => sum + m.organicClicks, 0);

    let rankingImprovements = 0;
    if (sim.scoreBreakdowns.length > 0) {
      const initialSeoScore = sim.scoreBreakdowns[0].seoScore;
      const latestSeoScore = sim.scoreBreakdowns[sim.scoreBreakdowns.length - 1].seoScore;
      
      const initialRank = (100 - initialSeoScore) / 1.8 + 1;
      const latestRank = (100 - latestSeoScore) / 1.8 + 1;
      rankingImprovements = parseFloat((initialRank - latestRank).toFixed(2));
    }

    let topKeywords: string[] = [];
    if (sim.decisions.length > 0) {
      try {
        topKeywords = JSON.parse(sim.decisions[0].seoTargetKeywords || '[]');
      } catch {
        topKeywords = [];
      }
    }

    return reply.status(200).send({
      success: true,
      report: {
        totalOrganicTraffic,
        rankingImprovements,
        topKeywords
      }
    });
  });

  fastify.get('/api/reports/:simulationId/ads', {
    preHandler: [requireAuth],
    schema: {
      description: 'Aggregates spend, conversions, CPC, and CTR across Google and Meta Ads',
      tags: ['Reports'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          simulationId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Ads report aggregation',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            report: {
              type: 'object',
              properties: {
                totalSpend: { type: 'number' },
                totalConversions: { type: 'number' },
                averageCPC: { type: 'number' },
                averageCTR: { type: 'number' },
                platformSplit: {
                  type: 'object',
                  properties: {
                    google: {
                      type: 'object',
                      properties: {
                        spend: { type: 'number' },
                        conversions: { type: 'number' }
                      }
                    },
                    meta: {
                      type: 'object',
                      properties: {
                        spend: { type: 'number' },
                        conversions: { type: 'number' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      simulationId: z.string().uuid()
    });

    const parsedParams = paramsSchema.parse(request.params);
    const sim = await prisma.simulationState.findUnique({
      where: { id: parsedParams.simulationId }
    });

    if (!sim) throw new NotFoundError('Simulation not found.');
    if (sim.userId !== authReq.user!.id && authReq.user!.role !== UserRole.INSTRUCTOR && authReq.user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Unauthorized.');
    }

    const metrics = await prisma.dailyMetric.findMany({
      where: { simulationId: sim.id }
    });

    const totalGoogleCost = metrics.reduce((sum, m) => sum + m.googleCost, 0);
    const totalMetaCost = metrics.reduce((sum, m) => sum + m.metaCost, 0);
    const totalSpend = parseFloat((totalGoogleCost + totalMetaCost).toFixed(2));

    const totalGoogleConversions = metrics.reduce((sum, m) => sum + m.googleConversions, 0);
    const totalMetaConversions = metrics.reduce((sum, m) => sum + m.metaConversions, 0);
    const totalConversions = totalGoogleConversions + totalMetaConversions;

    const totalGoogleClicks = metrics.reduce((sum, m) => sum + m.googleClicks, 0);
    const totalGoogleImpressions = metrics.reduce((sum, m) => sum + m.googleImpressions, 0);

    const averageCPC = totalGoogleClicks > 0 ? parseFloat((totalGoogleCost / totalGoogleClicks).toFixed(2)) : 0.0;
    const averageCTR = totalGoogleImpressions > 0 ? parseFloat((totalGoogleClicks / totalGoogleImpressions).toFixed(4)) : 0.0;

    return reply.status(200).send({
      success: true,
      report: {
        totalSpend,
        totalConversions,
        averageCPC,
        averageCTR,
        platformSplit: {
          google: {
            spend: parseFloat(totalGoogleCost.toFixed(2)),
            conversions: totalGoogleConversions
          },
          meta: {
            spend: parseFloat(totalMetaCost.toFixed(2)),
            conversions: totalMetaConversions
          }
        }
      }
    });
  });

  fastify.get('/api/reports/:simulationId/attribution', {
    preHandler: [requireAuth],
    schema: {
      description: 'Calculates channel conversions contribution % and marketing funnel',
      tags: ['Reports'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          simulationId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Attribution and marketing funnel metrics',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            report: {
              type: 'object',
              properties: {
                seoContributionPercent: { type: 'number' },
                googleAdsContributionPercent: { type: 'number' },
                metaAdsContributionPercent: { type: 'number' },
                funnel: {
                  type: 'object',
                  properties: {
                    impressions: { type: 'number' },
                    clicks: { type: 'number' },
                    conversions: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      simulationId: z.string().uuid()
    });

    const parsedParams = paramsSchema.parse(request.params);
    const sim = await prisma.simulationState.findUnique({
      where: { id: parsedParams.simulationId }
    });

    if (!sim) throw new NotFoundError('Simulation not found.');
    if (sim.userId !== authReq.user!.id && authReq.user!.role !== UserRole.INSTRUCTOR && authReq.user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Unauthorized.');
    }

    const metrics = await prisma.dailyMetric.findMany({
      where: { simulationId: sim.id }
    });

    const totalSeoConversions = metrics.reduce((sum, m) => sum + m.organicConversions, 0);
    const totalGoogleConversions = metrics.reduce((sum, m) => sum + m.googleConversions, 0);
    const totalMetaConversions = metrics.reduce((sum, m) => sum + m.metaConversions, 0);
    const totalConversions = totalSeoConversions + totalGoogleConversions + totalMetaConversions;

    const seoContribution = totalConversions > 0 ? parseFloat(((totalSeoConversions / totalConversions) * 100).toFixed(1)) : 0.0;
    const googleContribution = totalConversions > 0 ? parseFloat(((totalGoogleConversions / totalConversions) * 100).toFixed(1)) : 0.0;
    const metaContribution = totalConversions > 0 ? parseFloat(((totalMetaConversions / totalConversions) * 100).toFixed(1)) : 0.0;

    const totalImpressions = metrics.reduce((sum, m) => sum + m.organicImpressions + m.googleImpressions + m.metaImpressions, 0);
    const totalClicks = metrics.reduce((sum, m) => sum + m.organicClicks + m.googleClicks + m.metaClicks, 0);

    return reply.status(200).send({
      success: true,
      report: {
        seoContributionPercent: seoContribution,
        googleAdsContributionPercent: googleContribution,
        metaAdsContributionPercent: metaContribution,
        funnel: {
          impressions: totalImpressions,
          clicks: totalClicks,
          conversions: totalConversions
        }
      }
    });
  });

  // ==========================================
  // 10. Event Timeline Routes
  // ==========================================

  fastify.get('/api/simulations/:id/events', {
    preHandler: [requireAuth],
    schema: {
      description: 'Lists triggered market events for the simulation',
      tags: ['Events'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Market events list',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  simulationId: { type: 'string' },
                  round: { type: 'number' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  type: { type: 'string' },
                  impactMultiplier: { type: 'number' },
                  createdAt: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const paramsSchema = z.object({
      id: z.string().uuid()
    });

    const parsedParams = paramsSchema.parse(request.params);
    const sim = await prisma.simulationState.findUnique({
      where: { id: parsedParams.id }
    });

    if (!sim) throw new NotFoundError('Simulation not found.');
    if (sim.userId !== authReq.user!.id && authReq.user!.role !== UserRole.INSTRUCTOR && authReq.user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Unauthorized.');
    }

    const events = await prisma.marketEvent.findMany({
      where: { simulationId: sim.id },
      orderBy: { round: 'asc' }
    });

    return reply.status(200).send({
      success: true,
      events
    });
  });

  fastify.get('/api/scenarios/:id/event-probability', {
    preHandler: [requireAuth],
    schema: {
      description: 'Returns seeded probability list of scenario market events',
      tags: ['Events'],
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Scenario events probability',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            scenarioId: { type: 'string', nullable: true },
            events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  type: { type: 'string' },
                  probability: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid()
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const scenario = await prisma.scenario.findUnique({
      where: { id: parsedParams.data.id }
    });

    if (!scenario) {
      throw new NotFoundError('Scenario template not found.');
    }

    return reply.status(200).send({
      success: true,
      scenarioId: scenario.id,
      events: EVENTS_REGISTRY.map(evt => ({
        id: evt.id,
        name: evt.name,
        description: evt.description,
        type: evt.type,
        probability: evt.probability
      }))
    });
  });

  fastify.post('/api/instructor/trigger-event', {
    preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])],
    schema: {
      description: 'Manually triggers a market event injection for all active simulations in a class cohort',
      tags: ['Instructor'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        required: ['classId', 'eventId'],
        properties: {
          classId: { type: 'string', format: 'uuid' },
          eventId: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'Market event successfully triggered',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const bodySchema = z.object({
      classId: z.string().uuid(),
      eventId: z.string().min(1)
    });

    const parsedBody = bodySchema.parse(request.body);
    
    const targetClass = await prisma.class.findUnique({
      where: { id: parsedBody.classId }
    });
    if (!targetClass) throw new NotFoundError('Class not found.');

    const eventDef = EVENTS_REGISTRY.find(e => e.id === parsedBody.eventId);
    if (!eventDef) throw new ValidationError('Event ID is invalid.');

    const activeSims = await prisma.simulationState.findMany({
      where: { classId: targetClass.id, isCompleted: false }
    });

    await Promise.all(
      activeSims.map(sim => 
        prisma.marketEvent.create({
          data: {
            simulationId: sim.id,
            round: sim.currentRound,
            name: eventDef.name,
            description: eventDef.description,
            type: eventDef.type,
            impactMultiplier: eventDef.impactMultiplier
          }
        })
      )
    );

    return reply.status(200).send({
      success: true,
      message: `Successfully injected market event '${eventDef.name}' for all active simulations in the class.`
    });
  });

  // ==========================================
  // 11. AI Insight Route
  // ==========================================

  /**
   * POST /api/ai/insight
   * Generates a platform-specific AI insight for a simulation round.
   *
   * Body: { simulationId: string, platform: 'seo' | 'google_ads' | 'meta_ads' }
   * Response: { insight: string, fallback: boolean }
   */
  fastify.post('/api/ai/insight', {
    preHandler: [requireAuth],
    schema: {
      description: 'Generates a platform-specific AI insight for a simulation round',
      tags: ['AI'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        required: ['simulationId', 'platform'],
        properties: {
          simulationId: { type: 'string', format: 'uuid' },
          platform: { type: 'string', enum: ['seo', 'google_ads', 'meta_ads'] }
        }
      },
      response: {
        200: {
          description: 'AI insight generated successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            simulationId: { type: 'string' },
            platform: { type: 'string' },
            insight: { type: 'string' },
            fallback: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;

    const bodySchema = z.object({
      simulationId: z.string().uuid('Invalid Simulation ID'),
      platform: z.enum(['seo', 'google_ads', 'meta_ads'] as const),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const { simulationId, platform } = parsed.data;

    const sim = await prisma.simulationState.findUnique({
      where: { id: simulationId },
    });

    if (!sim) throw new NotFoundError('Simulation not found.');

    if (
      sim.userId !== authReq.user!.id &&
      authReq.user!.role !== UserRole.INSTRUCTOR &&
      authReq.user!.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenError('Unauthorized to request AI insights for this simulation.');
    }

    // Fetch the latest metrics for the current round
    const latestMetrics = await prisma.dailyMetric.findFirst({
      where: { simulationId: sim.id, round: sim.currentRound },
      orderBy: { day: 'desc' },
    });

    // Fetch the latest decision
    const latestDecision = await prisma.decision.findFirst({
      where: { simulationId: sim.id },
      orderBy: { round: 'desc' },
    });

    const metricsPayload: Record<string, unknown> = latestMetrics
      ? {
          organicClicks: latestMetrics.organicClicks,
          organicImpressions: latestMetrics.organicImpressions,
          organicConversions: latestMetrics.organicConversions,
          googleClicks: latestMetrics.googleClicks,
          googleImpressions: latestMetrics.googleImpressions,
          googleCost: latestMetrics.googleCost,
          googleConversions: latestMetrics.googleConversions,
          metaClicks: latestMetrics.metaClicks,
          metaImpressions: latestMetrics.metaImpressions,
          metaCost: latestMetrics.metaCost,
          metaConversions: latestMetrics.metaConversions,
        }
      : {};

    const decisionPayload: Record<string, unknown> = latestDecision
      ? {
          seoTargetKeywords: JSON.parse(latestDecision.seoTargetKeywords),
          seoContentQuality: latestDecision.seoContentQuality,
          seoBacklinkBudget: latestDecision.seoBacklinkBudget,
          googleCampaigns: JSON.parse(latestDecision.googleCampaigns),
          metaCampaigns: JSON.parse(latestDecision.metaCampaigns),
        }
      : {};

    const result = await generateInsight(platform as InsightPlatform, metricsPayload, decisionPayload);

    return reply.status(200).send({
      success: true,
      simulationId,
      platform,
      ...result,
    });
  });

  // ==========================================
  // 12. Trends & Market Conditions Routes
  // ==========================================

  /**
   * GET /api/trends/search
   * Returns normalized trend signals for queries.
   */
  fastify.get('/api/trends/search', {
    preHandler: [requireAuth],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          industry: { type: 'string' },
          location: { type: 'string' },
          keywords: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const query = request.query as any;
    const keywords = query.keywords ? query.keywords.split(',').map((k: string) => k.trim()) : [];
    
    if (keywords.length === 0) {
      throw new ValidationError('At least one keyword is required.');
    }

    try {
      const signals = await trendClient.fetchTrends({
        scenarioName: 'Search',
        industry: query.industry || 'General',
        location: query.location || 'Global',
        keywords,
        platforms: ['SEO', 'GOOGLE_ADS', 'META_ADS'],
        date: new Date()
      });
      return reply.send({ success: true, signals });
    } catch (err: any) {
      throw new ValidationError(err.message || 'Failed to fetch trend signals.');
    }
  });

  /**
   * GET /api/simulations/:id/trends
   * Returns all TrendSnapshot records for this simulation.
   */
  fastify.get('/api/simulations/:id/trends', {
    preHandler: [requireAuth],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const params = request.params as any;
    const trends = await prisma.trendSnapshot.findMany({
      where: { simulationId: params.id },
      orderBy: { roundNumber: 'asc' }
    });
    return reply.send({
      success: true,
      trends: trends.map(t => ({
        ...t,
        signals: typeof t.signals === 'string' ? JSON.parse(t.signals) : t.signals,
        sources: typeof t.sources === 'string' ? JSON.parse(t.sources) : t.sources
      }))
    });
  });

  /**
   * GET /api/simulations/:id/market-conditions
   * Returns all MarketConditionSnapshot records for this simulation.
   */
  fastify.get('/api/simulations/:id/market-conditions', {
    preHandler: [requireAuth],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const params = request.params as any;
    const conditions = await prisma.marketConditionSnapshot.findMany({
      where: { simulationId: params.id },
      orderBy: { roundNumber: 'asc' }
    });
    return reply.send({
      success: true,
      marketConditions: conditions.map(mc => ({
        ...mc,
        platformModifiers: typeof mc.platformModifiers === 'string' ? JSON.parse(mc.platformModifiers) : mc.platformModifiers
      }))
    });
  });

  /**
   * POST /api/simulations/:id/refresh-trends
   * Re-runs trend fetching and updates snapshot and market conditions. Instructor/Admin only.
   */
  fastify.post('/api/simulations/:id/refresh-trends', {
    preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const params = request.params as any;
    const sim = await prisma.simulationState.findUnique({
      where: { id: params.id },
      include: { class: { include: { scenario: true } } }
    });
    if (!sim) throw new NotFoundError('Simulation not found.');

    const decision = await prisma.decision.findFirst({
      where: { simulationId: sim.id, round: sim.currentRound }
    });
    
    const seoKeywords = decision ? JSON.parse(decision.seoTargetKeywords) : [];
    const scenario = sim.class.scenario;
    const combinedKeywords = Array.from(new Set([
      ...seoKeywords,
      scenario.industry
    ]));

    try {
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

      const existingTrend = await prisma.trendSnapshot.findFirst({
        where: { simulationId: sim.id, roundNumber: sim.currentRound }
      });

      if (existingTrend) {
        await prisma.trendSnapshot.update({
          where: { id: existingTrend.id },
          data: {
            signals: JSON.stringify(trendSignals),
            sources: JSON.stringify(trendSignals.flatMap(s => s.sources)),
            confidence,
            fetchedAt: new Date()
          }
        });
      } else {
        await prisma.trendSnapshot.create({
          data: {
            simulationId: sim.id,
            roundNumber: sim.currentRound,
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
        simulationId: sim.id,
        roundNumber: sim.currentRound,
        signals: trendSignals
      });

      const existingMC = await prisma.marketConditionSnapshot.findFirst({
        where: { simulationId: sim.id, roundNumber: sim.currentRound }
      });

      if (existingMC) {
        await prisma.marketConditionSnapshot.update({
          where: { id: existingMC.id },
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
        await prisma.marketConditionSnapshot.create({
          data: {
            simulationId: sim.id,
            roundNumber: sim.currentRound,
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

      return reply.send({ success: true, message: 'Trends refreshed successfully.' });
    } catch (err: any) {
      throw new ValidationError(err.message || 'Failed to refresh trend signals.');
    }
  });

  /**
   * GET /api/simulations/:id/data-mode
   * Returns information about the current data mode and availability of live/trend APIs.
   */
  fastify.get('/api/simulations/:id/data-mode', {
    preHandler: [requireAuth],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const params = request.params as any;
    const sim = await prisma.simulationState.findUnique({
      where: { id: params.id },
      include: { class: { include: { scenario: true } } }
    });
    if (!sim) throw new NotFoundError('Simulation not found.');

    const googleCredsConfigured = !!(config.GOOGLE_ADS_CLIENT_ID && config.GOOGLE_ADS_CLIENT_SECRET && config.GOOGLE_ADS_DEVELOPER_TOKEN);
    const metaCredsConfigured = !!(config.META_APP_ID && config.META_APP_SECRET && config.META_ACCESS_TOKEN);
    const liveCredentialsConfigured = googleCredsConfigured || metaCredsConfigured;

    let resolvedMode = sim.class.scenario.dataMode || 'REAL_TIME_TREND_SIMULATION';
    if (resolvedMode === 'LIVE_AD_ACCOUNT' && !liveCredentialsConfigured) {
      resolvedMode = 'REAL_TIME_TREND_SIMULATION';
    }

    return reply.send({
      success: true,
      mode: resolvedMode,
      liveCredentialsConfigured,
      trendSourcesAvailable: true
    });
  });

  /**
   * POST /api/simulations/:id/fast-forward
   * Instantly runs round advancement, bypassing queue delays. Dev mode only.
   */
  fastify.post('/api/simulations/:id/fast-forward', {
    preHandler: [requireAuth],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    if (config.NODE_ENV !== 'development' && config.NODE_ENV !== 'test') {
      throw new ForbiddenError('Fast-forward is only available in development or test mode.');
    }

    const params = request.params as any;
    const sim = await prisma.simulationState.findUnique({
      where: { id: params.id }
    });
    if (!sim) throw new NotFoundError('Simulation not found.');

    // Force locked status to allow processing
    await prisma.simulationState.update({
      where: { id: sim.id },
      data: { status: 'LOCKED' }
    });

    const result = await processSimulationRound(sim.id);
    notifyRoundComplete(sim.userId, result);

    return reply.send({
      success: true,
      result
    });
  });

  /**
   * GET /api/simulations/:id/countdown
   * Returns remaining seconds to the next round results
   */
  fastify.get('/api/simulations/:id/countdown', {
    preHandler: [requireAuth],
    schema: {
      description: 'Returns remaining seconds to next round result availability',
      tags: ['Simulation'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const params = request.params as any;
    const progress = await prisma.studentSimulationProgress.findUnique({
      where: { simulationId: params.id }
    });
    if (!progress || !progress.nextResultAt) {
      return reply.send({ success: true, remainingSeconds: 0 });
    }
    const diff = progress.nextResultAt.getTime() - Date.now();
    const remainingSeconds = Math.max(0, Math.ceil(diff / 1000));
    return reply.send({ success: true, remainingSeconds });
  });

  /**
   * GET /api/classes/:id/progress
   * Returns progress tracking list for all cohort students
   */
  fastify.get('/api/classes/:id/progress', {
    preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])],
    schema: {
      description: 'Returns progress tracking checklist for class students',
      tags: ['Instructor'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const params = request.params as any;
    const students = await prisma.user.findMany({
      where: { classId: params.id },
      include: {
        simulations: {
          include: {
            progress: true,
            scoreBreakdowns: { orderBy: { round: 'desc' }, take: 1 }
          }
        }
      }
    });

    const progress = students.map(student => {
      const activeSim = student.simulations[0] || null;
      return {
        studentId: student.id,
        name: student.name,
        email: student.email,
        currentDay: activeSim?.progress?.currentDay || 1,
        totalDays: activeSim?.progress?.totalDays || 30,
        status: activeSim?.status || 'NOT_STARTED',
        score: activeSim?.score || 0,
        submitted: activeSim?.status === 'LOCKED' || activeSim?.status === 'PROCESSING',
        lastSubmittedAt: activeSim?.progress?.lastSubmittedAt || null
      };
    });

    return reply.send({ success: true, progress });
  });

  /**
   * GET /api/classes/:id/leaderboard
   * Returns simulation scores leaderboard
   */
  fastify.get('/api/classes/:id/leaderboard', {
    preHandler: [requireAuth],
    schema: {
      description: 'Returns leaderboard rankings for class',
      tags: ['Simulation'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const params = request.params as any;
    const simulations = await prisma.simulationState.findMany({
      where: { classId: params.id },
      include: { user: true },
      orderBy: { score: 'desc' }
    });

    const leaderboard = simulations.map((sim, index) => ({
      rank: index + 1,
      studentName: sim.user.name,
      score: sim.score,
      round: sim.currentRound,
      isCompleted: sim.isCompleted
    }));

    return reply.send({ success: true, leaderboard });
  });

  /**
   * GET /api/classes/:id/audit
   * Returns classroom decisions audit trail
   */
  fastify.get('/api/classes/:id/audit', {
    preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])],
    schema: {
      description: 'Returns audit trail of decisions for all classroom members',
      tags: ['Instructor'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const params = request.params as any;
    const simulations = await prisma.simulationState.findMany({
      where: { classId: params.id },
      include: {
        user: true,
        decisions: { orderBy: { round: 'asc' } }
      }
    });

    const auditTrail = simulations.flatMap(sim => 
      sim.decisions.map(d => ({
        studentName: sim.user.name,
        round: d.round,
        seoTargetKeywords: JSON.parse(d.seoTargetKeywords),
        seoContentQuality: d.seoContentQuality,
        seoBacklinkBudget: d.seoBacklinkBudget,
        googleCampaigns: JSON.parse(d.googleCampaigns),
        metaCampaigns: JSON.parse(d.metaCampaigns),
        createdAt: d.createdAt
      }))
    );

    return reply.send({ success: true, auditTrail });
  });

  /**
   * GET /api/scenarios/:id/config
   * Returns full scenario configuration settings
   */
  fastify.get('/api/scenarios/:id/config', {
    preHandler: [requireAuth],
    schema: {
      description: 'Returns scenario settings configuration details',
      tags: ['Scenario'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const params = request.params as any;
    const scenario = await prisma.scenario.findUnique({
      where: { id: params.id }
    });
    if (!scenario) throw new NotFoundError('Scenario not found.');
    return reply.send({ success: true, config: scenario });
  });

  /**
   * POST /api/scenarios/:id/start
   * Starts a scenario simulation for student
   */
  fastify.post('/api/scenarios/:id/start', {
    preHandler: [requireAuth],
    schema: {
      description: 'Starts a student simulation for scenario ID',
      tags: ['Simulation'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const params = request.params as any;
    const classId = authReq.user!.classId;
    if (!classId) {
      throw new ValidationError('You must join a class cohort before starting a simulation.');
    }

    const existingState = await prisma.simulationState.findFirst({
      where: { userId: authReq.user!.id, classId }
    });
    if (existingState) {
      return reply.send({ success: true, simulationId: existingState.id, status: existingState.status });
    }

    const scenario = await prisma.scenario.findUnique({ where: { id: params.id } });
    if (!scenario) throw new NotFoundError('Scenario not found.');

    const newState = await prisma.simulationState.create({
      data: {
        userId: authReq.user!.id,
        classId,
        currentRound: 1,
        isCompleted: false,
        status: 'DECISION_OPEN'
      }
    });

    await prisma.studentSimulationProgress.create({
      data: {
        simulationId: newState.id,
        currentDay: 1,
        totalDays: scenario.durationDays,
        status: 'DECISION_OPEN'
      }
    });

    return reply.status(201).send({
      success: true,
      simulationId: newState.id,
      status: newState.status
    });
  });
}


