import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

export interface LogStore {
  correlationId?: string;
  userId?: string;
}

// Storage hook for request tracing contexts
export const asyncLocalStorage = new AsyncLocalStorage<LogStore>();

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  mixin() {
    const store = asyncLocalStorage.getStore();
    if (store) {
      return {
        correlationId: store.correlationId,
        userId: store.userId,
      };
    }
    return {};
  },
  transport: process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'SYS:standard',
    }
  } : undefined,
});

export default logger;
