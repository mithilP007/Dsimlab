import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

/**
 * Sweeps the database for user accounts and associated records inactive for more than 2 years.
 * Executes cleanups transactionally to ensure system integrity.
 */
export async function executeDataRetentionPruning(): Promise<void> {
  logger.info('Starting GDPR/CCPA data retention weekly sweep of inactive records...');
  
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 2); // 2 years ago

  try {
    const targetUsers = await prisma.user.findMany({
      where: {
        updatedAt: { lte: cutoff },
        role: { not: 'ADMIN' },
      },
      select: { id: true, email: true },
    });

    if (targetUsers.length === 0) {
      logger.info('Data retention sweep complete: 0 inactive accounts found.');
      return;
    }

    logger.info(`Data retention sweep: Found ${targetUsers.length} inactive accounts. Beginning pruning process...`);

    const userIds = targetUsers.map((u) => u.id);

    await prisma.$transaction(async (tx) => {
      // Step-by-step deletion of associated models to avoid deadlock locks
      await tx.account.deleteMany({ where: { userId: { in: userIds } } });
      await tx.session.deleteMany({ where: { userId: { in: userIds } } });
      await tx.certificate.deleteMany({ where: { userId: { in: userIds } } });
      await tx.simulationState.deleteMany({ where: { userId: { in: userIds } } });
      await tx.auditLog.deleteMany({ where: { userId: { in: userIds } } });
      await tx.notification.deleteMany({ where: { userId: { in: userIds } } });
      await tx.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await tx.invoice.deleteMany({ where: { userId: { in: userIds } } });
      await tx.couponUsage.deleteMany({ where: { userId: { in: userIds } } });

      const deletedCount = await tx.user.deleteMany({
        where: { id: { in: userIds } },
      });

      logger.info(`Data retention sweep successfully pruned ${deletedCount.count} users.`);
    });
  } catch (err) {
    logger.error(err, 'Failed to complete database data retention pruning sweep.');
  }
}
export default executeDataRetentionPruning;
