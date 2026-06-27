import { config } from '../config';

const PREVIEW_REGEX = /^https:\/\/dsimlab-frontend-[a-z0-9-]+-mithilp007s-projects\.vercel\.app$/;

/**
 * Normalizes an origin string by parsing it as URL to lowercase host/protocol and strip trailing slash safely.
 */
export function normalizeOrigin(origin: string | undefined | null): string {
  if (!origin) return '';
  try {
    const trimmed = origin.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      return url.origin;
    }
    return trimmed.toLowerCase().replace(/\/+$/, '');
  } catch {
    return String(origin).trim().toLowerCase().replace(/\/+$/, '');
  }
}

/**
 * Compiles the list of allowed origins.
 */
export function getAllowedOrigins(): string[] {
  const origins = new Set<string>();

  // Stable production URL
  origins.add('https://dsimlab-frontend.vercel.app');

  // Configured FRONTEND_URL
  if (config.FRONTEND_URL) {
    origins.add(normalizeOrigin(config.FRONTEND_URL));
  }

  // Configured CORS_ORIGINS
  if (config.CORS_ORIGINS) {
    config.CORS_ORIGINS.split(',')
      .map((o) => normalizeOrigin(o))
      .filter(Boolean)
      .forEach((o) => origins.add(o));
  }

  return Array.from(origins);
}

/**
 * Checks if a given origin is allowed under CORS / CSRF trust rules.
 */
export function isAllowedOrigin(origin: string | undefined | null): boolean {
  if (!origin) return false;
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;

  // Exact match from allowed list
  const allowedList = getAllowedOrigins();
  if (allowedList.includes(normalized)) {
    return true;
  }

  // Regex check for Vercel preview URL pattern
  return PREVIEW_REGEX.test(normalized);
}
