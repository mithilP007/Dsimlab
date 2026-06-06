import { FastifyInstance } from 'fastify';
import { requireRole, AuthenticatedRequest } from '../auth/middleware';
import { UserRole } from '../auth/roles';
import { prisma } from '../db/client';
import { z } from 'zod';
import { ValidationError, NotFoundError } from '../utils/errors';
import crypto from 'crypto';

export async function classRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/class
   * Creates a new class room (Guarded by INSTRUCTOR / ADMIN role check)
   */
  fastify.post('/', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;

    const bodySchema = z.object({
      name: z.string().min(1, 'Class name cannot be empty'),
      scenarioId: z.string().uuid('Invalid Scenario ID format'),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const scenario = await prisma.scenario.findUnique({
      where: { id: parsed.data.scenarioId },
    });

    if (!scenario) {
      throw new NotFoundError('Scenario template not found.');
    }

    // Generate unique 6-character uppercase invite code
    const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    const newClass = await prisma.class.create({
      data: {
        name: parsed.data.name,
        inviteCode,
        instructorId: authReq.user!.id,
        scenarioId: parsed.data.scenarioId,
      },
    });

    return reply.status(201).send({
      success: true,
      class: newClass,
    });
  });

  /**
   * GET /api/v1/class
   * Lists all classes managed by the calling instructor
   */
  fastify.get('/', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;

    const classes = await prisma.class.findMany({
      where: {
        instructorId: authReq.user!.id,
      },
      include: {
        scenario: true,
        _count: {
          select: { students: true },
        },
      },
    });

    return reply.status(200).send({
      success: true,
      classes,
    });
  });

  /**
   * GET /api/v1/class/:id
   * Retrieves single class cohort and lists each student's current simulation round status
   */
  fastify.get('/:id', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    
    const paramsSchema = z.object({
      id: z.string().uuid('Invalid Class UUID format'),
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const targetClass = await prisma.class.findFirst({
      where: {
        id: parsedParams.data.id,
        instructorId: authReq.user!.id,
      },
      include: {
        scenario: true,
        students: {
          select: {
            id: true,
            name: true,
            email: true,
            simulations: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!targetClass) {
      throw new NotFoundError('Class cohort not found or instructor is unauthorized to view it.');
    }

    return reply.status(200).send({
      success: true,
      class: targetClass,
    });
  });
}
