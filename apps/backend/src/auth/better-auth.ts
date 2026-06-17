import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { prisma } from '../db/client';
import { config } from '../config';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [config.FRONTEND_URL],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  advanced: {
    cookiePrefix: 'simlab',
    useSecureCookies: config.NODE_ENV === 'production',
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
      },
      phoneNumber: {
        type: 'string',
      },
      universityRole: {
        type: 'string',
      },
      age: {
        type: 'number',
      },
      gender: {
        type: 'string',
      },
      category: {
        type: 'string',
      }
    }
  }
});
export type Auth = typeof auth;
