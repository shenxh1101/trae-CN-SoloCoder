export const SCENE_CONSTANTS = {
  BOUNDS: {
    X: 40,
    Y: 30,
    Z: 30,
  },
  CAMERA: {
    INITIAL_POSITION: [0, 0, 60] as [number, number, number],
    FOV: 60,
    NEAR: 0.1,
    FAR: 1000,
  },
  CONNECTION_DISTANCE: 12,
  WOBBLE_AMPLITUDE: 2,
} as const;

export const BUBBLE_DEFAULTS = {
  COUNT: 200,
  MIN_SIZE: 0.5,
  MAX_SIZE: 2.5,
  FLOAT_SPEED: 0.3,
} as const;

export const COLOR_MODES = {
  RANDOM: 'random',
  PINK: 'pink',
  BLUE: 'blue',
} as const;

export const BACKGROUND_COLORS = {
  SKY: 'sky',
  OCEAN: 'ocean',
  BLACK: 'black',
} as const;

export type ColorMode = typeof COLOR_MODES[keyof typeof COLOR_MODES];
export type BackgroundColor = typeof BACKGROUND_COLORS[keyof typeof BACKGROUND_COLORS];

export interface BubbleData {
  id: number;
  position: [number, number, number];
  velocity: [number, number, number];
  size: number;
  color: string;
  wobbleOffset: number;
  wobbleSpeed: number;
  baseX: number;
}

export interface ParticleData {
  id: number;
  position: [number, number, number];
  velocity: [number, number, number];
  color: string;
  size: number;
  life: number;
  maxLife: number;
}
