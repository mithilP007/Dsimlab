import { Queue, Worker, Job } from 'bullmq';
import { config } from '../config';
import { logger } from '../utils/logger';
import { processSimulationRound } from '../services/simulation/engine';
import { notifyRoundComplete } from '../websocket/handlers/round-complete';

const QUEUE_NAME = 'daily-round-queue';

import Redis from 'ioredis';

export let dailyRoundQueue: Queue | null = null;
let queueWorker: Worker | null = null;

if (config.REDIS_URL && config.NODE_ENV !== 'test') {
  const checkClient = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 1000,
  });

  checkClient.ping()
    .then(() => {
      logger.info('Redis connection verified. Initializing BullMQ Queue...');
      dailyRoundQueue = new Queue(QUEUE_NAME, {
        connection: {
          url: config.REDIS_URL,
          maxRetriesPerRequest: null,
        },
      });
    })
    .catch((err) => {
      logger.warn(`Redis is offline: ${err.message}. Running in-memory local queue mode.`);
      dailyRoundQueue = null;
    })
    .finally(() => {
      checkClient.disconnect();
    });
} else {
  logger.info('Running in-memory local queue mode (REDIS_URL not configured or test environment).');
}

/**
 * Boots the background queue worker process to consume simulation round advancement jobs
 */
export function startQueueWorker(): void {
  if (!config.REDIS_URL || config.NODE_ENV === 'test') {
    logger.warn('BullMQ worker disabled: Redis connection unavailable or running in test environment.');
    return;
  }

  const checkClient = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 1000,
  });

  checkClient.ping()
    .then(() => {
      logger.info('Redis connection verified. Starting BullMQ Worker...');
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
            maxRetriesPerRequest: null,
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
    })
    .catch((err) => {
      logger.warn(`Redis is offline: ${err.message}. Worker disabled.`);
    })
    .finally(() => {
      checkClient.disconnect();
    });
}

import { prisma } from '../db/client';

/**
 * Triggers a simulation round advancement. Uses background BullMQ queue if Redis is online, otherwise runs synchronously or with in-memory delay.
 */
export async function scheduleRoundAdvancement(simulationId: string, userId: string): Promise<any> {
  const isDelayed = config.ROUND_PROCESSING_MODE === 'delayed';
  const delayMs = config.ROUND_DELAY_HOURS * 3600 * 1000;

  if (dailyRoundQueue) {
    const options = isDelayed ? { delay: delayMs } : {};
    const job = await dailyRoundQueue.add(
      `advance-${simulationId}`,
      { simulationId, userId },
      options
    );
    logger.info(
      { jobId: job.id, simulationId, isDelayed, delayMs },
      'Enqueued simulation round task to background BullMQ'
    );
    return { queued: true, jobId: job.id, delayMs: isDelayed ? delayMs : 0 };
  } else {
    if (isDelayed) {
      logger.warn(
        { simulationId, delayMs },
        'REDIS_URL not configured. Scheduling simulation round advancement via in-memory setTimeout fallback.'
      );
      
      setTimeout(async () => {
        try {
          logger.info({ simulationId }, 'Starting delayed in-memory simulation round processing');
          // Find simulation state to make sure status is LOCKED or PROCESSING
          const sim = await prisma.simulationState.findUnique({ where: { id: simulationId } });
          if (sim && (sim.status === 'LOCKED' || sim.status === 'PROCESSING')) {
            // Force status to LOCKED just in case
            if (sim.status !== 'LOCKED') {
              await prisma.simulationState.update({
                where: { id: simulationId },
                data: { status: 'LOCKED' }
              });
            }
            const result = await processSimulationRound(simulationId);
            notifyRoundComplete(userId, result);
          } else {
            logger.warn({ simulationId, status: sim?.status }, 'Simulation state is not eligible for round processing. Skipped.');
          }
        } catch (err) {
          logger.error(err, `Error processing in-memory delayed round for simulation ${simulationId}`);
        }
      }, delayMs);

      return { queued: true, isMemoryDelayed: true, delayMs };
    } else {
      logger.info({ simulationId }, 'Running simulation round synchronously (Redis offline)');
      const result = await processSimulationRound(simulationId);
      notifyRoundComplete(userId, result);
      return { queued: false, result };
    }
  }
}

