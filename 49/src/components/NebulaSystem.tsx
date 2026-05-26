import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface NebulaSystemProps {
  enabled: boolean;
  color: 'purple' | 'cyan';
}

export default function NebulaSystem({ enabled, color }: NebulaSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);
  const targetColorsRef = useRef<Float32Array | null>(null);
  const currentColorsRef = useRef<Float32Array | null>(null);
  const transitioningRef = useRef(false);

  const targetColor = useMemo(() => {
    return color === 'purple'
      ? { r: 0.5, g: 0.15, b: 0.7 }
      : { r: 0.1, g: 0.7, b: 0.8 };
  }, [color]);

  const { positions, baseSizes, phases } = useMemo(() => {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const baseSizes = new Float32Array(count);
    const phases = new Float32Array(count);

    const center = new THREE.Vector3(20, -10, -30);
    const spread = 40;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const angle = Math.random() * Math.PI * 2;
      const radius = spread * Math.pow(Math.random(), 0.5);
      const height = (Math.random() - 0.5) * spread * 0.5;

      positions[i3] = center.x + radius * Math.cos(angle) * (0.8 + Math.random() * 0.4);
      positions[i3 + 1] = center.y + height;
      positions[i3 + 2] = center.z + radius * Math.sin(angle) * (0.8 + Math.random() * 0.4);

      baseSizes[i] = 1.5 + Math.random() * 3;
      phases[i] = Math.random() * Math.PI * 2;
    }

    return { positions, baseSizes, phases };
  }, []);

  useEffect(() => {
    const count = baseSizes.length;
    const newColors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const colorVariation = 0.8 + Math.random() * 0.4;
      newColors[i3] = targetColor.r * colorVariation;
      newColors[i3 + 1] = targetColor.g * colorVariation;
      newColors[i3 + 2] = targetColor.b * colorVariation;
    }

    targetColorsRef.current = newColors;
    transitioningRef.current = true;
  }, [targetColor, baseSizes]);

  useFrame((_, delta) => {
    if (!enabled || !pointsRef.current) return;

    timeRef.current += delta;

    pointsRef.current.rotation.y += delta * 0.02;

    const geometry = pointsRef.current.geometry;
    const sizeAttribute = geometry.getAttribute('size') as THREE.BufferAttribute;

    if (sizeAttribute) {
      for (let i = 0; i < baseSizes.length; i++) {
        const pulse = 0.8 + 0.2 * Math.sin(timeRef.current * 0.5 + phases[i]);
        sizeAttribute.array[i] = baseSizes[i] * pulse;
      }
      sizeAttribute.needsUpdate = true;
    }

    if (transitioningRef.current && targetColorsRef.current && currentColorsRef.current) {
      const colorAttribute = geometry.getAttribute('color') as THREE.BufferAttribute;
      const colors = colorAttribute.array as Float32Array;
      const lerpFactor = Math.min(delta * 3, 1);

      for (let i = 0; i < colors.length; i++) {
        colors[i] += (targetColorsRef.current[i] - colors[i]) * lerpFactor;
      }
      colorAttribute.needsUpdate = true;

      let diff = 0;
      for (let i = 0; i < colors.length; i++) {
        diff += Math.abs(targetColorsRef.current[i] - colors[i]);
      }
      if (diff < 0.01) {
        transitioningRef.current = false;
      }
    }
  });

  useEffect(() => {
    if (pointsRef.current) {
      const geometry = pointsRef.current.geometry;
      const colorAttribute = geometry.getAttribute('color') as THREE.BufferAttribute;
      if (colorAttribute) {
        currentColorsRef.current = colorAttribute.array as Float32Array;
      }
    }
  }, [enabled]);

  if (!enabled) return null;

  const initialColors = useMemo(() => {
    const count = baseSizes.length;
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const colorVariation = 0.8 + Math.random() * 0.4;
      colors[i3] = targetColor.r * colorVariation;
      colors[i3 + 1] = targetColor.g * colorVariation;
      colors[i3 + 2] = targetColor.b * colorVariation;
    }

    return colors;
  }, []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={initialColors.length / 3}
          array={initialColors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={baseSizes.length}
          array={baseSizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={2}
        vertexColors
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
