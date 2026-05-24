import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import {User, PrivacySettings, NotificationSettings} from '@types/index';

interface UserState {
  profile: User | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  isLoading: false,
  error: null,
};

const defaultPrivacySettings: PrivacySettings = {
  profileVisibility: 'public',
  workoutVisibility: 'friends',
  bodyDataVisibility: 'private',
  leaderboardVisible: true,
  postDefaultVisibility: 'friends',
  allowFriendRequests: true,
  locationSharing: false,
};

const defaultNotificationSettings: NotificationSettings = {
  waterReminder: true,
  workoutReminder: true,
  sedentaryReminder: true,
  socialNotifications: true,
  challengeNotifications: true,
  waterReminderInterval: 120,
  workoutReminderTime: '18:00',
  sedentaryReminderInterval: 60,
};

export const createUserProfile = createAsyncThunk(
  'user/createUserProfile',
  async (userData: Partial<User>) => {
    const userId = userData.id;
    const userRef = firestore().collection('users').doc(userId);
    
    const newUser: User = {
      id: userId,
      phoneNumber: userData.phoneNumber,
      email: userData.email,
      displayName: userData.displayName || '健身爱好者',
      photoURL: userData.photoURL,
      fitnessGoal: userData.fitnessGoal || 'maintain',
      height: userData.height,
      weight: userData.weight,
      age: userData.age,
      gender: userData.gender,
      activityLevel: userData.activityLevel || 'moderate',
      isPremium: false,
      createdAt: new Date(),
      privacySettings: {...defaultPrivacySettings, ...userData.privacySettings} as PrivacySettings,
      notificationSettings: {...defaultNotificationSettings, ...userData.notificationSettings},
    };

    await userRef.set(newUser);
    return newUser;
  }
);

export const updateUserProfile = createAsyncThunk(
  'user/updateUserProfile',
  async (updates: Partial<User> & {id: string}) => {
    const {id, ...data} = updates;
    await firestore().collection('users').doc(id).update(data);
    return data;
  }
);

export const updateUserPhoto = createAsyncThunk(
  'user/updateUserPhoto',
  async ({userId, photoUri}: {userId: string; photoUri: string}) => {
    const reference = storage().ref(`profile_photos/${userId}.jpg`);
    await reference.putFile(photoUri);
    const photoURL = await reference.getDownloadURL();
    await firestore().collection('users').doc(userId).update({photoURL});
    return photoURL;
  }
);

export const updatePrivacySettings = createAsyncThunk(
  'user/updatePrivacySettings',
  async ({userId, settings}: {userId: string; settings: Partial<PrivacySettings>}) => {
    await firestore().collection('users').doc(userId).update({
      privacySettings: settings,
    });
    return settings;
  }
);

export const updateNotificationSettings = createAsyncThunk(
  'user/updateNotificationSettings',
  async ({userId, settings}: {userId: string; settings: Partial<NotificationSettings>}) => {
    await firestore().collection('users').doc(userId).update({
      notificationSettings: settings,
    });
    return settings;
  }
);

export const fetchUserProfile = createAsyncThunk(
  'user/fetchUserProfile',
  async (userId: string) => {
    const doc = await firestore().collection('users').doc(userId).get();
    if (doc.exists) {
      return doc.data() as User;
    }
    throw new Error('用户不存在');
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserProfile: (state, action: PayloadAction<User | null>) => {
      state.profile = action.payload;
    },
    clearUserError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(createUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '创建用户资料失败';
      })
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.profile) {
          state.profile = {...state.profile, ...action.payload};
        }
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '更新用户资料失败';
      })
      .addCase(updateUserPhoto.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserPhoto.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.profile) {
          state.profile.photoURL = action.payload;
        }
      })
      .addCase(updateUserPhoto.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '更新头像失败';
      })
      .addCase(updatePrivacySettings.fulfilled, (state, action) => {
        if (state.profile) {
          state.profile.privacySettings = {...state.profile.privacySettings, ...action.payload};
        }
      })
      .addCase(updateNotificationSettings.fulfilled, (state, action) => {
        if (state.profile) {
          state.profile.notificationSettings = {...state.profile.notificationSettings, ...action.payload};
        }
      })
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '获取用户资料失败';
      });
  },
});

export const {setUserProfile, clearUserError} = userSlice.actions;
export default userSlice.reducer;
