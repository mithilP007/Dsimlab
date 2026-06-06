import { FastifyInstance } from 'fastify';
import { requireAuth, AuthenticatedRequest } from '../auth/middleware';
import { prisma } from '../db/client';
import { z } from 'zod';
import { NotFoundError } from '../utils/errors';

export async function metricsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/metrics
   * Retrieves daily timeseries records for graphing
   */
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    
    const querySchema = z.object({
      round: z.coerce.number().int().positive().optional()
    });

    const parsedQuery = querySchema.safeParse(request.query);
    const round = parsedQuery.success ? parsedQuery.data.round : undefined;

    const sim = await prisma.simulationState.findFirst({
      where: {
        userId: authReq.user!.id,
        classId: authReq.user!.classId!
      }
    });

    if (!sim) {
      throw new NotFoundError('Simulation state has not been initialized.');
    }

    const filter: any = { simulationId: sim.id };
    if (round) {
      filter.round = round;
    }

    const metrics = await prisma.dailyMetric.findMany({
      where: filter,
      orderBy: [
        { round: 'asc' },
        { day: 'asc' }
      ]
    });

    return reply.status(200).send({
      success: true,
      metrics
    });
  });
}
