import {NativeModules, Platform} from 'react-native';
import {CountdownEvent, Category, WidgetConfig} from '@types';

const {CountdownWidgetModule} = NativeModules;

export interface SyncResult {
  success: boolean;
  eventCount?: number;
  configCount?: number;
  eventsSynced?: number;
  configsSynced?: number;
  message: string;
}

export interface WidgetData {
  events: Array<{
    id: string;
    name: string;
    targetDate: number;
    backgroundColor: string;
    categoryColor: string;
    categoryName: string;
    repeatInterval: string;
    isPinned: boolean;
    lastUpdated: number;
  }>;
  widgetConfigs: Array<{
    id: string;
    eventId: string;
    size: string;
    theme: string;
    createdAt: number;
  }>;
  lastSynced: number;
}

export interface AppGroupInfo {
  available: boolean;
  groupId: string;
}

class WidgetManager {
  readonly APP_GROUP_ID = 'group.com.countdown.app.widgets';
  readonly WIDGET_KIND = 'CountdownWidget';
  readonly LOCK_WIDGET_KIND = 'CountdownLockWidget';

  isSupported(): boolean {
    return Platform.OS === 'ios' && parseInt(Platform.Version as string, 10) >= 14;
  }

  async syncEvents(events: CountdownEvent[], categories: Category[]): Promise<SyncResult> {
    if (!this.isSupported() || !CountdownWidgetModule) {
      return {
        success: false,
        message: 'Widget sync not supported on this platform',
      };
    }

    try {
      const eventsWithCategories = events.map(event => ({
        ...event,
        _categories: categories,
      }));

      const result = await CountdownWidgetModule.syncEvents(eventsWithCategories);
      return result as SyncResult;
    } catch (error) {
      console.error('Failed to sync widget events:', error);
      throw error;
    }
  }

  async syncWidgetConfigs(configs: WidgetConfig[]): Promise<SyncResult> {
    if (!this.isSupported() || !CountdownWidgetModule) {
      return {
        success: false,
        message: 'Widget sync not supported on this platform',
      };
    }

    try {
      const result = await CountdownWidgetModule.syncWidgetConfigs(configs);
      return result as SyncResult;
    } catch (error) {
      console.error('Failed to sync widget configs:', error);
      throw error;
    }
  }

  async syncAllData(
    events: CountdownEvent[],
    categories: Category[],
    widgetConfigs: WidgetConfig[],
  ): Promise<SyncResult> {
    if (!this.isSupported() || !CountdownWidgetModule) {
      return {
        success: false,
        message: 'Widget sync not supported on this platform',
      };
    }

    try {
      const eventsWithCategories = events.map(event => ({
        ...event,
        _categories: categories,
      }));

      const result = await CountdownWidgetModule.syncAllData(
        eventsWithCategories,
        widgetConfigs,
        categories,
      );
      return result as SyncResult;
    } catch (error) {
      console.error('Failed to sync all widget data:', error);
      throw error;
    }
  }

  async forceUpdateAllWidgets(): Promise<SyncResult> {
    if (!this.isSupported() || !CountdownWidgetModule) {
      return {
        success: false,
        message: 'Widget update not supported on this platform',
      };
    }

    try {
      const result = await CountdownWidgetModule.forceUpdateWidgets();
      return result as SyncResult;
    } catch (error) {
      console.error('Failed to force update widgets:', error);
      throw error;
    }
  }

  async updateWidgetOfKind(kind: string): Promise<SyncResult> {
    if (!this.isSupported() || !CountdownWidgetModule) {
      return {
        success: false,
        message: 'Widget update not supported on this platform',
      };
    }

    try {
      const result = await CountdownWidgetModule.updateWidgetOfKind(kind);
      return result as SyncResult;
    } catch (error) {
      console.error('Failed to update widget:', error);
      throw error;
    }
  }

  async getWidgetData(): Promise<WidgetData> {
    if (!this.isSupported() || !CountdownWidgetModule) {
      return {
        events: [],
        widgetConfigs: [],
        lastSynced: 0,
      };
    }

    try {
      const data = await CountdownWidgetModule.getWidgetData();
      return data as WidgetData;
    } catch (error) {
      console.error('Failed to get widget data:', error);
      throw error;
    }
  }

