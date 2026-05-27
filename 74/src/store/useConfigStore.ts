import { create } from 'zustand';
import { ParticleConfig, ParticleShape, BackgroundType, FontWeight } from '@/types';

interface ConfigState extends ParticleConfig {
  particleCount: number;
  setText: (text: string) => void;
  setParticleSize: (size: number) => void;
  setParticleShape: (shape: ParticleShape) => void;
  setThickness: (thickness: number) => void;
  setFontWeight: (weight: FontWeight) => void;
  setColorGradient: (top: string, bottom: string) => void;
  setBackground: (background: BackgroundType) => void;
  setTrailEffect: (enabled: boolean) => void;
  setAutoRotate: (enabled: boolean) => void;
  setParticleCount: (count: number) => void;
  exportConfig: () => string;
  importConfig: (json: string) => void;
  resetConfig: () => void;
}

const defaultConfig: ParticleConfig = {
  text: 'HELLO',
  particleSize: 0.3,
  particleShape: 'sphere',
  thickness: 5,
  fontWeight: 'bold',
  colorGradient: {
    top: '#ff6b9d',
    bottom: '#4facfe',
  },
  background: 'black',
  trailEffect: false,
  autoRotate: true,
};

export const useConfigStore = create<ConfigState>((set, get) => ({
  ...defaultConfig,
  particleCount: 0,

  setText: (text) => set({ text: text.slice(0, 10) }),
  setParticleSize: (particleSize) => set({ particleSize }),
  setParticleShape: (particleShape) => set({ particleShape }),
  setThickness: (thickness) => set({ thickness }),
  setFontWeight: (fontWeight) => set({ fontWeight }),
  setColorGradient: (top, bottom) => set({ colorGradient: { top, bottom } }),
  setBackground: (background) => set({ background }),
  setTrailEffect: (trailEffect) => set({ trailEffect }),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  setParticleCount: (particleCount) => set({ particleCount }),

  exportConfig: () => {
    const { particleCount, ...config } = get();
    return JSON.stringify(config, null, 2);
  },

  importConfig: (json) => {
    try {
      const config = JSON.parse(json);
      set(config);
    } catch (e) {
      console.error('Failed to import config:', e);
    }
  },

  resetConfig: () => set(defaultConfig),
}));
