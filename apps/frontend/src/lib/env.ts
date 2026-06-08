import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url('VITE_API_BASE_URL must be a valid URL'),
  VITE_SOCKET_URL: z.string().url('VITE_SOCKET_URL must be a valid URL'),
  VITE_APP_NAME: z.string().min(1, 'VITE_APP_NAME is required'),
});

const parsed = envSchema.safeParse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_SOCKET_URL: import.meta.env.VITE_SOCKET_URL,
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
});

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors;
  const message = `❌ Invalid or missing environment variables:\n${Object.entries(errors)
    .map(([key, val]) => `  - ${key}: ${val ? val.join(', ') : 'unknown error'}`)
    .join('\n')}`;
  console.error(message);
  throw new Error(message);
}

export const env = parsed.data;
export default env;
