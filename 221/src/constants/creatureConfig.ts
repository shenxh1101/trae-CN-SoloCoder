import { BodyPartType, GeometryType } from '../types/creature';

export const MUTATION_RATES = {
  conservative: 0.15,
  neutral: 0.4,
  radical: 0.8,
} as const;

export const BODY_PART_BASE_POSITIONS: Record<BodyPartType, [number, number, number]> = {
  head: [0, 1.5, 0],
  torso: [0, 0, 0],
  arm_left: [-1.2, 0.3, 0],
  arm_right: [1.2, 0.3, 0],
  leg_left: [-0.5, -1.5, 0],
  leg_right: [0.5, -1.5, 0],
  tail: [0, -0.3, 1.2],
};

export const BODY_PART_ANCHOR_JOINTS: Record<BodyPartType, [number, number, number]> = {
  head: [0, 0.8, 0],
  torso: [0, 0, 0],
  arm_left: [-0.8, 0.5, 0],
  arm_right: [0.8, 0.5, 0],
  leg_left: [-0.3, -0.8, 0],
  leg_right: [0.3, -0.8, 0],
  tail: [0, -0.5, 0.6],
};

export const ANIMATABLE_PARTS: BodyPartType[] = [
  'arm_left',
  'arm_right',
  'leg_left',
  'leg_right',
  'tail',
];

export const GEOMETRY_SEGMENTS: Record<GeometryType, number> = {
  sphere: 16,
  cube: 1,
  cone: 16,
  cylinder: 16,
  torus: 16,
};

export const COLOR_PALETTE = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#00ffcc',
  '#ff6b35',
];

export const GENE_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const GENE_SEQUENCE_LENGTH = 32;

export const CAMERA_CONFIG = {
  initialDistance: 8,
  minDistance: 4,
  maxDistance: 15,
  autoRotateSpeed: 0.005,
  initialPolarAngle: Math.PI / 3,
};

export const ANIMATION_CONFIG = {
  swingAmplitude: 0.3,
  swingFrequency: 1.5,
  floatAmplitude: 0.1,
  floatFrequency: 0.8,
};
