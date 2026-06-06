import { startQueueWorker } from '../queue';
import { logger } from '../../utils/logger';

logger.info('Initializing standalone Daily Round batch worker...');
startQueueWorker();
