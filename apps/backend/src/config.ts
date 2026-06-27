import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:5000'),
  REDIS_URL: z.string().optional(),
  OLLAMA_HOST: z.string().url().default('http://127.0.0.1:11434'),
  OLLAMA_MODEL: z.string().default('qwen2.5:7b'),
  FRONTEND_URL: z.string().default('http://localhost:5173').transform((val) => val.trim().replace(/\/+$/, '')),
  // Comma-separated list of extra allowed origins (e.g. Vercel preview URLs).
  // FRONTEND_URL is always included automatically.
  CORS_ORIGINS: z.string().optional().transform((val) => {
    if (!val) return val;
    return val
      .split(',')
      .map((o) => o.trim().replace(/\/+$/, ''))
      .filter(Boolean)
      .join(',');
  }),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(20),
  ROUND_PROCESSING_MODE: z.enum(['immediate', 'delayed']).default('immediate'),
  ROUND_DELAY_HOURS: z.coerce.number().default(24),
  TREND_REFRESH_MODE: z.enum(['per_round', 'daily', 'off']).default('per_round'),
  LIVE_AD_ACCOUNT_MODE: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean()
  ).default(false),
  GOOGLE_ADS_CLIENT_ID: z.string().optional(),
  GOOGLE_ADS_CLIENT_SECRET: z.string().optional(),
  GOOGLE_ADS_DEVELOPER_TOKEN: z.string().optional(),
  GOOGLE_ADS_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_ADS_CUSTOMER_ID: z.string().optional(),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  META_AD_ACCOUNT_ID: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    if (!data.REDIS_URL || data.REDIS_URL.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['REDIS_URL'],
        message: 'REDIS_URL is required in production mode',
      });
    }
    if (!data.CORS_ORIGINS || data.CORS_ORIGINS.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_ORIGINS'],
        message: 'CORS_ORIGINS is required in production mode',
      });
    }
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  for (const [key, issues] of Object.entries(parsed.error.flatten().fieldErrors)) {
    console.error(`  ${key}: ${(issues as string[]).join(', ')}`);
  }
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
