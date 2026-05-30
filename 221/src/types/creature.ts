export type GeometryType = 'sphere' | 'cube' | 'cone' | 'cylinder' | 'torus';

export type BodyPartType =
  | 'head'
  | 'torso'
  | 'arm_left'
  | 'arm_right'
  | 'leg_left'
  | 'leg_right'
  | 'tail';

export interface BodyPart {
  type: BodyPartType;
  geometry: GeometryType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  locked: boolean;
}

export interface CreatureGenome {
  id: string;
  generation: number;
  fitness: number;
  parts: BodyPart[];
  geneSequence: string;
  createdAt: number;
}

export type EvolutionBias = 'neutral' | 'conservative' | 'radical';

export interface CreatureState {
  currentCreature: CreatureGenome | null;
  evolutionHistory: CreatureGenome[];
  lockedParts: Set<BodyPartType>;
  evolutionBias: EvolutionBias;
  autoRotate: boolean;
  animationEnabled: boolean;
  isEvolving: boolean;
  feedbackEffect: 'like' | 'dislike' | null;
}

export interface CreatureActions {
  initCreature: () => void;
  evolve: () => void;
  like: () => void;
  dislike: () => void;
  toggleLock: (part: BodyPartType) => void;
  loadCreature: (genome: CreatureGenome) => void;
  saveCreature: () => void;
  toggleAutoRotate: () => void;
  toggleAnimation: () => void;
  clearFeedback: () => void;
}

export const BODY_PART_LABELS: Record<BodyPartType, string> = {
  head: '头部',
  torso: '躯干',
  arm_left: '左臂',
  arm_right: '右臂',
  leg_left: '左腿',
  leg_right: '右腿',
  tail: '尾巴',
};

export const GEOMETRY_TYPES: GeometryType[] = [
  'sphere',
  'cube',
  'cone',
  'cylinder',
  'torus',
];
