import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useConfigStore } from '@/store/useConfigStore';
import type { LightingPreset } from '@/types';

interface LightingSystemProps {
  isDefault?: boolean;
}

const presetConfigs: Record<LightingPreset, {
  mainLight: { color: string; intensity: number; position: [number, number, number] };
  ambient: { color: string; intensity: number };
  fillLight: { color: string; intensity: number; position: [number, number, number] };
  rimLight: { color: string; intensity: number; position: [number, number, number] };
}> = {
  indoor: {
    mainLight: { color: '#ffffff', intensity: 1.5, position: [5, 5, 5] },
    ambient: { color: '#ffffff', intensity: 0.5 },
    fillLight: { color: '#88ccff', intensity: 0.3, position: [-3, 2, -3] },
    rimLight: { color: '#ffaa66', intensity: 0.2, position: [0, 3, -5] }
  },
  outdoor: {
    mainLight: { color: '#ffffee', intensity: 2.5, position: [10, 15, 5] },
    ambient: { color: '#87ceeb', intensity: 0.8 },
    fillLight: { color: '#87ceeb', intensity: 0.4, position: [-5, 3, -3] },
    rimLight: { color: '#ffffff', intensity: 0.3, position: [0, 5, -8] }
  },
  stage: {
    mainLight: { color: '#ffffff', intensity: 3.0, position: [0, 8, 5] },
    ambient: { color: '#1a1a2e', intensity: 0.2 },
    fillLight: { color: '#ff00ff', intensity: 0.5, position: [-4, 2, -2] },
    rimLight: { color: '#00ffff', intensity: 0.5, position: [4, 2, -2] }
  }
};

export const LightingSystem = ({ isDefault = false }: LightingSystemProps) => {
  const mainLightRef = useRef<THREE.SpotLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const fillLightRef = useRef<THREE.DirectionalLight>(null);
  const rimLightRef = useRef<THREE.DirectionalLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  const lightingConfig = useConfigStore((state) => state.config.lighting);
  const config = isDefault ? presetConfigs.indoor : presetConfigs[lightingConfig.preset];

  const mainLightPosition = useMemo(() => {
    if (isDefault) {
      return config.mainLight.position;
    }
    return [
      lightingConfig.mainLightPosition.x,
      lightingConfig.mainLightPosition.y,
      lightingConfig.mainLightPosition.z
    ] as [number, number, number];
  }, [isDefault, lightingConfig.mainLightPosition, config.mainLight.position]);

  const mainLightIntensity = useMemo(() => {
    if (isDefault) {
      return config.mainLight.intensity;
    }
    return lightingConfig.mainLightIntensity;
  }, [isDefault, lightingConfig.mainLightIntensity, config.mainLight.intensity]);

  const ambientIntensity = useMemo(() => {
    if (isDefault) {
      return config.ambient.intensity;
    }
    return lightingConfig.ambientIntensity;
  }, [isDefault, lightingConfig.ambientIntensity, config.ambient.intensity]);

  useEffect(() => {
    if (mainLightRef.current && targetRef.current) {
      mainLightRef.current.target = targetRef.current;
    }
  }, []);

  useFrame(() => {
    if (mainLightRef.current) {
      mainLightRef.current.position.set(...mainLightPosition);
      mainLightRef.current.intensity = mainLightIntensity;
      mainLightRef.current.color.set(config.mainLight.color);
    }
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = ambientIntensity;
      ambientLightRef.current.color.set(config.ambient.color);
    }
    if (fillLightRef.current) {
      fillLightRef.current.position.set(...config.fillLight.position);
      fillLightRef.current.intensity = config.fillLight.intensity;
      fillLightRef.current.color.set(config.fillLight.color);
    }
    if (rimLightRef.current) {
      rimLightRef.current.position.set(...config.rimLight.position);
      rimLightRef.current.intensity = config.rimLight.intensity;
      rimLightRef.current.color.set(config.rimLight.color);
    }
  });

  return (
    <>
      <object3D ref={targetRef} position={[0, 0.6, 0]} />

      <ambientLight ref={ambientLightRef} intensity={ambientIntensity} color={config.ambient.color} />

      <spotLight
        ref={mainLightRef}
        position={mainLightPosition}
        angle={0.5}
        penumbra={0.5}
        intensity={mainLightIntensity}
        color={config.mainLight.color}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />

      <directionalLight
        ref={fillLightRef}
        position={config.fillLight.position}
        intensity={config.fillLight.intensity}
        color={config.fillLight.color}
      />

      <directionalLight
        ref={rimLightRef}
        position={config.rimLight.position}
        intensity={config.rimLight.intensity}
        color={config.rimLight.color}
      />

      <hemisphereLight
        color="#ffffff"
        groundColor="#444444"
        intensity={0.3}
      />
    </>
  );
};

export default LightingSystem;
