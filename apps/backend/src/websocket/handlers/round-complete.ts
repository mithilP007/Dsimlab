import { broadcastSimulationEvent } from './notification';

/**
 * Broadcasts a "round:complete" WebSocket event to both the student's personal
 * room and the simulation room so instructors watching the dashboard also receive it.
 *
 * Payload shape:
 * {
 *   type: 'ROUND_COMPLETE',
 *   simulationId: string,
 *   roundNumber: number,
 *   nextState: 'DECISION_OPEN' | 'SCORE_LOCKED',
 *   compositeScore: number,
 *   scoreBreakdown: object | null
 * }
 */
export function notifyRoundComplete(userId: string, data: any): void {
  const payload = {
    type: 'ROUND_COMPLETE' as const,
    simulationId: data.simulationId,
    roundNumber: data.roundAdvanced,
    nextState: (data.isCompleted ? 'SCORE_LOCKED' : 'DECISION_OPEN') as 'DECISION_OPEN' | 'SCORE_LOCKED',
    compositeScore: data.compositeScore ?? null,
    scoreBreakdown: data.scoreBreakdown ?? null,
  };

  broadcastSimulationEvent(userId, data.simulationId, 'round:complete', payload);
}
