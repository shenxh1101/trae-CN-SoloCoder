import {configureStore, combineReducers} from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import eventsReducer from './eventsSlice';
import userReducer from './userSlice';
import widgetReducer from './widgetSlice';
import type {widgetSyncMiddleware as WidgetSyncMiddleware} from './widgetSyncMiddleware';
import type {notificationSyncMiddleware as NotificationSyncMiddleware} from './notificationSyncMiddleware';

const rootReducer = combineReducers({
  events: eventsReducer,
  user: userReducer,
  widgets: widgetReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['events', 'widgets'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const makeStore = () => {
  const widgetSyncMiddleware = require('./widgetSyncMiddleware').widgetSyncMiddleware as typeof WidgetSyncMiddleware;
  const notificationSyncMiddleware = require('./notificationSyncMiddleware').notificationSyncMiddleware as typeof NotificationSyncMiddleware;

  return configureStore({
    reducer: persistedReducer,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      })
        .prepend(widgetSyncMiddleware)
        .prepend(notificationSyncMiddleware),
  });
};

export const store = makeStore();
export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;
