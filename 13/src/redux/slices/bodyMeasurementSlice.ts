import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import firestore from '@react-native-firebase/firestore';
import {BodyMeasurement} from '@types/index';

interface BodyMeasurementState {
  measurements: BodyMeasurement[];
  latestMeasurement: BodyMeasurement | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: BodyMeasurementState = {
  measurements: [],
  latestMeasurement: null,
  isLoading: false,
  error: null,
};

export const fetchMeasurements = createAsyncThunk(
  'bodyMeasurement/fetchMeasurements',
  async (userId: string) => {
    const snapshot = await firestore()
      .collection('body_measurements')
      .where('userId', '==', userId)
      .orderBy('date', 'desc')
      .limit(30)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
    })) as BodyMeasurement[];
  }
);

export const addMeasurement = createAsyncThunk(
  'bodyMeasurement/addMeasurement',
  async (measurement: Omit<BodyMeasurement, 'id'>) => {
    const docRef = await firestore().collection('body_measurements').add(measurement);
    return {...measurement, id: docRef.id};
  }
);

export const updateMeasurement = createAsyncThunk(
  'bodyMeasurement/updateMeasurement',
  async (measurement: BodyMeasurement) => {
    const {id, ...data} = measurement;
    await firestore().collection('body_measurements').doc(id).update(data);
    return measurement;
  }
);

export const deleteMeasurement = createAsyncThunk(
  'bodyMeasurement/deleteMeasurement',
  async (measurementId: string) => {
    await firestore().collection('body_measurements').doc(measurementId).delete();
    return measurementId;
  }
);

const calculateBMI = (weight?: number, height?: number): number | undefined => {
  if (weight && height) {
    const heightInMeters = height / 100;
    return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
  }
  return undefined;
};

const bodyMeasurementSlice = createSlice({
  name: 'bodyMeasurement',
  initialState,
  reducers: {
    clearBodyMeasurementError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMeasurements.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMeasurements.fulfilled, (state, action) => {
        state.isLoading = false;
        state.measurements = action.payload;
        state.latestMeasurement = action.payload[0] || null;
      })
      .addCase(fetchMeasurements.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '获取身体数据失败';
      })
      .addCase(addMeasurement.fulfilled, (state, action) => {
        const measurementWithBMI = {
          ...action.payload,
          bmi: calculateBMI(action.payload.weight, state.measurements[0]?.weight ? undefined : undefined),
        };
        state.measurements.unshift(measurementWithBMI);
        state.latestMeasurement = measurementWithBMI;
      })
      .addCase(updateMeasurement.fulfilled, (state, action) => {
        const index = state.measurements.findIndex(m => m.id === action.payload.id);
        if (index !== -1) {
          const measurementWithBMI = {
            ...action.payload,
            bmi: calculateBMI(action.payload.weight, undefined),
          };
          state.measurements[index] = measurementWithBMI;
          if (index === 0) {
            state.latestMeasurement = measurementWithBMI;
          }
        }
      })
      .addCase(deleteMeasurement.fulfilled, (state, action) => {
        state.measurements = state.measurements.filter(m => m.id !== action.payload);
        if (state.latestMeasurement?.id === action.payload) {
          state.latestMeasurement = state.measurements[0] || null;
        }
      });
  },
});

export const {clearBodyMeasurementError} = bodyMeasurementSlice.actions;
export default bodyMeasurementSlice.reducer;
