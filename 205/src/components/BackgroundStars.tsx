import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { BufferGeometry } from 'three';
import { generateBackgroundStars } from '../utils/galaxyMath';
import { useGalaxyStore } from '../store/useGalaxyStore';

export function BackgroundStars() {
  const showBackground = useGalaxyStore((state) => state.config.showBackground);

  const positions = useMemo(() => generateBackgroundStars(3000), []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  if (!showBackground) return null;

  return (
    <points geometry={geometry as BufferGeometry}>
      <pointsMaterial
        size={0.5}
        color={0xffffff}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
