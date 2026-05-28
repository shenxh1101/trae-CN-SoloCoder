import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SeaweedProps {
  position: [number, number, number];
  height?: number;
  color?: string;
  swaySpeed?: number;
}

function SingleSeaweed({ position, height = 4, color = '#3cb371', swaySpeed = 1 }: SeaweedProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeOffset = useRef(Math.random() * Math.PI * 2);

  const geometry = useMemo(() => {
    const geo = new THREE.ConeGeometry(0.3, height, 8, 12);
    geo.translate(0, height / 2, 0);
    
    const positions = geo.attributes.position;
    const originalPositions = new Float32Array(positions.array);
    
    for (let i = 0; i < positions.count; i++) {
      const y = originalPositions[i * 3 + 1];
      (positions.array as Float32Array)[i * 3 + 2] = y * 0.1 * Math.sin(y * 2);
    }
    
    return geo;
  }, [height]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const time = clock.getElapsedTime() * swaySpeed + timeOffset.current;
      const swayAmount = 0.15;
      meshRef.current.rotation.x = Math.sin(time * 0.8) * swayAmount;
      meshRef.current.rotation.z = Math.cos(time * 0.6) * swayAmount * 0.8;
    }
  });

  return (
    <mesh ref={meshRef} position={position} geometry={geometry} castShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.8}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default function Seaweed() {
  const seaweedConfigs = useMemo(() => {
    const configs: SeaweedProps[] = [];
    const colors = ['#2d8a5e', '#3cb371', '#4cd98a', '#2a7a52', '#5ce099'];
    
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 25;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const baseY = Math.sin(x * 0.3) * Math.cos(z * 0.3) * 1.5 + 
                    Math.sin(x * 0.1 + z * 0.1) * 2 - 8;
      
      configs.push({
        position: [x, baseY, z],
        height: 2 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        swaySpeed: 0.5 + Math.random() * 1,
      });
    }
    return configs;
  }, []);

  return (
    <group>
      {seaweedConfigs.map((config, i) => (
        <SingleSeaweed key={i} {...config} />
      ))}
    </group>
  );
}
