import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import {MealLog, FoodItem, FoodPortion} from '@types/index';

interface NutritionState {
  mealLogs: MealLog[];
  foodDatabase: FoodItem[];
  customFoods: FoodItem[];
  isLoading: boolean;
  error: string | null;
}

const initialState: NutritionState = {
  mealLogs: [],
  foodDatabase: [],
  customFoods: [],
  isLoading: false,
  error: null,
};

export const fetchFoodDatabase = createAsyncThunk(
  'nutrition/fetchFoodDatabase',
  async () => {
    const snapshot = await firestore()
      .collection('foods')
      .where('isCustom', '==', false)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as FoodItem[];
  }
);

export const fetchCustomFoods = createAsyncThunk(
  'nutrition/fetchCustomFoods',
  async (userId: string) => {
    const snapshot = await firestore()
      .collection('foods')
      .where('userId', '==', userId)
      .where('isCustom', '==', true)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as FoodItem[];
  }
);

export const fetchMealLogs = createAsyncThunk(
  'nutrition/fetchMealLogs',
  async ({userId, date}: {userId: string; date: Date}) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const snapshot = await firestore()
      .collection('meals')
      .where('userId', '==', userId)
      .where('date', '>=', startOfDay)
      .where('date', '<=', endOfDay)
      .orderBy('date', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
    })) as MealLog[];
  }
);

export const addCustomFood = createAsyncThunk(
  'nutrition/addCustomFood',
  async (food: Omit<FoodItem, 'id'>) => {
    const docRef = await firestore().collection('foods').add(food);
    return {...food, id: docRef.id};
  }
);

export const saveMealLog = createAsyncThunk(
  'nutrition/saveMealLog',
  async (meal: Omit<MealLog, 'id'>) => {
    const docRef = await firestore().collection('meals').add(meal);
    return {...meal, id: docRef.id};
  }
);

export const updateMealLog = createAsyncThunk(
  'nutrition/updateMealLog',
  async (meal: MealLog) => {
    const {id, ...data} = meal;
    await firestore().collection('meals').doc(id).update(data);
    return meal;
  }
);

export const deleteMealLog = createAsyncThunk(
  'nutrition/deleteMealLog',
  async (mealId: string) => {
    await firestore().collection('meals').doc(mealId).delete();
    return mealId;
  }
);

export const uploadFoodImage = createAsyncThunk(
  'nutrition/uploadFoodImage',
  async ({userId, imageUri}: {userId: string; imageUri: string}) => {
    const timestamp = Date.now();
    const reference = storage().ref(`food_images/${userId}/${timestamp}.jpg`);
    await reference.putFile(imageUri);
    const url = await reference.getDownloadURL();
    return {imageUrl: url};
  }
);

export const recognizeFood = createAsyncThunk(
  'nutrition/recognizeFood',
  async ({imageUrl}: {imageUrl: string}) => {
    try {
      const functions = require('@react-native-firebase/functions').default;
      const result = await functions().httpsCallable('recognizeFood')({imageUrl});
      return {foods: result.data.foods} as {foods: FoodItem[]};
    } catch (error: any) {
      console.error('食物识别错误:', error);
      throw new Error(error.message || '食物识别失败');
    }
  }
);

const nutritionSlice = createSlice({
  name: 'nutrition',
  initialState,
  reducers: {
    clearNutritionError: (state) => {
      state.error = null;
    },
    addPortionToMeal: (state, action: PayloadAction<{mealIndex: number; portion: FoodPortion}>) => {
      const {mealIndex, portion} = action.payload;
      if (state.mealLogs[mealIndex]) {
        const meal = state.mealLogs[mealIndex];
        meal.foods.push(portion);
        meal.totalCalories += portion.calories;
        meal.totalProtein += portion.protein;
        meal.totalCarbs += portion.carbs;
        meal.totalFat += portion.fat;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFoodDatabase.fulfilled, (state, action) => {
        state.foodDatabase = action.payload;
      })
      .addCase(fetchCustomFoods.fulfilled, (state, action) => {
        state.customFoods = action.payload;
      })
      .addCase(fetchMealLogs.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMealLogs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.mealLogs = action.payload;
      })
      .addCase(fetchMealLogs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '获取饮食记录失败';
      })
      .addCase(addCustomFood.fulfilled, (state, action) => {
        state.customFoods.push(action.payload);
      })
      .addCase(saveMealLog.fulfilled, (state, action) => {
        state.mealLogs.unshift(action.payload);
      })
      .addCase(updateMealLog.fulfilled, (state, action) => {
        const index = state.mealLogs.findIndex(m => m.id === action.payload.id);
        if (index !== -1) {
          state.mealLogs[index] = action.payload;
        }
      })
      .addCase(deleteMealLog.fulfilled, (state, action) => {
        state.mealLogs = state.mealLogs.filter(m => m.id !== action.payload);
      });
  },
});

export const {clearNutritionError, addPortionToMeal} = nutritionSlice.actions;
export default nutritionSlice.reducer;
