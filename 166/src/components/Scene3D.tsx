import { Canvas, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useStore } from '@/store/useStore';
import { useEffect } from 'react';
import * as THREE from 'three';
import Ground from './Ground';
import House from './House';
import ChristmasTree from './ChristmasTree';
import Snowman from './Snowman';
import SnowParticles from './SnowParticles';
import CameraController from './CameraController';
import Lighting from './Lighting';

function FogHandler() {
  const { scene } = useThree();
  const fogDensity = useStore((s) => s.fogDensity);
  const isNight = useStore((s) => s.isNight);

  useEffect(() => {
    const fogColor = isNight ? '#0a0a1a' : '#d4e8f7';
    scene.fog = new THREE.FogExp2(fogColor, fogDensity);
  }, [fogDensity, isNight, scene]);

  return null;
}

export default function Scene3D() {
  const isNight = useStore((s) => s.isNight);

  return (
    <Canvas
      shadows
      camera={{ fov: 60, near: 0.1, far: 1000 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
    >
      <FogHandler />
      <Lighting />
      <CameraController />

      <Ground />

      <House position={[-8, 0, -5]} isNight={isNight} rotationY={Math.PI / 4} />
      <House position={[8, 0, -6]} isNight={isNight} rotationY={-Math.PI / 3} />
      <House position={[-6, 0, 8]} isNight={isNight} rotationY={Math.PI / 2} />
      <House position={[10, 0, 6]} isNight={isNight} rotationY={Math.PI} />

      <ChristmasTree position={[-12, 0, 3]} />
      <ChristmasTree position={[12, 0, -2]} />
      <ChristmasTree position={[-3, 0, -10]} />
      <ChristmasTree position={[5, 0, 10]} />

      <Snowman position={[0, 0, 0]} />

      <SnowParticles />

      <EffectComposer>
        <Bloom luminanceThreshold={0.2} intensity={0.6} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
