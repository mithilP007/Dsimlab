import { z } from "zod"

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url("VITE_API_BASE_URL must be a valid URL"),
  VITE_SOCKET_URL: z.string().url("VITE_SOCKET_URL must be a valid URL"),
  VITE_APP_NAME: z.string().min(1, "VITE_APP_NAME must not be empty"),
})

// safeParse Vite's import.meta.env
const parsed = envSchema.safeParse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_SOCKET_URL: import.meta.env.VITE_SOCKET_URL,
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
})

if (!parsed.success) {
  const errorMsg = "❌ CRITICAL: Missing or invalid environment variables. VITE_API_BASE_URL is required.";
  console.error(errorMsg, parsed.error.format());
  throw new Error(errorMsg);
}

export const env = parsed.data;
