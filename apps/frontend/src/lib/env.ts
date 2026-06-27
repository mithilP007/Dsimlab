import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url('VITE_API_BASE_URL must be a valid URL').optional(),
  VITE_API_URL: z.string().url('VITE_API_URL must be a valid URL').optional(),
  VITE_SOCKET_URL: z.string().url('VITE_SOCKET_URL must be a valid URL').optional(),
  VITE_WS_URL: z.string().url('VITE_WS_URL must be a valid URL').optional(),
  VITE_APP_NAME: z.string().min(1, 'VITE_APP_NAME is required'),
}).refine((data) => {
  return data.VITE_API_BASE_URL || data.VITE_API_URL;
}, {
  message: 'Either VITE_API_BASE_URL or VITE_API_URL must be provided and be a valid URL',
  path: ['VITE_API_BASE_URL'],
}).refine((data) => {
  return data.VITE_SOCKET_URL || data.VITE_WS_URL;
}, {
  message: 'Either VITE_SOCKET_URL or VITE_WS_URL must be provided and be a valid URL',
  path: ['VITE_SOCKET_URL'],
}).transform((data) => {
  const apiBaseUrl = (data.VITE_API_BASE_URL || data.VITE_API_URL)!;
  const socketUrl = (data.VITE_SOCKET_URL || data.VITE_WS_URL)!;
  return {
    VITE_API_BASE_URL: apiBaseUrl,
    VITE_SOCKET_URL: socketUrl,
    VITE_APP_NAME: data.VITE_APP_NAME,
  };
});

const parsed = envSchema.safeParse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_SOCKET_URL: import.meta.env.VITE_SOCKET_URL,
  VITE_WS_URL: import.meta.env.VITE_WS_URL,
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
