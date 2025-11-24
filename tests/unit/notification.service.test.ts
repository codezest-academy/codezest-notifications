import { NotificationService } from '../../src/application/services/notification.service';
import { notificationQueue } from '../../src/infrastructure/queue/notification.queue';
import { NotificationType, NotificationPriority } from '../../src/domain/entities/notification';

jest.mock('../../src/infrastructure/queue/notification.queue', () => ({
  notificationQueue: {
    add: jest.fn(),
  },
}));

jest.mock('../../src/common/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
    jest.clearAllMocks();
  });

  it('should create and queue a notification', async () => {
    const userId = 'user-123';
    const type = NotificationType.EMAIL;
    const title = 'Test Notification';
    const message = 'This is a test';
    const priority = NotificationPriority.HIGH;

    const notification = await notificationService.sendNotification(
      userId,
      type,
      title,
      message,
      priority
    );

    expect(notification).toBeDefined();
    expect(notification.userId).toBe(userId);
    expect(notification.type).toBe(type);
    expect(notificationQueue.add).toHaveBeenCalledWith(
      'send-notification',
      expect.objectContaining({
        userId,
        type,
        title,
        message,
      }),
      expect.objectContaining({
        priority: 1,
      })
    );
  });
});
