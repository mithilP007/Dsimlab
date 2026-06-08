import { env } from './env';

export const config = {
  apiBaseUrl: env.VITE_API_BASE_URL,
  socketUrl: env.VITE_SOCKET_URL,
  isProduction: import.meta.env.MODE === 'production',
  requestTimeout: 15000,
  maxRetries: 3,
};

export default config;
