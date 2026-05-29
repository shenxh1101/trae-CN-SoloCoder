import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneConfig, BACKGROUND_COLORS } from '../../types';

interface MirrorGroundProps {
  config: SceneConfig;
}

export function MirrorGround({ config }: MirrorGroundProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const gridHalf = (config.gridSize * config.spacing) / 2;
  const size = Math.max(gridHalf * 2.5, 30);

  useFrame(() => {
    if (materialRef.current) {
      const bgColor = BACKGROUND_COLORS[config.backgroundColor];
      materialRef.current.color.set(bgColor);
      materialRef.current.metalness = config.enableMirror ? 0.9 : 0.1;
      materialRef.current.roughness = config.enableMirror ? 0.1 : 0.8;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        ref={materialRef}
        color={BACKGROUND_COLORS[config.backgroundColor]}
        metalness={config.enableMirror ? 0.9 : 0.1}
        roughness={config.enableMirror ? 0.1 : 0.8}
        transparent
        opacity={config.enableMirror ? 0.6 : 0.3}
        envMapIntensity={0.5}
      />
    </mesh>
  );
}
