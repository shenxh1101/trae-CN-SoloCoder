import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {WidgetConfig} from '@types';

interface WidgetState {
  widgets: WidgetConfig[];
}

const initialState: WidgetState = {
  widgets: [],
};

const widgetSlice = createSlice({
  name: 'widgets',
  initialState,
  reducers: {
    addWidget: (state, action: PayloadAction<Omit<WidgetConfig, 'id' | 'createdAt'>>) => {
      state.widgets.push({
        ...action.payload,
        id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
      });
    },
    updateWidget: (state, action: PayloadAction<{id: string; updates: Partial<WidgetConfig>}>) => {
      const index = state.widgets.findIndex(w => w.id === action.payload.id);
      if (index !== -1) {
        state.widgets[index] = {...state.widgets[index], ...action.payload.updates};
      }
    },
    deleteWidget: (state, action: PayloadAction<string>) => {
      state.widgets = state.widgets.filter(w => w.id !== action.payload);
    },
    setWidgets: (state, action: PayloadAction<WidgetConfig[]>) => {
      state.widgets = action.payload;
    },
  },
});

export const {addWidget, updateWidget, deleteWidget, setWidgets} = widgetSlice.actions;

export default widgetSlice.reducer;
