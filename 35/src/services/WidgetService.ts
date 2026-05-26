import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as FileSystem from 'expo-file-system';
import { LocationService } from './LocationService';
import { NotificationService } from './NotificationService';
import { taskRepository } from '../database/database';
import { Task } from '../types/models';

const LOCATION_TASK_NAME = 'location-reminder-task';
const DATA_FETCH_TASK_NAME = 'data-fetch-task';
const WIDGET_DATA_FILE = 'widget-data.json';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const { coords } = locations[0];
      const tasks = taskRepository.getAll();

      for (const task of tasks) {
        if (task.location && !task.completed) {
          const isNear = LocationService.isNearLocation(
            task,
            coords.latitude,
            coords.longitude
          );

          if (isNear) {
            await NotificationService.scheduleLocationReminder(
              task,
              task.location.latitude,
              task.location.longitude,
              task.location.radius
            );
          }
        }
      }
    }
  }
});

TaskManager.defineTask(DATA_FETCH_TASK_NAME, async () => {
  try {
    await WidgetService.updateWidgetData();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const WidgetService = {
  registerLocationTask: async (): Promise<void> => {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (!isRegistered) {
        await LocationService.requestPermissions();
        await BackgroundFetch.registerTaskAsync(LOCATION_TASK_NAME, {
          minimumInterval: 60,
          stopOnTerminate: false,
          startOnBoot: true,
        });
      }
    } catch (error) {
      console.error('Failed to register location task:', error);
    }
  },

  registerDataFetchTask: async (): Promise<void> => {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(DATA_FETCH_TASK_NAME);
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(DATA_FETCH_TASK_NAME, {
          minimumInterval: 15 * 60,
          stopOnTerminate: false,
          startOnBoot: true,
        });
      }
    } catch (error) {
      console.error('Failed to register data fetch task:', error);
    }
  },

  unregisterAllTasks: async (): Promise<void> => {
    try {
      await TaskManager.unregisterAllTasksAsync();
    } catch (error) {
      console.error('Failed to unregister tasks:', error);
    }
  },

  getTodayTasks: (): any[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = taskRepository.getByDueDate(
      today.getTime(),
      tomorrow.getTime()
    );

    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      completed: task.completed,
      dueDate: task.dueDate,
      priority: task.priority,
    }));
  },

  updateWidgetData: async (): Promise<void> => {
    try {
      const todayTasks = WidgetService.getTodayTasks();
      const allTasks = taskRepository.getAll();
      const completedToday = todayTasks.filter((t: any) => t.completed).length;

      const widgetData = {
        todayTasks: todayTasks.slice(0, 5),
        totalCount: todayTasks.length,
        completedCount: completedToday,
        pendingCount: todayTasks.length - completedToday,
        lastUpdated: Date.now(),
      };

      if (FileSystem.documentDirectory) {
        const filePath = FileSystem.documentDirectory + WIDGET_DATA_FILE;
        await FileSystem.writeAsStringAsync(filePath, JSON.stringify(widgetData));
      }

      console.log('Widget data updated successfully');
    } catch (error) {
      console.error('Failed to update widget data:', error);
    }
  },

  readWidgetData: async (): Promise<any | null> => {
    try {
      let filePath: string | null = null;

      if (FileSystem.documentDirectory) {
        filePath = FileSystem.documentDirectory + WIDGET_DATA_FILE;
      }

      if (!filePath) return null;

      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) return null;

      const content = await FileSystem.readAsStringAsync(filePath);
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to read widget data:', error);
      return null;
    }
  },
};
