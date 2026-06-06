import { FastifyInstance } from 'fastify';
import { requireAuth, requireRole, AuthenticatedRequest } from '../auth/middleware';
import { UserRole } from '../auth/roles';
import { prisma } from '../db/client';
import { z } from 'zod';
import { ValidationError, NotFoundError } from '../utils/errors';

export async function userRoutes(fastify: FastifyInstance) {
  /**
   * PUT /api/v1/users/profile
   * Updates current user's profile display name
   */
  fastify.put('/profile', {
    preHandler: [requireAuth],
    schema: {
      description: "Update current user's profile display name",
      tags: ['User'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 }
        }
      },
      response: {
        200: {
          description: 'Profile updated successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const bodySchema = z.object({
      name: z.string().min(1, 'Display name cannot be empty'),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const updatedUser = await prisma.user.update({
      where: { id: authReq.user!.id },
      data: { name: parsed.data.name },
    });

    return reply.status(200).send({
      success: true,
      user: updatedUser,
    });
  });

  /**
   * POST /api/v1/users/join-class
   * Associates a student to a class room via class invite code
   */
  fastify.post('/join-class', {
    preHandler: [requireAuth],
    schema: {
      description: 'Associates a student to a class room via class invite code',
      tags: ['User'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        required: ['inviteCode'],
        properties: {
          inviteCode: { type: 'string', minLength: 1 }
        }
      },
      response: {
        200: {
          description: 'Successfully joined class',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            classId: { type: 'string' },
            className: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const bodySchema = z.object({
      inviteCode: z.string().min(1, 'Invite code is required'),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const targetClass = await prisma.class.findUnique({
      where: { inviteCode: parsed.data.inviteCode },
    });

    if (!targetClass) {
      throw new NotFoundError('No class found matching the provided invite code.');
    }

    await prisma.user.update({
      where: { id: authReq.user!.id },
      data: { classId: targetClass.id },
    });

    return reply.status(200).send({
      success: true,
      classId: targetClass.id,
      className: targetClass.name,
    });
  });

  /**
   * POST /api/v1/users/assign-role
   * Allows administrators to reassign user system roles
   */
  fastify.post('/assign-role', {
    preHandler: [requireRole([UserRole.ADMIN])],
    schema: {
      description: 'Allows administrators to reassign user system roles',
      tags: ['Admin'],
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        required: ['userId', 'role'],
        properties: {
          userId: { type: 'string' },
          role: { type: 'string', enum: Object.values(UserRole) }
        }
      },
      response: {
        200: {
          description: 'Role assigned successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const bodySchema = z.object({
      userId: z.string().uuid('Invalid user UUID format'),
      role: z.nativeEnum(UserRole),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
    });

    if (!targetUser) {
      throw new NotFoundError('User account not found.');
    }

    const updatedUser = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { role: parsed.data.role },
    });

    return reply.status(200).send({
      success: true,
      user: updatedUser,
    });
  });
}
