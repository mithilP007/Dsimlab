import { SeededRandom } from '../../utils/deterministic-random';

export interface CompetitorSEO {
  name: string;
  pageAuthority: number;
  domainAuthority: number;
}

export interface RankInput {
  keyword: string;
  pageAuthority: number;
  domainAuthority: number;
  relevanceScore: number; // 0.0 to 1.0 based on keyword overlap and scenario relevance
  competitors: CompetitorSEO[];
  keywordDifficulty?: number; // 0 to 100
  contentQuality?: number; // 1 to 10
  backlinkBudget?: number; // current round backlink budget
  technicalScore?: number; // 0 to 100
  previousBehavior?: {
    cumulativeBacklinkSpend: number;
    consecutiveSEOActiveRounds: number;
  };
  round?: number;
  keywordIntent?: string; // transactional, informational, commercial
}

/**
 * Calculates organic search ranking position (1 - 100) based on competitive index.
 */
export function calculateOrganicRank(
  input: RankInput,
  random: SeededRandom
): number {
  const isAdvanced =
    input.keywordDifficulty !== undefined ||
    input.contentQuality !== undefined ||
    input.technicalScore !== undefined ||
    input.previousBehavior !== undefined ||
    input.round !== undefined;

  let studentStrength = 0;

  if (isAdvanced) {
    const difficulty = input.keywordDifficulty !== undefined ? input.keywordDifficulty : 30;
    const contentQuality = input.contentQuality !== undefined ? input.contentQuality : 5.0;
    const technicalScore = input.technicalScore !== undefined ? input.technicalScore : 85.0;
    const prevBehavior = input.previousBehavior || { cumulativeBacklinkSpend: 0, consecutiveSEOActiveRounds: 0 };
    const currentRound = input.round !== undefined ? input.round : 2;

    // Student Strength calculations incorporating indexability and authority
    studentStrength =
      (input.pageAuthority * 0.3) +
      (input.domainAuthority * 0.2) +
      (contentQuality * 3.5) +
      (technicalScore * 0.2) +
      (input.relevanceScore * 18.0);

    // Search intent modifier
    if (input.keywordIntent === 'transactional') {
      // Transactional keywords are highly competitive (harder to rank for)
      studentStrength -= difficulty * 0.35;
    } else {
      studentStrength -= difficulty * 0.20;
    }

    // Compounding growth bonus
    const compoundingBonus = Math.min(18.0, prevBehavior.consecutiveSEOActiveRounds * 3.0);
    studentStrength += compoundingBonus;

    // SEO Lag multiplier for first round
    if (currentRound === 1) {
      studentStrength *= 0.55; 
    }
  } else {
    // Original formula fallback
    studentStrength =
      (input.pageAuthority * 0.4) +
      (input.domainAuthority * 0.3) +
      (input.relevanceScore * 30.0);
  }

  // Compute best competitor score
  let maxCompetitorStrength = 0;
  input.competitors.forEach(comp => {
    const compStrength = (comp.pageAuthority * 0.52) + (comp.domainAuthority * 0.48);
    if (compStrength > maxCompetitorStrength) {
      maxCompetitorStrength = compStrength;
    }
  });

  const strengthDiff = studentStrength - maxCompetitorStrength;
  const variance = random.nextFloat(-4, 4); 
  const competitiveIndex = strengthDiff + variance;

  let position = 100;

  if (competitiveIndex > 30) {
    position = random.nextInt(1, 2); 
  } else if (competitiveIndex > 18) {
    position = random.nextInt(3, 5); 
  } else if (competitiveIndex > 8) {
    position = random.nextInt(6, 10); 
  } else if (competitiveIndex > -2) {
    position = random.nextInt(11, 20); 
  } else if (competitiveIndex > -15) {
    position = random.nextInt(21, 50); 
  } else {
    position = random.nextInt(51, 100); 
  }

  return position;
}
