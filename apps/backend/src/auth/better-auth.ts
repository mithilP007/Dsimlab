import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { prisma } from '../db/client';
import { config } from '../config';
import { getAllowedOrigins } from '../utils/origin';

// Build the full list of trusted origins from static allowed list + Vercel preview wildcard pattern
const allTrustedOrigins = [
  ...getAllowedOrigins(),
  'https://dsimlab-frontend-*-mithilp007s-projects.vercel.app',
];

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: allTrustedOrigins,
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
    // Cross-origin cookies (Vercel → Render) require SameSite=None + Secure.
    // Without this, browsers silently drop the cookie and every /me call returns 401.
    crossSubdomainCookies: {
      enabled: config.NODE_ENV === 'production',
    },
    defaultCookieAttributes: config.NODE_ENV === 'production'
      ? {
          sameSite: 'none' as const,
          secure: true,
          httpOnly: true,
          path: '/',
        }
      : undefined,
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
