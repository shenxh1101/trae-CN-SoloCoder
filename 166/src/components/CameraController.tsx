import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useStore } from '@/store/useStore';
import * as THREE from 'three';

export default function CameraController() {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const isAutoOrbit = useStore((s) => s.isAutoOrbit);
  const isDragging = useRef(false);
  const angleRef = useRef(0);

  useEffect(() => {
    camera.position.set(15, 12, 15);
    camera.lookAt(0, 3, 0);
    angleRef.current = Math.atan2(camera.position.z, camera.position.x);
  }, [camera]);

  useFrame((_, delta) => {
    if (isAutoOrbit && controlsRef.current && !isDragging.current) {
      angleRef.current += delta * 0.2;
      const radius = 20;
      const height = 12;
      camera.position.x = Math.cos(angleRef.current) * radius;
      camera.position.z = Math.sin(angleRef.current) * radius;
      camera.position.y = height;
      camera.lookAt(0, 3, 0);
    }
  });

  const handleStart = () => {
    isDragging.current = true;
  };

  const handleEnd = () => {
    isDragging.current = false;
    if (controlsRef.current) {
      angleRef.current = Math.atan2(camera.position.z, camera.position.x);
    }
  };

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      minDistance={8}
      maxDistance={40}
      maxPolarAngle={Math.PI / 2.1}
      minPolarAngle={Math.PI / 6}
      onStart={handleStart}
      onEnd={handleEnd}
      target={[0, 3, 0]}
    />
  );
}
