import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { prisma } from '../db/client';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  // Map custom fields like role
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'STUDENT_COLLEGE',
      },
      classId: {
        type: 'string',
      },
      institution: {
        type: 'string',
      },
      planType: {
        type: 'string',
      }
    }
  }
});
export type Auth = typeof auth;
