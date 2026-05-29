import { useThree } from '@react-three/fiber';
import { useStore } from '@/store/useStore';
import { useEffect } from 'react';
import * as THREE from 'three';

export default function Lighting() {
  const isNight = useStore((s) => s.isNight);
  const { scene } = useThree();

  useEffect(() => {
    scene.fog = null;
    if (isNight) {
      scene.background = new THREE.Color('#0a0a1a');
    } else {
      scene.background = new THREE.Color('#87CEEB');
    }
  }, [isNight, scene]);

  const ambientIntensity = isNight ? 0.15 : 0.6;
  const ambientColor = isNight ? '#1a1a3e' : '#ffffff';
  const directionalIntensity = isNight ? 0.3 : 1.0;
  const directionalColor = isNight ? '#4a5568' : '#ffffff';

  return (
    <>
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={directionalIntensity}
        color={directionalColor}
        castShadow
      />
      {isNight && (
        <>
          <pointLight position={[-10, 5, -10]} intensity={0.3} color="#6366f1" />
          <pointLight position={[10, 5, 10]} intensity={0.2} color="#fbbf24" />
        </>
      )}
    </>
  );
}
