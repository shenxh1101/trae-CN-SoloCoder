import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Seabed from './Seabed';
import Seaweed from './Seaweed';
import FishSchool from './FishSchool';
import Bubbles from './Bubbles';
import Plankton from './Plankton';
import Diver from './Diver';
import LightRays from './LightRays';
import TestValidator from './TestValidator';
import { useOceanStore } from '@/store/useOceanStore';
import { BACKGROUND_COLORS, FOG_COLORS, BackgroundType } from '@/types';

function SceneSetup() {
  const { scene } = useThree();
  const backgroundType = useOceanStore((state) => state.backgroundType);
  const autoRotate = useOceanStore((state) => state.autoRotate);
  const autoRotateSpeed = useOceanStore((state) => state.autoRotateSpeed);
  const controlsRef = useRef<any>(null);

  const bgColor = useMemo(() => new THREE.Color(BACKGROUND_COLORS['deep']), []);
  const initialized = useRef(false);
  const prevBgType = useRef<BackgroundType>('deep');

  useFrame(() => {
    if (!initialized.current) {
      scene.background = bgColor;
      scene.fog = new THREE.Fog(FOG_COLORS['deep'], 20, 60);
      initialized.current = true;
    }
    if (prevBgType.current !== backgroundType) {
      bgColor.set(BACKGROUND_COLORS[backgroundType]);
      scene.background = bgColor;
      scene.fog = new THREE.Fog(FOG_COLORS[backgroundType], 20, 60);
      prevBgType.current = backgroundType;
    }
  });

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={40}
        autoRotate={autoRotate}
        autoRotateSpeed={autoRotateSpeed}
        maxPolarAngle={Math.PI / 2 + 0.3}
        minPolarAngle={0.2}
      />
      
      <ambientLight intensity={0.4} color="#88ccff" />
      
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        color="#ffffee"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#88ccff" distance={30} />
      <pointLight position={[-15, 0, -15]} intensity={0.3} color="#6699cc" distance={25} />
      <pointLight position={[15, 0, 15]} intensity={0.3} color="#6699cc" distance={25} />
    </>
  );
}

export default function OceanWorld() {
  return (
    <Canvas
      camera={{ position: [0, 5, 20], fov: 60, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      shadows
    >
      <SceneSetup />
      <TestValidator />
      <Seabed />
      <Seaweed />
      <FishSchool />
      <Bubbles />
      <Plankton />
      <Diver />
      <LightRays />
    </Canvas>
  );
}
