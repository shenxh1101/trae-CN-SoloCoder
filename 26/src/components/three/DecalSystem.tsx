import { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useConfigStore } from '@/store/useConfigStore';
import type { DecalConfig } from '@/types';

const fontMap: Record<string, string> = {
  arial: 'Arial, sans-serif',
  impact: 'Impact, sans-serif',
  script: 'Brush Script MT, cursive',
  bold: 'Arial Black, sans-serif'
};

const createTextTexture = (text: string, font: string, color: string): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.font = `bold 120px ${fontMap[font] || fontMap.arial}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

const createImageTexture = (base64: string): Promise<THREE.Texture> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      resolve(texture);
    };
    img.onerror = reject;
    img.src = base64;
  });
};

interface DecalMeshProps {
  decal: DecalConfig;
  index: number;
}

const DecalMesh = ({ decal, index }: DecalMeshProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (decal.badgeImage) {
      createImageTexture(decal.badgeImage).then(setTexture);
    } else if (decal.text) {
      setTexture(createTextTexture(decal.text, decal.font, decal.color));
    }
  }, [decal.text, decal.font, decal.color, decal.badgeImage]);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }, [texture]);

  const position = useMemo(() => {
    const baseX = 0.6 + decal.position.x * 0.3;
    const baseY = 0.7 + decal.position.y * 0.3;
    const baseZ = 0.48 + index * 0.01;
    return [baseX, baseY, baseZ] as [number, number, number];
  }, [decal.position, index]);

  const scale = useMemo(() => {
    const s = 0.15 * decal.scale;
    return [s, s * 0.5, 1] as [number, number, number];
  }, [decal.scale]);

  useFrame(() => {
    if (meshRef.current && material.map) {
      material.map.needsUpdate = true;
    }
  });

  if (!texture) return null;

  return (
    <mesh ref={meshRef} position={position} rotation={[0, -Math.PI / 2, 0]} scale={scale}>
      <planeGeometry args={[1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

export const DecalSystem = () => {
  const decals = useConfigStore((state) => state.config.decals);

  return (
    <group>
      {decals.map((decal, index) => (
        <DecalMesh key={decal.id} decal={decal} index={index} />
      ))}
    </group>
  );
};

export default DecalSystem;
