import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { initSocketServer } from './websocket/server';
import { startQueueWorker } from './jobs/queue';
import { checkExpiredSubscriptions } from './jobs/schedulers/round-scheduler';
import { isRedisAvailable } from './utils/redis-service';

const start = async () => {
  try {
    const redisOk = await isRedisAvailable();
    if (!redisOk && config.REDIS_REQUIRED) {
      logger.error('REDIS_REQUIRED is set to true, but Redis is not available. Exiting.');
      process.exit(1);
    }

    const address = await app.listen({ port: config.PORT, host: '0.0.0.0' });
    logger.info(`HTTP Server listening on ${address}`);

    // Print safe CORS startup configuration
    const corsCount = config.CORS_ORIGINS ? config.CORS_ORIGINS.split(',').filter(Boolean).length : 0;
    logger.info(`CORS Startup Config: stable FRONTEND_URL=${config.FRONTEND_URL}, explicit CORS_ORIGINS count=${corsCount}, preview pattern enabled=true`);

    // Initialize WebSockets attached to Fastify's HTTP server
    await initSocketServer(app.server);
    logger.info('WebSocket Server initialized successfully');

    // Start background BullMQ queue worker
    await startQueueWorker();
    logger.info('Background Queue worker started');

    // Run expired subscription sweep on startup and schedule hourly
    checkExpiredSubscriptions().catch(err => logger.error(err, 'Startup subscription sweep failed'));
    setInterval(() => {
      checkExpiredSubscriptions().catch(err => logger.error(err, 'Hourly subscription sweep failed'));
    }, 60 * 60 * 1000); // every hour
  } catch (err) {
    logger.error(err, 'Failed to bootstrap server application');
    process.exit(1);
  }
};

// Handle process shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down application gracefully.');
  await app.close();
  process.exit(0);
});

start();
