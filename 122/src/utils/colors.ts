import { ColorMode, BackgroundColor } from './constants';

const hsvToRgb = (h: number, s: number, v: number): string => {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

  return `rgb(${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)})`;
};

const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const generateBubbleColor = (mode: ColorMode): string => {
  switch (mode) {
    case 'random':
      return hsvToRgb(
        randomRange(0, 360),
        randomRange(0.8, 1.0),
        randomRange(0.6, 0.8)
      );
    case 'pink':
      return hsvToRgb(
        randomRange(300, 350),
        randomRange(0.7, 0.9),
        randomRange(0.7, 0.9)
      );
    case 'blue':
      return hsvToRgb(
        randomRange(180, 240),
        randomRange(0.6, 0.9),
        randomRange(0.5, 0.8)
      );
    default:
      return hsvToRgb(
        randomRange(0, 360),
        randomRange(0.8, 1.0),
        randomRange(0.6, 0.8)
      );
  }
};

export const getBackgroundColor = (type: BackgroundColor): string => {
  switch (type) {
    case 'sky':
      return '#87CEEB';
    case 'ocean':
      return '#003366';
    case 'black':
      return '#0a0a0a';
    default:
      return '#87CEEB';
  }
};

export const getFogColor = (type: BackgroundColor): string => {
  switch (type) {
    case 'sky':
      return '#b0e0e6';
    case 'ocean':
      return '#001a33';
    case 'black':
      return '#000000';
    default:
      return '#b0e0e6';
  }
};
