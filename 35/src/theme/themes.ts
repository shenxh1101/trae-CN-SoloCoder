import { DefaultTheme, DarkTheme } from '@react-navigation/native';
import { MD3LightTheme, MD3DarkTheme, adaptNavigationTheme } from 'react-native-paper';

const { LightTheme: PaperLightTheme, DarkTheme: PaperDarkTheme } = adaptNavigationTheme({
  reactNavigationLight: DefaultTheme,
  reactNavigationDark: DarkTheme,
});

export const lightTheme = {
  ...MD3LightTheme,
  ...PaperLightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...PaperLightTheme.colors,
    primary: '#6200ee',
    secondary: '#03dac6',
    background: '#ffffff',
    surface: '#ffffff',
    text: '#1a1a1a',
    error: '#B00020',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FB8C00',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  ...PaperDarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...PaperDarkTheme.colors,
    primary: '#bb86fc',
    secondary: '#03dac6',
    background: '#121212',
    surface: '#1e1e1e',
    text: '#ffffff',
    error: '#CF6679',
    info: '#64B5F6',
    success: '#81C784',
    warning: '#FFB74D',
  },
};

export const ListColors = [
  '#6200ee', '#03dac6', '#ff6b6b', '#ffd93d',
  '#6bcb77', '#4d96ff', '#ff8f00', '#e91e63',
  '#9c27b0', '#00bcd4', '#795548', '#607d8b',
];

export type AppTheme = typeof lightTheme & {
  colors: {
    text: string;
  };
};
