import { FastifyInstance } from 'fastify';
import { requireAuth, requireRole, AuthenticatedRequest } from '../auth/middleware';
import { prisma } from '../db/client';
import { cacheService } from '../utils/caching';
import { UserRole } from '../auth/roles';
import { logger } from '../utils/logger';

import { processSimulationRound } from '../services/simulation/engine';
import { ValidationError, NotFoundError } from '../utils/errors';
import { notifyRoundComplete } from '../websocket/handlers/round-complete';
import { validateStateTransition, SimulationStatus } from '../services/simulation/state-machine';
import { logActivity, createNotification } from '../utils/audit';
import { limitsService } from '../services/billing/limits.service';
import { z } from 'zod';

export async function simulationRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/simulation/start
   * Boots the active simulation instance for a student's classroom
   */
  fastify.post('/start', { preHandler: [requireAuth] }, async (request, reply) => {
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
      return reply.status(200).send({
        success: true,
        simulationId: existingState.id,
        currentRound: existingState.currentRound,
        isCompleted: existingState.isCompleted,
        status: existingState.status,
      });
    }

    await limitsService.checkSimulationLimit(authReq.user!.id);

    const newState = await prisma.simulationState.create({
      data: {
        userId: authReq.user!.id,
        classId: classId,
        currentRound: 1,
        isCompleted: false,
        status: 'INITIALIZED',
      },
    });

    // Validate and transition INITIALIZED -> DECISION_OPEN
    validateStateTransition(SimulationStatus.INITIALIZED, SimulationStatus.DECISION_OPEN);
    const updatedState = await prisma.simulationState.update({
      where: { id: newState.id },
      data: { status: 'DECISION_OPEN' }
    });

    // Write audit log
    await logActivity(
      authReq.user!.id,
      'SIMULATION_START',
      `Initialized digital marketing simulation lab for class cohort.`
    );

    // Notify instructor
    const targetClass = await prisma.class.findUnique({
      where: { id: classId },
      select: { instructorId: true }
    });
    if (targetClass?.instructorId) {
      await createNotification(
        targetClass.instructorId,
        'info',
        'Student Joined Simulation',
        `${authReq.user!.name} launched and initialized their simulation campaign.`,
        authReq.user!.name,
        '/instructor'
      );
    }

    return reply.status(201).send({
      success: true,
      simulationId: updatedState.id,
      currentRound: updatedState.currentRound,
      isCompleted: updatedState.isCompleted,
      status: updatedState.status,
    });
  });

  /**
   * GET /api/v1/simulation/state
   * Retrieves overall simulation aggregates for student dashboards
   */
  fastify.get('/state', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { role, id: userId, classId } = authReq.user!;
    const userRole = role ? role.toUpperCase().replace('-', '_') : '';

    if (userRole === UserRole.ADMIN || userRole === 'ADMIN' || userRole === UserRole.INSTRUCTOR || userRole === 'INSTRUCTOR') {
      return reply.status(200).send({
        success: true,
        hasState: false,
        state: null,
      });
    }

    try {
      let activeClassId = classId;

      if (activeClassId) {
        const classExists = await prisma.class.findUnique({
          where: { id: activeClassId }
        });
        if (!classExists) {
          // Stale classId, repair safely
          await prisma.user.update({
            where: { id: userId },
            data: { classId: null, status: 'active' }
          }).catch(() => {});
          authReq.user!.classId = null;
          activeClassId = null;
        }
      }

      if (!activeClassId) {
        if (userRole === 'INDIVIDUAL') {
          // Fallback for individuals: fetch any simulation state they have
          const state = await prisma.simulationState.findFirst({
            where: { userId: userId },
            include: {
              progress: true,
              class: {
                include: {
                  scenario: true,
                  instructor: {
                    select: { id: true, name: true, email: true },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' }
          });

          if (!state) {
            return reply.status(200).send({
              success: true,
              hasState: false,
              state: null,
            });
          }

          return reply.status(200).send({
            success: true,
            hasState: true,
            state,
          });
        }

        // Student with no classId
        return reply.status(200).send({
          success: true,
          hasState: false,
          state: null,
          message: 'You have not joined any class cohort yet.'
        });
      }

      // Student has classId
      const enrollment = await prisma.classEnrollment.findFirst({
        where: { studentId: userId, classId: activeClassId }
      });

      if (!enrollment || enrollment.status !== 'ACTIVE') {
        return reply.status(200).send({
          success: true,
          hasState: false,
          state: null,
          message: 'Your class enrollment is not active.'
        });
      }

      const cls = await prisma.class.findUnique({
        where: { id: activeClassId },
        include: { scenario: true }
      });

      if (!cls || !cls.scenario) {
        return reply.status(200).send({
          success: true,
          hasState: false,
          state: null,
          message: 'No scenario has been assigned to your class cohort yet. Please check with your instructor.'
        });
      }

      const state = await prisma.simulationState.findFirst({
        where: {
          userId: userId,
          classId: activeClassId,
        },
        include: {
          progress: true,
          class: {
            include: {
              scenario: true,
              instructor: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!state) {
        return reply.status(200).send({
          success: true,
          hasState: false,
          state: null,
          message: 'No active simulation initialized yet.'
        });
      }

      return reply.status(200).send({
        success: true,
        hasState: true,
        state,
      });

    } catch (err) {
      logger.error(err, 'Failed to fetch simulation state');
      return reply.status(200).send({
        success: true,
        hasState: false,
        state: null,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/v1/simulation/advance
   * Submits current choices and executes mathematical modeling to advance round
   */
  fastify.post('/advance', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const classId = authReq.user!.classId;

    if (!classId) {
      throw new ValidationError('No active class associated to user.');
    }

    const state = await prisma.simulationState.findFirst({
      where: {
        userId: authReq.user!.id,
        classId: classId,
      },
    });

    if (!state) {
      throw new NotFoundError('No active simulation initialized.');
    }

    // Gating Checkpoint Validation — controlled by scenario.checkpointRequired
    const classWithScenario = await prisma.class.findUnique({
      where: { id: classId },
      select: { scenario: { select: { checkpointRequired: true } } }
    });
    const scenarioRequiresCheckpoint = classWithScenario?.scenario?.checkpointRequired ?? true;

    if (scenarioRequiresCheckpoint && state.currentRound > 1) {
      const prevRound = state.currentRound - 1;
      const checkpoint = await prisma.checkpointValidation.findFirst({
        where: {
          simulationId: state.id,
          roundNumber: prevRound
        }
      });
      if (!checkpoint) {
        await logActivity(
          authReq.user!.id,
          'CHECKPOINT_BYPASS_ATTEMPT',
          `Student attempted to skip the mandatory checkpoint justification for Round ${prevRound}.`
        );
        throw new ValidationError(`Mandatory checkpoint justification for Round ${prevRound} must be submitted before advancing.`);
      }
    }

    // Validate and transition DECISION_OPEN -> LOCKED
    validateStateTransition(state.status as SimulationStatus, SimulationStatus.LOCKED);
    
    await prisma.simulationState.update({
      where: { id: state.id },
      data: { status: 'LOCKED' }
    });

    // Call core round calculation processor
    const result = await processSimulationRound(state.id);

    // Invalidate cached leaderboard and reports for this classroom cohort
    if (state.classId) {
      await cacheService.del(`cache:leaderboard:${state.classId}`);
      await cacheService.invalidatePattern(`cache:report:*:${state.classId}`);
    } else {
      await cacheService.del(`cache:leaderboard:sandbox`);
    }

    // Push real-time WS update
    notifyRoundComplete(authReq.user!.id, result);

    // Fetch updated simulation statistics
    const updatedState = await prisma.simulationState.findUnique({
      where: { id: state.id }
    });

    // Write audit log
    await logActivity(
      authReq.user!.id,
      'ROUND_ADVANCE',
      `Advanced to Round ${updatedState?.currentRound || state.currentRound + 1}. Cumulative Score: ${updatedState?.score || 0}%, Cumulative Revenue: $${updatedState?.cumulativeRevenue || 0}, Cumulative Spend: $${updatedState?.cumulativeSpend || 0}.`
    );

    // Notify instructor
    const targetClass = await prisma.class.findUnique({
      where: { id: state.classId },
      select: { instructorId: true }
    });
    if (targetClass?.instructorId) {
      await createNotification(
        targetClass.instructorId,
        'success',
        'Student Round Completed',
        `${authReq.user!.name} completed Round ${state.currentRound} and scored ${updatedState?.score || 0}% (Cumulative Revenue: $${updatedState?.cumulativeRevenue || 0}).`,
        authReq.user!.name,
        '/instructor'
      );
    }

    return reply.status(200).send({
      success: true,
      result,
    });
  });

  /**
   * POST /api/v1/simulation/checkpoint
   * Submits a mandatory round justification/reflection.
   */
  fastify.post('/checkpoint', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const bodySchema = z.object({
      simulationId: z.string().uuid(),
      roundNumber: z.number().int(),
      justificationText: z.string().min(10, 'Justification must be at least 10 characters long.')
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const { simulationId, roundNumber, justificationText } = parsed.data;

    const sim = await prisma.simulationState.findUnique({
      where: { id: simulationId }
    });

    if (!sim) {
      throw new NotFoundError('Simulation state not found.');
    }

    // Determine reflection quality score (0 to 100) deterministically
    const marketingKeywords = ['roi', 'traffic', 'keywords', 'cpc', 'spend', 'conversions', 'campaign', 'budget', 'revenue', 'ctr', 'roas', 'cpa', 'optimization'];
    const textLower = justificationText.toLowerCase();
    const matchedKeywords = marketingKeywords.filter(kw => textLower.includes(kw));
    let score = 50 + (matchedKeywords.length * 5); // baseline 50 for submitting a valid justification
    if (justificationText.length > 200) score += 15;
    if (justificationText.length > 500) score += 10;
    score = Math.min(100, score);

    // Prevent duplicate checkpoints for the same round
    const existing = await prisma.checkpointValidation.findFirst({
      where: { simulationId, roundNumber }
    });

    let checkpoint;
    if (existing) {
      checkpoint = await prisma.checkpointValidation.update({
        where: { id: existing.id },
        data: {
          justificationText,
          reflectionQualityScore: score,
          submittedAt: new Date()
        }
      });
    } else {
      checkpoint = await prisma.checkpointValidation.create({
        data: {
          simulationId,
          roundNumber,
          studentId: authReq.user!.id,
          justificationText,
          reflectionQualityScore: score,
          status: 'SUBMITTED'
        }
      });
    }

    // Write audit log
    await logActivity(
      authReq.user!.id,
      'CHECKPOINT_SUBMIT',
      `Submitted checkpoint justification for Round ${roundNumber}. Reflection quality score: ${score}%.`
    );

    return reply.status(201).send({
      success: true,
      checkpoint
    });
  });

  /**
   * GET /api/v1/simulation/checkpoint/:simulationId
   * Retrieves all checkpoint validations for a simulation state.
   */
  fastify.get('/checkpoint/:simulationId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { simulationId } = request.params as { simulationId: string };
    const checkpoints = await prisma.checkpointValidation.findMany({
      where: { simulationId },
      orderBy: { roundNumber: 'asc' }
    });

    return reply.status(200).send({
      success: true,
      checkpoints
    });
  });

  /**
   * PUT /api/v1/simulation/checkpoint/:id
   * Allows an instructor to comment or approve/reject a checkpoint.
   */
  fastify.put('/checkpoint/:id', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const bodySchema = z.object({
      status: z.enum(['SUBMITTED', 'APPROVED', 'REJECTED']).optional(),
      instructorComment: z.string().optional(),
      reflectionQualityScore: z.number().min(0).max(100).optional()
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const checkpoint = await prisma.checkpointValidation.update({
      where: { id },
      data: parsed.data
    });

    return reply.status(200).send({
      success: true,
      checkpoint
    });
  });
}

