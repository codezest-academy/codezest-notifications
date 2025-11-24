import { NotificationService } from '../src/application/services/notification.service';
import { NotificationType, NotificationPriority } from '../src/domain/entities/notification';
import { logger } from '../src/common/logger';
import '../src/application/workers/notification.worker'; // Start worker

const main = async () => {
  const service = new NotificationService();

  logger.info('Starting integration test...');

  try {
    await service.sendNotification(
      'test-user-id',
      NotificationType.EMAIL,
      'Integration Test',
      'Hello from the integration test script!',
      NotificationPriority.HIGH
    );

    logger.info('Notification sent. Check logs for worker output.');

    // Keep process alive briefly to allow worker to process
    setTimeout(() => {
      logger.info('Test completed.');
      process.exit(0);
    }, 2000);
  } catch (error) {
    logger.error('Test failed', error);
    process.exit(1);
  }
};

main();
