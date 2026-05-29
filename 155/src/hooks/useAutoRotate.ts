import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface UseAutoRotateProps {
  enabled: boolean;
  speed?: number;
}

export function useAutoRotate({ enabled, speed = 0.15 }: UseAutoRotateProps) {
  const { camera } = useThree();
  const angleRef = useRef(0);
  const radiusRef = useRef(15);
  const heightRef = useRef(8);

  useEffect(() => {
    if (enabled) {
      const spherical = new THREE.Spherical();
      spherical.setFromVector3(camera.position);
      angleRef.current = spherical.theta;
      radiusRef.current = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
      heightRef.current = camera.position.y;
    }
  }, [enabled, camera.position]);

  useFrame((_, delta) => {
    if (!enabled) return;

    angleRef.current += delta * speed;
    
    const x = Math.sin(angleRef.current) * radiusRef.current;
    const z = Math.cos(angleRef.current) * radiusRef.current;
    
    camera.position.set(x, heightRef.current, z);
    camera.lookAt(0, heightRef.current * 0.4, 0);
  });
}
