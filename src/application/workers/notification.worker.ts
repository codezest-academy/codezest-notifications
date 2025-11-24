import { Worker } from 'bullmq';
import { config } from '../../config';
import { logger } from '../../common/logger';
import { EmailProvider } from '../../infrastructure/providers/email.provider';
import { Notification } from '../../domain/entities/notification';

const emailProvider = new EmailProvider();

export const notificationWorker = new Worker(
  'notification-queue',
  async (job) => {
    const notification = job.data as Notification;
    logger.info(`Processing notification job ${job.id}`, { notificationId: notification.id });

    try {
      switch (notification.type) {
        case 'EMAIL':
          await emailProvider.send(notification);
          break;
        default:
          logger.warn(`Unsupported notification type: ${notification.type}`);
      }
    } catch (error) {
      logger.error(`Failed to process notification ${notification.id}`, error);
      throw error;
    }
  },
  {
    connection: {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    },
  }
);

notificationWorker.on('completed', (job) => {
  logger.info(`Notification job ${job.id} completed`);
});

notificationWorker.on('failed', (job, err) => {
  logger.error(`Notification job ${job?.id} failed`, err);
});
