import { FastifyInstance } from 'fastify';
import { requireAuth, AuthenticatedRequest } from '../auth/middleware';
import { prisma } from '../db/client';

import { processSimulationRound } from '../services/simulation/engine';
import { ValidationError, NotFoundError } from '../utils/errors';
import { notifyRoundComplete } from '../websocket/handlers/round-complete';
import { validateStateTransition, SimulationStatus } from '../services/simulation/state-machine';

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
        class: {
          include: {
            scenario: true,
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

    // Push real-time WS update
    notifyRoundComplete(authReq.user!.id, result);

    return reply.status(200).send({
      success: true,
      result,
    });
  });
}
