import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCloudStore } from '@/store/useCloudStore';

export default function CameraController() {
  const { camera, gl } = useThree();
  const { cameraMode, setCameraPosition } = useCloudStore();
  const keysRef = useRef<Record<string, boolean>>({});
  const orbitAngleRef = useRef(0);
  const orbitRadius = 40;
  const orbitHeight = 20;
  const moveSpeed = 0.5;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    const canvas = gl.domElement;
    canvas.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('keyup', handleKeyUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      canvas.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gl]);

  useFrame((_, delta) => {
    if (cameraMode === 'orbit') {
      orbitAngleRef.current += delta * 0.15;
      const angle = orbitAngleRef.current;
      const x = Math.cos(angle) * orbitRadius;
      const z = Math.sin(angle) * orbitRadius;
      camera.position.lerp(new THREE.Vector3(x, orbitHeight, z), 0.02);
      camera.lookAt(0, 5, 0);
    } else {
      const keys = keysRef.current;
      const direction = new THREE.Vector3();
      const right = new THREE.Vector3();

      camera.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();
      right.crossVectors(direction, camera.up).normalize();

      if (keys['w'] || keys['arrowup']) {
        camera.position.addScaledVector(direction, moveSpeed);
      }
      if (keys['s'] || keys['arrowdown']) {
        camera.position.addScaledVector(direction, -moveSpeed);
      }
      if (keys['a'] || keys['arrowleft']) {
        camera.position.addScaledVector(right, -moveSpeed);
      }
      if (keys['d'] || keys['arrowright']) {
        camera.position.addScaledVector(right, moveSpeed);
      }
      if (keys['q'] || keys[' ']) {
        camera.position.y += moveSpeed * 0.5;
      }
      if (keys['e'] || keys['shift']) {
        camera.position.y -= moveSpeed * 0.5;
      }
    }

    setCameraPosition(camera.position.x, camera.position.y, camera.position.z);
  });

  return null;
}
