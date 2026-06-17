import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errors';
import { requireRole } from '../auth/middleware';
import { UserRole } from '../auth/roles';

// Memory cache of frontend crashes capped at 100 entries
const frontendErrorsList: any[] = [];
const MAX_ERRORS = 100;

export async function errorReportRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/error-reports
   * Retrieves recorded client-side crash logs for the admin dashboard
   */
  fastify.get('/', { preHandler: [requireRole([UserRole.ADMIN])] }, async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      reports: frontendErrorsList,
    });
  });

  /**
   * POST /api/v1/error-reports
   * Receives and records client-side crash profiles
   */
  fastify.post('/', async (request, reply) => {
    const bodySchema = z.object({
      errorMessage: z.string().min(1, 'Error message is required'),
      errorStack: z.string().optional(),
      path: z.string().optional(),
      userAgent: z.string().optional(),
      userId: z.string().optional(),
      correlationId: z.string().optional(),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const { errorMessage, errorStack, path: routePath, userAgent, userId, correlationId } = parsed.data;

    const errorEntry = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      errorMessage,
      errorStack: errorStack || 'No stack trace captured',
      path: routePath || 'unknown',
      userAgent: userAgent || 'unknown',
      userId: userId || 'anonymous',
      correlationId: correlationId || request.headers['x-correlation-id'] || 'none',
    };

    // Push to list and shift if limit is reached
    frontendErrorsList.unshift(errorEntry);
    if (frontendErrorsList.length > MAX_ERRORS) {
      frontendErrorsList.pop();
    }

    // Log using structured JSON logger
    logger.error({
      clientError: true,
      errorMessage,
      errorStack,
      routePath,
      userAgent,
      userId,
      clientCorrelationId: correlationId || request.headers['x-correlation-id'],
    }, `Frontend Crash Intercepted: ${errorMessage}`);

    return reply.status(200).send({
      success: true,
      message: 'Error report captured and stored successfully.',
    });
  });
}
