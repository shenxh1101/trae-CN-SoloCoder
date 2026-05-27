export type ParticleShape = 'sphere' | 'cube' | 'tetrahedron';

export type BackgroundType = 'black' | 'stars' | 'white';

export type FontWeight = 'normal' | 'bold';

export interface ParticleConfig {
  text: string;
  particleSize: number;
  particleShape: ParticleShape;
  thickness: number;
  fontWeight: FontWeight;
  colorGradient: {
    top: string;
    bottom: string;
  };
  background: BackgroundType;
  trailEffect: boolean;
  autoRotate: boolean;
}

export interface ParticleData {
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  color: { r: number; g: number; b: number };
  velocity: { x: number; y: number; z: number };
}
