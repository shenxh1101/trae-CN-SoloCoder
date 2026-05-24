import {configureStore, combineReducers} from '@reduxjs/toolkit';
import {persistStore, persistReducer} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import workoutReducer from './slices/workoutSlice';
import nutritionReducer from './slices/nutritionSlice';
import trainingPlanReducer from './slices/trainingPlanSlice';
import activityReducer from './slices/activitySlice';
import bodyMeasurementReducer from './slices/bodyMeasurementSlice';
import socialReducer from './slices/socialSlice';
import challengeReducer from './slices/challengeSlice';
import subscriptionReducer from './slices/subscriptionSlice';
import notificationReducer from './slices/notificationSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'user', 'workout', 'nutrition', 'trainingPlan', 'activity', 'bodyMeasurement', 'social', 'challenge', 'subscription'],
  blacklist: ['notification'],
};

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  workout: workoutReducer,
  nutrition: nutritionReducer,
  trainingPlan: trainingPlanReducer,
  activity: activityReducer,
  bodyMeasurement: bodyMeasurementReducer,
  social: socialReducer,
  challenge: challengeReducer,
  subscription: subscriptionReducer,
  notification: notificationReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
