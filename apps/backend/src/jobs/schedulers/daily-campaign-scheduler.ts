import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { processDailySimulationStep } from '../../services/simulation/dailySimulationEngine';
import { config } from '../../config';

/**
 * Sweeps the database for daily campaigns due for processing and processes them.
 */
export async function executeDailyCampaignScheduler(): Promise<void> {
  logger.info('Starting daily campaign scheduler sweep...');

  try {
    const now = new Date();
    // Find campaign runs where status is ACTIVE and nextProcessingAt is due
    const dueCampaigns = await prisma.campaignRun.findMany({
      where: {
        status: 'ACTIVE',
        nextProcessingAt: {
          lte: now,
        },
      },
    });

    logger.info(`Found ${dueCampaigns.length} campaigns due for processing.`);

    for (const run of dueCampaigns) {
      try {
        await processCampaignWithCatchup(run.id);
      } catch (err: any) {
        logger.error(err, `Failed to process campaign run ${run.id} in scheduler`);
      }
    }
  } catch (err) {
    logger.error(err, 'Failed to execute daily campaign scheduler sweep');
  }
}

/**
 * Processes a campaign run day-by-day until nextProcessingAt is in the future (catchup logic).
 */
export async function processCampaignWithCatchup(campaignRunId: string): Promise<void> {
  let hasMoreDays = true;
  let loops = 0;

  while (hasMoreDays && loops < 35) { // Cap at 35 to prevent infinite loops
    loops++;
    const now = new Date();

    const run = await prisma.campaignRun.findUnique({
      where: { id: campaignRunId },
    });

    if (!run || run.status !== 'ACTIVE') {
      hasMoreDays = false;
      break;
    }

    const isDue = run.nextProcessingAt <= now;

    if (!isDue) {
      hasMoreDays = false;
      break;
    }

    const currentDay = run.currentDay;
    const idempotencyKey = `run-${run.id}-day-${currentDay}`;

    // Attempt to acquire lock by creating processing job
    let job = await prisma.campaignProcessingJob.findUnique({
      where: { idempotencyKey },
    });

    if (job && job.jobStatus === 'COMPLETED') {
      logger.info({ campaignRunId, currentDay }, 'Job already completed for this day. Skipping.');
      // If completed but database day didn't advance, advance manually to prevent stuck runs
      await prisma.campaignRun.update({
        where: { id: campaignRunId },
        data: {
          currentDay: currentDay === run.durationDays ? currentDay : currentDay + 1,
          nextProcessingAt: new Date(Date.now() + 24 * 3600 * 1000),
        },
      });
      continue;
    }

    if (job && job.jobStatus === 'PROCESSING') {
      logger.warn({ campaignRunId, currentDay }, 'Campaign day is already processing. Skipping.');
      hasMoreDays = false;
      break;
    }

    // Upsert or lock processing job
    if (!job) {
      try {
        job = await prisma.campaignProcessingJob.create({
          data: {
            campaignRunId: run.id,
            dayNumber: currentDay,
            jobStatus: 'PROCESSING',
            startedAt: new Date(),
            idempotencyKey,
          },
        });
      } catch (createErr) {
        // Unique constraint race condition check
        logger.warn({ campaignRunId, currentDay }, 'Failed to acquire campaign job lock due to concurrent execution.');
        hasMoreDays = false;
        break;
      }
    } else {
      // Retry failed job
      job = await prisma.campaignProcessingJob.update({
        where: { id: job.id },
        data: {
          jobStatus: 'PROCESSING',
          startedAt: new Date(),
          retryCount: job.retryCount + 1,
        },
      });
    }

    try {
      logger.info({ campaignRunId, currentDay }, 'Executing simulation step for day');
      await processDailySimulationStep(run.id);

      // Mark job completed
      await prisma.campaignProcessingJob.update({
        where: { id: job.id },
        data: {
          jobStatus: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    } catch (stepErr: any) {
      logger.error(stepErr, `Error executing daily simulation step for run ${run.id} Day ${currentDay}`);

      // Mark job failed
      await prisma.campaignProcessingJob.update({
        where: { id: job.id },
        data: {
          jobStatus: 'FAILED',
          errorMessage: stepErr.message || 'Unknown simulation engine error',
        },
      });

      hasMoreDays = false; // Stop catchup loop on failure
      throw stepErr;
    }
  }
}
