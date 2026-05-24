import {Middleware} from 'redux';
import notificationService from '@services/notificationService';

const NOTIFICATION_SYNC_ACTIONS = [
  'events/addEvent',
  'events/updateEvent',
  'events/deleteEvent',
  'events/archiveEvent',
  'events/unarchiveEvent',
  'events/updateRepeatingEvent',
  'events/importEvents',
  'events/setEvents',
  'events/updateSettings',
];

let isInitialized = false;
let syncTimeout: NodeJS.Timeout | null = null;
const THROTTLE_DELAY = 1000;

interface AnyAction {
  type: string;
  [key: string]: any;
}

export const notificationSyncMiddleware: Middleware = store => next => async (action: unknown) => {
  const act = action as AnyAction;
  if (!isInitialized) {
    try {
      await notificationService.initialize();
      isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  const result = next(action);

  const actionType = act.type as string;

  if (NOTIFICATION_SYNC_ACTIONS.includes(actionType)) {
    scheduleNotificationSync(store.getState as () => any);
  }

  return result;
};

const scheduleNotificationSync = (getState: () => any) => {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  const performSync = async () => {
    try {
      const state = getState();
      const {settings} = state.events;

      if (!settings.notificationEnabled) {
        await notificationService.cancelAllNotifications();
        return;
      }

      const {events, categories} = state.events;
      await notificationService.scheduleAllNotifications(events, categories);

      const upcomingEvents = events.filter((e: any) => !e.isArchived && e.targetDate > Date.now());
      await notificationService.updateBadgeCount(upcomingEvents.length);
    } catch (error) {
      console.error('Notification sync failed:', error);
    } finally {
      syncTimeout = null;
    }
  };

  syncTimeout = setTimeout(performSync, THROTTLE_DELAY);
};

export default notificationSyncMiddleware;
