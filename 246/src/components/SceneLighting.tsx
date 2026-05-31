import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCloudStore } from '@/store/useCloudStore';

export default function SceneLighting() {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const directionalRef = useRef<THREE.DirectionalLight>(null);
  const { analysis } = useCloudStore();
  const { lighting } = analysis;

  const targetAmbientColor = new THREE.Color(lighting.ambientColor);
  const targetDirColor = new THREE.Color(lighting.directionalColor);

  useFrame(() => {
    if (ambientRef.current) {
      ambientRef.current.color.lerp(targetAmbientColor, 0.02);
      ambientRef.current.intensity += (lighting.ambientIntensity - ambientRef.current.intensity) * 0.02;
    }
    if (directionalRef.current) {
      directionalRef.current.color.lerp(targetDirColor, 0.02);
      directionalRef.current.intensity += (lighting.directionalIntensity - directionalRef.current.intensity) * 0.02;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} color={lighting.ambientColor} intensity={lighting.ambientIntensity} />
      <directionalLight
        ref={directionalRef}
        color={lighting.directionalColor}
        intensity={lighting.directionalIntensity}
        position={[30, 50, 20]}
      />
      <hemisphereLight
        color={lighting.directionalColor}
        groundColor={lighting.fogColor}
        intensity={0.3}
      />
      <pointLight position={[0, -5, 0]} color={lighting.ambientColor} intensity={0.1} distance={100} />
    </>
  );
}
