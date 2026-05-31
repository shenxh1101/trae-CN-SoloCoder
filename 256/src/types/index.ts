export type DeformationMode = 'turbulence' | 'breathing';

export type BackgroundMode = 'solid' | 'mirror';

export interface FluidParams {
  flowSpeed: number;
  smoothness: number;
  mode: DeformationMode;
  amplitude: number;
  hueSpeed: number;
}

export interface EnvSettings {
  background: BackgroundMode;
  backgroundColor: string;
  ambientLight: boolean;
  pointLight: boolean;
  autoRotate: boolean;
}

export interface StatusInfo {
  fps: number;
  vertexCount: number;
  currentMode: string;
}

export interface RecordState {
  isRecording: boolean;
  progress: number;
}
