import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ElectronProps {
  orbitRadius: number;
  orbitInclination: number;
  orbitIndex: number;
  electronIndex: number;
  totalElectronsInOrbit: number;
  eccentricity: number;
  color: string;
  speed: number;
  onClick: (orbitIndex: number) => void;
  selected: boolean;
}

export default function Electron({
  orbitRadius,
  orbitInclination,
  orbitIndex,
  electronIndex,
  totalElectronsInOrbit,
  eccentricity,
  color,
  speed,
  onClick,
  selected,
}: ElectronProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const phaseOffset = totalElectronsInOrbit > 0
    ? (electronIndex / totalElectronsInOrbit) * Math.PI * 2
    : 0;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const time = clock.getElapsedTime() * speed + phaseOffset;

    const a = orbitRadius;
    const b = orbitRadius * (1 - eccentricity);
    const x = a * Math.cos(time);
    const z = b * Math.sin(time);

    const rotatedX = x;
    const rotatedY = z * Math.sin(orbitInclination);
    const rotatedZ = z * Math.cos(orbitInclination);

    meshRef.current.position.set(rotatedX, rotatedY, rotatedZ);

    if (lightRef.current) {
      lightRef.current.position.copy(meshRef.current.position);
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick(orbitIndex);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[selected ? 0.14 : 0.08, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected ? 1.5 : 0.8}
        />
      </mesh>

      <pointLight
        ref={lightRef}
        color={color}
        intensity={selected ? 3 : 1.5}
        distance={3}
        decay={2}
      />
    </group>
  );
}
