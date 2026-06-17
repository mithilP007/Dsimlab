import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

export class CacheService {
  private redis: Redis | null = null;
  private memoryCache = new Map<string, { value: any; expiresAt: number }>();
  private active = false;

  constructor() {
    if (config.REDIS_URL && config.NODE_ENV !== 'test') {
      try {
        this.redis = new Redis(config.REDIS_URL, {
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
        });

        this.redis.ping()
          .then(() => {
            this.active = true;
            logger.info('Redis connection verified. Caching enabled.');
          })
          .catch((err) => {
            logger.warn(`Redis is offline for caching: ${err.message}. Falling back to in-memory caching.`);
            this.redis = null;
          });
      } catch (err) {
        logger.warn('Redis configuration failure. Falling back to in-memory caching.');
        this.redis = null;
      }
    } else {
      logger.info('Redis caching disabled. Using in-memory fallback caching.');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.active && this.redis) {
      try {
        const raw = await this.redis.get(key);
        if (raw) return JSON.parse(raw) as T;
      } catch (err) {
        logger.warn({ err, key }, 'Failed to fetch value from Redis cache');
      }
    } else {
      const entry = this.memoryCache.get(key);
      if (entry) {
        if (Date.now() < entry.expiresAt) {
          return entry.value as T;
        } else {
          this.memoryCache.delete(key);
        }
      }
    }
    return null;
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    if (this.active && this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch (err) {
        logger.warn({ err, key }, 'Failed to write value to Redis cache');
      }
    } else {
      this.memoryCache.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    }
  }

  async del(key: string): Promise<void> {
    if (this.active && this.redis) {
      try {
        await this.redis.del(key);
      } catch (err) {
        logger.warn({ err, key }, 'Failed to delete key from Redis cache');
      }
    } else {
      this.memoryCache.delete(key);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (this.active && this.redis) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          logger.info({ pattern, count: keys.length }, 'Invalidated Redis cache keys by pattern');
        }
      } catch (err) {
        logger.warn({ err, pattern }, 'Failed to invalidate keys by pattern in Redis');
      }
    } else {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
        }
      }
      logger.info({ pattern }, 'Invalidated in-memory cache keys by pattern');
    }
  }
}

export const cacheService = new CacheService();
export default cacheService;
