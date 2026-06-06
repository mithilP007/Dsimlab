import { FastifyInstance } from 'fastify';
import { requireRole, AuthenticatedRequest } from '../auth/middleware';
import { UserRole } from '../auth/roles';
import { prisma } from '../db/client';
import { z } from 'zod';
import { aggregateSimulationReport } from '../services/report/aggregator';
import { ValidationError, NotFoundError } from '../utils/errors';

export async function reportRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/report/class/:classId
   * Generates a cohort-wide aggregation report for class instructors
   */
  fastify.get('/class/:classId', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;

    const paramsSchema = z.object({
      classId: z.string().uuid('Invalid Class UUID format')
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    // Verify instructor ownership of classroom
    const targetClass = await prisma.class.findFirst({
      where: {
        id: parsedParams.data.classId,
        instructorId: authReq.user!.id
      }
    });

    if (!targetClass) {
      throw new NotFoundError('Class cohort not found or unauthorized.');
    }

    const studentSimulations = await prisma.simulationState.findMany({
      where: { classId: parsedParams.data.classId },
      include: { user: true }
    });

    const reportRows = await Promise.all(
      studentSimulations.map(async sim => {
        const stats = await aggregateSimulationReport(sim.id);
        return {
          studentId: sim.user.id,
          studentName: sim.user.name,
          studentEmail: sim.user.email,
          currentRound: sim.currentRound,
          isCompleted: sim.isCompleted,
          totalRevenue: stats.totals.revenue,
          totalSpend: stats.totals.spend,
          googleAdsSpend: stats.totals.googleCost,
          metaAdsSpend: stats.totals.metaCost,
          averageCompositeScore: stats.averages.roundCompositeIndex,
          averagePercentileRank: stats.averages.roundPercentileRank,
        };
      })
    );

    return reply.status(200).send({
      success: true,
      className: targetClass.name,
      report: reportRows
    });
  });
}
