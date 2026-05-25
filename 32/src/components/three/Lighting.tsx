import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../../store/useSceneStore';

export default function Lighting() {
  const directionalRef = useRef<THREE.DirectionalLight>(null);
  const setSunPosition = useSceneStore((state) => state.setSunPosition);

  useFrame(({ clock }) => {
    if (directionalRef.current) {
      const t = clock.getElapsedTime() * 0.1;
      directionalRef.current.position.x = Math.cos(t) * 10;
      directionalRef.current.position.z = Math.sin(t) * 10;
      directionalRef.current.position.y = 3;
      setSunPosition({
        x: directionalRef.current.position.x,
        y: directionalRef.current.position.y,
        z: directionalRef.current.position.z,
      });
    }
  });

  return (
    <>
      <ambientLight intensity={0.1} color="#223344" />
      <directionalLight
        ref={directionalRef}
        intensity={2.5}
        color="#ffffff"
        position={[10, 3, 5]}
        castShadow
      />
    </>
  );
}
