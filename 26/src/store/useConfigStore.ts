import { create } from 'zustand';
import { produce } from 'immer';
import type { ShoeConfig, ShoePart, PartConfig, DecalConfig, LightingConfig, LightingPreset } from '@/types';
import { createDefaultConfig } from '@/data/presets';
import { saveConfigToLocalStorage, loadConfigFromLocalStorage } from '@/utils/configSerializer';

interface ThreeRefs {
  renderer: any;
  scene: any;
  camera: any;
}

interface ConfigState {
  config: ShoeConfig;
  selectedPart: ShoePart | null;
  compareMode: boolean;
  isLoading: boolean;
  error: string | null;
  threeRefs: ThreeRefs | null;

  setSelectedPart: (part: ShoePart | null) => void;
  updatePartConfig: (part: ShoePart, updates: Partial<PartConfig>) => void;
  updatePartColor: (part: ShoePart, color: string) => void;
  updatePartMaterial: (part: ShoePart, material: PartConfig['material']) => void;
  updatePartTexture: (part: ShoePart, texture: PartConfig['texture']) => void;
  addDecal: (decal: Omit<DecalConfig, 'id'>) => void;
  updateDecal: (id: string, updates: Partial<DecalConfig>) => void;
  removeDecal: (id: string) => void;
  updateLighting: (updates: Partial<LightingConfig>) => void;
  setLightingPreset: (preset: LightingPreset) => void;
  applyPreset: (presetConfig: Partial<ShoeConfig>) => void;
  resetToDefault: () => void;
  loadConfig: (config: ShoeConfig) => void;
  setCompareMode: (enabled: boolean) => void;
  setConfigName: (name: string) => void;
  setThreeRefs: (refs: ThreeRefs | null) => void;
  initializeFromStorage: () => void;
}

const HISTORY_LIMIT = 50;