  async isAppGroupAvailable(): Promise<AppGroupInfo> {
    if (!this.isSupported() || !CountdownWidgetModule) {
      return {
        available: false,
        groupId: this.APP_GROUP_ID,
      };
    }

    try {
      const result = await CountdownWidgetModule.isAppGroupAvailable();
      return result as AppGroupInfo;
    } catch (error) {
      console.error('Failed to check app group:', error);
      return {
        available: false,
        groupId: this.APP_GROUP_ID,
      };
    }
  }

  async clearWidgetData(): Promise<SyncResult> {
    if (!this.isSupported() || !CountdownWidgetModule) {
      return {
        success: false,
        message: 'Widget data clearing not supported on this platform',
      };
    }

    try {
      const result = await CountdownWidgetModule.clearWidgetData();
      return result as SyncResult;
    } catch (error) {
      console.error('Failed to clear widget data:', error);
      throw error;
    }
  }

  async scheduleBackgroundRefresh(): Promise<SyncResult> {
    if (!this.isSupported() || !CountdownWidgetModule) {
      return {
        success: false,
        message: 'Background refresh not supported on this platform',
      };
    }

    try {
      const result = await CountdownWidgetModule.scheduleBackgroundRefresh();
      return result as SyncResult;
    } catch (error) {
      console.error('Failed to schedule background refresh:', error);
      throw error;
    }
  }

  // Live Activity methods (iOS 16.1+)
  async startActivity(event: CountdownEvent): Promise<SyncResult> {
    if (!this.isSupported() || !CountdownWidgetModule) {
      return {
        success: false,
        message: 'Live Activity not supported on this platform',
      };
    }

    if (Platform.OS === 'ios' && parseInt(Platform.Version as string, 10) < 16.1) {
      return {
        success: false,
        message: 'Live Activity requires iOS 16.1+',
      };
    }

    try {
      const result = await CountdownWidgetModule.startActivity(event);
      return result as SyncResult;
    } catch (error) {
      console.error('Failed to start live activity:', error);
      throw error;
    }
  }

  async endActivity(activityId: string): Promise<SyncResult> {
    if (!this.isSupported() || !CountdownWidgetModule) {
      return {
        success: false,
        message: 'Live Activity not supported on this platform',
      };
    }

    try {
      const result = await CountdownWidgetModule.endActivity(activityId);
      return result as SyncResult;
    } catch (error) {
      console.error('Failed to end live activity:', error);
      throw error;
    }
  }

  async updateActivity(activityId: string, event: CountdownEvent): Promise<SyncResult> {
    if (!this.isSupported() || !CountdownWidgetModule) {
      return {
        success: false,
        message: 'Live Activity not supported on this platform',
      };
    }

    try {
      const result = await CountdownWidgetModule.updateActivity(activityId, event);
      return result as SyncResult;
    } catch (error) {
      console.error('Failed to update live activity:', error);
      throw error;
    }
  }

  // Android widget methods
  async updateAndroidWidgets(): Promise<SyncResult> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        message: 'Android widgets not supported on this platform',
      };
    }

    try {
      const result = await CountdownWidgetModule?.updateWidgets?.();
      return {
        success: true,
        message: 'Android widgets updated',
        ...result,
      };
    } catch (error) {
      console.error('Failed to update Android widgets:', error);
      throw error;
    }
  }

  async setAndroidWallpaper(eventId: string): Promise<SyncResult> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        message: 'Live wallpaper not supported on this platform',
      };
    }

    try {
      const result = await CountdownWidgetModule?.setWallpaper?.(eventId);
      return {
        success: true,
        message: 'Wallpaper set successfully',
        ...result,
      };
    } catch (error) {
      console.error('Failed to set wallpaper:', error);
      throw error;
    }
  }

  async startWallpaperService(): Promise<SyncResult> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        message: 'Live wallpaper not supported on this platform',
      };
    }

    try {
      const result = await CountdownWidgetModule?.startWallpaperService?.();
      return {
        success: true,
        message: 'Wallpaper service started',
        ...result,
      };
    } catch (error) {
      console.error('Failed to start wallpaper service:', error);
      throw error;
    }
  }
}

export default new WidgetManager();
