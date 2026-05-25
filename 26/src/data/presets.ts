import type { PresetScheme, ShoeConfig } from '@/types';

export const createDefaultConfig = (): ShoeConfig => {
  const now = Date.now();
  return {
    id: `config-${now}`,
    name: '我的定制跑鞋',
    parts: {
      upper: { color: '#2563eb', material: 'mesh', texture: 'solid' },
      sole: { color: '#1f2937', material: 'rubber', texture: 'solid' },
      laces: { color: '#ffffff', material: 'mesh', texture: 'solid' },
      logo: { color: '#f59e0b', material: 'reflective', texture: 'solid' },
      heel: { color: '#1e40af', material: 'carbon', texture: 'carbon' },
      tongue: { color: '#3b82f6', material: 'mesh', texture: 'solid' },
      lining: { color: '#60a5fa', material: 'mesh', texture: 'solid' }
    },
    decals: [],
    lighting: {
      preset: 'indoor',
      mainLightIntensity: 1.5,
      mainLightPosition: { x: 5, y: 5, z: 5 },
      ambientIntensity: 0.5
    },
    createdAt: now,
    updatedAt: now
  };
};

export const PRESET_SCHEMES: PresetScheme[] = [
  {
    id: 'classic-black-red',
    name: '经典黑红',
    description: '永恒的经典配色，低调中透着激情，适合各种场合',
    thumbnail: '',
    config: {
      parts: {
        upper: { color: '#1a1a1a', material: 'leather', texture: 'solid' },
        sole: { color: '#cc0000', material: 'rubber', texture: 'solid' },
        laces: { color: '#ff0000', material: 'mesh', texture: 'solid' },
        logo: { color: '#ffffff', material: 'reflective', texture: 'solid' },
        heel: { color: '#333333', material: 'carbon', texture: 'carbon' },
        tongue: { color: '#1a1a1a', material: 'mesh', texture: 'solid' },
        lining: { color: '#ff3333', material: 'mesh', texture: 'solid' }
      }
    }
  },
  {
    id: 'fresh-white-blue',
    name: '清新白蓝',
    description: '清爽的夏日配色，活力四射，轻盈透气',
    thumbnail: '',
    config: {
      parts: {
        upper: { color: '#ffffff', material: 'mesh', texture: 'stripes' },
        sole: { color: '#0066cc', material: 'eva', texture: 'solid' },
        laces: { color: '#3399ff', material: 'mesh', texture: 'solid' },
        logo: { color: '#003366', material: 'leather', texture: 'solid' },
        heel: { color: '#004080', material: 'rubber', texture: 'solid' },
        tongue: { color: '#e6f3ff', material: 'mesh', texture: 'solid' },
        lining: { color: '#b3d9ff', material: 'mesh', texture: 'solid' }
      }
    }
  },
  {
    id: 'bold-neon-green',
    name: '张扬荧光绿',
    description: '个性张扬，成为焦点，夜光下更加炫酷',
    thumbnail: '',
    config: {
      parts: {
        upper: { color: '#00ff00', material: 'reflective', texture: 'dots' },
        sole: { color: '#000000', material: 'carbon', texture: 'carbon' },
        laces: { color: '#33ff33', material: 'mesh', texture: 'solid' },
        logo: { color: '#00ff00', material: 'reflective', texture: 'solid' },
        heel: { color: '#1a1a1a', material: 'carbon', texture: 'carbon' },
        tongue: { color: '#00cc00', material: 'mesh', texture: 'dots' },
        lining: { color: '#003300', material: 'mesh', texture: 'solid' }
      }
    }
  }
];
