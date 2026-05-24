import {useColorScheme} from 'react-native';
import {useAppSelector} from '@hooks';

export const colors = {
  light: {
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#EC4899',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    card: '#FFFFFF',
    gradientStart: '#6366F1',
    gradientEnd: '#8B5CF6',
  },
  dark: {
    primary: '#818CF8',
    secondary: '#A78BFA',
    accent: '#F472B6',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    background: '#0F172A',
    surface: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    border: '#334155',
    card: '#1E293B',
    gradientStart: '#4F46E5',
    gradientEnd: '#7C3AED',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: 'normal' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  countdown: {
    days: {
      fontSize: 72,
      fontWeight: 'bold' as const,
      lineHeight: 80,
    },
    hours: {
      fontSize: 48,
      fontWeight: 'bold' as const,
      lineHeight: 56,
    },
    minutes: {
      fontSize: 36,
      fontWeight: 'bold' as const,
      lineHeight: 44,
    },
    seconds: {
      fontSize: 28,
      fontWeight: '600' as const,
      lineHeight: 36,
    },
    label: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
    },
  },
};

export const defaultCategories = [
  {id: '1', name: '生日', color: '#EF4444', createdAt: Date.now()},
  {id: '2', name: '纪念日', color: '#EC4899', createdAt: Date.now()},
  {id: '3', name: '节日', color: '#F59E0B', createdAt: Date.now()},
  {id: '4', name: '工作', color: '#10B981', createdAt: Date.now()},
  {id: '5', name: '学习', color: '#3B82F6', createdAt: Date.now()},
  {id: '6', name: '旅行', color: '#8B5CF6', createdAt: Date.now()},
  {id: '7', name: '其他', color: '#6B7280', createdAt: Date.now()},
];

export const presetColors = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#EAB308',
  '#84CC16',
  '#22C55E',
  '#10B981',
  '#14B8A6',
  '#06B6D4',
  '#0EA5E9',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#A855F7',
  '#D946EF',
  '#EC4899',
  '#F43F5E',
  '#78716C',
];

export type ThemeColors = typeof colors.light;
export type ThemeMode = 'light' | 'dark' | 'system';

export const useTheme = () => {
  const systemColorScheme = useColorScheme();
  const {settings} = useAppSelector(state => state.events);
  const themeMode = settings.theme as ThemeMode;

  let isDark = false;
  if (themeMode === 'system') {
    isDark = systemColorScheme === 'dark';
  } else {
    isDark = themeMode === 'dark';
  }

  const theme = isDark ? colors.dark : colors.light;

  return {
    colors: theme,
    spacing,
    borderRadius,
    typography,
    isDark,
    themeMode,
  };
};
