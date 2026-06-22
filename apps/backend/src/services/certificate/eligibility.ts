import { prisma } from '../../db/client';

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  band: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'COMPETENT' | 'PROFICIENT' | 'ADVANCED';
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

export function calculateDailyStrategicConsistency(decisions: any[]): number {
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
      const prevGSettings = (typeof prev.googleAdsSettingsJson === 'string' 
        ? JSON.parse(prev.googleAdsSettingsJson) 
        : prev.googleAdsSettingsJson) || {};
      const currGSettings = (typeof curr.googleAdsSettingsJson === 'string' 
        ? JSON.parse(curr.googleAdsSettingsJson) 
        : curr.googleAdsSettingsJson) || {};
      
      const prevGCamps = prevGSettings.campaigns || [];
      const currGCamps = currGSettings.campaigns || [];
      prevG = prevGCamps.reduce((sum: number, c: any) => sum + (c.budget || 0), 0);
      currG = currGCamps.reduce((sum: number, c: any) => sum + (c.budget || 0), 0);
    } catch { /* ignore */ }
    const gVariation = Math.max(prevG, currG) > 0 ? Math.abs(prevG - currG) / Math.max(prevG, currG) : 0;
    const gScore = 100 * (1 - gVariation);

    // 2. Meta Ads Budget similarity
    let prevM = 0;
    let currM = 0;
    try {
      const prevMSettings = (typeof prev.metaAdsSettingsJson === 'string' 
        ? JSON.parse(prev.metaAdsSettingsJson) 
        : prev.metaAdsSettingsJson) || {};
      const currMSettings = (typeof curr.metaAdsSettingsJson === 'string' 
        ? JSON.parse(curr.metaAdsSettingsJson) 
        : curr.metaAdsSettingsJson) || {};
      
      const prevMCamps = prevMSettings.campaigns || [];
      const currMCamps = currMSettings.campaigns || [];
      prevM = prevMCamps.reduce((sum: number, c: any) => sum + (c.budget || 0), 0);
      currM = currMCamps.reduce((sum: number, c: any) => sum + (c.budget || 0), 0);
    } catch { /* ignore */ }
    const mVariation = Math.max(prevM, currM) > 0 ? Math.abs(prevM - currM) / Math.max(prevM, currM) : 0;
    const mScore = 100 * (1 - mVariation);

    // 3. SEO Budget similarity
    let prevS = 0;
    let currS = 0;
    try {
      const prevSeo = (typeof prev.seoSettingsJson === 'string' 
        ? JSON.parse(prev.seoSettingsJson) 
        : prev.seoSettingsJson) || {};
      const currSeo = (typeof curr.seoSettingsJson === 'string' 
        ? JSON.parse(curr.seoSettingsJson) 
        : curr.seoSettingsJson) || {};
      prevS = prevSeo.backlinkBudget || 0;
      currS = currSeo.backlinkBudget || 0;
    } catch { /* ignore */ }
    const sVariation = Math.max(prevS, currS) > 0 ? Math.abs(prevS - currS) / Math.max(prevS, currS) : 0;
    const sScore = 100 * (1 - sVariation);

    // 4. Keyword targets similarity (Jaccard Overlap)
    let prevK: string[] = [];
    let currK: string[] = [];
    try {
      const prevSeo = (typeof prev.seoSettingsJson === 'string' 
        ? JSON.parse(prev.seoSettingsJson) 
        : prev.seoSettingsJson) || {};
      const currSeo = (typeof curr.seoSettingsJson === 'string' 
        ? JSON.parse(curr.seoSettingsJson) 
        : curr.seoSettingsJson) || {};
      prevK = prevSeo.targetKeywords || [];
      currK = currSeo.targetKeywords || [];
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
    let prevQ = 5.0;
    let currQ = 5.0;
    try {
      const prevSeo = (typeof prev.seoSettingsJson === 'string' 
        ? JSON.parse(prev.seoSettingsJson) 
        : prev.seoSettingsJson) || {};
      const currSeo = (typeof curr.seoSettingsJson === 'string' 
        ? JSON.parse(curr.seoSettingsJson) 
        : curr.seoSettingsJson) || {};
      prevQ = prevSeo.contentQuality || 5.0;
      currQ = currSeo.contentQuality || 5.0;
    } catch { /* ignore */ }
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
      band: 'BRONZE',
      compositeScore: 0,
      strategicConsistency: 0,
    };
  }

  // Check if a daily CampaignRun exists for this user and class
  const campaignRun = await prisma.campaignRun.findFirst({
    where: {
      userId: sim.userId,
      classId: sim.classId,
    },
    include: {
      decisions: {
        orderBy: { dayNumber: 'asc' }
      },
      results: {
        orderBy: { dayNumber: 'asc' }
      }
    }
  });

  const reasons: string[] = [];
  let compositeScore = 0;
  let strategicConsistency = 0;
  let eligible = false;
  let band: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'COMPETENT' | 'PROFICIENT' | 'ADVANCED' = 'BRONZE';

  const latestBreakdown = sim.scoreBreakdowns[0];
  const adaptability = latestBreakdown ? latestBreakdown.adaptability : 50.0;
  
  const hardViolationsCount = await prisma.hardViolation.count({
    where: { simulationId }
  });

  if (campaignRun) {
    const maxRounds = campaignRun.durationDays;
    const isStatusValid = campaignRun.status === 'COMPLETED' || sim.status === 'COMPLETED' || sim.status === 'SCORE_LOCKED';
    if (!isStatusValid) {
      reasons.push('Campaign run must be COMPLETED.');
    }

    const allRoundsSubmitted = campaignRun.decisions.length >= maxRounds;
    if (!allRoundsSubmitted) {
      reasons.push('All campaign days must have processed decisions.');
    }

    compositeScore = campaignRun.results.length > 0
      ? campaignRun.results.reduce((sum, r) => sum + r.compositeScore, 0) / campaignRun.results.length
      : sim.score;

    strategicConsistency = calculateDailyStrategicConsistency(campaignRun.decisions);
  } else {
    // Fallback to standard simulation state evaluation
    compositeScore = latestBreakdown ? latestBreakdown.compositeIndex : sim.score;
    const maxRounds = sim.class.scenario.maxRounds;

    // Calculate consistency
    strategicConsistency = calculateStrategicConsistency(sim.decisions);

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
  }

  // 3. Performance (compositeIndex) must be >= 60
  if (compositeScore < 60.0) {
    reasons.push(`Composite score of ${compositeScore.toFixed(1)} is below required 60.`);
  }

  // 4. Adaptability must be >= 50
  if (adaptability < 50.0) {
    reasons.push(`Adaptability score of ${adaptability.toFixed(1)} is below required 50.`);
  }

  // 5. No Hard Violations allowed
  if (hardViolationsCount > 0) {
    reasons.push(`Simulation has ${hardViolationsCount} hard policy or budget violations.`);
  }

  // 6. College mode requires instructor approval
  const isCollegeStudent = sim.user.role === 'STUDENT_COLLEGE';
  if (isCollegeStudent && !sim.instructorApproved) {
    reasons.push('College mode requires instructor approval.');
  }

  // Map scores to Bronze, Silver, Gold, or Platinum bands
  if (compositeScore >= 90.0) {
    band = 'PLATINUM';
  } else if (compositeScore >= 80.0) {
    band = 'GOLD';
  } else if (compositeScore >= 70.0) {
    band = 'SILVER';
  } else {
    band = 'BRONZE';
  }

  eligible = reasons.length === 0;

  return {
    eligible,
    reasons,
    band,
    compositeScore: parseFloat(compositeScore.toFixed(2)),
    strategicConsistency,
  };
}
