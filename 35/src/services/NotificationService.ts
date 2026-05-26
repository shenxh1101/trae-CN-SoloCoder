import * as Notifications from 'expo-notifications';
import { Task } from '../types/models';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const NotificationService = {
  requestPermissions: async (): Promise<boolean> => {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowAnnouncements: true,
      },
    });
    return status === 'granted';
  },

  scheduleTaskReminder: async (task: Task): Promise<string | null> => {
    if (!task.dueDate) return null;

    const trigger = {
      date: new Date(task.dueDate),
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: task.title,
        body: task.description || '任务提醒',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger,
    });

    return notificationId;
  },

  scheduleLocationReminder: async (
    task: Task,
    latitude: number,
    longitude: number,
    radius: number
  ): Promise<string | null> => {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: task.title,
        body: `您已到达 ${task.location?.address || '指定地点'}，请完成此任务`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        latitude,
        longitude,
        radius,
        notifyOnEnter: true,
        notifyOnExit: false,
      } as any,
    });

    return notificationId;
  },

  cancelNotification: async (notificationId: string): Promise<void> => {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  cancelAllNotifications: async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  getScheduledNotifications: async (): Promise<Notifications.NotificationRequest[]> => {
    return await Notifications.getAllScheduledNotificationsAsync();
  },
};
