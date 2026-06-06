import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { auth } from '../auth/better-auth';

export let io: SocketServer | null = null;

/**
 * Parses a Bearer token from the "Authorization" header or socket handshake auth.
 */
function extractToken(socket: Socket): string | null {
  const authHeader = socket.handshake.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  // Fallback: frontend can pass { token } in the socket.io auth handshake
  const handshakeAuth = socket.handshake.auth as Record<string, unknown>;
  if (typeof handshakeAuth?.token === 'string') {
    return handshakeAuth.token;
  }
  return null;
}

/**
 * Initializes the Socket.io WebSocket server attached to Fastify's HTTP server.
 * Attaches a Redis adapter when REDIS_URL is configured; falls back to in-memory adapter.
 */
export function initSocketServer(server: HttpServer): void {
  try {
    io = new SocketServer(server, {
      cors: {
        origin: '*', // Match Fastify CORS rules
        methods: ['GET', 'POST'],
      },
      // Increase ping interval for long-running simulation sessions
      pingInterval: 25_000,
      pingTimeout: 60_000,
    });

    // ── Redis Adapter (optional) ─────────────────────────────────────────────
    if (config.REDIS_URL) {
      try {
        const pubClient = new Redis(config.REDIS_URL);
        const subClient = pubClient.duplicate();

        pubClient.on('error', (err) =>
          logger.warn({ err }, 'Socket.io Redis pub-client error')
        );
        subClient.on('error', (err) =>
          logger.warn({ err }, 'Socket.io Redis sub-client error')
        );

        io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.io Redis adapter attached successfully.');
      } catch (adapterErr) {
        logger.warn({ adapterErr }, 'Redis adapter failed to initialise — using in-memory adapter.');
      }
    } else {
      logger.warn('REDIS_URL not set — Socket.io running with in-memory adapter (single-node only).');
    }

    // ── Connection Handler ───────────────────────────────────────────────────
    io.on('connection', async (socket) => {
      logger.info({ socketId: socket.id }, 'WebSocket client connected.');

      // ── Auth Check ─────────────────────────────────────────────────────────
      const token = extractToken(socket);

      let userId: string | null = null;

      if (token) {
        try {
          // Use Better-Auth session endpoint to validate the token
          const sessionResponse = await auth.api.getSession({
            headers: new Headers({ cookie: `better-auth.session_token=${token}` }),
          });
          if (sessionResponse?.user?.id) {
            userId = sessionResponse.user.id;
            // Auto-join personal user room
            socket.join(`user:${userId}`);
            logger.info({ socketId: socket.id, userId }, 'Authenticated socket joined user room.');
          }
        } catch {
          // Not a fatal error — socket stays connected but unauthenticated
          logger.debug({ socketId: socket.id }, 'Socket auth check failed; socket operating anonymously.');
        }
      }

      // ── Room Events ────────────────────────────────────────────────────────

      /**
       * join-user: Join a personal user notification room.
       * Payload: { userId: string }
       * Prefer server-side assignment from auth, but support explicit join as fallback.
       */
      socket.on('join-user', (incomingUserId: string) => {
        if (!incomingUserId) return;
        // Only allow if token-verified or matches already known userId
        if (userId && incomingUserId !== userId) {
          logger.warn({ socketId: socket.id, incomingUserId, userId }, 'User room mismatch — ignoring join-user.');
          return;
        }
        socket.join(`user:${incomingUserId}`);
        logger.info({ socketId: socket.id, room: `user:${incomingUserId}` }, 'Socket joined user room.');
      });

      /**
       * join-simulation: Subscribe to live updates for a specific simulation.
       * Payload: { simulationId: string }
       */
      socket.on('join-simulation', (simulationId: string) => {
        if (!simulationId) return;
        socket.join(`simulation:${simulationId}`);
        logger.info({ socketId: socket.id, room: `simulation:${simulationId}` }, 'Socket joined simulation room.');
      });

      /**
       * Legacy: plain "join" with userId — kept for backwards compat.
       */
      socket.on('join', (legacyUserId: string) => {
        if (!legacyUserId) return;
        socket.join(legacyUserId);
        logger.debug({ socketId: socket.id, room: legacyUserId }, 'Legacy socket join (userId only).');
      });

      socket.on('disconnect', (reason) => {
        logger.info({ socketId: socket.id, reason }, 'WebSocket client disconnected.');
      });
    });

    logger.info('Socket.io WebSocket server initialised.');
  } catch (err) {
    logger.error(err, 'Failed to initialise Socket.io WebSocket server.');
  }
}
