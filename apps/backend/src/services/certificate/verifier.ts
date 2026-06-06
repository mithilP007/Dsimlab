import crypto from 'crypto';
import { config } from '../../config';

/**
 * Generates a tamper-proof cryptographic hash for a student certificate
 */
export function generateVerificationHash(
  recipientName: string,
  userId: string,
  compositeScore: number,
  issueDate: Date
): string {
  const payload = [
    recipientName.trim(),
    userId,
    compositeScore.toFixed(2),
    issueDate.toISOString()
  ].join('|');

  return crypto
    .createHmac('sha256', config.BETTER_AUTH_SECRET)
    .update(payload)
    .digest('hex');
}

/**
 * Validates a verification hash against certificate parameters
 */
export function verifyCertificateHash(
  hash: string,
  recipientName: string,
  userId: string,
  compositeScore: number,
  issueDate: Date
): boolean {
  try {
    const computed = generateVerificationHash(recipientName, userId, compositeScore, issueDate);
    
    // Constant time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(computed, 'hex')
    );
  } catch (err) {
    return false;
  }
}
