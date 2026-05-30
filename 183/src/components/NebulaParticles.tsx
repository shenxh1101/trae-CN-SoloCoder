import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useNebulaStore } from '@/store/useNebulaStore';
import { hexToRgb, getParticleColor } from '@/config/themes';

const TRAIL_LENGTH = 8;

interface NebulaParticlesProps {
  maxRadius?: number;
  spiralTwist?: number;
  verticalSpread?: number;
}

export function NebulaParticles({
  maxRadius = 10,
  spiralTwist = Math.PI * 2.5,
  verticalSpread = 1.5,
}: NebulaParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const trailsRef = useRef<THREE.LineSegments>(null);
  const rotationRef = useRef(0);
  const progressRef = useRef<Float32Array | null>(null);
  const randomOffsetsRef = useRef<Float32Array | null>(null);
  const verticalRandomRef = useRef<Float32Array | null>(null);
  const trailHistoryRef = useRef<Float32Array | null>(null);

  const {
    particleCount,
    armCount,
    rotationSpeed,
    particleSpeed,
    coreColor,
    midColor,
    outerColor,
    trailEnabled,
  } = useNebulaStore();

  const armIndices = useMemo(() => {
    const indices = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      indices[i] = i % armCount;
    }
    return indices;
  }, [particleCount, armCount]);

  const { positions, colors, sizes, progress } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const progress = new Float32Array(particleCount);

    const coreRgb = hexToRgb(coreColor);
    const midRgb = hexToRgb(midColor);
    const outerRgb = hexToRgb(outerColor);

    const randomOffsets = new Float32Array(particleCount);
    const verticalRandom = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const t = Math.random() * 0.95 + 0.05;
      const armIndex = i % armCount;
      const armAngle = (armIndex / armCount) * Math.PI * 2;
      const randomOffset = (Math.random() - 0.5) * 0.35;
      const spiralAngle = armAngle + t * spiralTwist + randomOffset;
      const radius = t * maxRadius;

      const x = radius * Math.cos(spiralAngle);
      const y = (Math.random() - 0.5) * verticalSpread * (1 - t * 0.5);
      const z = radius * Math.sin(spiralAngle);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const color = getParticleColor(t, coreRgb, midRgb, outerRgb);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      const baseSize = 0.12;
      sizes[i] = baseSize * Math.pow(1 - t * 0.5, 1.5) + Math.random() * 0.03;

      progress[i] = t;
      randomOffsets[i] = randomOffset;
      verticalRandom[i] = (Math.random() - 0.5) * 2;
    }

    randomOffsetsRef.current = randomOffsets;
    verticalRandomRef.current = verticalRandom;

    return { positions, colors, sizes, progress };
  }, [particleCount, armCount, coreColor, midColor, outerColor, maxRadius, spiralTwist, verticalSpread]);

  useEffect(() => {
    progressRef.current = new Float32Array(progress);
  }, [progress]);

  const trailSegmentsPerParticle = TRAIL_LENGTH - 1;
  const trailVertexCount = particleCount * trailSegmentsPerParticle * 2;

  const { trailPositions, trailColors } = useMemo(() => {
    const trailPositions = new Float32Array(trailVertexCount * 3);
    const trailColors = new Float32Array(trailVertexCount * 3);
    return { trailPositions, trailColors };
  }, [trailVertexCount]);

  useEffect(() => {
    const history = new Float32Array(particleCount * TRAIL_LENGTH * 3);
    if (pointsRef.current) {
      const src = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        for (let j = 0; j < TRAIL_LENGTH; j++) {
          const dstIdx = (i * TRAIL_LENGTH + j) * 3;
          history[dstIdx] = src[i * 3];
          history[dstIdx + 1] = src[i * 3 + 1];
          history[dstIdx + 2] = src[i * 3 + 2];
        }
      }
    }
    trailHistoryRef.current = history;
  }, [particleCount, positions]);

  useFrame((_, delta) => {
    if (!pointsRef.current || !progressRef.current) return;

    const clampedDelta = Math.min(delta, 0.05);
    rotationRef.current += rotationSpeed * clampedDelta;

    const posArr = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const colArr = pointsRef.current.geometry.attributes.color.array as Float32Array;
    const coreRgb = hexToRgb(coreColor);
    const midRgb = hexToRgb(midColor);
    const outerRgb = hexToRgb(outerColor);
    const offsets = randomOffsetsRef.current;
    const vRandom = verticalRandomRef.current;
    const history = trailHistoryRef.current;

    for (let i = 0; i < particleCount; i++) {
      let t = progressRef.current[i];
      const speedFactor = 0.15 + t * 0.1;
      t += particleSpeed * clampedDelta * speedFactor;
      if (t > 1) t -= 1;
      progressRef.current[i] = t;

      const armIndex = armIndices[i];
      const armAngle = (armIndex / armCount) * Math.PI * 2;
      const radius = t * maxRadius;
      const offset = offsets ? offsets[i] : 0;
      const spiralAngle = armAngle + t * spiralTwist + offset + rotationRef.current;

      const x = radius * Math.cos(spiralAngle);
      const waveAmplitude = verticalSpread * 0.4 * (1 - t * 0.7);
      const y = Math.sin(t * Math.PI * 2 + rotationRef.current * 0.5) * waveAmplitude
        + (vRandom ? vRandom[i] * 0.15 : 0);
      const z = radius * Math.sin(spiralAngle);

      posArr[i * 3] = x;
      posArr[i * 3 + 1] = y;
      posArr[i * 3 + 2] = z;

      const color = getParticleColor(t, coreRgb, midRgb, outerRgb);
      colArr[i * 3] = color.r;
      colArr[i * 3 + 1] = color.g;
      colArr[i * 3 + 2] = color.b;

      if (history) {
        for (let j = TRAIL_LENGTH - 1; j > 0; j--) {
          const currIdx = (i * TRAIL_LENGTH + j) * 3;
          const prevIdx = (i * TRAIL_LENGTH + j - 1) * 3;
          history[currIdx] = history[prevIdx];
          history[currIdx + 1] = history[prevIdx + 1];
          history[currIdx + 2] = history[prevIdx + 2];
        }
        const firstIdx = i * TRAIL_LENGTH * 3;
        history[firstIdx] = x;
        history[firstIdx + 1] = y;
        history[firstIdx + 2] = z;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;

    if (trailEnabled && trailsRef.current && history) {
      const trailPos = trailsRef.current.geometry.attributes.position.array as Float32Array;
      const trailCol = trailsRef.current.geometry.attributes.color.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const t = progressRef.current[i];
        const color = getParticleColor(t, coreRgb, midRgb, outerRgb);

        for (let j = 0; j < trailSegmentsPerParticle; j++) {
          const segIdx = (i * trailSegmentsPerParticle + j) * 2;
          const fromHistIdx = (i * TRAIL_LENGTH + j) * 3;
          const toHistIdx = (i * TRAIL_LENGTH + j + 1) * 3;

          trailPos[segIdx * 3] = history[fromHistIdx];
          trailPos[segIdx * 3 + 1] = history[fromHistIdx + 1];
          trailPos[segIdx * 3 + 2] = history[fromHistIdx + 2];

          trailPos[(segIdx + 1) * 3] = history[toHistIdx];
          trailPos[(segIdx + 1) * 3 + 1] = history[toHistIdx + 1];
          trailPos[(segIdx + 1) * 3 + 2] = history[toHistIdx + 2];

          const alpha = 1 - j / TRAIL_LENGTH;
          const alphaSq = alpha * alpha;
          trailCol[segIdx * 3] = color.r * alphaSq;
          trailCol[segIdx * 3 + 1] = color.g * alphaSq;
          trailCol[segIdx * 3 + 2] = color.b * alphaSq;

          const nextAlpha = 1 - (j + 1) / TRAIL_LENGTH;
          const nextAlphaSq = nextAlpha * nextAlpha;
          trailCol[(segIdx + 1) * 3] = color.r * nextAlphaSq;
          trailCol[(segIdx + 1) * 3 + 1] = color.g * nextAlphaSq;
          trailCol[(segIdx + 1) * 3 + 2] = color.b * nextAlphaSq;
        }
      }

      trailsRef.current.geometry.attributes.position.needsUpdate = true;
      trailsRef.current.geometry.attributes.color.needsUpdate = true;
    }
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particleCount}
            array={colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={particleCount}
            array={sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.18}
          vertexColors
          transparent
          opacity={0.92}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {trailEnabled && (
        <lineSegments ref={trailsRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={trailVertexCount}
              array={trailPositions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={trailVertexCount}
              array={trailColors}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            vertexColors
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            linewidth={1}
          />
        </lineSegments>
      )}
    </group>
  );
}
