import { create } from 'zustand';

export interface StarConfig {
  particleCount: number;
  particleSize: number;
  autoRotate: boolean;
  nebulaEnabled: boolean;
  nebulaColor: 'purple' | 'cyan';
  backgroundType: 'black' | 'gradient';
  cloudEnabled: boolean;
  meteorEnabled: boolean;
  twinkleSpeed: number;
  cameraDistance: number;
}

interface StarState extends StarConfig {
  isPanelOpen: boolean;
  setParticleCount: (count: number) => void;
  setParticleSize: (size: number) => void;
  setAutoRotate: (enabled: boolean) => void;
  setNebulaEnabled: (enabled: boolean) => void;
  setNebulaColor: (color: 'purple' | 'cyan') => void;
  setBackgroundType: (type: 'black' | 'gradient') => void;
  setCloudEnabled: (enabled: boolean) => void;
  setMeteorEnabled: (enabled: boolean) => void;
  setTwinkleSpeed: (speed: number) => void;
  setCameraDistance: (distance: number) => void;
  setIsPanelOpen: (open: boolean) => void;
  applyConfig: (config: Partial<StarConfig>) => void;
  getConfig: () => StarConfig;
  resetConfig: () => void;
}

const defaultConfig: StarConfig = {
  particleCount: 5000,
  particleSize: 1.0,
  autoRotate: false,
  nebulaEnabled: true,
  nebulaColor: 'purple',
  backgroundType: 'gradient',
  cloudEnabled: true,
  meteorEnabled: true,
  twinkleSpeed: 1.0,
  cameraDistance: 100,
};

export const useStarStore = create<StarState>((set, get) => ({
  ...defaultConfig,
  isPanelOpen: true,

  setParticleCount: (count) => set({ particleCount: count }),
  setParticleSize: (size) => set({ particleSize: size }),
  setAutoRotate: (enabled) => set({ autoRotate: enabled }),
  setNebulaEnabled: (enabled) => set({ nebulaEnabled: enabled }),
  setNebulaColor: (color) => set({ nebulaColor: color }),
  setBackgroundType: (type) => set({ backgroundType: type }),
  setCloudEnabled: (enabled) => set({ cloudEnabled: enabled }),
  setMeteorEnabled: (enabled) => set({ meteorEnabled: enabled }),
  setTwinkleSpeed: (speed) => set({ twinkleSpeed: speed }),
  setCameraDistance: (distance) => set({ cameraDistance: distance }),
  setIsPanelOpen: (open) => set({ isPanelOpen: open }),

  applyConfig: (config) => set({ ...config }),

  getConfig: () => {
    const state = get();
    return {
      particleCount: state.particleCount,
      particleSize: state.particleSize,
      autoRotate: state.autoRotate,
      nebulaEnabled: state.nebulaEnabled,
      nebulaColor: state.nebulaColor,
      backgroundType: state.backgroundType,
      cloudEnabled: state.cloudEnabled,
      meteorEnabled: state.meteorEnabled,
      twinkleSpeed: state.twinkleSpeed,
      cameraDistance: state.cameraDistance,
    };
  },

  resetConfig: () => set({ ...defaultConfig }),
}));
