import { BodyPartType, CreatureGenome, EvolutionBias } from '../types/creature';
import { MUTATION_RATES } from '../constants/creatureConfig';
import { mutateGenome } from './genetics';

export function getMutationRate(bias: EvolutionBias): number {
  return MUTATION_RATES[bias];
}

export function calculateFitness(genome: CreatureGenome): number {
  const partCount = genome.parts.length;
  const varietyScore = new Set(genome.parts.map((p) => p.geometry)).size;
  const colorVariety = new Set(genome.parts.map((p) => p.color)).size;

  const baseScore = 50;
  const partBonus = Math.min(partCount * 3, 15);
  const varietyBonus = varietyScore * 4;
  const colorBonus = colorVariety * 3;
  const randomFactor = Math.random() * 20 - 10;

  const fitness = Math.max(
    0,
    Math.min(100, Math.floor(baseScore + partBonus + varietyBonus + colorBonus + randomFactor)),
  );

  return fitness;
}

export function evolveCreature(
  current: CreatureGenome,
  bias: EvolutionBias,
  lockedParts: Set<BodyPartType>,
): CreatureGenome {
  const mutationRate = getMutationRate(bias);
  const newGenome = mutateGenome(current, mutationRate, lockedParts);
  newGenome.fitness = calculateFitness(newGenome);
  return newGenome;
}
