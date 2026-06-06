/**
 * Digital Marketing Simulation Lab - Socket.io WebSocket Client (Sample Code)
 * 
 * Copy and paste this into your frontend application (e.g. `src/api/socket.ts`).
 * Make sure to install socket.io-client: `npm install socket.io-client`
 */

import { io, Socket } from 'socket.io-client';

const WS_URL = typeof process !== 'undefined'
  ? (process.env.VITE_WS_URL || process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000')
  : 'http://localhost:5000';

interface ConnectOptions {
  userId: string;
  simulationId?: string;
  token?: string; // Optional Better Auth token
}

/**
 * Initializes and binds event listeners to a new Socket.io connection.
 */
export function initializeSocket(options: ConnectOptions): Socket {
  const { userId, simulationId, token } = options;

  console.log(`🔌 Connecting to WebSocket server at: ${WS_URL}`);

  const socket = io(WS_URL, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    // You can explicitly pass token if using custom Authorization header flows
    auth: token ? { token } : undefined,
  });

  // ── Connection Event ───────────────────────────────────────────────────────
  socket.on('connect', () => {
    console.log('✅ Connected to WebSocket server. Socket ID:', socket.id);

    // 1. Subscribe to the user's personal channel for private notifications/audits
    socket.emit('join-user', userId);
    console.log(`👤 Requested to join personal room 'user:${userId}'`);

    // 2. Subscribe to the simulation channel for real-time campaign updates
    if (simulationId) {
      socket.emit('join-simulation', simulationId);
      console.log(`🎮 Requested to join simulation room 'simulation:${simulationId}'`);
    }
  });

  // ── Subscriptions / Room Switching ─────────────────────────────────────────

  /**
   * Dynamically subscribe to a new simulation room (e.g., when a user starts/switches simulations).
   */
  socket.on('join-simulation-ack', (joinedId: string) => {
    console.log(`👍 Successfully joined simulation channel: ${joinedId}`);
  });

  // ── Incoming Socket Events ─────────────────────────────────────────────────

  /**
   * Event: round:complete
   * Triggered when the simulation engine completes calculations for the current round.
   */
  socket.on('round:complete', (payload: {
    type: 'ROUND_COMPLETE';
    simulationId: string;
    roundNumber: number;
    nextState: 'RESULTS_READY' | 'SCORE_LOCKED' | 'COMPLETED';
  }) => {
    console.log('🎉 [WS Event] Round Completed:', payload);
    // ACTION: Refresh simulation state and daily metrics on the UI.
    // e.g. dispatchEvent(new CustomEvent('simulation-round-updated', { detail: payload }));
  });

  /**
   * Event: notification
   * General messages or alerts pushed to the specific user.
   */
  socket.on('notification', (notice: {
    id: string;
    message: string;
    level: 'info' | 'warn' | 'error';
    createdAt: string;
  }) => {
    console.log(`🔔 [WS Event] Notification received: [${notice.level.toUpperCase()}] ${notice.message}`);
    // ACTION: Display toast or alert banner to the student.
  });

  /**
   * Event: event:triggered
   * Emitted when a market scenario event (e.g., Google core update, Black Friday traffic) is active.
   */
  socket.on('event:triggered', (event: {
    id: string;
    name: string;
    description: string;
    impactMultiplier: number;
  }) => {
    console.warn(`⚡ [WS Event] Market Event Active: "${event.name}" - ${event.description}`);
    // ACTION: Show modal/notification warning the student about market conditions.
  });

  /**
   * Event: decision:locked
   * Observer notification that decisions have been committed.
   */
  socket.on('decision:locked', (data: {
    simulationId: string;
    round: number;
    locked: boolean;
  }) => {
    console.log(`🔒 [WS Event] Simulation ${data.simulationId} round ${data.round} decisions locked.`);
  });

  // ── Connection Status / Error Handling ─────────────────────────────────────
  socket.on('connect_error', (error) => {
    console.error('❌ WebSocket Connection Error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 WebSocket disconnected. Reason:', reason);
    if (reason === 'io server disconnect') {
      // Server booted the client; reconnect manually
      socket.connect();
    }
  });

  return socket;
}
