import { cacheService } from '../utils/caching';

const LIMIT = 5;
const BLOCK_DURATION_SEC = 900; // 15 minutes

export class BruteForceService {
  async handleFailedAttempt(identifier: string): Promise<void> {
    const failKey = `bf:fail:${identifier}`;
    const current = await cacheService.get<number>(failKey) || 0;
    const nextCount = current + 1;
    
    await cacheService.set(failKey, nextCount, BLOCK_DURATION_SEC);
    
    if (nextCount >= LIMIT) {
      const blockKey = `bf:block:${identifier}`;
      await cacheService.set(blockKey, Date.now() + BLOCK_DURATION_SEC * 1000, BLOCK_DURATION_SEC);
    }
  }

  async isBlocked(identifier: string): Promise<boolean> {
    const blockKey = `bf:block:${identifier}`;
    const blockedUntil = await cacheService.get<number>(blockKey);
    if (blockedUntil && Date.now() < blockedUntil) {
      return true;
    }
    return false;
  }
  
  async reset(identifier: string): Promise<void> {
    const failKey = `bf:fail:${identifier}`;
    const blockKey = `bf:block:${identifier}`;
    await cacheService.del(failKey);
    await cacheService.del(blockKey);
  }
}

export const bruteForceService = new BruteForceService();
export default bruteForceService;
