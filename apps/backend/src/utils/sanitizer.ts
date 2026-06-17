/**
 * Helper to recursively sanitize input text inputs.
 * Strips script tags, HTML tags, and suspicious javascript: targets.
 */
export function sanitizeString(val: string): string {
  if (!val) return val;
  return val
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '') // strip script blocks
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/javascript:/gi, '[removed]') // neutralize active javascript hrefs
    .trim();
}

export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return sanitizeString(input);
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }

  if (input !== null && typeof input === 'object') {
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(input)) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }

  return input;
}
