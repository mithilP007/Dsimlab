import { io } from '../server';
import { logger } from '../../utils/logger';

// ─── Canonical WS Event Types ─────────────────────────────────────────────────
export type WsEventName =
  | 'round:complete'
  | 'simulation:status'
  | 'ai:insight'
  | 'instructor:event';

/**
 * Dispatches a real-time event to a specific user's personal room.
 */
export function sendUserEvent(userId: string, eventName: WsEventName, payload: unknown): void {
  if (!io) {
    logger.debug({ userId, eventName }, 'Skipping WS dispatch: Socket.io server not running.');
    return;
  }
  try {
    io.to(`user:${userId}`).emit(eventName, payload);
    logger.debug({ userId, eventName }, 'Broadcasted WebSocket event to user room.');
  } catch (err) {
    logger.error(err, `Failed to dispatch WS event '${eventName}' to user:${userId}`);
  }
}

/**
 * Dispatches a real-time event to a specific simulation's room.
 * All connected clients that called join-simulation are notified.
 */
export function sendSimulationEvent(simulationId: string, eventName: WsEventName, payload: unknown): void {
  if (!io) {
    logger.debug({ simulationId, eventName }, 'Skipping WS dispatch: Socket.io server not running.');
    return;
  }
  try {
    io.to(`simulation:${simulationId}`).emit(eventName, payload);
    logger.debug({ simulationId, eventName }, 'Broadcasted WebSocket event to simulation room.');
  } catch (err) {
    logger.error(err, `Failed to dispatch WS event '${eventName}' to simulation:${simulationId}`);
  }
}

/**
 * Convenience: emit the same event to BOTH the owner's user room and the simulation room.
 * Use this for round completion and simulation status updates where all observers should be notified.
 */
export function broadcastSimulationEvent(
  userId: string,
  simulationId: string,
  eventName: WsEventName,
  payload: unknown
): void {
  sendUserEvent(userId, eventName, payload);
  sendSimulationEvent(simulationId, eventName, payload);
}

/**
 * @deprecated Use sendUserEvent() or sendSimulationEvent() instead.
 * Kept for backwards compatibility with legacy code calling sendRealTimeEvent(userId, eventName, payload).
 */
export function sendRealTimeEvent(userId: string, eventName: string, payload: unknown): void {
  if (!io) {
    logger.debug({ userId, eventName }, 'Skipping WS dispatch: Socket.io server not running.');
    return;
  }
  try {
    // Emit to both named room and legacy bare userId room for compatibility
    io.to(`user:${userId}`).emit(eventName, payload);
    io.to(userId).emit(eventName, payload);
    logger.debug({ userId, eventName }, 'Broadcasted WebSocket event (legacy sendRealTimeEvent).');
  } catch (err) {
    logger.error(err, `Failed to dispatch WS event '${eventName}' to user ${userId}`);
  }
}
