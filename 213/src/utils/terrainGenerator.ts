import { createNoise2D } from 'simplex-noise';

export function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateTerrainHeightMap(
  seed: number,
  segments: number,
  amplitude: number
): Float32Array {
  const prng = mulberry32(seed);
  const noise2D = createNoise2D(prng);
  const resolution = segments + 1;
  const totalVertices = resolution * resolution;
  const heights = new Float32Array(totalVertices);

  const octaves = 4;
  const lacunarity = 2.0;
  const persistence = 0.5;

  let minH = Infinity;
  let maxH = -Infinity;

  for (let i = 0; i < totalVertices; i++) {
    const ix = i % resolution;
    const iz = Math.floor(i / resolution);
    const x = (ix / segments) * 2 - 1;
    const z = (iz / segments) * 2 - 1;

    let value = 0;
    let freq = 1;
    let amp = 1;
    let maxAmp = 0;

    for (let o = 0; o < octaves; o++) {
      value += noise2D(x * freq, z * freq) * amp;
      maxAmp += amp;
      freq *= lacunarity;
      amp *= persistence;
    }

    heights[i] = value * amplitude / maxAmp;

    if (heights[i] < minH) minH = heights[i];
    if (heights[i] > maxH) maxH = heights[i];
  }

  const range = maxH - minH;
  if (range > 0) {
    for (let i = 0; i < totalVertices; i++) {
      heights[i] = (heights[i] - minH) / range;
    }
  }

  return heights;
}
