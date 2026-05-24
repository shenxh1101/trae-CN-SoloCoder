import {Platform} from 'react-native';
import notifee, {
  AndroidImportance,
  AndroidColor,
  AndroidVisibility,
  AuthorizationStatus,
  EventType,
  Notification,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import {CountdownEvent, Category} from '@types';

export interface NotificationConfig {
  eventId: string;
  eventName: string;
  targetDate: number;
  backgroundColor: string;
  categoryName: string;
  remindBefore?: number;
}

class NotificationService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await notifee.requestPermission();

      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: 'countdown_reminder',
          name: '倒计时提醒',
          description: '倒计时到期提醒通知',
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          sound: 'default',
          vibration: true,
          lightColor: AndroidColor.RED,
        });

        await notifee.createChannel({
          id: 'countdown_completed',
          name: '倒计时达成',
          description: '倒计时已达成通知',
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          sound: 'default',
          vibration: true,
        });
      }

      notifee.onForegroundEvent(({type, detail}) => {
        this.handleNotificationEvent(type, detail);
      });

      this.isInitialized = true;
      console.log('NotificationService initialized');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  private handleNotificationEvent(type: EventType, detail: any): void {
    switch (type) {
      case EventType.DISMISSED:
        console.log('Notification dismissed:', detail.notification?.id);
        break;
      case EventType.PRESS:
        console.log('Notification pressed:', detail.notification?.id);
        if (detail.pressAction?.id === 'default') {
          console.log('Default action pressed');
        }
        break;
      case EventType.DELIVERED:
        console.log('Notification delivered:', detail.notification?.id);
        break;
    }
  }

  async checkPermission(): Promise<boolean> {
    try {
      const settings = await notifee.getNotificationSettings();
      return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
    } catch (error) {
      console.error('Failed to check notification permission:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      const settings = await notifee.requestPermission();
      return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  async scheduleCountdownReminder(
    event: CountdownEvent,
    _category?: Category,
    remindBeforeMinutes: number = 0,
  ): Promise<string | null> {
    try {
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        const granted = await this.requestPermission();
        if (!granted) {
          console.warn('Notification permission not granted');
          return null;
        }
      }

      const triggerTime = event.targetDate - remindBeforeMinutes * 60 * 1000;
      const now = Date.now();

      if (triggerTime <= now) {
        console.warn('Trigger time is in the past, not scheduling reminder');
        return null;
      }

      const notificationId = `reminder_${event.id}`;

      const notification: Notification = {
        id: notificationId,
        title: '⏰ 倒计时提醒',
        subtitle: event.name,
        body: remindBeforeMinutes > 0
          ? `「${event.name}」将在 ${remindBeforeMinutes} 分钟后到期！`
          : `「${event.name}」已到期！`,
        android: {
          channelId: 'countdown_reminder',
          color: event.backgroundColor,
          smallIcon: 'ic_launcher',
          showTimestamp: true,
          timestamp: triggerTime,
          actions: [
            {
              title: '查看',
              pressAction: {id: 'view'},
            },
          ],
        },
        ios: {
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
          sound: 'default',
          critical: true,
          criticalVolume: 1.0,
        },
        data: {
          eventId: event.id,
          type: 'countdown_reminder',
        },
      };

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerTime / 1000,
      };

      await notifee.createTriggerNotification(notification, trigger);

      console.log(`Scheduled reminder for event ${event.id} at ${new Date(triggerTime).toLocaleString()}`);

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule countdown reminder:', error);
      return null;
    }
  }

  async scheduleCountdownCompleted(
    event: CountdownEvent,
    _category?: Category,
  ): Promise<string | null> {
    try {
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        const granted = await this.requestPermission();
        if (!granted) {
          console.warn('Notification permission not granted');
          return null;
        }
      }

      if (event.targetDate <= Date.now()) {
        console.warn('Event date is in the past, not scheduling completion notification');
        return null;
      }

      const notificationId = `completed_${event.id}`;

      const notification: Notification = {
        id: notificationId,
        title: '🎉 倒计时已达成！',
        subtitle: event.name,
        body: `「${event.name}」的倒计时已结束！`,
        android: {
          channelId: 'countdown_completed',
          color: event.backgroundColor,
          smallIcon: 'ic_launcher',
          showTimestamp: true,
          timestamp: event.targetDate,
          actions: [
            {
              title: '分享',
              pressAction: {id: 'share'},
            },
            {
              title: '查看',
              pressAction: {id: 'view'},
            },
          ],
        },
        ios: {
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
          sound: 'default',
          critical: true,
          criticalVolume: 1.0,
        },
        data: {
          eventId: event.id,
          type: 'countdown_completed',
        },
      };

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: event.targetDate / 1000,
      };

      await notifee.createTriggerNotification(notification, trigger);

      console.log(`Scheduled completion for event ${event.id} at ${new Date(event.targetDate).toLocaleString()}`);

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule countdown completion:', error);
      return null;
    }
  }

  async scheduleAllNotifications(
    events: CountdownEvent[],
    categories: Category[],
  ): Promise<void> {
    try {
      await this.cancelAllNotifications();

      const now = Date.now();

      for (const event of events) {
        if (event.isArchived || event.targetDate <= now) {
          continue;
        }

        const category = categories.find(c => c.id === event.categoryId);

        await this.scheduleCountdownReminder(event, category, 0);

        if (event.targetDate - now > 24 * 60 * 60 * 1000) {
          await this.scheduleCountdownReminder(event, category, 1440);
        }

        if (event.targetDate - now > 60 * 60 * 1000) {
          await this.scheduleCountdownReminder(event, category, 60);
        }

        await this.scheduleCountdownCompleted(event, category);
      }

      console.log('Scheduled notifications for all upcoming events');
    } catch (error) {
      console.error('Failed to schedule all notifications:', error);
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await notifee.cancelNotification(notificationId);
      console.log(`Cancelled notification: ${notificationId}`);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelEventNotifications(eventId: string): Promise<void> {
    try {
      await notifee.cancelNotification(`reminder_${eventId}`);
      await notifee.cancelNotification(`completed_${eventId}`);
      console.log(`Cancelled notifications for event: ${eventId}`);
    } catch (error) {
      console.error('Failed to cancel event notifications:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await notifee.cancelAllNotifications();
      console.log('Cancelled all notifications');
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  async getScheduledNotifications(): Promise<any[]> {
    try {
      const notifications = await notifee.getTriggerNotifications();
      return notifications;
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  async displayImmediateNotification(
    title: string,
    body: string,
    eventId?: string,
    color?: string,
  ): Promise<string | null> {
    try {
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        const granted = await this.requestPermission();
        if (!granted) {
          return null;
        }
      }

      const notificationId = `immediate_${Date.now()}`;

      const notification: Notification = {
        id: notificationId,
        title,
        body,
        android: {
          channelId: 'countdown_reminder',
          color: color || '#6366F1',
          smallIcon: 'ic_launcher',
          showTimestamp: true,
          timestamp: Date.now(),
        },
        ios: {
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
          sound: 'default',
        },
        data: eventId ? {eventId} : undefined,
      };

      await notifee.displayNotification(notification);

      return notificationId;
    } catch (error) {
      console.error('Failed to display immediate notification:', error);
      return null;
    }
  }

  async updateBadgeCount(count: number): Promise<void> {
    try {
      await notifee.setBadgeCount(count);
    } catch (error) {
      console.error('Failed to update badge count:', error);
    }
  }

  async incrementBadgeCount(): Promise<void> {
    try {
      const currentCount = await notifee.getBadgeCount();
      await notifee.setBadgeCount(currentCount + 1);
    } catch (error) {
      console.error('Failed to increment badge count:', error);
    }
  }

  async getDeliveredNotifications(): Promise<Notification[]> {
    try {
      return await notifee.getDisplayedNotifications();
    } catch (error) {
      console.error('Failed to get delivered notifications:', error);
      return [];
    }
  }

  async removeDeliveredNotification(notificationId: string): Promise<void> {
    try {
      await notifee.cancelDisplayedNotification(notificationId);
    } catch (error) {
      console.error('Failed to remove delivered notification:', error);
    }
  }

  async removeAllDeliveredNotifications(): Promise<void> {
    try {
      const notifications = await notifee.getDisplayedNotifications();
      for (const notification of notifications) {
        if (notification.id) {
          await notifee.cancelDisplayedNotification(notification.id);
        }
      }
    } catch (error) {
      console.error('Failed to remove all delivered notifications:', error);
    }
  }
}

export default new NotificationService();
