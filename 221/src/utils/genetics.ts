import {
  BodyPart,
  BodyPartType,
  CreatureGenome,
  GeometryType,
  GEOMETRY_TYPES,
} from '../types/creature';
import {
  BODY_PART_BASE_POSITIONS,
  COLOR_PALETTE,
  GENE_CHARS,
  GENE_SEQUENCE_LENGTH,
} from '../constants/creatureConfig';

function uuidv4(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const ALL_BODY_PARTS: BodyPartType[] = [
  'head',
  'torso',
  'arm_left',
  'arm_right',
  'leg_left',
  'leg_right',
  'tail',
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomColor(): string {
  return randomChoice(COLOR_PALETTE);
}

function randomGeometry(): GeometryType {
  return randomChoice(GEOMETRY_TYPES);
}

function generateRandomPart(type: BodyPartType): BodyPart {
  const basePos = BODY_PART_BASE_POSITIONS[type];
  const offset: [number, number, number] = [
    randomRange(-0.3, 0.3),
    randomRange(-0.3, 0.3),
    randomRange(-0.3, 0.3),
  ];

  return {
    type,
    geometry: randomGeometry(),
    position: [
      basePos[0] + offset[0],
      basePos[1] + offset[1],
      basePos[2] + offset[2],
    ],
    rotation: [
      randomRange(-Math.PI / 4, Math.PI / 4),
      randomRange(-Math.PI / 4, Math.PI / 4),
      randomRange(-Math.PI / 4, Math.PI / 4),
    ],
    scale: [
      randomRange(0.5, 1.5),
      randomRange(0.5, 1.5),
      randomRange(0.5, 1.5),
    ],
    color: randomColor(),
    locked: false,
  };
}

export function generateGeneSequence(): string {
  let result = '';
  for (let i = 0; i < GENE_SEQUENCE_LENGTH; i++) {
    result += GENE_CHARS.charAt(Math.floor(Math.random() * GENE_CHARS.length));
  }
  return result;
}

export function genomeToGeneSequence(genome: CreatureGenome): string {
  const parts = genome.parts;
  let seq = '';

  const head = parts.find((p) => p.type === 'head');
  const torso = parts.find((p) => p.type === 'torso');
  const arms = parts.filter((p) => p.type.startsWith('arm'));
  const legs = parts.filter((p) => p.type.startsWith('leg'));
  const tail = parts.find((p) => p.type === 'tail');

  const encodeGeometry = (g: GeometryType) =>
    GENE_CHARS[GEOMETRY_TYPES.indexOf(g) % GENE_CHARS.length];
  const encodeColor = (c: string) => {
    const idx = COLOR_PALETTE.indexOf(c);
    return idx >= 0 ? GENE_CHARS[idx % GENE_CHARS.length] : GENE_CHARS[0];
  };
  const encodeScale = (s: number) =>
    GENE_CHARS[Math.floor(Math.max(0, Math.min(1, (s - 0.5) / 1)) * (GENE_CHARS.length - 1))];

  if (head) {
    seq += encodeGeometry(head.geometry);
    seq += encodeColor(head.color);
    seq += encodeScale(head.scale[0]);
    seq += encodeScale(head.scale[1]);
  } else {
    seq += 'AAAA';
  }

  if (torso) {
    seq += encodeGeometry(torso.geometry);
    seq += encodeColor(torso.color);
    seq += encodeScale(torso.scale[0]);
    seq += encodeScale(torso.scale[1]);
  } else {
    seq += 'AAAA';
  }

  for (let i = 0; i < 4; i++) {
    const limb = arms[i] || legs[i - 2];
    if (limb) {
      seq += encodeGeometry(limb.geometry);
      seq += encodeColor(limb.color);
    } else {
      seq += 'AA';
    }
  }

  if (tail) {
    seq += encodeGeometry(tail.geometry);
    seq += encodeColor(tail.color);
    seq += encodeScale(tail.scale[0]);
    seq += encodeScale(tail.scale[1]);
  } else {
    seq += 'AAAA';
  }

  while (seq.length < GENE_SEQUENCE_LENGTH) {
    seq += GENE_CHARS[Math.floor(Math.random() * GENE_CHARS.length)];
  }

  return seq.substring(0, GENE_SEQUENCE_LENGTH);
}

export function generateRandomGenome(generation: number = 1): CreatureGenome {
  const parts: BodyPart[] = [];

  parts.push(generateRandomPart('head'));
  parts.push(generateRandomPart('torso'));

  if (Math.random() > 0.2) parts.push(generateRandomPart('arm_left'));
  if (Math.random() > 0.2) parts.push(generateRandomPart('arm_right'));
  if (Math.random() > 0.2) parts.push(generateRandomPart('leg_left'));
  if (Math.random() > 0.2) parts.push(generateRandomPart('leg_right'));
  if (Math.random() > 0.5) parts.push(generateRandomPart('tail'));

  const genome: CreatureGenome = {
    id: uuidv4(),
    generation,
    fitness: Math.floor(Math.random() * 101),
    parts,
    geneSequence: '',
    createdAt: Date.now(),
  };

  genome.geneSequence = genomeToGeneSequence(genome);
  return genome;
}

function mutateValue(
  value: number,
  mutationRate: number,
  min: number,
  max: number,
): number {
  if (Math.random() > mutationRate) return value;
  const delta = randomRange(-(max - min) * 0.3, (max - min) * 0.3);
  return Math.max(min, Math.min(max, value + delta));
}

function mutateColor(color: string, mutationRate: number): string {
  if (Math.random() > mutationRate) return color;
  return randomColor();
}

function mutateGeometry(geo: GeometryType, mutationRate: number): GeometryType {
  if (Math.random() > mutationRate) return geo;
  return randomGeometry();
}

function mutatePart(
  part: BodyPart,
  mutationRate: number,
  isLocked: boolean,
): BodyPart {
  if (isLocked) {
    return { ...part, locked: true };
  }

  const basePos = BODY_PART_BASE_POSITIONS[part.type];

  return {
    ...part,
    geometry: mutateGeometry(part.geometry, mutationRate),
    position: [
      mutateValue(part.position[0], mutationRate, basePos[0] - 0.5, basePos[0] + 0.5),
      mutateValue(part.position[1], mutationRate, basePos[1] - 0.5, basePos[1] + 0.5),
      mutateValue(part.position[2], mutationRate, basePos[2] - 0.5, basePos[2] + 0.5),
    ],
    rotation: [
      mutateValue(part.rotation[0], mutationRate, -Math.PI / 3, Math.PI / 3),
      mutateValue(part.rotation[1], mutationRate, -Math.PI / 3, Math.PI / 3),
      mutateValue(part.rotation[2], mutationRate, -Math.PI / 3, Math.PI / 3),
    ],
    scale: [
      mutateValue(part.scale[0], mutationRate, 0.4, 1.8),
      mutateValue(part.scale[1], mutationRate, 0.4, 1.8),
      mutateValue(part.scale[2], mutationRate, 0.4, 1.8),
    ],
    color: mutateColor(part.color, mutationRate),
    locked: false,
  };
}

export function mutateGenome(
  genome: CreatureGenome,
  mutationRate: number,
  lockedParts: Set<BodyPartType>,
): CreatureGenome {
  const newParts: BodyPart[] = genome.parts.map((part) =>
    mutatePart(part, mutationRate, lockedParts.has(part.type)),
  );

  const existingTypes = new Set(newParts.map((p) => p.type));
  const missingParts = ALL_BODY_PARTS.filter((t) => !existingTypes.has(t));

  for (const partType of missingParts) {
    if (partType === 'head' || partType === 'torso') continue;
    if (Math.random() < mutationRate * 0.3 && !lockedParts.has(partType)) {
      newParts.push(generateRandomPart(partType));
    }
  }

  const filteredParts = newParts.filter((part) => {
    if (part.type === 'head' || part.type === 'torso') return true;
    return Math.random() > mutationRate * 0.2 || lockedParts.has(part.type);
  });

  const newGenome: CreatureGenome = {
    id: uuidv4(),
    generation: genome.generation + 1,
    fitness: Math.floor(Math.random() * 101),
    parts: filteredParts,
    geneSequence: '',
    createdAt: Date.now(),
  };

  newGenome.geneSequence = genomeToGeneSequence(newGenome);
  return newGenome;
}

export function serializeGenome(genome: CreatureGenome): string {
  return JSON.stringify(genome, null, 2);
}

export function deserializeGenome(json: string): CreatureGenome {
  const parsed = JSON.parse(json);
  if (!parsed.id || !parsed.parts) {
    throw new Error('Invalid genome JSON');
  }
  return parsed as CreatureGenome;
}
