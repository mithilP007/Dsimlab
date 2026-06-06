import { FastifyInstance } from 'fastify';
import { requireAuth, AuthenticatedRequest } from '../auth/middleware';
import { prisma } from '../db/client';
import { NotFoundError } from '../utils/errors';

export async function scoringRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/scoring/breakdown
   * Retrieves dimensional score breakdowns for each completed round
   */
  fastify.get('/breakdown', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;

    const sim = await prisma.simulationState.findFirst({
      where: {
        userId: authReq.user!.id,
        classId: authReq.user!.classId!
      }
    });

    if (!sim) {
      throw new NotFoundError('Simulation not initialized.');
    }

    const breakdowns = await prisma.scoreBreakdown.findMany({
      where: {
        simulationId: sim.id
      },
      orderBy: {
        round: 'asc'
      }
    });

    return reply.status(200).send({
      success: true,
      breakdowns
    });
  });

  /**
   * GET /api/v1/scoring/leaderboard
   * Fetches the classmate leaderboard sorted descending by total score
   */
  fastify.get('/leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;

    const sim = await prisma.simulationState.findFirst({
      where: {
        userId: authReq.user!.id,
        classId: authReq.user!.classId!
      }
    });

    if (!sim) {
      throw new NotFoundError('Simulation not initialized.');
    }

    const leaderboard = await prisma.simulationState.findMany({
      where: {
        classId: sim.classId
      },
      select: {
        id: true,
        currentRound: true,
        isCompleted: true,
        score: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        score: 'desc'
      }
    });

    return reply.status(200).send({
      success: true,
      leaderboard
    });
  });
}
