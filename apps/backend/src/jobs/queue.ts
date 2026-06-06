import { Queue, Worker, Job } from 'bullmq';
import { config } from '../config';
import { logger } from '../utils/logger';
import { processSimulationRound } from '../services/simulation/engine';
import { notifyRoundComplete } from '../websocket/handlers/round-complete';

const QUEUE_NAME = 'daily-round-queue';

export let dailyRoundQueue: Queue | null = null;
let queueWorker: Worker | null = null;

try {
  if (config.REDIS_URL) {
    dailyRoundQueue = new Queue(QUEUE_NAME, {
      connection: {
        url: config.REDIS_URL,
      },
    });
    logger.info('BullMQ Queue initialized successfully.');
  } else {
    logger.warn('REDIS_URL not configured. Running in-memory local queue mode.');
  }
} catch (err) {
  logger.error(err, 'Failed to connect to Redis for BullMQ Queue. Falling back to in-memory processing.');
}

/**
 * Boots the background queue worker process to consume simulation round advancement jobs
 */
export function startQueueWorker(): void {
  if (!config.REDIS_URL) {
    logger.warn('BullMQ worker disabled: Redis connection unavailable.');
    return;
  }

  try {
    queueWorker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        const { simulationId, userId } = job.data;
        logger.info({ jobId: job.id, simulationId }, 'Processing background round advancement job');
        
        // Execute round simulation calculations
        const result = await processSimulationRound(simulationId);
        
        // Broadcast completion message via WebSockets
        notifyRoundComplete(userId, result);

        return result;
      },
      {
        connection: {
          url: config.REDIS_URL,
        },
        concurrency: 2, // process up to 2 rounds concurrently
      }
    );

    queueWorker.on('completed', (job) => {
      logger.info({ jobId: job.id }, 'Background simulation round job completed.');
    });

    queueWorker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err }, 'Background simulation round job failed.');
    });
  } catch (err) {
    logger.error(err, 'Failed to boot BullMQ worker instance.');
  }
}

/**
 * Triggers a simulation round advancement. Uses background BullMQ queue if Redis is online, otherwise runs synchronously.
 */
export async function scheduleRoundAdvancement(simulationId: string, userId: string): Promise<any> {
  if (dailyRoundQueue) {
    const job = await dailyRoundQueue.add(`advance-${simulationId}`, {
      simulationId,
      userId,
    });
    logger.info({ jobId: job.id, simulationId }, 'Enqueued simulation round task to background BullMQ');
    return { queued: true, jobId: job.id };
  } else {
    logger.info({ simulationId }, 'Running simulation round synchronously (Redis offline)');
    const result = await processSimulationRound(simulationId);
    notifyRoundComplete(userId, result);
    return { queued: false, result };
  }
}
