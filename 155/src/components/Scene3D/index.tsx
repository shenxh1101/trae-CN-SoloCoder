import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { LightBeams } from './LightBeams';
import { Particles } from './Particles';
import { MirrorGround } from './MirrorGround';
import { useConfig, useBeamData, useScreenshotTrigger } from '../../store/useSceneStore';
import { useAutoRotate } from '../../hooks/useAutoRotate';
import { useScreenshot } from '../../hooks/useScreenshot';
import { BACKGROUND_COLORS } from '../../types';

function SceneContent() {
  const config = useConfig();
  const beamData = useBeamData();
  const screenshotTrigger = useScreenshotTrigger();
  const { scene } = useThree();
  const controlsRef = useRef<any>(null);

  useAutoRotate({ enabled: config.autoRotate, speed: 0.2 });
  useScreenshot(screenshotTrigger);

  useEffect(() => {
    scene.background = new THREE.Color(BACKGROUND_COLORS[config.backgroundColor]);
    
    if (config.enableFog) {
      scene.fog = new THREE.FogExp2(
        BACKGROUND_COLORS[config.backgroundColor],
        0.025
      );
    } else {
      scene.fog = null;
    }
  }, [config.backgroundColor, config.enableFog, scene]);

  useFrame(() => {
    if (controlsRef.current && !config.autoRotate) {
      controlsRef.current.update();
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.6} color="#ffffff" />
      <pointLight position={[-10, 5, -10]} intensity={0.4} color="#8888ff" />
      
      <LightBeams beamData={beamData} config={config} />
      <Particles config={config} count={Math.min(300, config.beamCount / 8)} />
      <MirrorGround config={config} />
      
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.1}
        enabled={!config.autoRotate}
      />
    </>
  );
}

export function Scene3D() {
  const config = useConfig();

  return (
    <Canvas
      camera={{ position: [0, 8, 15], fov: 60 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
      dpr={[1, 2]}
      style={{ background: BACKGROUND_COLORS[config.backgroundColor] }}
    >
      <SceneContent />
    </Canvas>
  );
}
