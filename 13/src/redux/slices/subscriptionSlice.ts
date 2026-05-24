import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import firestore from '@react-native-firebase/firestore';
import {Subscription} from '@types/index';

interface SubscriptionState {
  subscription: Subscription | null;
  products: any[];
  isLoading: boolean;
  error: string | null;
}

const initialState: SubscriptionState = {
  subscription: null,
  products: [],
  isLoading: false,
  error: null,
};

export const fetchSubscription = createAsyncThunk(
  'subscription/fetchSubscription',
  async (userId: string) => {
    const snapshot = await firestore()
      .collection('subscriptions')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    
    if (snapshot.docs.length > 0) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate() || new Date(),
        endDate: doc.data().endDate?.toDate(),
      } as Subscription;
    }
    return null;
  }
);

export const purchaseSubscription = createAsyncThunk(
  'subscription/purchaseSubscription',
  async ({userId, plan, transactionId}: {userId: string; plan: 'monthly' | 'quarterly' | 'yearly'; transactionId: string}) => {
    const startDate = new Date();
    const endDate = new Date();
    
    const monthsToAdd = plan === 'yearly' ? 12 : plan === 'quarterly' ? 3 : 1;
    endDate.setMonth(endDate.getMonth() + monthsToAdd);

    const subscription: Omit<Subscription, 'id'> = {
      userId,
      plan,
      startDate,
      endDate,
      isActive: true,
      transactionId,
    };

    const batch = firestore().batch();
    
    const subscriptionRef = firestore().collection('subscriptions').doc();
    batch.set(subscriptionRef, subscription);

    const userRef = firestore().collection('users').doc(userId);
    batch.update(userRef, {
      isPremium: true,
    });

    await batch.commit();
    return {...subscription, id: subscriptionRef.id};
  }
);

export const cancelSubscription = createAsyncThunk(
  'subscription/cancelSubscription',
  async (subscriptionId: string) => {
    await firestore().collection('subscriptions').doc(subscriptionId).update({
      isActive: false,
    });
    return subscriptionId;
  }
);

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    clearSubscriptionError: (state) => {
      state.error = null;
    },
    setProducts: (state, action) => {
      state.products = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscription.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchSubscription.fulfilled, (state, action) => {
        state.isLoading = false;
        state.subscription = action.payload;
      })
      .addCase(fetchSubscription.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '获取订阅信息失败';
      })
      .addCase(purchaseSubscription.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(purchaseSubscription.fulfilled, (state, action) => {
        state.isLoading = false;
        state.subscription = action.payload;
      })
      .addCase(purchaseSubscription.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '购买订阅失败';
      })
      .addCase(cancelSubscription.fulfilled, (state) => {
        if (state.subscription) {
          state.subscription.isActive = false;
        }
      });
  },
});

export const {clearSubscriptionError, setProducts} = subscriptionSlice.actions;
export default subscriptionSlice.reducer;
