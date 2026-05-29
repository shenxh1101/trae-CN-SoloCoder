import * as THREE from 'three';

export type ColorMode = 'rainbow' | 'warm' | 'cool';
export type BackgroundColor = 'black' | 'darkblue' | 'purple';

export interface SceneConfig {
  beamCount: number;
  beamMinHeight: number;
  beamMaxHeight: number;
  beamRadius: number;
  pulseSpeed: number;
  colorMode: ColorMode;
  backgroundColor: BackgroundColor;
  enableMirror: boolean;
  enableFog: boolean;
  enableParticles: boolean;
  autoRotate: boolean;
  gridSize: number;
  spacing: number;
}

export interface BeamData {
  id: number;
  x: number;
  z: number;
  height: number;
  color: THREE.Color;
  pulseOffset: number;
  pulseStrength: number;
}

export interface ParticleData {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  color: THREE.Color;
  opacity: number;
}

export const BACKGROUND_COLORS: Record<BackgroundColor, string> = {
  black: '#000000',
  darkblue: '#0a0a2e',
  purple: '#1a0a2e',
};

export const COLOR_MODE_LABELS: Record<ColorMode, string> = {
  rainbow: '彩虹色',
  warm: '暖色系',
  cool: '冷色系',
};

export const BACKGROUND_LABELS: Record<BackgroundColor, string> = {
  black: '黑色',
  darkblue: '深蓝色',
  purple: '紫色',
};
