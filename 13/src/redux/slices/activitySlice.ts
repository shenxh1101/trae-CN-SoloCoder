import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import firestore from '@react-native-firebase/firestore';
import {DailyActivity} from '@types/index';

interface ActivityState {
  todayActivity: DailyActivity | null;
  weeklyActivities: DailyActivity[];
  isTracking: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: ActivityState = {
  todayActivity: null,
  weeklyActivities: [],
  isTracking: false,
  isLoading: false,
  error: null,
};

export const fetchTodayActivity = createAsyncThunk(
  'activity/fetchTodayActivity',
  async (userId: string) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const snapshot = await firestore()
      .collection('daily_activities')
      .where('userId', '==', userId)
      .where('date', '>=', startOfDay)
      .where('date', '<=', endOfDay)
      .limit(1)
      .get();

    if (snapshot.docs.length > 0) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
      } as DailyActivity;
    }

    const newActivity: Omit<DailyActivity, 'id'> = {
      userId,
      date: new Date(),
      steps: 0,
      walkingSteps: 0,
      runningSteps: 0,
      distance: 0,
      caloriesBurned: 0,
      activeMinutes: 0,
    };

    const docRef = await firestore().collection('daily_activities').add(newActivity);
    return {...newActivity, id: docRef.id};
  }
);

export const fetchWeeklyActivities = createAsyncThunk(
  'activity/fetchWeeklyActivities',
  async (userId: string) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);

    const snapshot = await firestore()
      .collection('daily_activities')
      .where('userId', '==', userId)
      .where('date', '>=', oneWeekAgo)
      .orderBy('date', 'asc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
    })) as DailyActivity[];
  }
);

export const updateActivity = createAsyncThunk(
  'activity/updateActivity',
  async (activity: DailyActivity) => {
    const {id, ...data} = activity;
    await firestore().collection('daily_activities').doc(id).update(data);
    return activity;
  }
);

export const updateSteps = createAsyncThunk(
  'activity/updateSteps',
  async ({activityId, steps, walkingSteps, runningSteps, distance, calories}: 
    {activityId: string; steps: number; walkingSteps: number; runningSteps: number; distance: number; calories: number}) => {
    await firestore().collection('daily_activities').doc(activityId).update({
      steps: firestore.FieldValue.increment(steps),
      walkingSteps: firestore.FieldValue.increment(walkingSteps),
      runningSteps: firestore.FieldValue.increment(runningSteps),
      distance: firestore.FieldValue.increment(distance),
      caloriesBurned: firestore.FieldValue.increment(calories),
    });
    return {steps, walkingSteps, runningSteps, distance, calories};
  }
);

const activitySlice = createSlice({
  name: 'activity',
  initialState,
  reducers: {
    setIsTracking: (state, action: PayloadAction<boolean>) => {
      state.isTracking = action.payload;
    },
    updateLocalSteps: (state, action: PayloadAction<{steps: number; walkingSteps: number; runningSteps: number; distance: number; calories: number}>) => {
      if (state.todayActivity) {
        state.todayActivity.steps += action.payload.steps;
        state.todayActivity.walkingSteps += action.payload.walkingSteps;
        state.todayActivity.runningSteps += action.payload.runningSteps;
        state.todayActivity.distance += action.payload.distance;
        state.todayActivity.caloriesBurned += action.payload.calories;
      }
    },
    updateActiveMinutes: (state, action: PayloadAction<number>) => {
      if (state.todayActivity) {
        state.todayActivity.activeMinutes += action.payload;
      }
    },
    clearActivityError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodayActivity.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTodayActivity.fulfilled, (state, action) => {
        state.isLoading = false;
        state.todayActivity = action.payload;
      })
      .addCase(fetchTodayActivity.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '获取今日活动数据失败';
      })
      .addCase(fetchWeeklyActivities.fulfilled, (state, action) => {
        state.weeklyActivities = action.payload;
      })
      .addCase(updateActivity.fulfilled, (state, action) => {
        if (state.todayActivity?.id === action.payload.id) {
          state.todayActivity = action.payload;
        }
      })
      .addCase(updateSteps.fulfilled, (state, action) => {
        if (state.todayActivity) {
          state.todayActivity.steps += action.payload.steps;
          state.todayActivity.walkingSteps += action.payload.walkingSteps;
          state.todayActivity.runningSteps += action.payload.runningSteps;
          state.todayActivity.distance += action.payload.distance;
          state.todayActivity.caloriesBurned += action.payload.calories;
        }
      });
  },
});

export const {setIsTracking, updateLocalSteps, updateActiveMinutes, clearActivityError} = activitySlice.actions;
export default activitySlice.reducer;
