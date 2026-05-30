import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useNebulaStore } from '@/store/useNebulaStore';

export function CoreGlow() {
  const coreRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const { coreColor, midColor, outerColor } = useNebulaStore();

  useFrame((_, delta) => {
    if (coreRef.current) {
      const scale = 1 + Math.sin(Date.now() * 0.002) * 0.1;
      coreRef.current.scale.setScalar(scale);
    }
    if (outerGlowRef.current) {
      const scale = 2.5 + Math.sin(Date.now() * 0.0015) * 0.3;
      outerGlowRef.current.scale.setScalar(scale);
      outerGlowRef.current.rotation.y += delta * 0.1;
      outerGlowRef.current.rotation.x += delta * 0.05;
    }
  });

  return (
    <group>
      <pointLight
        ref={lightRef}
        position={[0, 0, 0]}
        color={coreColor}
        intensity={2}
        distance={20}
        decay={2}
      />

      <mesh ref={coreRef}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial
          color={coreColor}
          transparent
          opacity={0.9}
        />
      </mesh>

      <mesh ref={outerGlowRef}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial
          color={midColor}
          transparent
          opacity={0.2}
          side={THREE.BackSide}
        />
      </mesh>

      <mesh>
        <ringGeometry args={[1.5, 1.8, 64]} />
        <meshBasicMaterial
          color={midColor}
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
