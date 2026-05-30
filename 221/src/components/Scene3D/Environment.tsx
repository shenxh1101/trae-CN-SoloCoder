import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export function Environment() {
  const starsRef = useRef<THREE.Points>(null);
  const platformRef = useRef<THREE.Mesh>(null);

  const starsGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];

    for (let i = 0; i < 2000; i++) {
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
      );

      const brightness = 0.5 + Math.random() * 0.5;
      colors.push(brightness, brightness, brightness);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    return geometry;
  }, []);

  useFrame((_, delta) => {
    if (starsRef.current) {
      starsRef.current.rotation.y += delta * 0.01;
    }
    if (platformRef.current) {
      const mat = platformRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.3 + Math.sin(Date.now() * 0.002) * 0.1;
    }
  });

  return (
    <>
      <hemisphereLight args={[0x4488ff, 0x002244, 0.6]} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-5, 3, -5]} color="#a855f7" intensity={0.5} />
      <pointLight position={[5, 3, 5]} color="#00ffcc" intensity={0.3} />
      <ambientLight intensity={0.2} />

      <points ref={starsRef} geometry={starsGeometry}>
        <pointsMaterial size={0.5} vertexColors transparent opacity={0.8} sizeAttenuation />
      </points>

      <mesh ref={platformRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <circleGeometry args={[3, 64]} />
        <meshBasicMaterial color="#00ffcc" transparent opacity={0.3} side={2} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.01, 0]}>
        <ringGeometry args={[2.8, 3, 64]} />
        <meshBasicMaterial color="#00ffcc" transparent opacity={0.6} side={2} />
      </mesh>
    </>
  );
}
