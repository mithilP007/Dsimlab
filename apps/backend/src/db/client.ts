import { PrismaClient } from '@prisma/client';
import { monitoring } from '../utils/monitoring';

declare global {
  // eslint-disable-next-line no-var
  var prisma: any;
}

const rawPrisma = globalThis.prisma || new PrismaClient();

export const prisma = rawPrisma.$extends({
  query: {
    async $allOperations({ model, operation, args, query }: any) {
      const start = Date.now();
      try {
        return await query(args);
      } finally {
        const duration = Date.now() - start;
        monitoring.recordDbLatency(duration);
      }
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = rawPrisma;
}
