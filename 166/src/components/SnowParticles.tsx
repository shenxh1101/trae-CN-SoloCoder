import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '@/store/useStore';
import * as THREE from 'three';

const vertexShader = `
  attribute float opacity;
  attribute float size;
  varying float vOpacity;
  void main() {
    vOpacity = opacity;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying float vOpacity;
  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    if (d > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.0, 0.5, d);
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * vOpacity);
  }
`;

export default function SnowParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const snowflakeCount = useStore((s) => s.snowflakeCount);
  const snowfallSpeed = useStore((s) => s.snowfallSpeed);
  const windStrength = useStore((s) => s.windStrength);

  const { positions, velocities, twinkle } = useMemo(() => {
    const pos = new Float32Array(snowflakeCount * 3);
    const vel = new Float32Array(snowflakeCount);
    const twk = new Float32Array(snowflakeCount);

    for (let i = 0; i < snowflakeCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = Math.random() * 30 + 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
      vel[i] = 0.03 + Math.random() * 0.05;
      twk[i] = Math.random() > 0.7 ? Math.random() : 0;
    }

    return { positions: pos, velocities: vel, twinkle: twk };
  }, [snowflakeCount]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const opacityAttr = pointsRef.current.geometry.attributes.opacity as THREE.BufferAttribute;
    const sizeAttr = pointsRef.current.geometry.attributes.size as THREE.BufferAttribute;
    const time = clock.getElapsedTime();

    for (let i = 0; i < snowflakeCount; i++) {
      const idx = i * 3;
      posAttr.array[idx + 1] -= velocities[i] * snowfallSpeed * 3;
      posAttr.array[idx] += windStrength * 0.02;

      if (twinkle[i] > 0) {
        const twinkleValue = 0.5 + Math.sin(time * 3 + twinkle[i] * 10) * 0.5;
        opacityAttr.array[i] = 0.4 + twinkleValue * 0.6;
        sizeAttr.array[i] = 6 + Math.sin(time * 2 + twinkle[i] * 8) * 2;
        opacityAttr.needsUpdate = true;
        sizeAttr.needsUpdate = true;
      } else {
        opacityAttr.array[i] = 0.9;
        sizeAttr.array[i] = 6;
      }

      if (posAttr.array[idx + 1] < 0.1) {
        posAttr.array[idx] = (Math.random() - 0.5) * 60;
        posAttr.array[idx + 1] = 30 + Math.random() * 10;
        posAttr.array[idx + 2] = (Math.random() - 0.5) * 60;
      }
    }
    posAttr.needsUpdate = true;
  });

  useEffect(() => {
    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const opacityAttr = geo.attributes.opacity as THREE.BufferAttribute;
      const sizeAttr = geo.attributes.size as THREE.BufferAttribute;

      for (let i = 0; i < snowflakeCount; i++) {
        posAttr.array[i * 3] = (Math.random() - 0.5) * 60;
        posAttr.array[i * 3 + 1] = Math.random() * 30 + 5;
        posAttr.array[i * 3 + 2] = (Math.random() - 0.5) * 60;
        opacityAttr.array[i] = 0.9;
        sizeAttr.array[i] = 6;
      }
      posAttr.needsUpdate = true;
      opacityAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    }
  }, [snowflakeCount]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={snowflakeCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-opacity"
          count={snowflakeCount}
          array={new Float32Array(snowflakeCount).fill(0.9)}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-size"
          count={snowflakeCount}
          array={new Float32Array(snowflakeCount).fill(6)}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
    </points>
  );
}
