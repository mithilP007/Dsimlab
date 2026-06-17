import { FastifyInstance } from 'fastify';
import { requireAuth, AuthenticatedRequest } from '../auth/middleware';
import { prisma } from '../db/client';
import { cacheService } from '../utils/caching';

import { processSimulationRound } from '../services/simulation/engine';
import { ValidationError, NotFoundError } from '../utils/errors';
import { notifyRoundComplete } from '../websocket/handlers/round-complete';
import { validateStateTransition, SimulationStatus } from '../services/simulation/state-machine';
import { logActivity, createNotification } from '../utils/audit';
import { limitsService } from '../services/billing/limits.service';

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
    const classId = authReq.user!.classId;

    if (!classId) {
      throw new ValidationError('Student is not registered to a class room.');
    }

    const state = await prisma.simulationState.findFirst({
      where: {
        userId: authReq.user!.id,
        classId: classId,
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
      throw new NotFoundError('No active simulation state initialized yet.');
    }

    return reply.status(200).send({
      success: true,
      state,
    });
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
}

