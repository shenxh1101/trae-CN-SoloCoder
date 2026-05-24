import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import auth from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {Platform} from 'react-native';

interface AuthState {
  user: any | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  verificationId: string | null;
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  verificationId: null,
};

export const sendPhoneVerification = createAsyncThunk(
  'auth/sendPhoneVerification',
  async (phoneNumber: string) => {
    try {
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
      return confirmation.verificationId;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
);

export const verifyPhoneCode = createAsyncThunk(
  'auth/verifyPhoneCode',
  async ({verificationId, code}: {verificationId: string; code: string}) => {
    try {
      const credential = auth.PhoneAuthProvider.credential(verificationId, code);
      const userCredential = await auth().signInWithCredential(credential);
      return userCredential.user;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
);

export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async () => {
    try {
      await GoogleSignin.configure({
      webClientId: 'YOUR_WEB_CLIENT_ID',
    });
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const googleCredential = auth.GoogleAuthProvider.credential(userInfo.idToken);
    const userCredential = await auth().signInWithCredential(googleCredential);
    return userCredential.user;
    } catch (error: any) {
    throw new Error(error.message);
    }
  }
);

export const signInWithApple = createAsyncThunk(
  'auth/signInWithApple',
  async () => {
    try {
      const appleCredential = await auth().signInWithProvider(
        auth.AppleAuthProvider.credential({
          rawNonce: '',
          idToken: '',
        })
      );
      return appleCredential.user;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  await auth().signOut();
  if (Platform.OS === 'android') {
    await GoogleSignin.signOut();
  }
  return null;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendPhoneVerification.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendPhoneVerification.fulfilled, (state, action) => {
        state.isLoading = false;
        state.verificationId = action.payload;
      })
      .addCase(sendPhoneVerification.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '发送验证码失败';
      })
      .addCase(verifyPhoneCode.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyPhoneCode.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.verificationId = null;
      })
      .addCase(verifyPhoneCode.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '验证码验证失败';
      })
      .addCase(signInWithGoogle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInWithGoogle.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(signInWithGoogle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Google登录失败';
      })
      .addCase(signInWithApple.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInWithApple.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(signInWithApple.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Apple登录失败';
      })
      .addCase(signOut.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.verificationId = null;
      });
  },
});

export const {clearError, setUser} = authSlice.actions;
export default authSlice.reducer;
