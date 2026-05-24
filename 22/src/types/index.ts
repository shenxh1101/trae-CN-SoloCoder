export type RepeatInterval = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export type SortOption = 'date' | 'name' | 'category' | 'remaining';

export type WidgetSize = 'small' | 'medium' | 'large';

export type WidgetTheme = 'light' | 'dark' | 'colorful' | 'minimal';

export type CountdownStatus = 'upcoming' | 'ongoing' | 'passed';

export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface CountdownEvent {
  id: string;
  name: string;
  targetDate: number;
  backgroundColor: string;
  categoryId: string;
  repeatInterval: RepeatInterval;
  notes?: string;
  isArchived: boolean;
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
  lastOccurrence?: number;
}

export interface WidgetConfig {
  id: string;
  eventId: string;
  size: WidgetSize;
  theme: WidgetTheme;
  createdAt: number;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: number;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt?: number;
  error?: string;
}

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isPast: boolean;
}

export interface ShareCardConfig {
  showBackground: boolean;
  showDate: boolean;
  cardStyle: 'modern' | 'classic' | 'elegant';
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  defaultSort: SortOption;
  showSeconds: boolean;
  autoArchive: boolean;
  autoArchiveDays: number;
  wallpaperEventId?: string;
  notificationEnabled: boolean;
  remind24hBefore: boolean;
  remind1hBefore: boolean;
}

export type RootStackParamList = {
  Home: undefined;
  EventDetail: {eventId: string};
  CreateEvent: {eventId?: string};
  History: undefined;
  Statistics: undefined;
  Settings: undefined;
  WidgetSettings: undefined;
  CategoryManagement: undefined;
  CloudSync: undefined;
  ICSImport: undefined;
  ICSExport: undefined;
  ShareEvent: {eventId: string};
  WallpaperSettings: undefined;
  Login: undefined;
  Register: undefined;
};

export type RootTabParamList = {
  Countdowns: undefined;
  History: undefined;
  Statistics: undefined;
  Settings: undefined;
};
