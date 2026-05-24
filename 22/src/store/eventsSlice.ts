import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {CountdownEvent, Category, AppSettings} from '@types';
import {defaultCategories} from '@theme';

interface EventsState {
  events: CountdownEvent[];
  categories: Category[];
  settings: AppSettings;
  selectedEventId?: string;
}

const initialState: EventsState = {
  events: [],
  categories: defaultCategories,
  settings: {
    theme: 'system',
    defaultSort: 'date',
    showSeconds: true,
    autoArchive: true,
    autoArchiveDays: 30,
    notificationEnabled: true,
    remind24hBefore: true,
    remind1hBefore: true,
  },
  selectedEventId: undefined,
};

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    addEvent: (state, action: PayloadAction<Omit<CountdownEvent, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const now = Date.now();
      state.events.push({
        ...action.payload,
        id: `event_${now}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      });
    },
    updateEvent: (state, action: PayloadAction<{id: string; updates: Partial<CountdownEvent>}>) => {
      const index = state.events.findIndex(e => e.id === action.payload.id);
      if (index !== -1) {
        state.events[index] = {
          ...state.events[index],
          ...action.payload.updates,
          updatedAt: Date.now(),
        };
      }
    },
    deleteEvent: (state, action: PayloadAction<string>) => {
      state.events = state.events.filter(e => e.id !== action.payload);
    },
    archiveEvent: (state, action: PayloadAction<string>) => {
      const event = state.events.find(e => e.id === action.payload);
      if (event) {
        event.isArchived = true;
        event.updatedAt = Date.now();
      }
    },
    unarchiveEvent: (state, action: PayloadAction<string>) => {
      const event = state.events.find(e => e.id === action.payload);
      if (event) {
        event.isArchived = false;
        event.updatedAt = Date.now();
      }
    },
    togglePin: (state, action: PayloadAction<string>) => {
      const event = state.events.find(e => e.id === action.payload);
      if (event) {
        event.isPinned = !event.isPinned;
        event.updatedAt = Date.now();
      }
    },
    addCategory: (state, action: PayloadAction<Omit<Category, 'id' | 'createdAt'>>) => {
      state.categories.push({
        ...action.payload,
        id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
      });
    },
    updateCategory: (state, action: PayloadAction<{id: string; updates: Partial<Category>}>) => {
      const index = state.categories.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.categories[index] = {...state.categories[index], ...action.payload.updates};
      }
    },
    deleteCategory: (state, action: PayloadAction<string>) => {
      state.categories = state.categories.filter(c => c.id !== action.payload);
    },
    updateSettings: (state, action: PayloadAction<Partial<AppSettings>>) => {
      state.settings = {...state.settings, ...action.payload};
    },
    selectEvent: (state, action: PayloadAction<string | undefined>) => {
      state.selectedEventId = action.payload;
    },
    setEvents: (state, action: PayloadAction<CountdownEvent[]>) => {
      state.events = action.payload;
    },
    setCategories: (state, action: PayloadAction<Category[]>) => {
      state.categories = action.payload;
    },
    importEvents: (state, action: PayloadAction<CountdownEvent[]>) => {
      const existingIds = new Set(state.events.map(e => e.id));
      const newEvents = action.payload.filter(e => !existingIds.has(e.id));
      state.events = [...state.events, ...newEvents];
    },
    updateRepeatingEvent: (state, action: PayloadAction<string>) => {
      const event = state.events.find(e => e.id === action.payload);
      if (event && event.repeatInterval !== 'none' && event.targetDate < Date.now()) {
        let nextDate = event.targetDate;
        const now = Date.now();

        while (nextDate < now) {
          const date = new Date(nextDate);
          switch (event.repeatInterval) {
            case 'daily':
              date.setDate(date.getDate() + 1);
              break;
            case 'weekly':
              date.setDate(date.getDate() + 7);
              break;
            case 'monthly':
              date.setMonth(date.getMonth() + 1);
              break;
            case 'yearly':
              date.setFullYear(date.getFullYear() + 1);
              break;
          }
          nextDate = date.getTime();
        }

        event.lastOccurrence = event.targetDate;
        event.targetDate = nextDate;
        event.isArchived = false;
        event.updatedAt = Date.now();
      }
    },
  },
});

export const {
  addEvent,
  updateEvent,
  deleteEvent,
  archiveEvent,
  unarchiveEvent,
  togglePin,
  addCategory,
  updateCategory,
  deleteCategory,
  updateSettings,
  selectEvent,
  setEvents,
  setCategories,
  importEvents,
  updateRepeatingEvent,
} = eventsSlice.actions;

export default eventsSlice.reducer;
