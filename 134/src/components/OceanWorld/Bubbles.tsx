import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useOceanStore } from '@/store/useOceanStore';

const MAX_BUBBLES = 600;

export default function Bubbles() {
  const pointsRef = useRef<THREE.Points>(null);
  const prevCountRef = useRef(MAX_BUBBLES);
  const bubbleCount = useOceanStore((state) => state.bubbleCount);
  const bubbleDensity = useOceanStore((state) => state.bubbleDensity);

  const velocities = useMemo(() => {
    const v = new Float32Array(MAX_BUBBLES);
    for (let i = 0; i < MAX_BUBBLES; i++) {
      v[i] = 0.02 + Math.random() * 0.03;
    }
    return v;
  }, []);

  const positions = useMemo(() => {
    const p = new Float32Array(MAX_BUBBLES * 3);
    for (let i = 0; i < MAX_BUBBLES; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 25;
      p[i * 3] = Math.cos(angle) * radius;
      p[i * 3 + 1] = -8 + Math.random() * 18;
      p[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return p;
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;

    const displayCount = Math.min(Math.floor(bubbleCount * bubbleDensity), MAX_BUBBLES);

    if (prevCountRef.current !== displayCount) {
      pointsRef.current.geometry.setDrawRange(0, displayCount);
      prevCountRef.current = displayCount;
    }

    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < MAX_BUBBLES; i++) {
      posArray[i * 3 + 1] += velocities[i];
      posArray[i * 3] += (Math.random() - 0.5) * 0.01;
      posArray[i * 3 + 2] += (Math.random() - 0.5) * 0.01;

      if (posArray[i * 3 + 1] > 10) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 25;
        posArray[i * 3] = Math.cos(angle) * radius;
        posArray[i * 3 + 1] = -8;
        posArray[i * 3 + 2] = Math.sin(angle) * radius;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={MAX_BUBBLES}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#88ccff"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
