import { useMemo } from 'react';
import * as THREE from 'three';

interface NucleusProps {
  color: string;
  size: number;
  nucleonCount?: number;
}

export default function Nucleus({ color, size, nucleonCount = 6 }: NucleusProps) {
  const nucleons = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    
    for (let i = 0; i < Math.min(nucleonCount, 30); i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.5) * 0.3 * size;
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      positions.push(new THREE.Vector3(x, y, z));
    }
    return positions;
  }, [size, nucleonCount]);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.4 * size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>
      
      {nucleons.map((pos, i) => (
        <mesh key={i} position={[pos.x, pos.y, pos.z]}>
          <sphereGeometry args={[0.12 * size, 16, 16]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
      
      <pointLight
        color={color}
        intensity={2}
        distance={5}
        decay={2}
      />
    </group>
  );
}
