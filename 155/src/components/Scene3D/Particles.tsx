import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneConfig } from '../../types';
import { generateParticleColor } from '../../utils/colorUtils';

interface ParticlesProps {
  config: SceneConfig;
  count?: number;
}

export function Particles({ config, count = 200 }: ParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const particleData = useRef<{
    positions: Float32Array;
    velocities: Float32Array;
  } | null>(null);

  const geometry = useMemo(() => new THREE.BufferGeometry(), []);
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const velocities = useMemo(() => new Float32Array(count * 3), [count]);
  const colors = useMemo(() => new Float32Array(count * 3), [count]);

  useEffect(() => {
    const gridHalf = (config.gridSize * config.spacing) / 2;
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * gridHalf * 1.5;
      positions[i * 3 + 1] = Math.random() * config.beamMaxHeight * 1.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * gridHalf * 1.5;

      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.015;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

      const color = generateParticleColor(config.colorMode);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    particleData.current = { positions, velocities };
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }, [count, config, geometry, positions, velocities, colors]);

  useEffect(() => {
    if (!particleData.current) return;
    
    for (let i = 0; i < count; i++) {
      const color = generateParticleColor(config.colorMode);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    if (geometry.attributes.color) {
      geometry.attributes.color.needsUpdate = true;
    }
  }, [config.colorMode, count, colors, geometry]);

  useFrame(() => {
    if (!pointsRef.current || !particleData.current) return;

    const gridHalf = (config.gridSize * config.spacing) / 2;
    const { positions, velocities } = particleData.current;

    for (let i = 0; i < count; i++) {
      positions[i * 3] += velocities[i * 3];
      positions[i * 3 + 1] += velocities[i * 3 + 1];
      positions[i * 3 + 2] += velocities[i * 3 + 2];

      if (Math.abs(positions[i * 3]) > gridHalf * 1.5) velocities[i * 3] *= -1;
      if (positions[i * 3 + 1] < 0 || positions[i * 3 + 1] > config.beamMaxHeight * 1.5) {
        velocities[i * 3 + 1] *= -1;
      }
      if (Math.abs(positions[i * 3 + 2]) > gridHalf * 1.5) velocities[i * 3 + 2] *= -1;
    }

    if (pointsRef.current.geometry.attributes.position) {
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  if (!config.enableParticles) return null;

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.12}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
