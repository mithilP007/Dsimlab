import { FastifyInstance } from 'fastify';
import { requireAuth, requireRole } from '../auth/middleware';
import { UserRole } from '../auth/roles';
import { prisma } from '../db/client';
import { z } from 'zod';
import { ValidationError } from '../utils/errors';

export async function scenarioRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/scenario
   * Lists all simulation scenarios templates
   */
  fastify.get('/', { preHandler: [requireAuth] }, async (_request, reply) => {
    const scenarios = await prisma.scenario.findMany({
      orderBy: { name: 'asc' },
    });
    
    return reply.status(200).send({
      success: true,
      scenarios,
    });
  });

  /**
   * POST /api/v1/scenario
   * Creates a custom scenario (Guarded to instructors or system admins)
   */
  fastify.post('/', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(1, 'Scenario name is required'),
      description: z.string().min(1, 'Description is required'),
      industry: z.string().min(1, 'Target industry is required'),
      startRound: z.number().int().positive().default(1),
      maxRounds: z.number().int().positive().default(10),
      budgetPerRound: z.number().positive('Round budget must be positive'),
      baselineOrganicTraffic: z.number().int().positive().default(1000),
      targetKPI: z.enum(['revenue', 'clicks', 'conversions']).default('revenue'),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const scenario = await prisma.scenario.create({
      data: parsed.data,
    });

    return reply.status(201).send({
      success: true,
      scenario,
    });
  });
}
