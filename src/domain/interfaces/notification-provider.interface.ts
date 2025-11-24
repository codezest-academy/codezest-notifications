import { Notification } from '../entities/notification';

export interface NotificationProviderInterface {
  send(notification: Notification): Promise<void>;
}
