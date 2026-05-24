import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import firestore from '@react-native-firebase/firestore';
import {Challenge, ChallengeParticipation, Badge} from '@types/index';

interface ChallengeState {
  availableChallenges: Challenge[];
  activeChallenges: ChallengeParticipation[];
  badges: Badge[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ChallengeState = {
  availableChallenges: [],
  activeChallenges: [],
  badges: [],
  isLoading: false,
  error: null,
};

export const fetchAvailableChallenges = createAsyncThunk(
  'challenge/fetchAvailableChallenges',
  async (isPremium: boolean) => {
    let query = firestore()
      .collection('challenges')
      .where('startDate', '<=', new Date())
      .where('endDate', '>=', new Date());
    
    if (!isPremium) {
      query = query.where('isPremium', '==', false);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate() || new Date(),
      endDate: doc.data().endDate?.toDate() || new Date(),
    })) as Challenge[];
  }
);

export const fetchActiveChallenges = createAsyncThunk(
  'challenge/fetchActiveChallenges',
  async (userId: string) => {
    const snapshot = await firestore()
      .collection('challenge_participations')
      .where('userId', '==', userId)
      .where('completed', '==', false)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate() || new Date(),
      completedDate: doc.data().completedDate?.toDate(),
    })) as ChallengeParticipation[];
  }
);

export const fetchBadges = createAsyncThunk(
  'challenge/fetchBadges',
  async (userId: string) => {
    const snapshot = await firestore()
      .collection('user_badges')
      .where('userId', '==', userId)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      unlockedAt: doc.data().unlockedAt?.toDate(),
    })) as Badge[];
  }
);

export const joinChallenge = createAsyncThunk(
  'challenge/joinChallenge',
  async ({challengeId, userId}: {challengeId: string; userId: string}) => {
    const participation: Omit<ChallengeParticipation, 'id'> = {
      challengeId,
      userId,
      currentProgress: 0,
      startDate: new Date(),
      completed: false,
    };

    const batch = firestore().batch();
    
    const participationRef = firestore().collection('challenge_participations').doc();
    batch.set(participationRef, participation);

    const challengeRef = firestore().collection('challenges').doc(challengeId);
    batch.update(challengeRef, {
      participants: firestore.FieldValue.arrayUnion(userId),
    });

    await batch.commit();
    return {...participation, id: participationRef.id};
  }
);

export const updateChallengeProgress = createAsyncThunk(
  'challenge/updateChallengeProgress',
  async ({participationId, progress}: {participationId: string; progress: number}) => {
    await firestore().collection('challenge_participations').doc(participationId).update({
      currentProgress: progress,
    });
    return {participationId, progress};
  }
);

export const checkChallengeCompletion = createAsyncThunk(
  'challenge/checkChallengeCompletion',
  async ({participationId, challenge}: {participationId: string; challenge: Challenge}) => {
    const doc = await firestore().collection('challenge_participations').doc(participationId).get();
    const data = doc.data() as ChallengeParticipation;
    
    if (data.currentProgress >= challenge.target) {
      const batch = firestore().batch();
      
      batch.update(doc.ref, {
        completed: true,
        completedDate: new Date(),
      });

      if (challenge.badgeId) {
        const badgeRef = firestore().collection('user_badges').doc();
        const badgeDoc = await firestore().collection('badges').doc(challenge.badgeId).get();
        const badgeData = badgeDoc.data();
        batch.set(badgeRef, {
          ...badgeData,
          id: challenge.badgeId,
          userId: data.userId,
          unlockedAt: new Date(),
        });
      }

      await batch.commit();
      return {participationId, completed: true, badgeId: challenge.badgeId};
    }
    
    return {participationId, completed: false, badgeId: null};
  }
);

const challengeSlice = createSlice({
  name: 'challenge',
  initialState,
  reducers: {
    clearChallengeError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAvailableChallenges.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAvailableChallenges.fulfilled, (state, action) => {
        state.isLoading = false;
        state.availableChallenges = action.payload;
      })
      .addCase(fetchAvailableChallenges.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '获取挑战列表失败';
      })
      .addCase(fetchActiveChallenges.fulfilled, (state, action) => {
        state.activeChallenges = action.payload;
      })
      .addCase(fetchBadges.fulfilled, (state, action) => {
        state.badges = action.payload;
      })
      .addCase(joinChallenge.fulfilled, (state, action) => {
        state.activeChallenges.push(action.payload);
      })
      .addCase(updateChallengeProgress.fulfilled, (state, action) => {
        const participation = state.activeChallenges.find(c => c.id === action.payload.participationId);
        if (participation) {
          participation.currentProgress = action.payload.progress;
        }
      })
      .addCase(checkChallengeCompletion.fulfilled, (state, action) => {
        if (action.payload.completed) {
          const participation = state.activeChallenges.find(c => c.id === action.payload.participationId);
          if (participation) {
            participation.completed = true;
            participation.completedDate = new Date();
          }
        }
      });
  },
});

export const {clearChallengeError} = challengeSlice.actions;
export default challengeSlice.reducer;
