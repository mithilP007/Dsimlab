import { SimulationError } from '../../utils/errors';

export enum SimulationStatus {
  INITIALIZED = 'INITIALIZED',
  DECISION_OPEN = 'DECISION_OPEN',
  LOCKED = 'LOCKED',
  PROCESSING = 'PROCESSING',
  RESULTS_READY = 'RESULTS_READY',
  SCORE_LOCKED = 'SCORE_LOCKED',
  COMPLETED = 'COMPLETED'
}

/**
 * Validates transition from one simulation status to another
 */
export function validateStateTransition(from: SimulationStatus, to: SimulationStatus): void {
  const allowedTransitions: Record<SimulationStatus, SimulationStatus[]> = {
    [SimulationStatus.INITIALIZED]: [SimulationStatus.DECISION_OPEN],
    [SimulationStatus.DECISION_OPEN]: [SimulationStatus.LOCKED],
    [SimulationStatus.LOCKED]: [SimulationStatus.PROCESSING],
    [SimulationStatus.PROCESSING]: [SimulationStatus.RESULTS_READY],
    [SimulationStatus.RESULTS_READY]: [SimulationStatus.DECISION_OPEN, SimulationStatus.SCORE_LOCKED],
    [SimulationStatus.SCORE_LOCKED]: [SimulationStatus.COMPLETED],
    [SimulationStatus.COMPLETED]: [],
  };

  const allowed = allowedTransitions[from];
  if (!allowed || !allowed.includes(to)) {
    throw new SimulationError(`Invalid state transition from ${from} to ${to}`);
  }
}

export interface MiniState {
  currentRound: number;
  isCompleted: boolean;
  cumulativeSpend: number;
  cumulativeRevenue: number;
  score: number;
}

/**
 * Executes a pure state transition to advance the simulation state
 */
export function advanceRoundState(
  currentState: MiniState,
  maxRounds: number,
  roundSpend: number,
  roundRevenue: number,
  roundScore: number
): MiniState {
  if (currentState.isCompleted) {
    throw new SimulationError('Simulation has already completed. Cannot advance further.');
  }

  const isFinished = currentState.currentRound >= maxRounds;
  const nextRound = isFinished ? currentState.currentRound : currentState.currentRound + 1;
  const isCompleted = isFinished;

  const nextSpend = currentState.cumulativeSpend + roundSpend;
  const nextRevenue = currentState.cumulativeRevenue + roundRevenue;

  // New overall score is the simple moving average across all rounds completed so far
  const totalRounds = currentState.currentRound;
  const nextScore = ((currentState.score * (totalRounds - 1)) + roundScore) / totalRounds;

  return {
    currentRound: nextRound,
    isCompleted,
    cumulativeSpend: parseFloat(nextSpend.toFixed(2)),
    cumulativeRevenue: parseFloat(nextRevenue.toFixed(2)),
    score: parseFloat(nextScore.toFixed(2)),
  };
}
