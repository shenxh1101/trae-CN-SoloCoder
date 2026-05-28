import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FishData } from '@/types';

interface FishProps {
  data: FishData;
  onClick: (data: FishData) => void;
}

export default function Fish({ data, onClick }: FishProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const leftFinRef = useRef<THREE.Mesh>(null);
  const rightFinRef = useRef<THREE.Mesh>(null);

  const fishGeometry = useMemo(() => {
    const bodyGeo = new THREE.SphereGeometry(1, 32, 16);
    bodyGeo.scale(1, 0.6, 0.5);
    
    const tailGeo = new THREE.ConeGeometry(0.5, 0.8, 8);
    tailGeo.rotateZ(Math.PI / 2);
    tailGeo.translate(-1.2, 0, 0);
    
    const finGeo = new THREE.ConeGeometry(0.25, 0.5, 8);
    
    return { bodyGeo, tailGeo, finGeo };
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    
    const time = clock.getElapsedTime() * data.speed;
    const angle = time * 0.5 + data.pathOffset;
    
    const x = Math.cos(angle) * data.pathRadius;
    const z = Math.sin(angle) * data.pathRadius;
    const y = Math.sin(time * 0.7) * data.pathHeight + data.pathHeight;
    
    groupRef.current.position.set(x, y, z);
    
    const nextAngle = angle + 0.01;
    const nextX = Math.cos(nextAngle) * data.pathRadius;
    const nextZ = Math.sin(nextAngle) * data.pathRadius;
    groupRef.current.lookAt(nextX, y, nextZ);
    
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(time * 8) * 0.5;
    }
    
    if (leftFinRef.current && rightFinRef.current) {
      const finWave = Math.sin(time * 6) * 0.3;
      leftFinRef.current.rotation.z = finWave;
      rightFinRef.current.rotation.z = -finWave;
    }
  });

  return (
    <group
      ref={groupRef}
      scale={data.size}
      onClick={(e) => {
        e.stopPropagation();
        onClick(data);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <mesh ref={bodyRef} geometry={fishGeometry.bodyGeo} castShadow>
        <meshStandardMaterial color={data.color} roughness={0.3} metalness={0.2} />
      </mesh>
      
      <mesh ref={tailRef} geometry={fishGeometry.tailGeo} castShadow>
        <meshStandardMaterial color={data.secondaryColor} roughness={0.3} />
      </mesh>
      
      <mesh
        ref={leftFinRef}
        geometry={fishGeometry.finGeo}
        position={[0.3, 0.2, 0.4]}
        rotation={[0, 0, Math.PI / 4]}
        castShadow
      >
        <meshStandardMaterial color={data.secondaryColor} roughness={0.4} />
      </mesh>
      
      <mesh
        ref={rightFinRef}
        geometry={fishGeometry.finGeo}
        position={[0.3, 0.2, -0.4]}
        rotation={[0, 0, -Math.PI / 4]}
        castShadow
      >
        <meshStandardMaterial color={data.secondaryColor} roughness={0.4} />
      </mesh>
      
      <mesh position={[0.5, 0.15, 0.15]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[0.52, 0.17, 0.17]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      <mesh position={[0.5, 0.15, -0.15]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[0.52, 0.17, -0.17]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {data.type === 'clownfish' && (
        <>
          <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.3, 0.04, 8, 16]} />
            <meshStandardMaterial color={data.secondaryColor} />
          </mesh>
          <mesh position={[-0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.28, 0.04, 8, 16]} />
            <meshStandardMaterial color={data.secondaryColor} />
          </mesh>
        </>
      )}
    </group>
  );
}
