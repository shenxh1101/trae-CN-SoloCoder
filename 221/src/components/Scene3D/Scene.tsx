import { useRef, useCallback, useEffect, MutableRefObject } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Creature } from './Creature';
import { Environment } from './Environment';
import { useCreatureStore } from '../../store/useCreatureStore';
import { BodyPartType } from '../../types/creature';
import { CAMERA_CONFIG } from '../../constants/creatureConfig';

export interface SceneApi {
  gl: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  creatureGroup: THREE.Group | null;
}

interface SceneContentProps {
  sceneApiRef: MutableRefObject<SceneApi>;
  onCreatureGroupReady: (group: THREE.Group | null) => void;
}

function SceneContent({ sceneApiRef, onCreatureGroupReady }: SceneContentProps) {
  const { gl, scene, camera } = useThree();
  const controlsRef = useRef<any>(null);

  const {
    currentCreature,
    animationEnabled,
    isEvolving,
    autoRotate,
    feedbackEffect,
    toggleLock,
  } = useCreatureStore();

  useEffect(() => {
    sceneApiRef.current.gl = gl;
    sceneApiRef.current.scene = scene;
    sceneApiRef.current.camera = camera;
  }, [gl, scene, camera, sceneApiRef]);

  const handlePartClick = useCallback(
    (type: string) => {
      toggleLock(type as BodyPartType);
    },
    [toggleLock],
  );

  const handleGroupReady = useCallback(
    (group: THREE.Group | null) => {
      sceneApiRef.current.creatureGroup = group;
      onCreatureGroupReady(group);
    },
    [sceneApiRef, onCreatureGroupReady],
  );

  if (!currentCreature) return null;

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={CAMERA_CONFIG.minDistance}
        maxDistance={CAMERA_CONFIG.maxDistance}
        autoRotate={autoRotate}
        autoRotateSpeed={CAMERA_CONFIG.autoRotateSpeed * 60}
        enablePan={false}
      />

      <Environment />

      <Creature
        genome={currentCreature}
        animationEnabled={animationEnabled}
        isEvolving={isEvolving}
        feedbackEffect={feedbackEffect}
        onPartClick={handlePartClick}
        onGroupReady={handleGroupReady}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          height={300}
          intensity={0.5}
        />
      </EffectComposer>
    </>
  );
}

interface SceneProps {
  sceneApiRef: MutableRefObject<SceneApi>;
}

export function Scene({ sceneApiRef }: SceneProps) {
  const onCreatureGroupReady = useCallback((_group: THREE.Group | null) => {}, []);

  return (
    <Canvas
      camera={{
        fov: 60,
        near: 0.1,
        far: 1000,
        position: [
          CAMERA_CONFIG.initialDistance * Math.sin(CAMERA_CONFIG.initialPolarAngle),
          CAMERA_CONFIG.initialDistance * Math.cos(CAMERA_CONFIG.initialPolarAngle),
          CAMERA_CONFIG.initialDistance * Math.sin(CAMERA_CONFIG.initialPolarAngle),
        ],
      }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      shadows
      dpr={[1, 2]}
    >
      <color attach="background" args={['#0a0e1a']} />
      <fog attach="fog" args={['#0a0e1a', 20, 80]} />
      <SceneContent sceneApiRef={sceneApiRef} onCreatureGroupReady={onCreatureGroupReady} />
    </Canvas>
  );
}
