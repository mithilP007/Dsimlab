import { FastifyInstance } from 'fastify';
import { requireAuth, AuthenticatedRequest } from '../auth/middleware';
import { prisma } from '../db/client';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';

export async function eventsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/events
   * Returns a historical list of all market events triggered in this simulation
   */
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const role = authReq.user!.role.toUpperCase().replace('-', '_');

    if (role === 'INSTRUCTOR' || role === 'ADMIN') {
      const { classId } = request.query as { classId?: string };

      if (!classId) {
        return reply.status(200).send({
          success: true,
          events: [],
          message: 'Please select a class to view market events.'
        });
      }

      const targetClass = await prisma.class.findFirst({
        where: { id: classId, instructorId: authReq.user!.id }
      });

      if (!targetClass && role !== 'ADMIN') {
        throw new ForbiddenError('Unauthorized to view events for this class.');
      }

      const sims = await prisma.simulationState.findMany({
        where: { classId }
      });
      const simIds = sims.map(s => s.id);

      const events = await prisma.marketEvent.findMany({
        where: {
          simulationId: { in: simIds }
        },
        orderBy: {
          round: 'desc'
        }
      });

      return reply.status(200).send({
        success: true,
        events
      });
    }

    // Role is STUDENT_COLLEGE or INDIVIDUAL
    const classId = authReq.user!.classId;
    if (!classId) {
      if (role === 'STUDENT_COLLEGE') {
        return reply.status(403).send({
          success: false,
          error: 'Your class access request is pending instructor approval.',
          message: 'Your class access request is pending instructor approval.',
          code: 'FORBIDDEN',
          statusCode: 403
        });
      }
      // Individual sandbox mode: find sandbox state
      const sim = await prisma.simulationState.findFirst({
        where: {
          userId: authReq.user!.id
        }
      });
      if (!sim) {
        return reply.status(200).send({
          success: true,
          events: [],
          message: 'No active simulation initialized.'
        });
      }
      const events = await prisma.marketEvent.findMany({
        where: { simulationId: sim.id },
        orderBy: { round: 'desc' }
      });
      return reply.status(200).send({
        success: true,
        events
      });
    }

    // Student has a classId: verify enrollment status first
    const enrollment = await prisma.classEnrollment.findFirst({
      where: { studentId: authReq.user!.id, classId }
    });

    if (role === 'STUDENT_COLLEGE') {
      if (!enrollment || enrollment.status === 'PENDING') {
        return reply.status(403).send({
          success: false,
          error: 'Your class access request is pending instructor approval.',
          message: 'Your class access request is pending instructor approval.',
          code: 'FORBIDDEN',
          statusCode: 403
        });
      }

      if (['REJECTED', 'REMOVED', 'TERMINATED'].includes(enrollment.status)) {
        return reply.status(403).send({
          success: false,
          error: 'Your access to this class has been terminated by the instructor.',
          message: 'Your access to this class has been terminated by the instructor.',
          code: 'FORBIDDEN',
          statusCode: 403
        });
      }
    }

    const sim = await prisma.simulationState.findFirst({
      where: {
        userId: authReq.user!.id,
        classId
      }
    });

    if (!sim) {
      return reply.status(200).send({
        success: true,
        events: [],
        message: 'No active simulation initialized.'
      });
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
