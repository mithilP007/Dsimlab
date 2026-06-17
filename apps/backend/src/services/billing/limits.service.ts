import { prisma } from '../../db/client';
import { ValidationError } from '../../utils/errors';

export class LimitsService {
  /**
   * Resolves the active pricing plan and subscription limits for a user.
   */
  async resolveUserLimits(userId: string) {
    const activeSub = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['active', 'trialing'] },
      },
      include: { plan: true },
    });

    if (activeSub && activeSub.plan) {
      return activeSub.plan;
    }

    // Fallback default: Free Plan limits
    const freePlan = await prisma.plan.findUnique({ where: { code: 'free' } });
    if (!freePlan) {
      // Hardcoded fallback safety checks if database seed is not loaded
      return {
        simulationLimit: 1,
        studentLimit: 5,
        instructorLimit: 0,
        certificateLimit: 0,
        reportExportLimit: 10,
        storageLimitMb: 50,
      };
    }
    return freePlan;
  }

  /**
   * Checks if user can create/start a new simulation campaign run.
   */
  async checkSimulationLimit(userId: string) {
    const limits = await this.resolveUserLimits(userId);

    if (limits.simulationLimit === -1) return; // Unlimited

    const currentCount = await prisma.simulationState.count({
      where: { userId },
    });

    if (currentCount >= limits.simulationLimit) {
      throw new ValidationError(
        `Simulation limit reached (${limits.simulationLimit} max). Please upgrade your pricing plan.`
      );
    }
  }

  /**
   * Checks if an instructor can enroll another student into their classrooms.
   */
  async checkStudentLimit(instructorId: string) {
    const limits = await this.resolveUserLimits(instructorId);

    if (limits.studentLimit === -1) return; // Unlimited

    // Count all active or pending students enrolled across all classes of this instructor
    const currentStudentsCount = await prisma.user.count({
      where: {
        class: { instructorId },
      },
    });

    if (currentStudentsCount >= limits.studentLimit) {
      throw new ValidationError(
        `Student enrollment capacity reached (${limits.studentLimit} max) for your active plan. Please upgrade your subscription tier.`
      );
    }
  }

  /**
   * Checks if a user is allowed to acquire another certificate.
   */
  async checkCertificateLimit(userId: string) {
    const limits = await this.resolveUserLimits(userId);

    if (limits.certificateLimit === -1) return; // Unlimited

    const currentCount = await prisma.certificate.count({
      where: { userId },
    });

    if (currentCount >= limits.certificateLimit) {
      throw new ValidationError(
        `Certificate accrual limit reached (${limits.certificateLimit} max) for your plan. Please upgrade to claim certificates.`
      );
    }
  }

  /**
   * Checks if a user is allowed to export NBA/OBE reports.
   */
  async checkExportLimit(userId: string) {
    const limits = await this.resolveUserLimits(userId);

    if (limits.reportExportLimit === -1) return; // Unlimited

    // Audit log entries can serve as export counters
    const currentExports = await prisma.auditLog.count({
      where: {
        userId,
        action: 'EXPORT_REPORT',
      },
    });

    if (currentExports >= limits.reportExportLimit) {
      throw new ValidationError(
        `Report export limit reached (${limits.reportExportLimit} max) for your active plan. Please upgrade to export more reports.`
      );
    }
  }
}

export const limitsService = new LimitsService();
