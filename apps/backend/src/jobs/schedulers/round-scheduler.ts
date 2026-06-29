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

    // Schedule hourly daily campaign processing sweep ('0 * * * *')
    await dailyRoundQueue.add(
      'hourly-campaign-sweep-job',
      {},
      {
        repeat: {
          pattern: '0 * * * *',
        },
      }
    );
    logger.info('Hourly daily campaign scheduler configured.');

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

export async function executeSandboxScheduledSweep(): Promise<void> {
  logger.info('Running scheduled sandbox simulation sweep...');
  try {
    const now = new Date();
    const processingProgress = await prisma.studentSimulationProgress.findMany({
      where: {
        status: 'PROCESSING',
        nextResultAt: { lte: now }
      },
      include: {
        simulation: {
          include: {
            class: true
          }
        }
      }
    });

    if (processingProgress.length === 0) {
      logger.info('No scheduled sandbox rounds due for processing.');
      return;
    }

    logger.info(`Found ${processingProgress.length} sandbox sessions ready to advance.`);

    for (const prog of processingProgress) {
      const sim = prog.simulation;
      if (!sim) continue;
      
      if (sim.class.inviteCode.startsWith('SANDBOX')) {
        try {
          await prisma.simulationState.update({
            where: { id: sim.id },
            data: { status: 'LOCKED' }
          });
          await processSimulationRound(sim.id);
          logger.info({ simulationId: sim.id }, 'Successfully advanced scheduled sandbox simulation round.');
        } catch (err) {
          logger.error(err, `Failed to process scheduled sandbox simulation round ${sim.id}`);
          await prisma.simulationState.update({
            where: { id: sim.id },
            data: { status: 'DECISION_OPEN' }
          });
          await prisma.studentSimulationProgress.update({
            where: { simulationId: sim.id },
            data: { status: 'DECISION_OPEN' }
          });
        }
      }
    }
  } catch (err) {
    logger.error(err, 'Failed during sandbox scheduled sweep.');
  }
}

/**
 * Executes the daily campaign processing scheduler
 */
export async function executeHourlyCampaignSweep(): Promise<void> {
  const { executeDailyCampaignScheduler } = await import('./daily-campaign-scheduler');
  await executeDailyCampaignScheduler();
  await executeSandboxScheduledSweep();
}

/**
 * Sweeps all expired subscriptions and downgrades users back to free tier.
 * Runs at startup and hourly via cron.
 */
export async function checkExpiredSubscriptions(): Promise<void> {
  logger.info('Running expired subscription sweep...');
  try {
    const now = new Date();

    // Find all active/trialing subscriptions whose end date is in the past
    const expired = await prisma.subscription.findMany({
      where: {
        status: { in: ['active', 'trialing', 'past_due'] },
        endDate: { lt: now }
      }
    });

    if (expired.length === 0) {
      logger.info('No expired subscriptions found.');
      return;
    }

    logger.info(`Found ${expired.length} expired subscription(s). Downgrading users...`);

    for (const sub of expired) {
      try {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'expired' }
        });

        // Downgrade user planType to free
        await prisma.user.update({
          where: { id: sub.userId },
          data: { planType: 'free' }
        });

        logger.info({ subscriptionId: sub.id, userId: sub.userId }, 'Subscription expired. User downgraded to free.');
      } catch (err) {
        logger.error(err, `Failed to expire subscription ${sub.id}`);
      }
    }
  } catch (err) {
    logger.error(err, 'Failed to sweep expired subscriptions.');
  }
}

