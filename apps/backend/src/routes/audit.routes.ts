import { FastifyInstance } from 'fastify';
import { requireAuth, AuthenticatedRequest } from '../auth/middleware';
import { prisma } from '../db/client';
import { z } from 'zod';
import { ValidationError, ForbiddenError } from '../utils/errors';
import { UserRole } from '../auth/roles';

export async function auditRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/audit
   * Retrieves decision and action audit trails.
   */
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    
    const querySchema = z.object({
      studentId: z.string().uuid('Invalid UUID format').optional()
    });

    const parsedQuery = querySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      throw new ValidationError(parsedQuery.error.errors[0].message);
    }

    let targetUserId = authReq.user!.id;

    if (parsedQuery.data.studentId) {
      // Students are forbidden from viewing audit logs of other classmates
      if (authReq.user!.role === UserRole.STUDENT_COLLEGE) {
        throw new ForbiddenError('Students are unauthorized to view third-party audit logs.');
      }
      targetUserId = parsedQuery.data.studentId;
    }

    const logs = await prisma.auditLog.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' }
    });

    return reply.status(200).send({
      success: true,
      logs
    });
  });
}
