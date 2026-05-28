import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BubbleData } from '../../utils/constants';

interface BubbleProps {
  bubbles: BubbleData[];
}

export default function Bubble({ bubbles }: BubbleProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.count = bubbles.length;
    }
  }, [bubbles.length]);

  useFrame(() => {
    if (!meshRef.current) return;

    bubbles.forEach((bubble, i) => {
      dummy.position.set(bubble.position[0], bubble.position[1], bubble.position[2]);
      dummy.scale.setScalar(bubble.size);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, color.set(bubble.color));
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, bubbles.length]}
    >
      <sphereGeometry args={[1, 32, 32]} />
      <meshPhysicalMaterial
        transparent
        opacity={0.6}
        roughness={0.1}
        metalness={0.1}
        transmission={0.9}
        thickness={0.5}
        envMapIntensity={1.0}
        clearcoat={1.0}
        clearcoatRoughness={0.1}
        ior={1.5}
      />
    </instancedMesh>
  );
}
