import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/utils/deterministic-random';
import { validateStateTransition, SimulationStatus } from '../../src/services/simulation/state-machine';
import { calculateOrganicRank } from '../../src/services/seo/ranking-engine';
import { SimulationError } from '../../src/utils/errors';

describe('Phase 2 Engine Core: RNG & State Machine Unit Tests', () => {
  describe('Deterministic RNG (createRng)', () => {
    it('should generate same output for same seed and different for different seeds', () => {
      const rng1 = createRng('test-seed-123');
      const rng2 = createRng('test-seed-123');
      const rng3 = createRng('other-seed-456');

      const seq1 = Array.from({ length: 10 }, () => rng1.next());
      const seq2 = Array.from({ length: 10 }, () => rng2.next());
      const seq3 = Array.from({ length: 10 }, () => rng3.next());

      expect(seq1).toEqual(seq2);
      expect(seq1).not.toEqual(seq3);
    });
  });

  describe('State Machine Transitions', () => {
    it('should allow valid transitions', () => {
      expect(() => validateStateTransition(SimulationStatus.INITIALIZED, SimulationStatus.DECISION_OPEN)).not.toThrow();
      expect(() => validateStateTransition(SimulationStatus.DECISION_OPEN, SimulationStatus.LOCKED)).not.toThrow();
      expect(() => validateStateTransition(SimulationStatus.LOCKED, SimulationStatus.PROCESSING)).not.toThrow();
      expect(() => validateStateTransition(SimulationStatus.PROCESSING, SimulationStatus.RESULTS_READY)).not.toThrow();
      expect(() => validateStateTransition(SimulationStatus.RESULTS_READY, SimulationStatus.DECISION_OPEN)).not.toThrow();
      expect(() => validateStateTransition(SimulationStatus.RESULTS_READY, SimulationStatus.SCORE_LOCKED)).not.toThrow();
      expect(() => validateStateTransition(SimulationStatus.SCORE_LOCKED, SimulationStatus.COMPLETED)).not.toThrow();
    });

    it('should reject invalid transitions', () => {
      expect(() => validateStateTransition(SimulationStatus.INITIALIZED, SimulationStatus.LOCKED)).toThrow(SimulationError);
      expect(() => validateStateTransition(SimulationStatus.DECISION_OPEN, SimulationStatus.PROCESSING)).toThrow(SimulationError);
      expect(() => validateStateTransition(SimulationStatus.LOCKED, SimulationStatus.RESULTS_READY)).toThrow(SimulationError);
      expect(() => validateStateTransition(SimulationStatus.PROCESSING, SimulationStatus.DECISION_OPEN)).toThrow(SimulationError);
      expect(() => validateStateTransition(SimulationStatus.RESULTS_READY, SimulationStatus.COMPLETED)).toThrow(SimulationError);
      expect(() => validateStateTransition(SimulationStatus.COMPLETED, SimulationStatus.INITIALIZED)).toThrow(SimulationError);
    });
  });

  describe('SEO Engine Advanced Rules', () => {
    const competitors = [
      { name: 'Competitor A', pageAuthority: 50, domainAuthority: 50 }
    ];

    it('should apply Round 1 SEO lag penalty', () => {
      const rng1 = createRng('seo-lag-test');
      const rng2 = createRng('seo-lag-test');

      const baseInput = {
        keyword: 'seo crm system',
        pageAuthority: 70,
        domainAuthority: 60,
        relevanceScore: 0.90,
        competitors,
        keywordDifficulty: 30,
        contentQuality: 8.0,
        backlinkBudget: 500,
        technicalScore: 90
      };

      const rankRound1 = calculateOrganicRank({ ...baseInput, round: 1 }, rng1);
      const rankRound2 = calculateOrganicRank({ ...baseInput, round: 2 }, rng2);

      // Lag penalty reduces strength in round 1, leading to a worse (higher numeric value) or equal rank position
      expect(rankRound1).toBeGreaterThanOrEqual(rankRound2);
    });

    it('should apply compounding improvement for consecutive active SEO rounds', () => {
      const rng1 = createRng('seo-compound-test');
      const rng2 = createRng('seo-compound-test');

      const baseInput = {
        keyword: 'seo crm system',
        pageAuthority: 50,
        domainAuthority: 50,
        relevanceScore: 0.90,
        competitors,
        keywordDifficulty: 50,
        contentQuality: 8.0,
        backlinkBudget: 500,
        technicalScore: 90,
        round: 3
      };

      const rankLowCompounding = calculateOrganicRank({
        ...baseInput,
        previousBehavior: { cumulativeBacklinkSpend: 1000, consecutiveSEOActiveRounds: 0 }
      }, rng1);

      const rankHighCompounding = calculateOrganicRank({
        ...baseInput,
        previousBehavior: { cumulativeBacklinkSpend: 1000, consecutiveSEOActiveRounds: 4 }
      }, rng2);

      // Compounding bonus improves strength, leading to a better (lower numeric value) or equal rank position
      expect(rankHighCompounding).toBeLessThanOrEqual(rankLowCompounding);
    });
  });
});
