import { useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Effects } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { CubeFace } from '../types';
import { StyledCube } from './StyledCube';
import { Starfield } from './Starfield';

interface Scene3DProps {
  faceStyles: any;
  styleIntensity: number;
  contentImage: string | null;
  backgroundType: 'solid' | 'stars';
  autoRotate: boolean;
  rotationSpeed: number;
  onFaceClick?: (face: CubeFace) => void;
}

function SceneContent({
  faceStyles,
  styleIntensity,
  contentImage,
  backgroundType,
  autoRotate,
  rotationSpeed,
  onFaceClick,
}: Scene3DProps) {
  const { scene } = useThree();

  if (backgroundType === 'solid') {
    scene.background = new THREE.Color('#0a0a1a');
  } else {
    scene.background = new THREE.Color('#050510');
  }

  return (
    <>
      {backgroundType === 'stars' && <Starfield count={4000} speed={0.3} />}

      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
      <pointLight position={[-10, -10, 10]} intensity={0.5} color="#8b5cf6" />
      <pointLight position={[0, -10, -10]} intensity={0.5} color="#06b6d4" />

      <StyledCube
        faceStyles={faceStyles}
        styleIntensity={styleIntensity}
        contentImage={contentImage}
        autoRotate={autoRotate}
        rotationSpeed={rotationSpeed}
        onFaceClick={onFaceClick}
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={15}
        autoRotate={false}
        enablePan={false}
      />

      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={0.5} />
        <Vignette offset={0.5} darkness={0.5} />
      </EffectComposer>
    </>
  );
}

export function Scene3D(props: Scene3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 60 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      dpr={[1, 2]}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}
