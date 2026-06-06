import { FastifyInstance } from 'fastify';
import { requireAuth, AuthenticatedRequest } from '../auth/middleware';
import { prisma } from '../db/client';
import { NotFoundError } from '../utils/errors';

export async function eventsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/events
   * Returns a historical list of all market events triggered in this simulation
   */
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
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

    const events = await prisma.marketEvent.findMany({
      where: {
        simulationId: sim.id
      },
      orderBy: {
        round: 'desc'
      }
    });

    return reply.status(200).send({
      success: true,
      events
    });
  });
}
