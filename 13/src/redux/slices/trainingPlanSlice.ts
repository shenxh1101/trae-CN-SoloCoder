import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import firestore from '@react-native-firebase/firestore';
import {TrainingPlan} from '@types/index';

interface TrainingPlanState {
  presetPlans: TrainingPlan[];
  userPlans: TrainingPlan[];
  activePlan: TrainingPlan | null;
  selectedDay: string;
  isTimerRunning: boolean;
  currentRestTime: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: TrainingPlanState = {
  presetPlans: [],
  userPlans: [],
  activePlan: null,
  selectedDay: 'monday',
  isTimerRunning: false,
  currentRestTime: 0,
  isLoading: false,
  error: null,
};

export const fetchPresetPlans = createAsyncThunk(
  'trainingPlan/fetchPresetPlans',
  async () => {
    const snapshot = await firestore()
      .collection('training_plans')
      .where('isPreset', '==', true)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as TrainingPlan[];
  }
);

export const fetchUserPlans = createAsyncThunk(
  'trainingPlan/fetchUserPlans',
  async (userId: string) => {
    const snapshot = await firestore()
      .collection('training_plans')
      .where('userId', '==', userId)
      .where('isPreset', '==', false)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as TrainingPlan[];
  }
);

export const createCustomPlan = createAsyncThunk(
  'trainingPlan/createCustomPlan',
  async (plan: Omit<TrainingPlan, 'id'>) => {
    const docRef = await firestore().collection('training_plans').add(plan);
    return {...plan, id: docRef.id};
  }
);

export const updateTrainingPlan = createAsyncThunk(
  'trainingPlan/updateTrainingPlan',
  async (plan: TrainingPlan) => {
    const {id, ...data} = plan;
    await firestore().collection('training_plans').doc(id).update(data);
    return plan;
  }
);

export const deleteTrainingPlan = createAsyncThunk(
  'trainingPlan/deleteTrainingPlan',
  async (planId: string) => {
    await firestore().collection('training_plans').doc(planId).delete();
    return planId;
  }
);

export const getRecommendedPlans = createAsyncThunk(
  'trainingPlan/getRecommendedPlans',
  async ({goal, difficulty}: {goal: string; difficulty: string}) => {
    const snapshot = await firestore()
      .collection('training_plans')
      .where('isPreset', '==', true)
      .where('goal', '==', goal)
      .where('difficulty', '==', difficulty)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as TrainingPlan[];
  }
);

const trainingPlanSlice = createSlice({
  name: 'trainingPlan',
  initialState,
  reducers: {
    setActivePlan: (state, action: PayloadAction<TrainingPlan | null>) => {
      state.activePlan = action.payload;
    },
    setSelectedDay: (state, action: PayloadAction<string>) => {
      state.selectedDay = action.payload;
    },
    startTimer: (state, action: PayloadAction<number>) => {
      state.isTimerRunning = true;
      state.currentRestTime = action.payload;
    },
    updateRestTime: (state, action: PayloadAction<number>) => {
      state.currentRestTime = action.payload;
    },
    stopTimer: (state) => {
      state.isTimerRunning = false;
      state.currentRestTime = 0;
    },
    clearTrainingPlanError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPresetPlans.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPresetPlans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.presetPlans = action.payload;
      })
      .addCase(fetchPresetPlans.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '获取预设计划失败';
      })
      .addCase(fetchUserPlans.fulfilled, (state, action) => {
        state.userPlans = action.payload;
      })
      .addCase(createCustomPlan.fulfilled, (state, action) => {
        state.userPlans.push(action.payload);
      })
      .addCase(updateTrainingPlan.fulfilled, (state, action) => {
        const index = state.userPlans.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.userPlans[index] = action.payload;
        }
        if (state.activePlan?.id === action.payload.id) {
          state.activePlan = action.payload;
        }
      })
      .addCase(deleteTrainingPlan.fulfilled, (state, action) => {
        state.userPlans = state.userPlans.filter(p => p.id !== action.payload);
        if (state.activePlan?.id === action.payload) {
          state.activePlan = null;
        }
      })
      .addCase(getRecommendedPlans.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getRecommendedPlans.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(getRecommendedPlans.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '获取推荐计划失败';
      });
  },
});

export const {
  setActivePlan,
  setSelectedDay,
  startTimer,
  updateRestTime,
  stopTimer,
  clearTrainingPlanError,
} = trainingPlanSlice.actions;

export default trainingPlanSlice.reducer;
