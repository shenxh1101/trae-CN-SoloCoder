import { ColorTheme, ThemeColors } from '@/types/nebula';

export const colorThemes: Record<ColorTheme, ThemeColors> = {
  'purple-blue': {
    core: '#ffffff',
    mid: '#818cf8',
    outer: '#6d28d9',
    name: '蓝紫色',
  },
  'red-purple': {
    core: '#ffffff',
    mid: '#f472b6',
    outer: '#be185d',
    name: '红紫色',
  },
  'cyan-green': {
    core: '#ffffff',
    mid: '#5eead4',
    outer: '#0d9488',
    name: '蓝绿色',
  },
  'gold-orange': {
    core: '#ffffff',
    mid: '#fbbf24',
    outer: '#ea580c',
    name: '金橙色',
  },
};

export const themeList: ColorTheme[] = ['purple-blue', 'red-purple', 'cyan-green', 'gold-orange'];

export const getRandomTheme = (): ColorTheme => {
  const index = Math.floor(Math.random() * themeList.length);
  return themeList[index];
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 1, g: 1, b: 1 };
};

export const lerpColor = (
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } => {
  return {
    r: color1.r + (color2.r - color1.r) * t,
    g: color1.g + (color2.g - color1.g) * t,
    b: color1.b + (color2.b - color1.b) * t,
  };
};

export const getParticleColor = (
  t: number,
  coreRgb: { r: number; g: number; b: number },
  midRgb: { r: number; g: number; b: number },
  outerRgb: { r: number; g: number; b: number }
): { r: number; g: number; b: number } => {
  const colorT = Math.pow(t, 2.0);
  if (colorT < 0.5) {
    const localT = colorT / 0.5;
    return lerpColor(coreRgb, midRgb, localT);
  } else {
    const localT = (colorT - 0.5) / 0.5;
    return lerpColor(midRgb, outerRgb, localT);
  }
};
