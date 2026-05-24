import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import firestore from '@react-native-firebase/firestore';
import {Friend, SocialPost, LeaderboardEntry} from '@types/index';

interface SocialState {
  friends: Friend[];
  posts: SocialPost[];
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
}

const initialState: SocialState = {
  friends: [],
  posts: [],
  leaderboard: [],
  isLoading: false,
  error: null,
};

export const fetchFriends = createAsyncThunk(
  'social/fetchFriends',
  async (userId: string) => {
    const snapshot = await firestore()
      .collection('friends')
      .where('userId', '==', userId)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      addedAt: doc.data().addedAt?.toDate() || new Date(),
    })) as Friend[];
  }
);

export const sendFriendRequest = createAsyncThunk(
  'social/sendFriendRequest',
  async ({userId, friendId, friendName, friendPhotoURL}: 
    {userId: string; friendId: string; friendName: string; friendPhotoURL?: string}) => {
    const batch = firestore().batch();
    
    const userFriendRef = firestore().collection('friends').doc();
    batch.set(userFriendRef, {
      userId,
      friendId,
      friendName,
      friendPhotoURL,
      status: 'pending',
      addedAt: new Date(),
    });

    const friendFriendRef = firestore().collection('friends').doc();
    batch.set(friendFriendRef, {
      userId: friendId,
      friendId: userId,
      friendName: '',
      friendPhotoURL: '',
      status: 'pending',
      addedAt: new Date(),
    });

    await batch.commit();
    return {
      id: userFriendRef.id,
      userId,
      friendId,
      friendName,
      friendPhotoURL,
      status: 'pending',
      addedAt: new Date(),
    } as Friend;
  }
);

export const acceptFriendRequest = createAsyncThunk(
  'social/acceptFriendRequest',
  async (friendDocId: string) => {
    await firestore().collection('friends').doc(friendDocId).update({
      status: 'accepted',
    });
    return friendDocId;
  }
);

export const fetchFeed = createAsyncThunk(
  'social/fetchFeed',
  async (userId: string) => {
    const userDoc = await firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    let visibleUsers: string[] = [userId];
    
    if (userData?.friends) {
      visibleUsers = visibleUsers.concat(userData.friends);
    }
    
    const snapshot = await firestore()
      .collection('posts')
      .where('visibility', 'in', ['public', 'friends'])
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    const allPosts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      comments: doc.data().comments?.map((c: any) => ({
        ...c,
        createdAt: c.createdAt?.toDate() || new Date(),
      })) || [],
    })) as SocialPost[];
    
    return allPosts.filter(post => {
      if (post.visibility === 'public') {
        return true;
      }
      if (post.visibility === 'friends' && visibleUsers.includes(post.userId)) {
        return true;
      }
      return false;
    });
  }
);

export const createPost = createAsyncThunk(
  'social/createPost',
  async (post: Omit<SocialPost, 'id'>) => {
    const docRef = await firestore().collection('posts').add(post);
    return {...post, id: docRef.id};
  }
);

export const likePost = createAsyncThunk(
  'social/likePost',
  async ({postId, userId}: {postId: string; userId: string}) => {
    const docRef = firestore().collection('posts').doc(postId);
    const doc = await docRef.get();
    const likes = doc.data()?.likes || [];
    
    if (likes.includes(userId)) {
      await docRef.update({
        likes: firestore.FieldValue.arrayRemove(userId),
      });
      return {postId, userId, isLiked: false};
    } else {
      await docRef.update({
        likes: firestore.FieldValue.arrayUnion(userId),
      });
      return {postId, userId, isLiked: true};
    }
  }
);

export const fetchLeaderboard = createAsyncThunk(
  'social/fetchLeaderboard',
  async ({userId, type, timeRange}: {userId: string; type: 'steps' | 'calories' | 'workouts'; timeRange: 'daily' | 'weekly' | 'monthly'}) => {
    const userDoc = await firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    let visibleUsers: string[] = [userId];
    if (userData?.friends) {
      visibleUsers = visibleUsers.concat(userData.friends);
    }
    
    const snapshot = await firestore()
      .collection('leaderboards')
      .doc(timeRange === 'daily' ? new Date().toISOString().split('T')[0] : timeRange)
      .collection(type)
      .orderBy('value', 'desc')
      .limit(20)
      .get();
    
    return snapshot.docs.map((doc, index) => ({
      userId: doc.id,
      ...doc.data(),
      rank: index + 1,
      isFriend: visibleUsers.includes(doc.id),
    })) as LeaderboardEntry[];
  }
);

const socialSlice = createSlice({
  name: 'social',
  initialState,
  reducers: {
    clearSocialError: (state) => {
      state.error = null;
    },
    updatePostLikes: (state, action: PayloadAction<{postId: string; userId: string; isLiked: boolean}>) => {
      const {postId, userId, isLiked} = action.payload;
      const post = state.posts.find(p => p.id === postId);
      if (post) {
        if (isLiked) {
          if (!post.likes.includes(userId)) {
            post.likes.push(userId);
          }
        } else {
          post.likes = post.likes.filter(id => id !== userId);
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFriends.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchFriends.fulfilled, (state, action) => {
        state.isLoading = false;
        state.friends = action.payload;
      })
      .addCase(fetchFriends.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '获取好友列表失败';
      })
      .addCase(sendFriendRequest.fulfilled, (state, action) => {
        state.friends.push(action.payload);
      })
      .addCase(acceptFriendRequest.fulfilled, (state, action) => {
        const friend = state.friends.find(f => f.id === action.payload);
        if (friend) {
          friend.status = 'accepted';
        }
      })
      .addCase(fetchFeed.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        state.isLoading = false;
        state.posts = action.payload;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.posts.unshift(action.payload);
      })
      .addCase(likePost.fulfilled, (state, action) => {
        const {postId, userId, isLiked} = action.payload;
        const post = state.posts.find(p => p.id === postId);
        if (post) {
          if (isLiked) {
            if (!post.likes.includes(userId)) {
              post.likes.push(userId);
            }
          } else {
            post.likes = post.likes.filter(id => id !== userId);
          }
        }
      })
      .addCase(fetchLeaderboard.fulfilled, (state, action) => {
        state.leaderboard = action.payload;
      });
  },
});

export const {clearSocialError, updatePostLikes} = socialSlice.actions;
export default socialSlice.reducer;
