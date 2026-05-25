import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Satellite({ offset, orbitRadius }: { offset: number; orbitRadius: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime() * 0.5 + offset;
      groupRef.current.position.x = Math.cos(t) * orbitRadius;
      groupRef.current.position.z = Math.sin(t) * orbitRadius;
      groupRef.current.rotation.y = t;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[0.08, 0.08, 0.12]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.15, 0, 0]}>
        <boxGeometry args={[0.2, 0.01, 0.08]} />
        <meshStandardMaterial color="#1a5276" metalness={0.5} />
      </mesh>
      <mesh position={[-0.15, 0, 0]}>
        <boxGeometry args={[0.2, 0.01, 0.08]} />
        <meshStandardMaterial color="#1a5276" metalness={0.5} />
      </mesh>
    </group>
  );
}

export default function Satellites() {
  const orbitRadius = 3.2;

  const orbitPoints = useMemo(() => {
    const points: [number, number, number][] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      points.push([Math.cos(t) * orbitRadius, 0, Math.sin(t) * orbitRadius]);
    }
    return points;
  }, []);

  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(orbitPoints.flat()), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#4a90d9" transparent opacity={0.4} />
      </line>
      <Satellite offset={0} orbitRadius={orbitRadius} />
      <Satellite offset={(Math.PI * 2) / 3} orbitRadius={orbitRadius} />
      <Satellite offset={(Math.PI * 4) / 3} orbitRadius={orbitRadius} />
    </group>
  );
}
