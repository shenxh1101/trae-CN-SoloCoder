import {Middleware} from 'redux';
import {Platform} from 'react-native';
import widgetManager from '@services/widgetManager';

const WIDGET_SYNC_ACTIONS = [
  'events/addEvent',
  'events/updateEvent',
  'events/deleteEvent',
  'events/archiveEvent',
  'events/unarchiveEvent',
  'events/togglePin',
  'events/importEvents',
  'events/setEvents',
  'events/updateRepeatingEvent',
  'widgets/addWidget',
  'widgets/updateWidget',
  'widgets/deleteWidget',
  'widgets/setWidgets',
];

const THROTTLE_DELAY = 2000;
let lastSyncTime = 0;
let syncTimeout: NodeJS.Timeout | null = null;

interface AnyAction {
  type: string;
  [key: string]: any;
}

export const widgetSyncMiddleware: Middleware = store => next => (action: unknown) => {
  const act = action as AnyAction;
  const result = next(action);

  const actionType = act.type as string;

  if (WIDGET_SYNC_ACTIONS.includes(actionType)) {
    scheduleSync(store.getState as () => any);
  }

  return result;
};

const scheduleSync = (getState: () => any) => {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  const now = Date.now();
  const timeSinceLastSync = now - lastSyncTime;

  const performSync = async () => {
    try {
      const state = getState();
      const {events, categories} = state.events;
      const {widgets} = state.widgets;

      if (widgetManager.isSupported()) {
        await widgetManager.syncAllData(events, categories, widgets);
        lastSyncTime = Date.now();
      } else if (Platform.OS === 'android') {
        await widgetManager.updateAndroidWidgets();
        lastSyncTime = Date.now();
      }
    } catch (error) {
      console.error('Widget sync failed:', error);
    } finally {
      syncTimeout = null;
    }
  };

  if (timeSinceLastSync > THROTTLE_DELAY) {
    performSync();
  } else {
    syncTimeout = setTimeout(performSync, THROTTLE_DELAY - timeSinceLastSync);
  }
};

export default widgetSyncMiddleware;