export const useConfigStore = create<ConfigState>((set, get) => {
  const initialConfig = loadConfigFromLocalStorage() || createDefaultConfig();

  return {
    config: initialConfig,
    selectedPart: 'upper',
    compareMode: false,
    isLoading: false,
    error: null,
    threeRefs: null,

    setSelectedPart: (part) => set({ selectedPart: part }),
    setThreeRefs: (refs) => set({ threeRefs: refs }),

    updatePartConfig: (part, updates) =>
      set(
        produce((state: ConfigState) => {
          state.config.parts[part] = {
            ...state.config.parts[part],
            ...updates
          };
          state.config.updatedAt = Date.now();
        })
      ),

    updatePartColor: (part, color) => {
      get().updatePartConfig(part, { color });
      const { config } = get();
      saveConfigToLocalStorage(config);
    },

    updatePartMaterial: (part, material) => {
      get().updatePartConfig(part, { material });
      const { config } = get();
      saveConfigToLocalStorage(config);
    },

    updatePartTexture: (part, texture) => {
      get().updatePartConfig(part, { texture });
      const { config } = get();
      saveConfigToLocalStorage(config);
    },

    addDecal: (decal) =>
      set(
        produce((state: ConfigState) => {
          const newDecal: DecalConfig = {
            ...decal,
            id: `decal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };
          state.config.decals.push(newDecal);
          state.config.updatedAt = Date.now();
        })
      ),

    updateDecal: (id, updates) =>
      set(
        produce((state: ConfigState) => {
          const index = state.config.decals.findIndex((d) => d.id === id);
          if (index !== -1) {
            state.config.decals[index] = {
              ...state.config.decals[index],
              ...updates
            };
            state.config.updatedAt = Date.now();
          }
        })
      ),

    removeDecal: (id) =>
      set(
        produce((state: ConfigState) => {
          state.config.decals = state.config.decals.filter((d) => d.id !== id);
          state.config.updatedAt = Date.now();
        })
      ),

    updateLighting: (updates) =>
      set(
        produce((state: ConfigState) => {
          state.config.lighting = {
            ...state.config.lighting,
            ...updates
          };
          state.config.updatedAt = Date.now();
        })
      ),

    setLightingPreset: (preset) => {
      const presets: Record<LightingPreset, Partial<LightingConfig>> = {
        indoor: {
          preset: 'indoor',
          mainLightIntensity: 1.5,
          mainLightPosition: { x: 5, y: 5, z: 5 },
          ambientIntensity: 0.5
        },
        outdoor: {
          preset: 'outdoor',
          mainLightIntensity: 2.5,
          mainLightPosition: { x: 10, y: 15, z: 5 },
          ambientIntensity: 0.8
        },
        stage: {
          preset: 'stage',
          mainLightIntensity: 3.0,
          mainLightPosition: { x: 0, y: 8, z: 5 },
          ambientIntensity: 0.2
        }
      };

      get().updateLighting(presets[preset]);
    },

    applyPreset: (presetConfig) =>
      set(
        produce((state: ConfigState) => {
          if (presetConfig.parts) {
            Object.keys(presetConfig.parts).forEach((part) => {
              state.config.parts[part as ShoePart] = {
                ...state.config.parts[part as ShoePart],
                ...presetConfig.parts![part as ShoePart]
              };
            });
          }
          if (presetConfig.lighting) {
            state.config.lighting = {
              ...state.config.lighting,
              ...presetConfig.lighting
            };
          }
          if (presetConfig.decals) {
            state.config.decals = presetConfig.decals;
          }
          state.config.updatedAt = Date.now();
        })
      ),

    resetToDefault: () => {
      const defaultConfig = createDefaultConfig();
      set({ config: defaultConfig });
      saveConfigToLocalStorage(defaultConfig);
    },

    loadConfig: (config) => {
      set({ config });
      saveConfigToLocalStorage(config);
    },

    setCompareMode: (enabled) => set({ compareMode: enabled }),

    setConfigName: (name) =>
      set(
        produce((state: ConfigState) => {
          state.config.name = name;
          state.config.updatedAt = Date.now();
        })
      ),

    initializeFromStorage: () => {
      const stored = loadConfigFromLocalStorage();
      if (stored) {
        set({ config: stored });
      }
    }
  };
});

interface HistoryState {
  past: ShoeConfig[];
  future: ShoeConfig[];
  canUndo: boolean;
  canRedo: boolean;

  pushHistory: (config: ShoeConfig) => void;
  undo: () => ShoeConfig | null;
  redo: () => ShoeConfig | null;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  pushHistory: (config) => {
    const configCopy = JSON.parse(JSON.stringify(config));

    set(
      produce((state: HistoryState) => {
        state.past.push(configCopy);
        if (state.past.length > HISTORY_LIMIT) {
          state.past.shift();
        }
        state.future = [];
        state.canUndo = state.past.length > 0;
        state.canRedo = false;
      })
    );
  },

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return null;

    const currentConfig = useConfigStore.getState().config;
    const previous = past[past.length - 1];

    set(
      produce((state: HistoryState) => {
        state.past.pop();
        state.future.unshift(JSON.parse(JSON.stringify(currentConfig)));
        state.canUndo = state.past.length > 0;
        state.canRedo = true;
      })
    );

    useConfigStore.getState().loadConfig(previous);
    return previous;
  },

  redo: () => {
    const { future } = get();
    if (future.length === 0) return null;

    const currentConfig = useConfigStore.getState().config;
    const next = future[0];

    set(
      produce((state: HistoryState) => {
        state.future.shift();
        state.past.push(JSON.parse(JSON.stringify(currentConfig)));
        state.canUndo = true;
        state.canRedo = state.future.length > 0;
      })
    );

    useConfigStore.getState().loadConfig(next);
    return next;
  },

  clearHistory: () =>
    set({
      past: [],
      future: [],
      canUndo: false,
      canRedo: false
    })
}));

export const useUndoRedo = () => {
  const { canUndo, canRedo, undo, redo } = useHistoryStore();

  return {
    canUndo,
    canRedo,
    undo,
    redo
  };
};
