import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ArtStyle, CubeFace } from '../types';
import { loadStyleTexture, loadContentTexture, blendTextures } from '../utils/textureManager';

interface StyledCubeProps {
  faceStyles: Record<CubeFace, ArtStyle>;
  styleIntensity: number;
  contentImage: string | null;
  autoRotate: boolean;
  rotationSpeed: number;
  onFaceClick?: (face: CubeFace) => void;
}

const facePositions: Record<CubeFace, [number, number, number]> = {
  front: [0, 0, 1.01],
  back: [0, 0, -1.01],
  left: [-1.01, 0, 0],
  right: [1.01, 0, 0],
  top: [0, 1.01, 0],
  bottom: [0, -1.01, 0],
};

const faceRotations: Record<CubeFace, [number, number, number]> = {
  front: [0, 0, 0],
  back: [0, Math.PI, 0],
  left: [0, -Math.PI / 2, 0],
  right: [0, Math.PI / 2, 0],
  top: [-Math.PI / 2, 0, 0],
  bottom: [Math.PI / 2, 0, 0],
};

const faceOrder: CubeFace[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];

export function StyledCube({
  faceStyles,
  styleIntensity,
  contentImage,
  autoRotate,
  rotationSpeed,
  onFaceClick,
}: StyledCubeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [faceTextures, setFaceTextures] = useState<Record<CubeFace, THREE.Texture | null>>({
    front: null,
    back: null,
    left: null,
    right: null,
    top: null,
    bottom: null,
  });
  const [contentTexture, setContentTexture] = useState<THREE.Texture | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTextures = async () => {
      setIsLoading(true);
      try {
        const texturePromises = faceOrder.map(async (face) => {
          const style = faceStyles[face];
          const texture = await loadStyleTexture(style, 512);
          return { face, texture };
        });

        const results = await Promise.all(texturePromises);
        const newTextures: Record<CubeFace, THREE.Texture | null> = {
          front: null,
          back: null,
          left: null,
          right: null,
          top: null,
          bottom: null,
        };
        results.forEach(({ face, texture }) => {
          newTextures[face] = texture;
        });
        setFaceTextures(newTextures);
      } catch (error) {
        console.error('Failed to load textures:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTextures();
  }, [faceStyles]);

  useEffect(() => {
    if (!contentImage) {
      setContentTexture(null);
      return;
    }

    const loadContent = async () => {
      try {
        const texture = await loadContentTexture(contentImage);
        setContentTexture(texture);
      } catch (error) {
        console.error('Failed to load content texture:', error);
      }
    };

    loadContent();
  }, [contentImage]);

  const materials = useMemo(() => {
    return faceOrder.map((face) => {
      let mapTexture = faceTextures[face];

      if (!mapTexture) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;
        const style = faceStyles[face];
        ctx.fillStyle = style.baseColor;
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', 256, 256);
        mapTexture = new THREE.CanvasTexture(canvas);
      }

      if (contentTexture && contentImage && styleIntensity > 0) {
        mapTexture = blendTextures(contentTexture, mapTexture, styleIntensity);
      }

      return new THREE.MeshStandardMaterial({
        map: mapTexture,
        metalness: 0.1,
        roughness: 0.8,
      });
    });
  }, [faceTextures, contentTexture, contentImage, styleIntensity, faceStyles]);

  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * rotationSpeed * 0.5;
      groupRef.current.rotation.x += delta * rotationSpeed * 0.2;
    }
  });

  useEffect(() => {
    return () => {
      materials.forEach((mat) => {
        mat.map?.dispose();
        mat.dispose();
      });
    };
  }, [materials]);

  const handleFaceClick = (face: CubeFace, event: any) => {
    event.stopPropagation();
    onFaceClick?.(face);
  };

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial color="#0a0a1a" side={THREE.BackSide} />
      </mesh>

      {faceOrder.map((face, index) => (
        <mesh
          key={face}
          position={facePositions[face]}
          rotation={faceRotations[face]}
          material={materials[index]}
          onClick={(e) => handleFaceClick(face, e)}
          onPointerOver={(e) => {
            document.body.style.cursor = 'pointer';
            e.stopPropagation();
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          <planeGeometry args={[2, 2]} />
        </mesh>
      ))}

      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(2.02, 2.02, 2.02)]} />
        <lineBasicMaterial color="#8b5cf6" linewidth={2} transparent opacity={0.6} />
      </lineSegments>

      {isLoading && (
        <mesh position={[0, 0, 2.1]}>
          <planeGeometry args={[1, 0.3]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}
