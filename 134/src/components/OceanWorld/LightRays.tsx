import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useOceanStore } from '@/store/useOceanStore';

export default function LightRays() {
  const groupRef = useRef<THREE.Group>(null);
  const enabled = useOceanStore((state) => state.sunRaysEnabled);

  const rayConfigs = useMemo(() => {
    const configs = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 3 + Math.random() * 5;
      configs.push({
        position: [
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius,
        ] as [number, number, number],
        rotation: [
          Math.PI / 2 + (Math.random() - 0.5) * 0.3,
          0,
          angle + Math.random() * 0.2,
        ] as [number, number, number],
        height: 15 + Math.random() * 5,
        opacity: 0.08 + Math.random() * 0.05,
        width: 1 + Math.random() * 1.5,
        speed: 0.5 + Math.random() * 0.5,
      });
    }
    return configs;
  }, []);

  const spotConfigs = useMemo(() => {
    const spots = [];
    for (let i = 0; i < 5; i++) {
      spots.push({
        position: [
          (Math.random() - 0.5) * 20,
          -5 - Math.random() * 3,
          (Math.random() - 0.5) * 20,
        ] as [number, number, number],
        radius: 2 + Math.random() * 2,
        opacity: 0.05 + Math.random() * 0.05,
      });
    }
    return spots;
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current || !enabled) return;
    
    const time = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      const config = rayConfigs[i];
      if (config && child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshBasicMaterial;
        material.opacity = config.opacity * (0.8 + Math.sin(time * config.speed + i) * 0.2);
      }
    });
  });

  if (!enabled) return null;

  return (
    <group ref={groupRef} position={[0, 10, 0]}>
      {rayConfigs.map((config, i) => (
        <mesh key={i} position={config.position} rotation={config.rotation}>
          <coneGeometry args={[config.width, config.height, 6, 1, true]} />
          <meshBasicMaterial
            color="#ffffcc"
            transparent
            opacity={config.opacity}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
      
      {spotConfigs.map((spot, i) => (
        <mesh key={`spot-${i}`} position={spot.position}>
          <circleGeometry args={[spot.radius, 32]} />
          <meshBasicMaterial
            color="#ffffaa"
            transparent
            opacity={spot.opacity}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}
