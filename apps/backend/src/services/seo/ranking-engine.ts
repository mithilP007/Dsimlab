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
  relevanceScore: number; // 0.0 to 1.0 based on keyword overlap
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
}

/**
 * Calculates a organic search ranking position (1 - 100) based on competitive index
 */
export function calculateOrganicRank(
  input: RankInput,
  random: SeededRandom
): number {
  // Check if advanced parameters are provided
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

    studentStrength =
      (input.pageAuthority * 0.25) +
      (input.domainAuthority * 0.15) +
      (contentQuality * 3.0) +
      (technicalScore * 0.15) +
      (input.relevanceScore * 15.0);

    const difficultyPenalty = difficulty * 0.25;
    studentStrength -= difficultyPenalty;

    const compoundingBonus = Math.min(15.0, prevBehavior.consecutiveSEOActiveRounds * 2.5);
    studentStrength += compoundingBonus;

    if (currentRound === 1) {
      studentStrength *= 0.6; // 40% reduction in strength for round 1 due to SEO lag
    }
  } else {
    // Original formula
    studentStrength =
      (input.pageAuthority * 0.4) +
      (input.domainAuthority * 0.3) +
      (input.relevanceScore * 30.0);
  }

  // Compute best competitor score
  let maxCompetitorStrength = 0;
  input.competitors.forEach(comp => {
    const compStrength = (comp.pageAuthority * 0.5) + (comp.domainAuthority * 0.5);
    if (compStrength > maxCompetitorStrength) {
      maxCompetitorStrength = compStrength;
    }
  });

  // Calculate position index with seeded noise
  const strengthDiff = studentStrength - maxCompetitorStrength;
  const variance = random.nextFloat(-5, 5); // Seeded noise
  const competitiveIndex = strengthDiff + variance;

  let position = 100;

  if (competitiveIndex > 30) {
    position = random.nextInt(1, 2); // Rank 1-2
  } else if (competitiveIndex > 18) {
    position = random.nextInt(3, 5); // Rank 3-5
  } else if (competitiveIndex > 8) {
    position = random.nextInt(6, 10); // Rank 6-10 (Page 1)
  } else if (competitiveIndex > -2) {
    position = random.nextInt(11, 20); // Rank 11-20 (Page 2)
  } else if (competitiveIndex > -15) {
    position = random.nextInt(21, 50); // Rank 21-50
  } else {
    position = random.nextInt(51, 100); // Rank 51-100
  }

  return position;
}
