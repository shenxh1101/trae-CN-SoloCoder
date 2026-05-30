export interface GalaxyConfig {
  particleCount: number;
  armCount: 2 | 3 | 4;
  rotationSpeed: number;
  armTightness: number;
  randomSize: boolean;
  showBackground: boolean;
  fogEnabled: boolean;
  autoRotate: boolean;
}

export interface GalaxyParticleData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
}

export const DEFAULT_CONFIG: GalaxyConfig = {
  particleCount: 15000,
  armCount: 3,
  rotationSpeed: 0.3,
  armTightness: 0.8,
  randomSize: true,
  showBackground: true,
  fogEnabled: true,
  autoRotate: false,
};

export const CONFIG_RANGES = {
  particleCount: { min: 1000, max: 50000, step: 1000 },
  rotationSpeed: { min: 0, max: 2, step: 0.01 },
  armTightness: { min: 0.1, max: 2, step: 0.01 },
};
