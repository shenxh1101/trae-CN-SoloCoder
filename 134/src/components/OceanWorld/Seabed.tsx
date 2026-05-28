import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Seabed() {
  const meshRef = useRef<THREE.Mesh>(null);
  const sandRef = useRef<THREE.InstancedMesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(80, 80, 128, 128);
    const positions = geo.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 1.5 + 
                Math.sin(x * 0.1 + y * 0.1) * 2 +
                (Math.random() - 0.5) * 0.3;
      positions.setZ(i, z);
    }
    
    geo.computeVertexNormals();
    return geo;
  }, []);

  const sandPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 35;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.sin(x * 0.3) * Math.cos(z * 0.3) * 1.5 + 
                Math.sin(x * 0.1 + z * 0.1) * 2 - 0.1;
      positions.push([x, y, z]);
    }
    return positions;
  }, []);

  useEffect(() => {
    if (!sandRef.current) return;
    const dummy = new THREE.Object3D();
    sandPositions.forEach((pos, i) => {
      dummy.position.set(pos[0], pos[1] - 8, pos[2]);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      sandRef.current!.setMatrixAt(i, dummy.matrix);
    });
    sandRef.current.instanceMatrix.needsUpdate = true;
  }, [sandPositions]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.y = -8;
    }
  });

  const rockPositions = useMemo(() => {
    const rocks = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 15 + Math.random() * 10;
      rocks.push({
        position: [
          Math.cos(angle) * radius,
          -7.5 + Math.random() * 0.5,
          Math.sin(angle) * radius,
        ] as [number, number, number],
        rotation: [Math.random() * 0.3, Math.random() * Math.PI, 0] as [number, number, number],
        scale: [0.8 + Math.random() * 0.5, 1.5 + Math.random(), 0.8 + Math.random() * 0.5] as [number, number, number],
        key: i,
      });
    }
    return rocks;
  }, []);

  return (
    <group>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow geometry={geometry}>
        <meshStandardMaterial
          color="#2d4a3e"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      <instancedMesh ref={sandRef} args={[undefined, undefined, sandPositions.length]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#c4a35a" roughness={1} />
      </instancedMesh>
      
      {rockPositions.map((rock) => (
        <mesh
          key={rock.key}
          position={rock.position}
          rotation={rock.rotation}
          scale={rock.scale}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#5a7a6a" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
