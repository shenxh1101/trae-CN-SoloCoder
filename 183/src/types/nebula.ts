export type ArmCount = 2 | 3 | 4;

export type BackgroundType = 'black' | 'stars';

export type ColorTheme = 'purple-blue' | 'red-purple' | 'cyan-green' | 'gold-orange';

export interface NebulaParameters {
  particleCount: number;
  armCount: ArmCount;
  rotationSpeed: number;
  particleSpeed: number;
  bloomEnabled: boolean;
  lensFlareEnabled: boolean;
  trailEnabled: boolean;
  backgroundType: BackgroundType;
  colorTheme: ColorTheme;
  coreColor: string;
  midColor: string;
  outerColor: string;
  autoRotate: boolean;
}

export interface NebulaState extends NebulaParameters {
  fps: number;
  updateParameter: <K extends keyof NebulaParameters>(
    key: K,
    value: NebulaParameters[K]
  ) => void;
  setColorTheme: (theme: ColorTheme) => void;
  randomizeTheme: () => void;
  exportParameters: () => string;
  importParameters: (json: string) => void;
  setFps: (fps: number) => void;
}

export interface ParticleData {
  position: Float32Array;
  color: Float32Array;
  size: Float32Array;
  progress: Float32Array;
  armIndex: Float32Array;
}

export interface ThemeColors {
  core: string;
  mid: string;
  outer: string;
  name: string;
}
