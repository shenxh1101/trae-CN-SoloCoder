import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '@/store/useStore';
import * as THREE from 'three';

interface SnowmanProps {
  position: [number, number, number];
}

export default function Snowman({ position }: SnowmanProps) {
  const rightArmRef = useRef<THREE.Group>(null);
  const waveStartRef = useRef<number | null>(null);
  const isNight = useStore((s) => s.isNight);
  const setSnowmanWaving = useStore((s) => s.setSnowmanWaving);

  useFrame(({ clock }) => {
    const waving = useStore.getState().snowmanWaving;

    if (waving && rightArmRef.current) {
      if (waveStartRef.current === null) {
        waveStartRef.current = clock.getElapsedTime();
      }
      const elapsed = clock.getElapsedTime() - waveStartRef.current;
      if (elapsed >= 2) {
        useStore.getState().setSnowmanWaving(false);
        waveStartRef.current = null;
        rightArmRef.current.rotation.z = 0;
        return;
      }
      rightArmRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 5) * 0.6;
    } else if (!waving && rightArmRef.current) {
      rightArmRef.current.rotation.z = 0;
      waveStartRef.current = null;
    }
  });

  const scarfColor = isNight ? '#ff3333' : '#cc0000';

  return (
    <group position={position} onClick={() => setSnowmanWaving(true)}>
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="white" />
      </mesh>

      <mesh position={[0, 2.7, 0]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial color="white" />
      </mesh>

      <mesh position={[0, 3.9, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="white" />
      </mesh>

      <mesh position={[0, 3.9, 0.75]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.08, 0.5, 16]} />
        <meshStandardMaterial color="orange" />
      </mesh>

      <mesh position={[-0.15, 4.05, 0.45]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>

      <mesh position={[0.15, 4.05, 0.45]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>

      <mesh position={[0, 3.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.08, 16, 32]} />
        <meshStandardMaterial color={scarfColor} />
      </mesh>

      <mesh position={[-1.2, 2.9, 0]} rotation={[0, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.04, 0.04, 1, 8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      <group position={[0.7, 2.7, 0]} ref={rightArmRef}>
        <mesh position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 1, 8]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
      </group>
    </group>
  );
}
