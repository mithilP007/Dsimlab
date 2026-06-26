import { FastifyInstance } from 'fastify';
import { requireRole, AuthenticatedRequest } from '../auth/middleware';
import { UserRole } from '../auth/roles';
import { prisma } from '../db/client';
import { z } from 'zod';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import crypto from 'crypto';
import { checkCertificateEligibility } from '../services/certificate/eligibility';
import { limitsService } from '../services/billing/limits.service';

export async function classRoutes(fastify: FastifyInstance) {
  async function getClassAndCheckPermission(classId: string, user: any) {
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classRecord) {
      throw new NotFoundError('Class cohort not found.');
    }

    const isInstructor = user.role === UserRole.INSTRUCTOR || user.role === 'INSTRUCTOR';
    const isAdmin = user.role === UserRole.ADMIN || user.role === 'ADMIN';

    if (isInstructor && classRecord.instructorId !== user.id) {
      throw new ForbiddenError('Unauthorized: Instructor does not own this class cohort.');
    }

    if (!isAdmin && !isInstructor) {
      throw new ForbiddenError('Unauthorized to access this class cohort.');
    }

    return classRecord;
  }

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
    const isAdmin = authReq.user!.role === UserRole.ADMIN || authReq.user!.role === 'ADMIN';

    try {
      const classes = await prisma.class.findMany({
        where: isAdmin ? undefined : { instructorId: authReq.user!.id },
        include: {
          scenario: true,
          instructor: isAdmin ? { select: { id: true, name: true, email: true } } : undefined,
          _count: {
            select: { students: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.status(200).send({ success: true, classes });
    } catch (err) {
      return reply.status(200).send({ success: true, classes: [] });
    }
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

    await getClassAndCheckPermission(parsedParams.data.id, authReq.user);

    const targetClass = await prisma.class.findUnique({
      where: {
        id: parsedParams.data.id,
      },
      include: {
        scenario: true,
        students: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            simulations: {
              select: {
                id: true,
                status: true,
                currentRound: true,
                isCompleted: true,
                score: true,
                cumulativeSpend: true,
                cumulativeRevenue: true,
                createdAt: true,
                progress: {
                  select: {
                    id: true,
                    currentDay: true,
                    totalDays: true,
                    status: true,
                    lastSubmittedAt: true,
                    nextResultAt: true,
                    completedAt: true,
                  }
                },
                scoreBreakdowns: {
                  select: {
                    id: true,
                    round: true,
                    seoScore: true,
                    googleAdsScore: true,
                    metaAdsScore: true,
                    budgetScore: true,
                    revenueScore: true,
                    compositeIndex: true,
                    percentileRank: true,
                    createdAt: true,
                  },
                  orderBy: { round: 'desc' },
                  take: 1,
                }
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!targetClass) {
      throw new NotFoundError('Class cohort not found.');
    }

    return reply.status(200).send({
      success: true,
      class: targetClass,
    });
  });

  /**
   * PUT /api/v1/class/:id
   * Updates an existing class room's name (Guarded by INSTRUCTOR / ADMIN role check)
   */
  fastify.put('/:id', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;

    const paramsSchema = z.object({
      id: z.string().uuid('Invalid Class UUID format'),
    });

    const bodySchema = z.object({
      name: z.string().min(1, 'Class name cannot be empty'),
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    const parsedBody = bodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      throw new ValidationError(parsedBody.error.errors[0].message);
    }

    await getClassAndCheckPermission(parsedParams.data.id, authReq.user);

    const updatedClass = await prisma.class.update({
      where: { id: parsedParams.data.id },
      data: {
        name: parsedBody.data.name,
      },
    });

    return reply.status(200).send({
      success: true,
      class: updatedClass,
    });
  });
  /**
   * DELETE /api/v1/class/:id
   * Deletes a class cohort (Instructor only)
   */
  fastify.delete('/:id', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;

    const paramsSchema = z.object({
      id: z.string().uuid('Invalid Class UUID format'),
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    await getClassAndCheckPermission(parsedParams.data.id, authReq.user);

    // Unlink students before deleting
    await prisma.user.updateMany({
      where: { classId: parsedParams.data.id },
      data: { classId: null, status: 'active' },
    });

    await prisma.class.delete({ where: { id: parsedParams.data.id } });

    return reply.status(200).send({ success: true, message: 'Class deleted.' });
  });

  /**
   * GET /api/v1/class/:id/pending-students
   * Returns all students pending approval for a class owned by this instructor
   */
  fastify.get('/:id/pending-students', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;

    const { id } = request.params as { id: string };

    await getClassAndCheckPermission(id, authReq.user);

    const pendingStudents = await prisma.user.findMany({
      where: { classId: id, status: 'pending' },
      select: {
        id: true,
        name: true,
        email: true,
        institution: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return reply.status(200).send({ success: true, students: pendingStudents });
  });

  /**
   * POST /api/v1/class/:id/approve/:studentId
   * Approves a pending student join request — sets status to 'active'
   */
  fastify.post('/:id/approve/:studentId', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id, studentId } = request.params as { id: string; studentId: string };

    const targetClass = await getClassAndCheckPermission(id, authReq.user);

    const student = await prisma.user.findFirst({
      where: { id: studentId, classId: id, status: 'pending' },
    });

    if (!student) throw new NotFoundError('Pending student not found in this class.');

    await limitsService.checkStudentLimit(authReq.user!.id);

    await prisma.user.update({
      where: { id: studentId },
      data: { status: 'active' },
    });

    // Sync with ClassEnrollment system
    const enrollment = await prisma.classEnrollment.findFirst({
      where: { studentId, classId: id }
    });

    if (enrollment) {
      await prisma.classEnrollment.update({
        where: { id: enrollment.id },
        data: { status: 'ACTIVE', approvedAt: new Date(), actionByInstructorId: authReq.user!.id }
      });
    } else {
      await prisma.classEnrollment.create({
        data: {
          classId: id,
          studentId,
          studentEmail: student.email,
          status: 'ACTIVE',
          approvedAt: new Date(),
          actionByInstructorId: authReq.user!.id
        }
      });
    }

    // Initialize SimulationState if it doesn't exist
    const existingState = await prisma.simulationState.findFirst({
      where: { userId: studentId, classId: id }
    });

    if (!existingState) {
      const newState = await prisma.simulationState.create({
        data: {
          userId: studentId,
          classId: id,
          currentRound: 1,
          isCompleted: false,
          status: 'DECISION_OPEN'
        }
      });

      const totalDays = targetClass.scenarioId
        ? (await prisma.scenario.findUnique({ where: { id: targetClass.scenarioId } }))?.durationDays || 30
        : 30;

      await prisma.studentSimulationProgress.create({
        data: {
          simulationId: newState.id,
          currentDay: 1,
          totalDays,
          status: 'DECISION_OPEN'
        }
      });
    }

    return reply.status(200).send({ success: true, message: 'Student approved.' });
  });

  /**
   * POST /api/v1/class/:id/reject/:studentId
   * Rejects a pending student join request — removes them from the class
   */
  fastify.post('/:id/reject/:studentId', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id, studentId } = request.params as { id: string; studentId: string };

    await getClassAndCheckPermission(id, authReq.user);

    const student = await prisma.user.findFirst({
      where: { id: studentId, classId: id, status: 'pending' },
    });

    if (!student) throw new NotFoundError('Pending student not found in this class.');

    // Remove from class entirely
    await prisma.user.update({
      where: { id: studentId },
      data: { classId: null, status: 'active' },
    });

    // Update ClassEnrollment to REJECTED
    await prisma.classEnrollment.updateMany({
      where: { studentId, classId: id },
      data: { status: 'REJECTED', rejectedAt: new Date(), actionByInstructorId: authReq.user!.id }
    });

    return reply.status(200).send({ success: true, message: 'Student request rejected.' });
  });

  /**
   * GET /api/v1/class/:id/certifications
   * Returns classroom cohort certifications report (distribution, eligible, issued).
   */
  fastify.get('/:id/certifications', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    
    const paramsSchema = z.object({
      id: z.string().uuid('Invalid Class UUID format'),
    });

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new ValidationError(parsedParams.error.errors[0].message);
    }

    await getClassAndCheckPermission(parsedParams.data.id, authReq.user);

    const targetClass = await prisma.class.findUnique({
      where: {
        id: parsedParams.data.id,
      },
      include: {
        students: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            simulations: {
              select: {
                id: true,
                status: true,
                score: true,
                isCompleted: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            }
          }
        }
      }
    });

    if (!targetClass) {
      throw new NotFoundError('Class cohort not found.');
    }

    // Query all certificates in this class
    const certificates = await prisma.certificate.findMany({
      where: {
        simulation: {
          classId: targetClass.id
        }
      },
      orderBy: { issueDate: 'desc' }
    });

    // Calculate distributions
    const distribution = {
      BRONZE: 0,
      SILVER: 0,
      GOLD: 0,
      PLATINUM: 0
    };

    certificates.forEach(c => {
      const b = c.band.toUpperCase();
      if (b === 'BRONZE' || b === 'COMPETENT') {
        distribution.BRONZE++;
      } else if (b === 'SILVER' || b === 'PROFICIENT') {
        distribution.SILVER++;
      } else if (b === 'GOLD' || b === 'ADVANCED') {
        distribution.GOLD++;
      } else if (b === 'PLATINUM') {
        distribution.PLATINUM++;
      }
    });

    // Determine eligibility of each student who does not have an issued certificate
    const certifiedUserIds = new Set(certificates.map(c => c.userId));
    const eligibleStudents: any[] = [];

    await Promise.all(
      targetClass.students.map(async student => {
        if (certifiedUserIds.has(student.id)) return;
        
        const latestSim = student.simulations[0];
        if (!latestSim) return;

        const check = await checkCertificateEligibility(latestSim.id);
        if (check.eligible) {
          eligibleStudents.push({
            studentId: student.id,
            studentName: student.name,
            studentEmail: student.email,
            simulationId: latestSim.id,
            compositeScore: check.compositeScore,
            strategicConsistency: check.strategicConsistency,
            eligibleBand: check.band
          });
        }
      })
    );

    const totalStudentsCount = targetClass.students.length;
    const finalSuccessRate = totalStudentsCount > 0 
      ? parseFloat(((certificates.length / totalStudentsCount) * 100).toFixed(1))
      : 0;

    return reply.status(200).send({
      success: true,
      totalStudents: totalStudentsCount,
      certifiedCount: certificates.length,
      successRate: finalSuccessRate,
      distribution,
      certificates,
      eligibleStudents
    });
  });
}

