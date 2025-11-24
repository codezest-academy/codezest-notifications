import { NotificationProviderInterface } from '../../domain/interfaces/notification-provider.interface';
import { Notification } from '../../domain/entities/notification';
import { logger } from '../../common/logger';

export class EmailProvider implements NotificationProviderInterface {
  async send(notification: Notification): Promise<void> {
    logger.info(`[EmailProvider] Sending email to ${notification.userId}`, {
      subject: notification.title,
      body: notification.message,
    });
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
