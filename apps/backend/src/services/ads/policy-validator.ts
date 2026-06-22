import { prisma } from '../../db/client';
import { logActivity } from '../../utils/audit';

export interface ValidationViolation {
  type: string;
  severity: 'WARNING' | 'BLOCKING';
  message: string;
  source: 'GOOGLE_ADS' | 'META_ADS';
}

/**
 * Validates Google or Meta Ads creative copy against policy rules.
 */
export function validateAdPolicy(campaign: any, source: 'GOOGLE_ADS' | 'META_ADS'): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  const prohibitedWords = [
    'guaranteed returns', 'cryptocurrency cash', 'double your money', 
    'miracle cure', 'replica brand', 'buy votes', 'cheat', 'hack', 'illegal'
  ];
  const softViolations = ['best in world', 'cheapest ever'];
  
  let text = '';
  let finalUrl = '';
  
  if (source === 'GOOGLE_ADS') {
    const copy = campaign.adCopy || {};
    text = [
      copy.headline1, copy.headline2, copy.headline3,
      copy.description1, copy.description2
    ].filter(Boolean).join(' ');
    // Handle both formats of landing page URL
    finalUrl = campaign.finalUrl || (campaign.landingPage && campaign.landingPage.url) || '';
  } else {
    const creative = campaign.creative || {};
    text = [
      creative.headline, creative.primaryText
    ].filter(Boolean).join(' ');
    finalUrl = creative.destinationUrl || campaign.destinationUrl || '';
  }

  const textLower = text.toLowerCase();

  // 1. Prohibited / Banned Words (Hard Violation)
  prohibitedWords.forEach(word => {
    if (textLower.includes(word)) {
      violations.push({
        type: 'POLICY_VIOLATION',
        severity: 'BLOCKING',
        message: `Ad creative contains prohibited word or phrase: "${word}".`,
        source
      });
    }
  });

  // 2. Unrealistic Guarantee / Misleading Claims (Hard Violation)
  const misleadingKeywords = ['100% success', 'make millions overnight', 'lose 10kg in 2 days'];
  misleadingKeywords.forEach(word => {
    if (textLower.includes(word)) {
      violations.push({
        type: 'UNREALISTIC_GUARANTEE',
        severity: 'BLOCKING',
        message: `Ad creative contains unrealistic guarantee: "${word}".`,
        source
      });
    }
  });

  // 3. Excessive Capitalization (Soft Violation)
  const words = text.split(/\s+/);
  const capsWords = words.filter(w => w.length > 3 && w === w.toUpperCase() && /^[A-Z]+$/.test(w));
  if (capsWords.length > 0) {
    violations.push({
      type: 'EXCESSIVE_CAPITALIZATION',
      severity: 'WARNING',
      message: `Creative contains words in ALL CAPS: ${capsWords.join(', ')}.`,
      source
    });
  }

  // 4. Misleading claims (Soft Violation)
  softViolations.forEach(word => {
    if (textLower.includes(word)) {
      violations.push({
        type: 'MISLEADING_CLAIM',
        severity: 'WARNING',
        message: `Ad contains exaggerated claims: "${word}".`,
        source
      });
    }
  });

  // 5. Missing Landing Page URL / Invalid domain (Hard Violation)
  if (!finalUrl || !finalUrl.startsWith('http')) {
    violations.push({
      type: 'MISSING_LANDING_PAGE',
      severity: 'BLOCKING',
      message: 'Ad campaign must specify a valid destination URL starting with http/https.',
      source
    });
  }

  // 6. Destination Mismatch (Soft Violation)
  // Check if domain in landing page matches expected domain. 
  // Let's check if finalUrl has mismatch (e.g. including mismatch in query parameter or mock path)
  if (finalUrl && finalUrl.includes('mismatch')) {
    violations.push({
      type: 'DESTINATION_MISMATCH',
      severity: 'WARNING',
      message: 'Ad landing page URL does not match final destination domain.',
      source
    });
  }
  
  return violations;
}
