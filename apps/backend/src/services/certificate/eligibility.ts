import { prisma } from '../../db/client';

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  band: 'COMPETENT' | 'PROFICIENT' | 'ADVANCED';
  compositeScore: number;
  strategicConsistency: number;
}

/**
 * Calculates strategic consistency (0-100) across all submitted decision rounds.
 */
export function calculateStrategicConsistency(decisions: any[]): number {
  if (decisions.length === 0) return 0;
  if (decisions.length === 1) return 85.0; // Default high consistency for initial round

  let totalConsistency = 0;
  const numTransitions = decisions.length - 1;

  for (let i = 1; i < decisions.length; i++) {
    const prev = decisions[i - 1];
    const curr = decisions[i];

    // 1. Google Ads Budget similarity
    let prevG = 0;
    let currG = 0;
    try {
      const prevGCamps = JSON.parse(prev.googleCampaigns || '[]');
      const currGCamps = JSON.parse(curr.googleCampaigns || '[]');
      prevG = prevGCamps.reduce((sum: number, c: any) => sum + (c.budget || 0), 0);
      currG = currGCamps.reduce((sum: number, c: any) => sum + (c.budget || 0), 0);
    } catch { /* ignore */ }
    const gVariation = Math.max(prevG, currG) > 0 ? Math.abs(prevG - currG) / Math.max(prevG, currG) : 0;
    const gScore = 100 * (1 - gVariation);

    // 2. Meta Ads Budget similarity
    let prevM = 0;
    let currM = 0;
    try {
      const prevMCamps = JSON.parse(prev.metaCampaigns || '[]');
      const currMCamps = JSON.parse(curr.metaCampaigns || '[]');
      prevM = prevMCamps.reduce((sum: number, c: any) => sum + (c.budget || 0), 0);
      currM = currMCamps.reduce((sum: number, c: any) => sum + (c.budget || 0), 0);
    } catch { /* ignore */ }
    const mVariation = Math.max(prevM, currM) > 0 ? Math.abs(prevM - currM) / Math.max(prevM, currM) : 0;
    const mScore = 100 * (1 - mVariation);

    // 3. SEO Budget similarity
    const prevS = prev.seoBacklinkBudget || 0;
    const currS = curr.seoBacklinkBudget || 0;
    const sVariation = Math.max(prevS, currS) > 0 ? Math.abs(prevS - currS) / Math.max(prevS, currS) : 0;
    const sScore = 100 * (1 - sVariation);

    // 4. Keyword targets similarity (Jaccard Overlap)
    let prevK: string[] = [];
    let currK: string[] = [];
    try {
      prevK = JSON.parse(prev.seoTargetKeywords || '[]');
      currK = JSON.parse(curr.seoTargetKeywords || '[]');
    } catch { /* ignore */ }
    let kScore = 100;
    if (prevK.length > 0 || currK.length > 0) {
      const setA = new Set(prevK);
      const setB = new Set(currK);
      const intersection = new Set([...setA].filter(x => setB.has(x)));
      const union = new Set([...setA, ...setB]);
      kScore = (intersection.size / union.size) * 100;
    }

    // 5. Content Quality stability
    const prevQ = prev.seoContentQuality || 5.0;
    const currQ = curr.seoContentQuality || 5.0;
    const qScore = 100 - Math.abs(prevQ - currQ) * 10;

    const transitionScore = (gScore * 0.2) + (mScore * 0.2) + (sScore * 0.2) + (kScore * 0.2) + (qScore * 0.2);
    totalConsistency += transitionScore;
  }

  const finalConsistency = totalConsistency / numTransitions;
  return parseFloat(Math.max(0, Math.min(100, finalConsistency)).toFixed(2));
}

/**
 * Validates if a student has successfully passed the digital marketing simulation requirements
 */
export async function checkCertificateEligibility(simulationId: string): Promise<EligibilityResult> {
  const sim = await prisma.simulationState.findUnique({
    where: { id: simulationId },
    include: {
      user: true,
      class: {
        include: {
          scenario: true,
        },
      },
      scoreBreakdowns: {
        orderBy: {
          round: 'desc',
        },
      },
      decisions: true,
    },
  });

  if (!sim) {
    return {
      eligible: false,
      reasons: ['Simulation state not found.'],
      band: 'COMPETENT',
      compositeScore: 0,
      strategicConsistency: 0,
    };
  }

  const latestBreakdown = sim.scoreBreakdowns[0];
  const compositeScore = latestBreakdown ? latestBreakdown.compositeIndex : sim.score;
  const maxRounds = sim.class.scenario.maxRounds;

  // Calculate consistency
  const strategicConsistency = calculateStrategicConsistency(sim.decisions);

  const reasons: string[] = [];

  // 1. Status must be COMPLETED or SCORE_LOCKED (final state reached)
  const isStatusValid = sim.status === 'COMPLETED' || sim.status === 'SCORE_LOCKED';
  if (!isStatusValid) {
    reasons.push('Simulation status must be COMPLETED.');
  }

  // 2. All rounds must be submitted
  const allRoundsSubmitted = sim.decisions.length >= maxRounds && sim.decisions.every(d => d.submitted);
  if (!allRoundsSubmitted) {
    reasons.push('All rounds must be submitted.');
  }

  // 3. compositeIndex must be >= 70
  if (compositeScore < 70.0) {
    reasons.push(`Composite score of ${compositeScore.toFixed(1)} is below required 70.`);
  }

  // 4. strategicConsistency must be >= 65
  if (strategicConsistency < 65.0) {
    reasons.push(`Strategic consistency score of ${strategicConsistency.toFixed(1)} is below required 65.`);
  }

  // 5. College mode requires instructor approval
  const isCollegeStudent = sim.user.role === 'STUDENT_COLLEGE';
  if (isCollegeStudent && !sim.instructorApproved) {
    reasons.push('College mode requires instructor approval.');
  }

  // Determine band
  let band: 'COMPETENT' | 'PROFICIENT' | 'ADVANCED' = 'COMPETENT';
  if (compositeScore >= 90.0) {
    band = 'ADVANCED';
  } else if (compositeScore >= 80.0) {
    band = 'PROFICIENT';
  }

  const eligible = reasons.length === 0;

  return {
    eligible,
    reasons,
    band,
    compositeScore: parseFloat(compositeScore.toFixed(2)),
    strategicConsistency,
  };
}
