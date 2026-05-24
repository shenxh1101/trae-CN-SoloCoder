import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import firestore from '@react-native-firebase/firestore';
import {Workout, Exercise} from '@types/index';

interface WorkoutState {
  workouts: Workout[];
  currentWorkout: Workout | null;
  currentExerciseIndex: number;
  isWorkoutActive: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: WorkoutState = {
  workouts: [],
  currentWorkout: null,
  currentExerciseIndex: 0,
  isWorkoutActive: false,
  isLoading: false,
  error: null,
};

export const fetchWorkouts = createAsyncThunk(
  'workout/fetchWorkouts',
  async (userId: string) => {
    const snapshot = await firestore()
      .collection('workouts')
      .where('userId', '==', userId)
      .orderBy('date', 'desc')
      .limit(50)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
    })) as Workout[];
  }
);

export const saveWorkout = createAsyncThunk(
  'workout/saveWorkout',
  async (workout: Omit<Workout, 'id'>) => {
    const docRef = await firestore().collection('workouts').add(workout);
    return {...workout, id: docRef.id};
  }
);

export const updateWorkout = createAsyncThunk(
  'workout/updateWorkout',
  async (workout: Workout) => {
    const {id, ...data} = workout;
    await firestore().collection('workouts').doc(id).update(data);
    return workout;
  }
);

export const deleteWorkout = createAsyncThunk(
  'workout/deleteWorkout',
  async (workoutId: string) => {
    await firestore().collection('workouts').doc(workoutId).delete();
    return workoutId;
  }
);

const workoutSlice = createSlice({
  name: 'workout',
  initialState,
  reducers: {
    startWorkout: (state, action: PayloadAction<Workout>) => {
      state.currentWorkout = action.payload;
      state.currentExerciseIndex = 0;
      state.isWorkoutActive = true;
    },
    nextExercise: (state) => {
      if (state.currentWorkout && state.currentExerciseIndex < state.currentWorkout.exercises.length - 1) {
        state.currentExerciseIndex++;
      }
    },
    previousExercise: (state) => {
      if (state.currentExerciseIndex > 0) {
        state.currentExerciseIndex--;
      }
    },
    endWorkout: (state) => {
      state.currentWorkout = null;
      state.currentExerciseIndex = 0;
      state.isWorkoutActive = false;
    },
    addExerciseToCurrent: (state, action: PayloadAction<Exercise>) => {
      if (state.currentWorkout) {
        state.currentWorkout.exercises.push(action.payload);
        state.currentWorkout.totalCalories += action.payload.caloriesBurned;
        if (action.payload.duration) {
          state.currentWorkout.totalDuration += action.payload.duration;
        }
      }
    },
    updateCurrentExercise: (state, action: PayloadAction<{index: number; exercise: Exercise}>) => {
      if (state.currentWorkout) {
        const oldExercise = state.currentWorkout.exercises[action.payload.index];
        state.currentWorkout.exercises[action.payload.index] = action.payload.exercise;
        state.currentWorkout.totalCalories += 
          action.payload.exercise.caloriesBurned - oldExercise.caloriesBurned;
        if (action.payload.exercise.duration && oldExercise.duration) {
          state.currentWorkout.totalDuration += 
            action.payload.exercise.duration - oldExercise.duration;
        }
      }
    },
    clearWorkoutError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkouts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkouts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.workouts = action.payload;
      })
      .addCase(fetchWorkouts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '获取运动记录失败';
      })
      .addCase(saveWorkout.fulfilled, (state, action) => {
        state.workouts.unshift(action.payload);
      })
      .addCase(updateWorkout.fulfilled, (state, action) => {
        const index = state.workouts.findIndex(w => w.id === action.payload.id);
        if (index !== -1) {
          state.workouts[index] = action.payload;
        }
      })
      .addCase(deleteWorkout.fulfilled, (state, action) => {
        state.workouts = state.workouts.filter(w => w.id !== action.payload);
      });
  },
});

export const {
  startWorkout,
  nextExercise,
  previousExercise,
  endWorkout,
  addExerciseToCurrent,
  updateCurrentExercise,
  clearWorkoutError,
} = workoutSlice.actions;

export default workoutSlice.reducer;
