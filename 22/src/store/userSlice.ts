import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {User, SyncStatus} from '@types';

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  syncStatus: SyncStatus;
}

const initialState: UserState = {
  user: null,
  isAuthenticated: false,
  syncStatus: {
    isSyncing: false,
  },
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = {...state.user, ...action.payload};
      }
    },
    logout: state => {
      state.user = null;
      state.isAuthenticated = false;
    },
    setSyncing: (state, action: PayloadAction<boolean>) => {
      state.syncStatus.isSyncing = action.payload;
      if (action.payload) {
        state.syncStatus.error = undefined;
      }
    },
    setSyncError: (state, action: PayloadAction<string>) => {
      state.syncStatus.error = action.payload;
      state.syncStatus.isSyncing = false;
    },
    setLastSynced: (state, action: PayloadAction<number>) => {
      state.syncStatus.lastSyncedAt = action.payload;
      state.syncStatus.isSyncing = false;
    },
  },
});

export const {
  setUser,
  updateUser,
  logout,
  setSyncing,
  setSyncError,
  setLastSynced,
} = userSlice.actions;

export default userSlice.reducer;
