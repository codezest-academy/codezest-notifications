import { Request, Response } from 'express';
import { NotificationService } from '../../application/services/notification.service';
import { NotificationType, NotificationPriority } from '../../domain/entities/notification';
import { logger } from '../../common/logger';

const notificationService = new NotificationService();

export class NotificationController {
  async send(req: Request, res: Response): Promise<void> {
    try {
      const { userId, type, title, message, priority } = req.body;

      if (!userId || !type || !title || !message) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const notification = await notificationService.sendNotification(
        userId,
        type as NotificationType,
        title,
        message,
        priority as NotificationPriority
      );

      res.status(201).json(notification);
    } catch (error) {
      logger.error('Failed to send notification', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
