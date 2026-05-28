import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Diver() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const time = clock.getElapsedTime();
      groupRef.current.position.y = -5.5 + Math.sin(time * 0.5) * 0.1;
      groupRef.current.rotation.y = Math.sin(time * 0.3) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[12, -5.5, 0]} scale={0.8}>
      <mesh position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.35, 0.8, 8, 16]} />
        <meshStandardMaterial color="#1a5a8a" roughness={0.6} />
      </mesh>
      
      <mesh position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#ffcc99" roughness={0.8} />
      </mesh>
      
      <mesh position={[0, 1.4, 0.28]}>
        <sphereGeometry args={[0.2, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#333333" transparent opacity={0.3} />
      </mesh>
      
      <mesh position={[0, 1.55, 0.25]}>
        <boxGeometry args={[0.25, 0.08, 0.05]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      
      <mesh position={[0, 1.7, -0.2]}>
        <cylinderGeometry args={[0.12, 0.15, 0.15, 16]} />
        <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.3} />
      </mesh>
      
      <mesh position={[0.35, 0.5, 0]} rotation={[0, 0, -0.5]}>
        <capsuleGeometry args={[0.08, 0.5, 8, 16]} />
        <meshStandardMaterial color="#1a5a8a" roughness={0.6} />
      </mesh>
      
      <mesh position={[-0.35, 0.5, 0]} rotation={[0, 0, 0.5]}>
        <capsuleGeometry args={[0.08, 0.5, 8, 16]} />
        <meshStandardMaterial color="#1a5a8a" roughness={0.6} />
      </mesh>
      
      <mesh position={[0.6, 0.2, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#ffcc99" roughness={0.8} />
      </mesh>
      
      <mesh position={[-0.6, 0.2, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#ffcc99" roughness={0.8} />
      </mesh>
      
      <mesh position={[0.2, -0.2, 0]} rotation={[0, 0, 0.2]}>
        <capsuleGeometry args={[0.1, 0.6, 8, 16]} />
        <meshStandardMaterial color="#1a5a8a" roughness={0.6} />
      </mesh>
      
      <mesh position={[-0.2, -0.2, 0]} rotation={[0, 0, -0.2]}>
        <capsuleGeometry args={[0.1, 0.6, 8, 16]} />
        <meshStandardMaterial color="#1a5a8a" roughness={0.6} />
      </mesh>
      
      <mesh position={[0.3, -0.6, 0]}>
        <boxGeometry args={[0.15, 0.3, 0.4]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      
      <mesh position={[-0.3, -0.6, 0]}>
        <boxGeometry args={[0.15, 0.3, 0.4]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      
      <mesh position={[0, -0.2, -0.4]}>
        <boxGeometry args={[0.5, 0.7, 0.25]} />
        <meshStandardMaterial color="#4a90d9" metalness={0.3} roughness={0.5} />
      </mesh>
      
      <mesh position={[0.65, 0.3, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
        <meshStandardMaterial color="#666666" metalness={0.9} />
      </mesh>
      
      <mesh position={[0.9, 0.3, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#88ccff" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
