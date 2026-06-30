import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';
import { isRedisAvailable, getRedisOptions } from './redis-service';

export class CacheService {
  private redis: Redis | null = null;
  private memoryCache = new Map<string, { value: any; expiresAt: number }>();
  private active = false;
  private checkAttempted = false;

  private async getRedisClient(): Promise<Redis | null> {
    if (this.checkAttempted) {
      return this.redis;
    }
    
    if (config.NODE_ENV === 'test') {
      this.checkAttempted = true;
      return null;
    }

    const available = await isRedisAvailable();
    if (available && config.REDIS_URL) {
      try {
        this.redis = new Redis(config.REDIS_URL, getRedisOptions('caching'));
        this.active = true;
        logger.info('Lazy Redis caching client initialized successfully.');
      } catch (err) {
        logger.warn('Redis caching initialization failed. Falling back to in-memory caching.');
        this.redis = null;
        this.active = false;
      }
    }
    this.checkAttempted = true;
    return this.redis;
  }

  async get<T>(key: string): Promise<T | null> {
    const client = await this.getRedisClient();
    if (this.active && client) {
      try {
        const raw = await client.get(key);
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
    const client = await this.getRedisClient();
    if (this.active && client) {
      try {
        await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
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
    const client = await this.getRedisClient();
    if (this.active && client) {
      try {
        await client.del(key);
      } catch (err) {
        logger.warn({ err, key }, 'Failed to delete key from Redis cache');
      }
    } else {
      this.memoryCache.delete(key);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const client = await this.getRedisClient();
    if (this.active && client) {
      try {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          await client.del(...keys);
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
