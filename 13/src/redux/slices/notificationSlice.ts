import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {Platform} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';

interface NotificationState {
  fcmToken: string | null;
  notificationPermission: boolean;
  waterLogs: {id: string; date: Date; amount: number; goal: number}[];
  todayWaterAmount: number;
  waterGoal: number;
  sedentaryLastActive: Date | null;
}

const initialState: NotificationState = {
  fcmToken: null,
  notificationPermission: false,
  waterLogs: [],
  todayWaterAmount: 0,
  waterGoal: 2000,
  sedentaryLastActive: null,
};

export const requestNotificationPermission = createAsyncThunk(
  'notification/requestNotificationPermission',
  async () => {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    
    if (enabled) {
      const token = await messaging().getToken();
      return {enabled, token};
    }
    return {enabled: false, token: null};
  }
);

export const scheduleNotifications = createAsyncThunk(
  'notification/scheduleNotifications',
  async (settings: {
    waterReminder: boolean;
    waterReminderInterval: number;
    workoutReminder: boolean;
    workoutReminderTime: string;
    sedentaryReminder: boolean;
    sedentaryReminderInterval: number;
  }) => {
    PushNotification.cancelAllLocalNotifications();

    if (settings.waterReminder) {
      PushNotification.configure({
        onNotification: function (notification) {
          notification.finish(1);
        },
        requestPermissions: Platform.OS === 'ios',
      });

      const now = new Date();
      for (let i = 0; i < 10; i++) {
        const nextTime = new Date(now.getTime() + i * settings.waterReminderInterval * 60000);
        PushNotification.localNotificationSchedule({
          id: `water_${i}`,
          title: '喝水提醒',
          message: '该喝水了！保持身体水分充足',
          date: nextTime,
          repeatType: 'time',
          repeatTime: settings.waterReminderInterval * 60000,
        });
      }
    }

    if (settings.workoutReminder) {
      const [hours, minutes] = settings.workoutReminderTime.split(':').map(Number);
      const workoutTime = new Date();
      workoutTime.setHours(hours, minutes, 0, 0);
      if (workoutTime < new Date()) {
        workoutTime.setDate(workoutTime.getDate() + 1);
      }

      PushNotification.localNotificationSchedule({
        id: 'workout',
        title: '训练提醒',
        message: '今日训练时间到了！准备开始锻炼',
        date: workoutTime,
        repeatType: 'day',
      });
    }

    if (settings.sedentaryReminder) {
      PushNotification.configure({
        onNotification: function (notification) {
          notification.finish(1);
        },
        requestPermissions: Platform.OS === 'ios',
      });
      for (let i = 0; i < 24; i++) {
        const nextTime = new Date();
        nextTime.setHours(9 + i, 0, 0, 0);
        if (nextTime > new Date() && nextTime.getHours() < 22) {
          PushNotification.localNotificationSchedule({
            id: `sedentary_${i}`,
            title: '久坐提醒',
            message: '已经坐了很久了，起来活动一下吧！',
            date: nextTime,
          });
        }
      }
    }

    return true;
  }
);

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setFcmToken: (state, action: PayloadAction<string | null>) => {
      state.fcmToken = action.payload;
    },
    setNotificationPermission: (state, action: PayloadAction<boolean>) => {
      state.notificationPermission = action.payload;
    },
    addWaterLog: (state, action: PayloadAction<{id: string; date: Date; amount: number; goal: number}>) => {
      state.waterLogs.unshift(action.payload);
      state.todayWaterAmount += action.payload.amount;
    },
    setWaterGoal: (state, action: PayloadAction<number>) => {
      state.waterGoal = action.payload;
    },
    updateSedentaryLastActive: (state, action: PayloadAction<Date>) => {
      state.sedentaryLastActive = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(requestNotificationPermission.fulfilled, (state, action) => {
        state.notificationPermission = action.payload.enabled;
        state.fcmToken = action.payload.token;
      });
  },
});

export const {
  setFcmToken,
  setNotificationPermission,
  addWaterLog,
  setWaterGoal,
  updateSedentaryLastActive,
} = notificationSlice.actions;

export default notificationSlice.reducer;
