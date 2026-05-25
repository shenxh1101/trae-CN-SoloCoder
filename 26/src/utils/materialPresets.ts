import type { MaterialPreset, MaterialType } from '@/types';

export const MATERIAL_PRESETS: Record<MaterialType, MaterialPreset> = {
  leather: {
    roughness: 0.6,
    metalness: 0.1,
    envMapIntensity: 0.5
  },
  mesh: {
    roughness: 0.3,
    metalness: 0.0,
    envMapIntensity: 0.3,
    transparent: true,
    opacity: 0.9
  },
  suede: {
    roughness: 0.9,
    metalness: 0.0,
    envMapIntensity: 0.2
  },
  reflective: {
    roughness: 0.1,
    metalness: 0.8,
    envMapIntensity: 1.5
  },
  rubber: {
    roughness: 0.7,
    metalness: 0.0,
    envMapIntensity: 0.3
  },
  eva: {
    roughness: 0.5,
    metalness: 0.0,
    envMapIntensity: 0.4
  },
  carbon: {
    roughness: 0.2,
    metalness: 0.6,
    envMapIntensity: 1.0,
    normalScale: 0.1
  }
};

export const getMaterialPreset = (material: MaterialType): MaterialPreset => {
  return MATERIAL_PRESETS[material] || MATERIAL_PRESETS.leather;
};
