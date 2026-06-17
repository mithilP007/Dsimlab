import { dailyRoundQueue } from '../queue';
import { logger } from '../../utils/logger';
import { prisma } from '../../db/client';
import { processSimulationRound } from '../../services/simulation/engine';

/**
 * Registers repeatable overnight batch cron jobs in BullMQ
 */
export async function setupRoundScheduler(): Promise<void> {
  if (!dailyRoundQueue) {
    logger.warn('Skipping repeatable cron setup: Redis connection offline.');
    return;
  }

  try {
    // Schedule overnight batch sweep every night at 12:00 AM ('0 0 * * *')
    await dailyRoundQueue.add(
      'overnight-sweep-job',
      {},
      {
        repeat: {
          pattern: '0 0 * * *',
        },
      }
    );
    logger.info('Overnight batch scheduler configured for 12:00 AM daily.');

    // Schedule weekly compliance data retention sweep every Sunday at 3:00 AM ('0 3 * * 0')
    await dailyRoundQueue.add(
      'data-retention-pruning-job',
      {},
      {
        repeat: {
          pattern: '0 3 * * 0',
        },
      }
    );
    logger.info('GDPR data retention pruning scheduler configured for 3:00 AM weekly on Sundays.');
  } catch (err) {
    logger.error(err, 'Failed to register repeatable cron scheduler in BullMQ.');
  }
}

/**
 * Sweeps the database for active simulations and schedules advance jobs for each
 */
export async function executeOvernightBatchSweep(): Promise<void> {
  logger.info('Starting overnight batch sweep of active simulation sessions...');

  try {
    const activeSessions = await prisma.simulationState.findMany({
      where: {
        isCompleted: false,
      },
    });

    logger.info(`Found ${activeSessions.length} active simulations. Enqueuing advancement tasks.`);

    for (const session of activeSessions) {
      try {
        if (dailyRoundQueue) {
          await dailyRoundQueue.add(`advance-${session.id}`, {
            simulationId: session.id,
            userId: session.userId,
          });
        } else {
          // Direct synchronous process fallback if Redis is unavailable
          await processSimulationRound(session.id);
        }
      } catch (err) {
        logger.error(err, `Failed to enqueue/advance simulation session ${session.id}`);
      }
    }
  } catch (err) {
    logger.error(err, 'Failed to sweep active simulation sessions during overnight batch.');
  }
}
