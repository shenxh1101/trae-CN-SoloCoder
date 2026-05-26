import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStarStore } from '@/store/useStarStore';

interface StarFieldProps {
  count: number;
  size: number;
  twinkleSpeed: number;
}

export default function StarField({ count, size, twinkleSpeed }: StarFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const timeRef = useRef(0);

  const { positions, colors, sizes, phases, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);

    const radius = 150;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * Math.cbrt(Math.random());

      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);

      const colorChoice = Math.random();
      if (colorChoice < 0.15) {
        const blueShade = 0.6 + Math.random() * 0.4;
        colors[i3] = 0.7 + Math.random() * 0.2;
        colors[i3 + 1] = 0.8 + Math.random() * 0.2;
        colors[i3 + 2] = blueShade;
      } else if (colorChoice < 0.3) {
        const redShade = 0.6 + Math.random() * 0.4;
        colors[i3] = redShade;
        colors[i3 + 1] = 0.7 + Math.random() * 0.2;
        colors[i3 + 2] = 0.7 + Math.random() * 0.2;
      } else {
        const whiteShade = 0.8 + Math.random() * 0.2;
        colors[i3] = whiteShade;
        colors[i3 + 1] = whiteShade;
        colors[i3 + 2] = whiteShade;
      }

      sizes[i] = 0.5 + Math.random() * 2.5;
      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.8 + Math.random() * 0.4;
    }

    return { positions, colors, sizes, phases, speeds };
  }, [count]);

  useFrame((_, delta) => {
    timeRef.current += delta * twinkleSpeed;
    const time = timeRef.current;

    if (pointsRef.current) {
      const geometry = pointsRef.current.geometry;
      const sizeAttribute = geometry.getAttribute('size') as THREE.BufferAttribute;

      if (sizeAttribute) {
        for (let i = 0; i < count; i++) {
          const twinkle = 0.7 + 0.3 * Math.sin(time * speeds[i] + phases[i]);
          sizeAttribute.array[i] = sizes[i] * size * twinkle;
        }
        sizeAttribute.needsUpdate = true;
      }
    }
  });

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.size = size;
    }
  }, [size]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={size}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
