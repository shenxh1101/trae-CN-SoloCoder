import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Piece, StyleType, Face } from '../../types';
import { COLOR_HEX, FACE_NORMAL } from '../../types';

import { ThreeEvent } from '@react-three/fiber';

interface PyraminxPieceProps {
  piece: Piece;
  style: StyleType;
  showEdges: boolean;
  onClick?: (piece: Piece, e: ThreeEvent<MouseEvent>) => void;
  onPointerDown?: (piece: Piece, e: ThreeEvent<PointerEvent>) => void;
}

function createTipGeometry(): THREE.BufferGeometry {
  const h = 0.5;
  const r = 0.35;
  const geometry = new THREE.ConeGeometry(r, h, 3);
  geometry.translate(0, h * 0.3, 0);
  return geometry;
}

function createEdgeGeometry(): THREE.BufferGeometry {
  const h = 0.55;
  const r = 0.4;
  const geometry = new THREE.ConeGeometry(r, h, 3);
  geometry.translate(0, h * 0.1, 0);
  return geometry;
}

function createCenterGeometry(): THREE.BufferGeometry {
  const h = 0.6;
  const r = 0.45;
  const geometry = new THREE.ConeGeometry(r, h, 3);
  geometry.translate(0, 0, 0);
  return geometry;
}

function getColorForFacelet(piece: Piece, materialIndex: number, style: StyleType): string {
  const faces: Face[] = ['U', 'R', 'L', 'B'];
  const targetFace = faces[materialIndex % 4];
  
  const facelet = piece.facelets.find(f => f.face === targetFace);
  
  if (facelet) {
    return COLOR_HEX[facelet.color][style];
  }
  
  return '#1a1a2e';
}

function createMaterials(piece: Piece, style: StyleType): THREE.MeshStandardMaterial[] {
  const materials: THREE.MeshStandardMaterial[] = [];
  const faceCount = piece.type === 'tip' ? 3 : piece.type === 'edge' ? 2 : 1;
  
  for (let i = 0; i < 4; i++) {
    const colorHex = getColorForFacelet(piece, i, style);
    const isColored = piece.type === 'center' ? i === 0 : i < faceCount;
    
    materials.push(
      new THREE.MeshStandardMaterial({
        color: colorHex,
        metalness: style === 'metallic' ? 0.8 : style === 'neon' ? 0.1 : 0.3,
        roughness: style === 'metallic' ? 0.2 : style === 'neon' ? 0.8 : 0.5,
        emissive: style === 'neon' && isColored ? colorHex : '#000000',
        emissiveIntensity: style === 'neon' && isColored ? 0.5 : 0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1.0,
      })
    );
  }
  
  return materials;
}

export default function PyraminxPiece({
  piece,
  style,
  showEdges,
  onClick,
  onPointerDown,
}: PyraminxPieceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);

  const geometry = useMemo(() => {
    switch (piece.type) {
      case 'tip':
        return createTipGeometry();
      case 'edge':
        return createEdgeGeometry();
      case 'center':
        return createCenterGeometry();
      default:
        return createCenterGeometry();
    }
  }, [piece.type]);

  const materials = useMemo(() => createMaterials(piece, style), [piece, style]);

  const edgesGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(geometry, 20);
  }, [geometry]);

  const groupRotation = useMemo(() => {
    if (piece.type === 'center') {
      const face = piece.facelets[0]?.face || 'U';
      const normal = FACE_NORMAL[face];
      const up = new THREE.Vector3(0, 1, 0);
      const dir = new THREE.Vector3(normal[0], normal[1], normal[2]);
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(up, dir);
      const euler = new THREE.Euler().setFromQuaternion(quaternion);
      return [euler.x, euler.y, euler.z] as [number, number, number];
    }
    return piece.rotation;
  }, [piece]);

  return (
    <group position={piece.position} rotation={groupRotation}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={materials}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(piece, e);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDown?.(piece, e);
        }}
      />
      {showEdges && (
        <lineSegments ref={edgesRef} geometry={edgesGeometry}>
          <lineBasicMaterial 
            color="#00f5ff" 
            linewidth={1.5} 
            opacity={0.7} 
            transparent 
          />
        </lineSegments>
      )}
    </group>
  );
}
