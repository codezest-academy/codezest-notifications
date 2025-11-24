import { notificationQueue } from '../../infrastructure/queue/notification.queue';
import { Notification, NotificationType, NotificationPriority } from '../../domain/entities/notification';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../common/logger';

export class NotificationService {
  async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM
  ): Promise<Notification> {
    const notification = new Notification(
      uuidv4(),
      userId,
      type,
      title,
      message,
      priority
    );

    await notificationQueue.add('send-notification', notification, {
      priority: priority === NotificationPriority.HIGH ? 1 : 2,
    });

    logger.info(`Notification queued for user ${userId}`, { notificationId: notification.id });
    return notification;
  }
}
