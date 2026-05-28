import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleData } from '../../utils/constants';

interface ParticlesProps {
  particles: ParticleData[];
}

export default function Particles({ particles }: ParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const maxParticles = 5000;

  const positions = useMemo(() => {
    return new Float32Array(maxParticles * 3);
  }, []);

  const colors = useMemo(() => {
    return new Float32Array(maxParticles * 3);
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  useEffect(() => {
    if (pointsRef.current) {
      pointsRef.current.geometry.setDrawRange(0, particles.length);
    }
  }, [particles.length]);

  useFrame(() => {
    if (!pointsRef.current) return;

    const color = new THREE.Color();
    particles.forEach((particle, i) => {
      const idx = i * 3;
      const alpha = particle.life / particle.maxLife;

      positions[idx] = particle.position[0];
      positions[idx + 1] = particle.position[1];
      positions[idx + 2] = particle.position[2];

      color.set(particle.color);
      colors[idx] = color.r * alpha;
      colors[idx + 1] = color.g * alpha;
      colors[idx + 2] = color.b * alpha;
    });

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        vertexColors
        transparent
        opacity={1}
        size={2}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
