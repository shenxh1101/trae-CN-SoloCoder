import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore } from '../../store/useSceneStore';
import { majorCities } from '../../data/cities';
import { latLngToVector3 } from '../../utils/coords';
import Earth from './Earth';
import Clouds from './Clouds';
import Stars from './Stars';
import Satellites from './Satellites';
import Lighting from './Lighting';

interface CameraControllerProps {
  earthRef: React.MutableRefObject<THREE.Group | null>;
}

const CameraController = forwardRef<any, CameraControllerProps>(({ earthRef }, ref) => {
  const { camera } = useThree();
  const isAnimating = useSceneStore((state) => state.isAnimating);
  const currentTargetCity = useSceneStore((state) => state.currentTargetCity);
  const setCameraPosition = useSceneStore((state) => state.setCameraPosition);
  const setIsAnimating = useSceneStore((state) => state.setIsAnimating);
  const setCurrentTargetCity = useSceneStore((state) => state.setCurrentTargetCity);
  const controlsRef = useRef<any>(null);

  useImperativeHandle(ref, () => controlsRef.current);

  const animationRef = useRef({
    startTime: 0,
    phase: 'idle' as 'idle' | 'going' | 'holding' | 'returning',
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    holdStartPos: new THREE.Vector3(),
  });

  useEffect(() => {
    if (isAnimating && currentTargetCity) {
      animationRef.current.startPos.copy(camera.position);
      animationRef.current.startTime = performance.now();
      animationRef.current.phase = 'going';
    }
  }, [isAnimating, currentTargetCity, camera]);

  useFrame(() => {
    setCameraPosition({
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    });

    if (isAnimating && currentTargetCity) {
      const elapsed = (performance.now() - animationRef.current.startTime) / 1000;

      if (animationRef.current.phase === 'going') {
        const duration = 2;
        if (elapsed < duration) {
          const t = elapsed / duration;
          const easeT = 1 - Math.pow(1 - t, 3);
          
          const localTarget = latLngToVector3(currentTargetCity.lat, currentTargetCity.lng, 2.02);
          const worldTarget = localTarget.clone();
          if (earthRef.current) {
            earthRef.current.localToWorld(worldTarget);
          }
          
          const direction = worldTarget.clone().normalize();
          const targetCameraPos = direction.multiplyScalar(3.5);
          
          camera.position.lerpVectors(
            animationRef.current.startPos,
            targetCameraPos,
            easeT
          );
          
          if (controlsRef.current) {
            controlsRef.current.target.lerp(worldTarget, 0.1);
          }
        } else {
          const localTarget = latLngToVector3(currentTargetCity.lat, currentTargetCity.lng, 2.02);
          const worldTarget = localTarget.clone();
          if (earthRef.current) {
            earthRef.current.localToWorld(worldTarget);
          }
          const direction = worldTarget.clone().normalize();
          const targetCameraPos = direction.multiplyScalar(3.5);
          
          camera.position.copy(targetCameraPos);
          if (controlsRef.current) {
            controlsRef.current.target.copy(worldTarget);
          }
          
          animationRef.current.holdStartPos.copy(camera.position);
          animationRef.current.phase = 'holding';
          animationRef.current.startTime = performance.now();
        }
      } else if (animationRef.current.phase === 'holding') {
        if (elapsed > 3) {
          animationRef.current.phase = 'returning';
          animationRef.current.startPos.copy(camera.position);
          animationRef.current.endPos.set(0, 0, 6);
          animationRef.current.startTime = performance.now();
        } else {
          const localTarget = latLngToVector3(currentTargetCity.lat, currentTargetCity.lng, 2.02);
          const worldTarget = localTarget.clone();
          if (earthRef.current) {
            earthRef.current.localToWorld(worldTarget);
          }
          const direction = worldTarget.clone().normalize();
          const targetCameraPos = direction.multiplyScalar(3.5);
          
          camera.position.lerp(targetCameraPos, 0.1);
          if (controlsRef.current) {
            controlsRef.current.target.lerp(worldTarget, 0.1);
          }
        }
      } else if (animationRef.current.phase === 'returning') {
        const duration = 2;
        if (elapsed < duration) {
          const t = elapsed / duration;
          const easeT = 1 - Math.pow(1 - t, 3);
          camera.position.lerpVectors(
            animationRef.current.startPos,
            animationRef.current.endPos,
            easeT
          );
          if (controlsRef.current) {
            controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), 0.1);
          }
        } else {
          camera.position.copy(animationRef.current.endPos);
          if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, 0);
          }
          animationRef.current.phase = 'idle';
          setIsAnimating(false);
          setCurrentTargetCity(null);
        }
      }
    }

    controlsRef.current?.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={3}
      maxDistance={15}
      enablePan={false}
    />
  );
});

CameraController.displayName = 'CameraController';

function FPSMonitor() {
  const setFps = useSceneStore((state) => state.setFps);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frameCount.current++;
    const now = performance.now();
    if (now - lastTime.current >= 1000) {
      setFps(frameCount.current);
      frameCount.current = 0;
      lastTime.current = now;
    }
  });

  return null;
}

export default function Scene() {
  const earthRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const handleFlyToRandomCity = () => {
      const randomIndex = Math.floor(Math.random() * majorCities.length);
      const randomCity = majorCities[randomIndex];
      const store = useSceneStore.getState();
      store.setCurrentTargetCity(randomCity);
      store.setIsAnimating(true);
    };

    (window as any).flyToRandomCity = handleFlyToRandomCity;
    return () => {
      delete (window as any).flyToRandomCity;
    };
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 60 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ background: '#050510' }}
    >
      <CameraController ref={controlsRef} earthRef={earthRef} />
      <FPSMonitor />
      <Lighting />
      <Stars />
      <Earth earthRef={earthRef} />
      <Clouds />
      <Satellites />
    </Canvas>
  );
}
