import Redis, { RedisOptions } from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

let redisAvailable = false;
let redisCheckDone = false;

export function getRedisOptions(purpose: string, forceMaxRetriesNull = false): RedisOptions {
  return {
    maxRetriesPerRequest: forceMaxRetriesNull ? null : 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 5000,
    retryStrategy(times: number) {
      if (times > 3) {
        logger.warn(`Redis [${purpose}] max connection attempts reached. Disabling reconnect.`);
        return null; // Stop reconnecting
      }
      return Math.min(times * 200, 2000);
    },
    reconnectOnError(err: Error) {
      const errMsg = err.message || '';
      if (
        errMsg.includes('max requests limit exceeded') ||
        errMsg.includes('ERR max requests limit exceeded') ||
        errMsg.includes('NOAUTH') ||
        errMsg.includes('ECONNREFUSED')
      ) {
        logger.warn(`Redis [${purpose}] encountered terminal error: ${errMsg}. Stopping reconnection.`);
        return false;
      }
      return true;
    }
  };
}

export async function isRedisAvailable(): Promise<boolean> {
  if (redisCheckDone) {
    return redisAvailable;
  }

  if (!config.REDIS_URL || config.REDIS_URL.trim() === '') {
    logger.info('No REDIS_URL configured. Running in local memory fallback mode.');
    redisAvailable = false;
    redisCheckDone = true;
    return false;
  }

  // Hide connection string credentials in logging
  const maskedUrl = config.REDIS_URL.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@');
  logger.info(`Performing startup Redis health check on ${maskedUrl}...`);

  const checkClient = new Redis(config.REDIS_URL, getRedisOptions('health-check'));

  try {
    await checkClient.connect();
    const pingRes = await checkClient.ping();
    if (pingRes === 'PONG') {
      redisAvailable = true;
      logger.info('Redis connection verified. Redis is operational.');
    }
  } catch (err: any) {
    const errMsg = err.message || '';
    logger.warn(`Redis health check failed: ${errMsg}. Running queues/cache/socket in local memory mode.`);
    redisAvailable = false;
  } finally {
    try {
      await checkClient.quit();
    } catch {
      checkClient.disconnect();
    }
    redisCheckDone = true;
  }

  return redisAvailable;
}
