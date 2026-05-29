import { useRef } from 'react';
import * as THREE from 'three';

interface HouseProps {
  position: [number, number, number];
  isNight: boolean;
  rotationY?: number;
}

export default function House({ position, isNight, rotationY = 0 }: HouseProps) {
  const lightRef = useRef<THREE.PointLight>(null);

  const windowColor = isNight ? '#FFD700' : '#1a1a3e';
  const windowEmissiveIntensity = isNight ? 2 : 0;
  const lightIntensity = isNight ? 1.5 : 0;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[3, 2.5, 2.5]} />
        <meshStandardMaterial color="#e8d5b7" />
      </mesh>

      <mesh position={[0, 2.8, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[2.9, 2.9, 0.8]} />
        <meshStandardMaterial color="white" />
      </mesh>

      <mesh position={[0, 2.8, 0]} rotation={[Math.PI / 2, 0, Math.PI / 4]}>
        <boxGeometry args={[2.9, 2.5, 0.8]} />
        <meshStandardMaterial color="white" />
      </mesh>

      <mesh position={[0, 0.6, 1.31]}>
        <boxGeometry args={[0.6, 1.2, 0.05]} />
        <meshStandardMaterial color="#5c3a1e" />
      </mesh>

      <mesh position={[-0.9, 1.5, 1.31]}>
        <boxGeometry args={[0.5, 0.5, 0.05]} />
        <meshStandardMaterial
          color={windowColor}
          emissive={windowColor}
          emissiveIntensity={windowEmissiveIntensity}
        />
      </mesh>

      <mesh position={[0.9, 1.5, 1.31]}>
        <boxGeometry args={[0.5, 0.5, 0.05]} />
        <meshStandardMaterial
          color={windowColor}
          emissive={windowColor}
          emissiveIntensity={windowEmissiveIntensity}
        />
      </mesh>

      <mesh position={[-0.9, 1.5, -1.31]}>
        <boxGeometry args={[0.5, 0.5, 0.05]} />
        <meshStandardMaterial
          color={windowColor}
          emissive={windowColor}
          emissiveIntensity={windowEmissiveIntensity}
        />
      </mesh>

      <mesh position={[0.9, 1.5, -1.31]}>
        <boxGeometry args={[0.5, 0.5, 0.05]} />
        <meshStandardMaterial
          color={windowColor}
          emissive={windowColor}
          emissiveIntensity={windowEmissiveIntensity}
        />
      </mesh>

      <pointLight
        ref={lightRef}
        position={[0, 1.5, 0]}
        color="#FFD700"
        intensity={lightIntensity}
        distance={8}
      />
    </group>
  );
}
