import { create } from 'zustand';
import { NebulaState, NebulaParameters, ColorTheme } from '@/types/nebula';
import { colorThemes, getRandomTheme } from '@/config/themes';

const defaultParameters: NebulaParameters = {
  particleCount: 3000,
  armCount: 3,
  rotationSpeed: 0.3,
  particleSpeed: 0.15,
  bloomEnabled: true,
  lensFlareEnabled: false,
  trailEnabled: false,
  backgroundType: 'stars',
  colorTheme: 'purple-blue',
  coreColor: '#ffffff',
  midColor: '#818cf8',
  outerColor: '#6d28d9',
  autoRotate: false,
};

export const useNebulaStore = create<NebulaState>((set, get) => ({
  ...defaultParameters,
  fps: 60,

  updateParameter: (key, value) => {
    set({ [key]: value } as Partial<NebulaState>);
  },

  setColorTheme: (theme: ColorTheme) => {
    const colors = colorThemes[theme];
    set({
      colorTheme: theme,
      coreColor: colors.core,
      midColor: colors.mid,
      outerColor: colors.outer,
    });
  },

  randomizeTheme: () => {
    const theme = getRandomTheme();
    const colors = colorThemes[theme];
    set({
      colorTheme: theme,
      coreColor: colors.core,
      midColor: colors.mid,
      outerColor: colors.outer,
    });
  },

  exportParameters: () => {
    const state = get();
    const params: NebulaParameters = {
      particleCount: state.particleCount,
      armCount: state.armCount,
      rotationSpeed: state.rotationSpeed,
      particleSpeed: state.particleSpeed,
      bloomEnabled: state.bloomEnabled,
      lensFlareEnabled: state.lensFlareEnabled,
      trailEnabled: state.trailEnabled,
      backgroundType: state.backgroundType,
      colorTheme: state.colorTheme,
      coreColor: state.coreColor,
      midColor: state.midColor,
      outerColor: state.outerColor,
      autoRotate: state.autoRotate,
    };
    return JSON.stringify(params, null, 2);
  },

  importParameters: (json: string) => {
    try {
      const params = JSON.parse(json) as Partial<NebulaParameters>;
      set(params as Partial<NebulaState>);
    } catch (e) {
      console.error('Failed to import parameters:', e);
    }
  },

  setFps: (fps: number) => {
    set({ fps });
  },
}));
