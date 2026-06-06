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
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(20),
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
