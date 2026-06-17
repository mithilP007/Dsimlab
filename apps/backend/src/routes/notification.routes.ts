import { FastifyInstance } from 'fastify';
import { requireAuth, AuthenticatedRequest } from '../auth/middleware';
import { prisma } from '../db/client';
import { z } from 'zod';
import { ValidationError, NotFoundError } from '../utils/errors';

export async function notificationRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/notifications
   * Retrieves all notifications for the logged in user
   */
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;

    const notifications = await prisma.notification.findMany({
      where: { userId: authReq.user!.id },
      orderBy: { createdAt: 'desc' }
    });

    return reply.status(200).send({
      success: true,
      notifications
    });
  });

  /**
   * PUT /api/v1/notifications/:id/read
   * Marks a notification as read
   */
  fastify.put('/:id/read', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    
    const paramsSchema = z.object({
      id: z.string().uuid('Invalid Notification UUID format')
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const notification = await prisma.notification.findFirst({
      where: { id: parsedParams.data.id, userId: authReq.user!.id }
    });

    if (!notification) {
      throw new NotFoundError('Notification not found or unauthorized.');
    }

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { read: true }
    });

    return reply.status(200).send({
      success: true,
      notification: updated
    });
  });

  /**
   * PUT /api/v1/notifications/read-all
   * Marks all notifications of this user as read
   */
  fastify.put('/read-all', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;

    await prisma.notification.updateMany({
      where: { userId: authReq.user!.id, read: false },
      data: { read: true }
    });

    return reply.status(200).send({
      success: true,
      message: 'All notifications marked as read.'
    });
  });

  /**
   * DELETE /api/v1/notifications/:id
   * Dismisses (deletes) a notification
   */
  fastify.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    
    const paramsSchema = z.object({
      id: z.string().uuid('Invalid Notification UUID format')
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const notification = await prisma.notification.findFirst({
      where: { id: parsedParams.data.id, userId: authReq.user!.id }
    });

    if (!notification) {
      throw new NotFoundError('Notification not found or unauthorized.');
    }

    await prisma.notification.delete({
      where: { id: notification.id }
    });

    return reply.status(200).send({
      success: true,
      message: 'Notification dismissed.'
    });
  });

  /**
   * DELETE /api/v1/notifications/clear-read
   * Clears all read notifications for the user
   */
  fastify.delete('/clear-read', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;

    await prisma.notification.deleteMany({
      where: { userId: authReq.user!.id, read: true }
    });

    return reply.status(200).send({
      success: true,
      message: 'Read notifications cleared.'
    });
  });
}
