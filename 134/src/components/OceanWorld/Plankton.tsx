import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useOceanStore } from '@/store/useOceanStore';

export default function Plankton() {
  const pointsRef = useRef<THREE.Points>(null);
  const enabled = useOceanStore((state) => state.planktonEnabled);

  const { positions, colors } = useMemo(() => {
    const count = 500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 30;
      const height = (Math.random() - 0.5) * 15;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      const colorChoice = Math.random();
      if (colorChoice < 0.3) {
        colors[i * 3] = 0.5;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      } else if (colorChoice < 0.6) {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 0.8;
      } else {
        colors[i * 3] = 0.8;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 0.9;
      }
    }

    return { positions, colors };
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current || !enabled) return;

    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const time = clock.getElapsedTime();
    const count = posArray.length / 3;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const drift = Math.sin(time * 0.3 + i * 0.1) * 0.002;
      posArray[i3] += drift;
      posArray[i3 + 1] += Math.sin(time * 0.5 + i * 0.15) * 0.001;
      posArray[i3 + 2] += Math.cos(time * 0.4 + i * 0.12) * 0.002;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!enabled) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={500}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={500}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
