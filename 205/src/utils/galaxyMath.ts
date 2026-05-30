import * as THREE from 'three';
import type { GalaxyConfig, GalaxyParticleData } from '../types/galaxy';

const MAX_RADIUS = 100;
const FLATTEN_FACTOR = 0.15;
const SPREAD_FACTOR = 15;
const CORE_RADIUS = 8;
const BASE_PARTICLE_SIZE = 0.8;

const COLOR_CORE = new THREE.Color(0xffaa33);
const COLOR_OUTER = new THREE.Color(0x3388ff);
const COLOR_CORE_BRIGHT = new THREE.Color(0xffff88);

function gaussianRandom(): number {
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function generateGalaxyParticles(config: GalaxyConfig): GalaxyParticleData {
  const { particleCount, armCount, armTightness, randomSize } = config;

  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  const tempColor = new THREE.Color();

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    const radiusFraction = Math.sqrt(Math.random());
    const radius = radiusFraction * MAX_RADIUS;

    const spinAngle = radius * armTightness;
    const armIndex = i % armCount;
    const baseAngle = armIndex * ((Math.PI * 2) / armCount);
    const angle = baseAngle + spinAngle;

    const distanceFactor = 1 - radiusFraction;
    const randomOffset = gaussianRandom() * distanceFactor * SPREAD_FACTOR;
    const randomOffsetY = gaussianRandom() * distanceFactor * SPREAD_FACTOR * FLATTEN_FACTOR;

    let x = Math.cos(angle) * radius + randomOffset * (Math.random() > 0.5 ? 1 : -1);
    let y = randomOffsetY;
    let z = Math.sin(angle) * radius + randomOffset * (Math.random() > 0.5 ? 1 : -1);

    if (radius < CORE_RADIUS) {
      const coreFactor = 1 - radius / CORE_RADIUS;
      const coreRandom = gaussianRandom() * coreFactor * CORE_RADIUS * 0.5;
      x += coreRandom * (Math.random() - 0.5);
      y += coreRandom * (Math.random() - 0.5) * FLATTEN_FACTOR;
      z += coreRandom * (Math.random() - 0.5);
    }

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    if (radius < CORE_RADIUS) {
      const coreBrightness = 1 - radius / CORE_RADIUS;
      tempColor.copy(COLOR_CORE_BRIGHT).lerp(COLOR_CORE, radius / CORE_RADIUS);
      tempColor.multiplyScalar(1 + coreBrightness * 0.5);
    } else {
      const colorT = (radius - CORE_RADIUS) / (MAX_RADIUS - CORE_RADIUS);
      tempColor.copy(COLOR_CORE).lerp(COLOR_OUTER, Math.pow(colorT, 0.8));
    }

    colors[i3] = tempColor.r;
    colors[i3 + 1] = tempColor.g;
    colors[i3 + 2] = tempColor.b;

    let size = BASE_PARTICLE_SIZE * (1 - radiusFraction * 0.6);
    if (radius < CORE_RADIUS) {
      size *= 1 + (1 - radius / CORE_RADIUS) * 1.5;
    }
    if (randomSize) {
      size *= 0.5 + Math.random() * 1.5;
    }
    sizes[i] = size;
  }

  return { positions, colors, sizes };
}

export function generateBackgroundStars(count: number = 3000): Float32Array {
  const positions = new Float32Array(count * 3);
  const distance = 500;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = distance * (0.8 + Math.random() * 0.4);

    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.5;
    positions[i3 + 2] = r * Math.cos(phi);
  }

  return positions;
}
