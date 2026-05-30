import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { BodyPart, GeometryType } from '../../types/creature';
import { GEOMETRY_SEGMENTS } from '../../constants/creatureConfig';

interface CreaturePartProps {
  part: BodyPart;
  onPartClick?: (type: string) => void;
  registerPart?: (type: string, obj: THREE.Object3D | null) => void;
}

function createGeometry(type: GeometryType): THREE.BufferGeometry {
  const segments = GEOMETRY_SEGMENTS[type];
  switch (type) {
    case 'sphere':
      return new THREE.SphereGeometry(0.6, segments, segments);
    case 'cube':
      return new THREE.BoxGeometry(1, 1, 1);
    case 'cone':
      return new THREE.ConeGeometry(0.6, 1.2, segments);
    case 'cylinder':
      return new THREE.CylinderGeometry(0.4, 0.4, 1.2, segments);
    case 'torus':
      return new THREE.TorusGeometry(0.5, 0.2, segments, segments * 2);
    default:
      return new THREE.SphereGeometry(0.6, segments, segments);
  }
}

export function CreaturePart({ part, onPartClick, registerPart }: CreaturePartProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => createGeometry(part.geometry), [part.geometry]);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(part.color),
      metalness: 0.3,
      roughness: 0.5,
      flatShading: true,
    });
  }, [part.color]);

  useEffect(() => {
    if (registerPart && groupRef.current) {
      registerPart(part.type, groupRef.current);
    }
    return () => {
      if (registerPart) {
        registerPart(part.type, null);
      }
    };
  }, [registerPart, part.type]);

  useEffect(() => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.color.set(part.color);
    }
  }, [part.color]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    onPartClick?.(part.type);
  };

  return (
    <group
      ref={groupRef}
      position={part.position}
      rotation={part.rotation}
      scale={part.scale}
    >
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        onClick={handleClick}
        castShadow
        receiveShadow
      >
        {part.locked && (
          <lineSegments>
            <edgesGeometry args={[geometry]} />
            <lineBasicMaterial color="#ffd700" linewidth={2} />
          </lineSegments>
        )}
      </mesh>
    </group>
  );
}
