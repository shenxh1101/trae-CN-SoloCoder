import { create } from 'zustand';
import type { GalaxyConfig } from '../types/galaxy';
import { DEFAULT_CONFIG } from '../types/galaxy';
import type { Points } from 'three';

interface GalaxyState {
  config: GalaxyConfig;
  setConfig: <K extends keyof GalaxyConfig>(key: K, value: GalaxyConfig[K]) => void;
  setFullConfig: (config: GalaxyConfig) => void;
  resetConfig: () => void;
  galaxyRef: React.RefObject<Points> | null;
  setGalaxyRef: (ref: React.RefObject<Points> | null) => void;
}

export const useGalaxyStore = create<GalaxyState>((set) => ({
  config: { ...DEFAULT_CONFIG },
  setConfig: (key, value) =>
    set((state) => ({
      config: { ...state.config, [key]: value },
    })),
  setFullConfig: (config) => set({ config }),
  resetConfig: () => set({ config: { ...DEFAULT_CONFIG } }),
  galaxyRef: null,
  setGalaxyRef: (ref) => set({ galaxyRef: ref }),
}));
