import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMemo } from 'react';

export default function Clouds() {
  const meshRef = useRef<THREE.Mesh>(null);

  const cloudTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load('https://unpkg.com/three-globe@2.24.13/example/img/earth-clouds.png');
    return tex;
  }, []);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2.01, 64, 64]} />
      <meshPhongMaterial
        map={cloudTexture}
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </mesh>
  );
}
