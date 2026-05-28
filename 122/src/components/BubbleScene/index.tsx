import { useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { SCENE_CONSTANTS } from '../../utils/constants';
import { getBackgroundColor, getFogColor } from '../../utils/colors';
import { useBubbleStore } from '../../store/useBubbleStore';
import { useBubbles } from '../../hooks/useBubbles';
import Bubble from './Bubble';
import Connections from './Connections';
import Particles from './Particles';

interface SceneContentProps {
  onBubbleCountChange?: (count: number) => void;
}

function SceneContent({ onBubbleCountChange }: SceneContentProps) {
  const { bubbles, particles, updateBubbles, updateParticles, popBubble } = useBubbles();
  const timeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const { gl, camera } = useThree();
  const domElement = gl.domElement;

  const {
    backgroundColor,
    bloomEnabled,
    autoRotate,
    connectionsEnabled,
    audioManager,
  } = useBubbleStore();

  useEffect(() => {
    gl.setClearColor(getBackgroundColor(backgroundColor));
  }, [gl, backgroundColor]);

  useEffect(() => {
    if (onBubbleCountChange) {
      onBubbleCountChange(bubbles.length);
    }
  }, [bubbles.length, onBubbleCountChange]);

  const handleClick = useCallback((event: MouseEvent) => {
    const rect = domElement.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);

    let closestBubble: { id: number; distance: number } | null = null;
    const sphere = new THREE.Sphere();
    const intersectPoint = new THREE.Vector3();

    bubbles.forEach((bubble) => {
      sphere.center.set(
        bubble.position[0],
        bubble.position[1],
        bubble.position[2]
      );
      sphere.radius = bubble.size;

      if (raycasterRef.current.ray.intersectSphere(sphere, intersectPoint)) {
        const distance = raycasterRef.current.ray.origin.distanceTo(intersectPoint);
        if (!closestBubble || distance < closestBubble.distance) {
          closestBubble = { id: bubble.id, distance };
        }
      }
    });

    if (closestBubble) {
      audioManager.init();
      audioManager.playPopSound();
      popBubble(closestBubble.id);
    }
  }, [bubbles, camera, domElement, audioManager, popBubble]);

  useEffect(() => {
    domElement.addEventListener('click', handleClick);
    return () => domElement.removeEventListener('click', handleClick);
  }, [handleClick, domElement]);

  useFrame((state, delta) => {
    timeRef.current += delta;
    const deltaTime = timeRef.current - lastTimeRef.current;
    lastTimeRef.current = timeRef.current;

    updateBubbles(timeRef.current);
    updateParticles(deltaTime);
  });

  const fogColor = getFogColor(backgroundColor);

  return (
    <>
      <fog attach="fog" args={[fogColor, 20, 120]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[20, 20, 20]} intensity={1} color="#ffffff" />
      <pointLight position={[-20, -10, -20]} intensity={0.5} color="#88ccff" />
      <pointLight position={[0, 10, -15]} intensity={0.8} color="#ffcc88" />

      <Bubble bubbles={bubbles} />
      <Connections bubbles={bubbles} enabled={connectionsEnabled} />
      <Particles particles={particles} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        minDistance={20}
        maxDistance={120}
      />

      {bloomEnabled && (
        <EffectComposer>
          <Bloom
            intensity={0.6}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      )}
    </>
  );
}

interface BubbleSceneProps {
  onBubbleCountChange?: (count: number) => void;
}

export default function BubbleScene({ onBubbleCountChange }: BubbleSceneProps) {
  const { backgroundColor } = useBubbleStore();
  const { CAMERA } = SCENE_CONSTANTS;

  return (
    <Canvas
      camera={{
        position: CAMERA.INITIAL_POSITION,
        fov: CAMERA.FOV,
        near: CAMERA.NEAR,
        far: CAMERA.FAR,
      }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ background: getBackgroundColor(backgroundColor) }}
    >
      <SceneContent onBubbleCountChange={onBubbleCountChange} />
    </Canvas>
  );
}
