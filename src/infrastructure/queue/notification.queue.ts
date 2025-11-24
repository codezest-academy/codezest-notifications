import { Queue } from 'bullmq';
import { config } from '../../config';
import { logger } from '../../common/logger';

export const notificationQueue = new Queue('notification-queue', {
  connection: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  },
});

notificationQueue.on('error', (err) => {
  logger.error('Notification queue error', err);
});

logger.info('Notification queue initialized');
