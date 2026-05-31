export type VisualStyle = 'neon' | 'stone' | 'glass';

export type BackgroundType = 'starfield' | 'abyss';

export type CameraMode = 'firstPerson' | 'thirdPerson';

export interface StairConfig {
  seed: string;
  style: VisualStyle;
  background: BackgroundType;
  stairColor: string;
  accentColor: string;
  stepWidth: number;
  stepHeight: number;
  stepDepth: number;
  spiral: boolean;
  spiralAngle: number;
  particleEnabled: boolean;
  particleCount: number;
  autoWalk: boolean;
  autoWalkSpeed: number;
  soundEnabled: boolean;
  soundVolume: number;
}

export interface PositionState {
  x: number;
  y: number;
  z: number;
  stairIndex: number;
}

export interface StatsState {
  stairCount: number;
  totalTime: number;
  walking: boolean;
}

export interface StepData {
  index: number;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

export interface StyleMaterialConfig {
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
  transmission?: number;
  thickness?: number;
}

export const DEFAULT_CONFIG: StairConfig = {
  seed: 'endless-stairs-2024',
  style: 'neon',
  background: 'starfield',
  stairColor: '#00ffff',
  accentColor: '#ff00ff',
  stepWidth: 3,
  stepHeight: 0.3,
  stepDepth: 1.5,
  spiral: true,
  spiralAngle: 5,
  particleEnabled: true,
  particleCount: 50,
  autoWalk: false,
  autoWalkSpeed: 1,
  soundEnabled: true,
  soundVolume: 0.5,
};
