import { FastifyInstance } from 'fastify';
import { requireRole, AuthenticatedRequest } from '../auth/middleware';
import { UserRole } from '../auth/roles';
import { prisma } from '../db/client';
import { z } from 'zod';
import { ValidationError, NotFoundError } from '../utils/errors';
import { hashPassword } from 'better-auth/crypto';
import { monitoring } from '../utils/monitoring';
import { cacheService } from '../utils/caching';

export async function adminRoutes(fastify: FastifyInstance) {
  // Enforce ADMIN role on all endpoints under this router
  fastify.addHook('preHandler', requireRole([UserRole.ADMIN]));

  /**
   * GET /api/v1/admin/dashboard-stats
   * Retrieves platform-wide metrics overview.
   */
  fastify.get('/dashboard-stats', async (request, reply) => {
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { status: 'active' } });
    const students = await prisma.user.count({
      where: { role: { in: [UserRole.STUDENT_COLLEGE, UserRole.INDIVIDUAL] } }
    });
    const instructors = await prisma.user.count({ where: { role: UserRole.INSTRUCTOR } });

    // Extract unique non-null institutions
    const usersWithInst = await prisma.user.findMany({
      where: { institution: { not: null } },
      select: { institution: true }
    });
    const uniqueInsts = new Set(usersWithInst.map(u => u.institution).filter(Boolean));
    const colleges = uniqueInsts.size;

    const activeSimulations = await prisma.simulationState.count({
      where: { isCompleted: false }
    });

    const certificatesIssued = await prisma.certificate.count();

    // Compute estimated revenue
    const simRevenueAggregate = await prisma.simulationState.aggregate({
      _sum: { cumulativeRevenue: true }
    });
    const simRevenue = simRevenueAggregate._sum.cumulativeRevenue || 0;

    // Standard Individual user plans cost $30
    const individualPlansCount = await prisma.user.count({
      where: { role: UserRole.INDIVIDUAL, planType: { not: null } }
    });
    const planRevenue = individualPlansCount * 30;
    const totalRevenue = simRevenue + planRevenue;

    // Get recent activity feed (last 10 logs)
    const recentLogs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } }
    });

    const recentActivity = recentLogs.map(log => ({
      id: log.id,
      timestamp: log.createdAt,
      actorName: log.user.name,
      actorEmail: log.user.email,
      action: log.action,
      details: log.details
    }));

    return reply.status(200).send({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        students,
        instructors,
        colleges,
        activeSimulations,
        certificatesIssued,
        totalRevenue
      },
      recentActivity
    });
  });

  /**
   * GET /api/v1/admin/audit-logs
   * Retrieves action audit logs.
   */
  fastify.get('/audit-logs', async (request, reply) => {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } }
    });

    return reply.status(200).send({
      success: true,
      logs: logs.map(l => ({
        id: l.id,
        timestamp: l.createdAt,
        actorName: l.user.name,
        actorEmail: l.user.email,
        action: l.action,
        target: l.details, // Using details as action target summary
        status: 'success'
      }))
    });
  });

  /**
   * GET /api/v1/admin/institutions
   * Retrieves computed institution profiles.
   */
  fastify.get('/institutions', async (request, reply) => {
    const allUsers = await prisma.user.findMany({
      include: {
        simulations: { select: { isCompleted: true } },
        _count: { select: { simulations: true } }
      }
    });

    const dbInstitutions = await prisma.institution.findMany();

    // Group users by institution
    const institutionGroups: Record<string, typeof allUsers> = {};
    allUsers.forEach(u => {
      if (u.institution) {
        const name = u.institution.trim();
        if (name) {
          institutionGroups[name] = institutionGroups[name] || [];
          institutionGroups[name].push(u);
        }
      }
    });

    // Ensure all DB institutions exist in the groups
    dbInstitutions.forEach(di => {
      if (!institutionGroups[di.name]) {
        institutionGroups[di.name] = [];
      }
    });

    const institutions = await Promise.all(
      Object.entries(institutionGroups).map(async ([name, users]) => {
        const studentsInInst = users.filter(u => u.role === UserRole.STUDENT_COLLEGE);
        const instructorsInInst = users.filter(u => u.role === UserRole.INSTRUCTOR);

        const studentsCount = studentsInInst.length;
        const instructorCount = instructorsInInst.length;

        // Calculate active simulation completion rate
        const totalSims = studentsInInst.reduce((sum, u) => sum + u._count.simulations, 0);
        let completionRate = 0;
        if (totalSims > 0) {
          const completedSimsCount = studentsInInst.reduce(
            (sum, u) => sum + u.simulations.filter(s => s.isCompleted).length,
            0
          );
          completionRate = parseFloat(((completedSimsCount / totalSims) * 100).toFixed(1));
        }

        // Calculate certification rate (% of students who have certificates)
        const certsCount = await prisma.certificate.count({
          where: { userId: { in: studentsInInst.map(s => s.id) } }
        });
        const certificationRate = studentsCount > 0
          ? parseFloat(((certsCount / studentsCount) * 100).toFixed(1))
          : 0;

        const dbInst = dbInstitutions.find(di => di.name.toLowerCase() === name.toLowerCase());
        const code = dbInst ? dbInst.code : "N/A";
        const status = dbInst ? dbInst.status : (users.some(u => u.status === 'active') ? 'active' : 'suspended');

        return {
          name,
          studentsCount,
          instructorCount,
          completionRate,
          certificationRate,
          status,
          code
        };
      })
    );

    return reply.status(200).send({
      success: true,
      institutions
    });
  });

  /**
   * PUT /api/v1/admin/institutions/:name
   * Renames an institution name on all associated users.
   */
  fastify.put('/institutions/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    const bodySchema = z.object({
      newName: z.string().min(1)
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const authReq = request as AuthenticatedRequest;

    await prisma.$transaction(async (tx) => {
      await tx.institution.updateMany({
        where: { name },
        data: { name: parsed.data.newName }
      });

      await tx.user.updateMany({
        where: { institution: name },
        data: { institution: parsed.data.newName }
      });

      await tx.auditLog.create({
        data: {
          userId: authReq.user!.id,
          action: 'INSTITUTION_RENAME',
          details: `Renamed institution from "${name}" to "${parsed.data.newName}"`
        }
      });
    });

    return reply.status(200).send({ success: true });
  });

  /**
   * POST /api/v1/admin/institutions/:name/deactivate
   * Suspends all users associated with the institution.
   */
  fastify.post('/institutions/:name/deactivate', async (request, reply) => {
    const { name } = request.params as { name: string };
    const authReq = request as AuthenticatedRequest;

    await prisma.$transaction(async (tx) => {
      await tx.institution.updateMany({
        where: { name },
        data: { status: 'suspended' }
      });

      await tx.user.updateMany({
        where: { institution: name },
        data: { status: 'suspended' }
      });

      await tx.auditLog.create({
        data: {
          userId: authReq.user!.id,
          action: 'INSTITUTION_DEACTIVATE',
          details: `Suspended all users in institution "${name}"`
        }
      });
    });

    return reply.status(200).send({ success: true });
  });

  /**
   * POST /api/v1/admin/institutions/:name/reactivate
   * Activates all users associated with the institution.
   */
  fastify.post('/institutions/:name/reactivate', async (request, reply) => {
    const { name } = request.params as { name: string };
    const authReq = request as AuthenticatedRequest;

    await prisma.$transaction(async (tx) => {
      await tx.institution.updateMany({
        where: { name },
        data: { status: 'active' }
      });

      await tx.user.updateMany({
        where: { institution: name },
        data: { status: 'active' }
      });

      await tx.auditLog.create({
        data: {
          userId: authReq.user!.id,
          action: 'INSTITUTION_REACTIVATE',
          details: `Activated all users in institution "${name}"`
        }
      });
    });

    return reply.status(200).send({ success: true });
  });

  /**
   * POST /api/v1/admin/institutions
   * Creates a new college/institution with registration code.
   */
  fastify.post('/institutions', async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(1),
      code: z.string().min(1).toUpperCase()
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const { name, code } = parsed.data;

    const existing = await prisma.institution.findFirst({
      where: {
        OR: [
          { name },
          { code }
        ]
      }
    });

    if (existing) {
      throw new ValidationError('Institution name or code already registered.');
    }

    const institution = await prisma.institution.create({
      data: {
        name,
        code,
        status: 'active'
      }
    });

    const authReq = request as AuthenticatedRequest;
    await prisma.auditLog.create({
      data: {
        userId: authReq.user!.id,
        action: 'INSTITUTION_CREATE',
        details: `Created new college/institution: "${name}" with code: "${code}"`
      }
    });

    return reply.status(201).send({ success: true, institution });
  });

  /**
   * PUT /api/v1/admin/users/:id
   * Updates user records (name, email, role, status, institution).
   */
  fastify.put('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const bodySchema = z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      role: z.enum(['STUDENT_COLLEGE', 'INDIVIDUAL', 'INSTRUCTOR', 'ADMIN']).optional(),
      status: z.enum(['active', 'suspended', 'pending']).optional(),
      institution: z.string().nullable().optional()
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      throw new NotFoundError('User not found.');
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: parsed.data
    });

    const authReq = request as AuthenticatedRequest;
    await prisma.auditLog.create({
      data: {
        userId: authReq.user!.id,
        action: 'USER_UPDATE_OVERRIDE',
        details: `Updated details for user "${targetUser.email}": ${JSON.stringify(parsed.data)}`
      }
    });

    return reply.status(200).send({ success: true, user: updatedUser });
  });

  /**
   * GET /api/v1/admin/analytics/overview
   * Retrieves platform simulation throughput and registration metrics over time.
   */
  fastify.get('/analytics/overview', async (_request, reply) => {
    const cacheKey = 'cache:admin:analytics:overview';
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      return reply.status(200).send(cached);
    }

    const growth: any[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const usersCount = await prisma.user.count({
        where: { createdAt: { gte: startOfMonth, lte: endOfMonth } }
      });
      
      const simulationsCount = await prisma.simulationState.count({
        where: { createdAt: { gte: startOfMonth, lte: endOfMonth } }
      });
      
      const certificatesCount = await prisma.certificate.count({
        where: { createdAt: { gte: startOfMonth, lte: endOfMonth } }
      });
      
      growth.push({
        month: monthLabel,
        users: usersCount,
        simulations: simulationsCount,
        certificates: certificatesCount
      });
    }

    const responsePayload = {
      success: true,
      growth
    };

    // Cache for 1 hour
    await cacheService.set(cacheKey, responsePayload, 3600);

    return reply.status(200).send(responsePayload);
  });

  /**
   * GET /api/v1/admin/system-health
   * Telemetry health checks.
   */
  fastify.get('/system-health', async (_request, reply) => {
    const report = await monitoring.getSystemHealthReport();
    return reply.status(200).send({
      success: true,
      health: report
    });
  });

  /**
   * POST /api/v1/admin/broadcast-notification
   * Sends system alerts.
   */
  fastify.post('/broadcast-notification', async (request, reply) => {
    const bodySchema = z.object({
      title: z.string().min(1),
      message: z.string().min(1),
      targetRole: z.string().optional(),
      targetInstitution: z.string().optional()
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const { title, message, targetRole, targetInstitution } = parsed.data;

    const whereClause: any = {};
    if (targetRole) {
      let dbRole = 'STUDENT_COLLEGE';
      if (targetRole === 'instructor') dbRole = 'INSTRUCTOR';
      else if (targetRole === 'admin') dbRole = 'ADMIN';
      whereClause.role = dbRole;
    }
    if (targetInstitution) {
      whereClause.institution = targetInstitution;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: { id: true }
    });

    const notificationsData = users.map(u => ({
      userId: u.id,
      type: 'warning',
      title,
      message,
      read: false
    }));

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({
        data: notificationsData
      });
    }

    const authReq = request as AuthenticatedRequest;
    await prisma.auditLog.create({
      data: {
        userId: authReq.user!.id,
        action: 'BROADCAST_NOTIFICATION',
        details: `Broadcast alert "${title}" to ${users.length} target users.`
      }
    });

    return reply.status(200).send({
      success: true,
      recipientsCount: users.length
    });
  });

  /**
   * POST /api/v1/admin/users/:id/reset-password
   * Resets a user's password.
   */
  fastify.post('/users/:id/reset-password', async (request, reply) => {
    const { id } = request.params as { id: string };

    const targetUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!targetUser) {
      throw new NotFoundError('User not found.');
    }

    const defaultPassword = 'ResetPassword123!';
    const hashedPassword = await hashPassword(defaultPassword);

    await prisma.account.updateMany({
      where: { userId: id },
      data: { password: hashedPassword }
    });

    const authReq = request as AuthenticatedRequest;
    await prisma.auditLog.create({
      data: {
        userId: authReq.user!.id,
        action: 'PASSWORD_RESET',
        details: `Reset password for user "${targetUser.name}" (${targetUser.email})`
      }
    });

    return reply.status(200).send({
      success: true,
      message: `Password reset successfully to standard value "${defaultPassword}"`
    });
  });

  /**
   * POST /api/v1/admin/users/bulk-action
   * Bulk suspends, activates, or deletes users.
   */
  fastify.post('/users/bulk-action', async (request, reply) => {
    const bodySchema = z.object({
      userIds: z.array(z.string()),
      action: z.enum(['suspend', 'activate', 'delete'])
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const { userIds, action } = parsed.data;
    const authReq = request as AuthenticatedRequest;

    if (action === 'suspend') {
      await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { status: 'suspended' }
      });
    } else if (action === 'activate') {
      await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { status: 'active' }
      });
    } else if (action === 'delete') {
      await prisma.$transaction(async (tx) => {
        // Cascades are supported but manually cleaning tables prevents dependency locks
        await tx.account.deleteMany({ where: { userId: { in: userIds } } });
        await tx.session.deleteMany({ where: { userId: { in: userIds } } });
        await tx.certificate.deleteMany({ where: { userId: { in: userIds } } });
        await tx.simulationState.deleteMany({ where: { userId: { in: userIds } } });
        await tx.user.deleteMany({ where: { id: { in: userIds } } });
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: authReq.user!.id,
        action: `BULK_${action.toUpperCase()}`,
        details: `Executed bulk ${action} on ${userIds.length} user records.`
      }
    });

    return reply.status(200).send({ success: true });
  });

}

