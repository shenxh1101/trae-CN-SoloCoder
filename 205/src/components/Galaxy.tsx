import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Points, BufferGeometry } from 'three';
import { generateGalaxyParticles } from '../utils/galaxyMath';
import { useGalaxyStore } from '../store/useGalaxyStore';

export function Galaxy() {
  const pointsRef = useRef<Points>(null);
  const config = useGalaxyStore((state) => state.config);
  const setGalaxyRef = useGalaxyStore((state) => state.setGalaxyRef);

  const { positions, colors, sizes } = useMemo(
    () => generateGalaxyParticles(config),
    [config.particleCount, config.armCount, config.armTightness, config.randomSize]
  );

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, colors, sizes]);

  useEffect(() => {
    setGalaxyRef(pointsRef);
    return () => setGalaxyRef(null);
  }, [setGalaxyRef]);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * config.rotationSpeed;
    }
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <points ref={pointsRef} geometry={geometry as BufferGeometry}>
      <pointsMaterial
        size={1}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
