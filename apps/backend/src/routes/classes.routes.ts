import { FastifyInstance } from 'fastify';
import { requireAuth, requireRole, AuthenticatedRequest } from '../auth/middleware';
import { UserRole } from '../auth/roles';
import { prisma } from '../db/client';
import { z } from 'zod';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { logActivity, createNotification } from '../utils/audit';

export async function classesRoutes(fastify: FastifyInstance) {
  // POST /api/classes/join
  fastify.post('/join', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const bodySchema = z.object({
      joinCode: z.string().min(1, 'Join code is required'),
      email: z.string().email('Invalid email format'),
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const targetClass = await prisma.class.findUnique({
      where: { inviteCode: parsed.data.joinCode.toUpperCase() },
    });

    if (!targetClass) {
      throw new NotFoundError('No class found matching the provided invite code.');
    }

    // Check if there is an existing enrollment
    const existing = await prisma.classEnrollment.findFirst({
      where: { studentId: authReq.user!.id, classId: targetClass.id }
    });

    if (existing) {
      if (existing.status === 'ACTIVE') {
        // Force User status to active and classId in case of mismatch
        await prisma.user.update({
          where: { id: authReq.user!.id },
          data: { classId: targetClass.id, status: 'active' }
        });
        return reply.status(200).send({
          success: true,
          status: 'ACTIVE',
          classId: targetClass.id,
          className: targetClass.name,
        });
      }
      if (['REJECTED', 'REMOVED', 'TERMINATED'].includes(existing.status)) {
        return reply.status(403).send({
          success: false,
          error: 'Your access to this class has been terminated by the instructor.',
          message: 'Your access to this class has been terminated by the instructor.',
          code: 'FORBIDDEN',
          statusCode: 403
        });
      }
      if (existing.status === 'PENDING') {
        return reply.status(200).send({
          success: true,
          status: 'PENDING',
          classId: targetClass.id,
          className: targetClass.name,
        });
      }
    }

    // Create a new PENDING class enrollment request
    const enrollment = await prisma.classEnrollment.create({
      data: {
        classId: targetClass.id,
        studentId: authReq.user!.id,
        studentEmail: parsed.data.email,
        status: 'PENDING',
      }
    });

    // Also update User profile classId and status: 'pending'
    await prisma.user.update({
      where: { id: authReq.user!.id },
      data: { classId: targetClass.id, status: 'pending' }
    });

    // Notify the instructor
    await createNotification(
      targetClass.instructorId,
      'info',
      'New Student Joined Class',
      `Student "${authReq.user!.name}" (${authReq.user!.email}) has requested to join your class "${targetClass.name}". Approval is required.`,
      authReq.user!.name
    );

    // Audit Log
    await logActivity(
      authReq.user!.id,
      'STUDENT_JOIN_REQUEST',
      `Student submitted a join request for class "${targetClass.name}" (Code: ${targetClass.inviteCode}).`
    );

    return reply.status(201).send({
      success: true,
      status: 'PENDING',
      classId: targetClass.id,
      className: targetClass.name,
    });
  });

  // GET /api/classes/my-enrollment
  fastify.get('/my-enrollment', { preHandler: [requireAuth] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const classId = authReq.user!.classId;
    if (!classId) {
      return reply.status(200).send({
        success: true,
        status: 'NONE',
        message: 'You have not requested to join any class.'
      });
    }

    const classExists = await prisma.class.findUnique({
      where: { id: classId }
    });

    if (!classExists) {
      // Clean up stale classId on student's user profile
      await prisma.user.update({
        where: { id: authReq.user!.id },
        data: { classId: null, status: 'active' }
      });
      authReq.user!.classId = null;
      authReq.user!.status = 'active';

      return reply.status(200).send({
        success: true,
        status: 'NONE',
        message: 'Your previous class was deleted or no longer exists.'
      });
    }

    const enrollment = await prisma.classEnrollment.findFirst({
      where: { studentId: authReq.user!.id, classId },
      orderBy: { requestedAt: 'desc' }
    });

    if (!enrollment) {
      // Fallback if classId is set on user but no enrollment record exists
      const status = authReq.user!.status === 'active' ? 'ACTIVE' : 'PENDING';
      return reply.status(200).send({
        success: true,
        status,
        message: status === 'ACTIVE' ? 'Your enrollment is active.' : 'Your request is waiting for instructor approval.'
      });
    }

    let message = 'Your request is waiting for instructor approval.';
    if (enrollment.status === 'ACTIVE') {
      message = 'Your enrollment is active.';
    } else if (['REJECTED', 'REMOVED', 'TERMINATED'].includes(enrollment.status)) {
      message = 'Your class access has been terminated by the instructor.';
    }

    return reply.status(200).send({
      success: true,
      status: enrollment.status,
      message,
      enrollment
    });
  });

  // GET /api/classes/:classId/enrollment-requests
  fastify.get('/:classId/enrollment-requests', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { classId } = request.params as { classId: string };

    const targetClass = await prisma.class.findUnique({
      where: { id: classId }
    });

    if (!targetClass) {
      throw new NotFoundError('Class cohort not found.');
    }

    const isInstructor = authReq.user!.role === UserRole.INSTRUCTOR || authReq.user!.role === 'INSTRUCTOR';
    const isAdmin = authReq.user!.role === UserRole.ADMIN || authReq.user!.role === 'ADMIN';

    if (isInstructor && targetClass.instructorId !== authReq.user!.id) {
      throw new ForbiddenError('Unauthorized to access this class cohort.');
    }

    if (!isAdmin && !isInstructor) {
      throw new ForbiddenError('Unauthorized to access this class cohort.');
    }

    const pendingRequests = await prisma.classEnrollment.findMany({
      where: { classId, status: 'PENDING' },
      orderBy: { requestedAt: 'asc' }
    });

    // Resolve student names from User table safely
    const requestsWithNames = await Promise.all((pendingRequests || []).map(async (req) => {
      if (!req || !req.studentId) {
        return {
          ...req,
          studentName: 'Unknown Student'
        };
      }
      try {
        const student = await prisma.user.findUnique({
          where: { id: req.studentId },
          select: { name: true }
        });
        return {
          ...req,
          studentName: student?.name || 'Unknown Student'
        };
      } catch (err) {
        return {
          ...req,
          studentName: 'Unknown Student'
        };
      }
    }));

    return reply.status(200).send({
      success: true,
      requests: requestsWithNames || [],
      pendingCount: requestsWithNames ? requestsWithNames.length : 0
    });
  });

  // POST /api/classes/:classId/enrollments/:enrollmentId/approve
  fastify.post('/:classId/enrollments/:enrollmentId/approve', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { classId, enrollmentId } = request.params as { classId: string; enrollmentId: string };

    const targetClass = await prisma.class.findFirst({
      where: { id: classId, instructorId: authReq.user!.id }
    });

    if (!targetClass) {
      throw new ForbiddenError('Unauthorized to access this class cohort.');
    }

    const enrollment = await prisma.classEnrollment.findUnique({
      where: { id: enrollmentId }
    });

    if (!enrollment || enrollment.classId !== classId) {
      throw new NotFoundError('Enrollment request not found.');
    }

    // Set ACTIVE
    const updatedEnrollment = await prisma.classEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'ACTIVE',
        approvedAt: new Date(),
        actionByInstructorId: authReq.user!.id
      }
    });

    // Update User table: classId and status = active
    await prisma.user.update({
      where: { id: enrollment.studentId },
      data: { classId, status: 'active' }
    });

    // Initialize SimulationState if it doesn't exist
    const existingState = await prisma.simulationState.findFirst({
      where: { userId: enrollment.studentId, classId }
    });

    if (!existingState) {
      const newState = await prisma.simulationState.create({
        data: {
          userId: enrollment.studentId,
          classId,
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

    // Notify the student
    await createNotification(
      enrollment.studentId,
      'success',
      'Classroom Access Approved',
      `Your instructor has approved your request to join the class "${targetClass.name}". You can now access your simulation workspace!`,
      authReq.user!.name
    );

    // Audit Log
    await logActivity(
      enrollment.studentId,
      'STUDENT_APPROVED',
      `Instructor approved join request for class "${targetClass.name}".`
    );

    return reply.status(200).send({
      success: true,
      enrollment: updatedEnrollment
    });
  });

  // POST /api/classes/:classId/enrollments/:enrollmentId/reject
  fastify.post('/:classId/enrollments/:enrollmentId/reject', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { classId, enrollmentId } = request.params as { classId: string; enrollmentId: string };
    const bodySchema = z.object({
      reason: z.string().optional()
    });

    const parsed = bodySchema.parse(request.body || {});

    const targetClass = await prisma.class.findFirst({
      where: { id: classId, instructorId: authReq.user!.id }
    });

    if (!targetClass) {
      throw new ForbiddenError('Unauthorized to access this class cohort.');
    }

    const enrollment = await prisma.classEnrollment.findUnique({
      where: { id: enrollmentId }
    });

    if (!enrollment || enrollment.classId !== classId) {
      throw new NotFoundError('Enrollment request not found.');
    }

    // Set REJECTED
    const updatedEnrollment = await prisma.classEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        actionByInstructorId: authReq.user!.id,
        rejectionReason: parsed.reason || null
      }
    });

    // Update student status in User table
    await prisma.user.update({
      where: { id: enrollment.studentId },
      data: { status: 'rejected' }
    });

    // Notify the student
    await createNotification(
      enrollment.studentId,
      'warning',
      'Classroom Access Rejected',
      `Your request to join the class "${targetClass.name}" was rejected by the instructor.`,
      authReq.user!.name
    );

    // Audit Log
    await logActivity(
      enrollment.studentId,
      'STUDENT_REJECTED',
      `Instructor rejected join request for class "${targetClass.name}". Reason: ${parsed.reason || 'None'}`
    );

    return reply.status(200).send({
      success: true,
      enrollment: updatedEnrollment
    });
  });

  // POST /api/classes/:classId/enrollments/:enrollmentId/remove
  fastify.post('/:classId/enrollments/:enrollmentId/remove', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { classId, enrollmentId } = request.params as { classId: string; enrollmentId: string };
    const bodySchema = z.object({
      reason: z.string().optional()
    });

    const parsed = bodySchema.parse(request.body || {});

    const targetClass = await prisma.class.findFirst({
      where: { id: classId, instructorId: authReq.user!.id }
    });

    if (!targetClass) {
      throw new ForbiddenError('Unauthorized to access this class cohort.');
    }

    const enrollment = await prisma.classEnrollment.findUnique({
      where: { id: enrollmentId }
    });

    if (!enrollment || enrollment.classId !== classId) {
      throw new NotFoundError('Enrollment request not found.');
    }

    // Set TERMINATED
    const updatedEnrollment = await prisma.classEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'TERMINATED',
        removedAt: new Date(),
        actionByInstructorId: authReq.user!.id,
        removalReason: parsed.reason || null
      }
    });

    // Update student status
    await prisma.user.update({
      where: { id: enrollment.studentId },
      data: { status: 'terminated' }
    });

    // Notify student
    await createNotification(
      enrollment.studentId,
      'warning',
      'Classroom Access Terminated',
      `Your access to the class "${targetClass.name}" was terminated by the instructor.`,
      authReq.user!.name
    );

    // Audit Log
    await logActivity(
      enrollment.studentId,
      'STUDENT_KICKED',
      `Instructor terminated class enrollment for class "${targetClass.name}". Reason: ${parsed.reason || 'None'}`
    );

    return reply.status(200).send({
      success: true,
      enrollment: updatedEnrollment
    });
  });

  // POST /api/classes/:classId/students/:studentId/kick
  fastify.post('/:classId/students/:studentId/kick', { preHandler: [requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN])] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { classId, studentId } = request.params as { classId: string; studentId: string };
    const bodySchema = z.object({
      reason: z.string().optional()
    });

    const parsed = bodySchema.parse(request.body || {});

    const targetClass = await prisma.class.findFirst({
      where: { id: classId, instructorId: authReq.user!.id }
    });

    if (!targetClass) {
      throw new ForbiddenError('Unauthorized to access this class cohort.');
    }

    const enrollment = await prisma.classEnrollment.findFirst({
      where: { studentId, classId },
      orderBy: { requestedAt: 'desc' }
    });

    if (enrollment) {
      await prisma.classEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: 'TERMINATED',
          removedAt: new Date(),
          actionByInstructorId: authReq.user!.id,
          removalReason: parsed.reason || null
        }
      });
    } else {
      await prisma.classEnrollment.create({
        data: {
          classId,
          studentId,
          studentEmail: (await prisma.user.findUnique({ where: { id: studentId } }))?.email || '',
          status: 'TERMINATED',
          removedAt: new Date(),
          actionByInstructorId: authReq.user!.id,
          removalReason: parsed.reason || null
        }
      });
    }

    // Update user status
    await prisma.user.update({
      where: { id: studentId },
      data: { status: 'terminated' }
    });

    // Notify the student
    await createNotification(
      studentId,
      'warning',
      'Classroom Access Terminated',
      `Your access to the class "${targetClass.name}" was terminated by the instructor.`,
      authReq.user!.name
    );

    // Audit Log
    await logActivity(
      studentId,
      'STUDENT_KICKED',
      `Instructor kicked student from class "${targetClass.name}". Reason: ${parsed.reason || 'None'}`
    );

    return reply.status(200).send({
      success: true,
      message: 'Student kicked successfully.'
    });
  });
}
