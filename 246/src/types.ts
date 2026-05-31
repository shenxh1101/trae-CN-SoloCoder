export type CloudPreset = 'cumulus' | 'cirrus' | 'stratus';
export type FlowDirection = 'left-to-right' | 'right-to-left' | 'toward-camera' | 'away-from-camera';
export type CameraMode = 'free' | 'orbit';
export type ParticleType = 'bird' | 'butterfly' | 'none';
export type MusicType = 'guqin' | 'nature';

export interface KeywordMatch {
  word: string;
  category: 'color' | 'creature' | 'nature' | 'emotion';
  mapping: string;
  colorHex?: string;
  particleType?: ParticleType;
  flowDirection?: FlowDirection;
}

export interface LightingConfig {
  ambientColor: string;
  ambientIntensity: number;
  directionalColor: string;
  directionalIntensity: number;
  fogColor: string;
  fogNear: number;
  fogFar: number;
}

export interface ParticleConfig {
  type: ParticleType;
  count: number;
  color: string;
  speed: number;
}

export interface PoemAnalysis {
  keywords: KeywordMatch[];
  lighting: LightingConfig;
  flowDirection: FlowDirection;
  particles: ParticleConfig;
}

export interface CloudSceneConfig {
  poem: string;
  analysis: PoemAnalysis;
  cloudPreset: CloudPreset;
  cameraPosition: [number, number, number];
  cameraMode: CameraMode;
  musicEnabled: boolean;
  musicType: MusicType;
}
