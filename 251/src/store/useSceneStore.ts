import { create } from 'zustand';
import {
  StairConfig,
  PositionState,
  StatsState,
  CameraMode,
  DEFAULT_CONFIG,
} from '../types';

interface SceneStore {
  config: StairConfig;
  position: PositionState;
  stats: StatsState;
  cameraMode: CameraMode;
  controlsLocked: boolean;
  actions: {
    setConfig: (config: Partial<StairConfig>) => void;
    resetConfig: () => void;
    setPosition: (position: Partial<PositionState>) => void;
    incrementStairCount: () => void;
    setWalking: (walking: boolean) => void;
    updateTotalTime: (delta: number) => void;
    setCameraMode: (mode: CameraMode) => void;
    toggleCameraMode: () => void;
    setControlsLocked: (locked: boolean) => void;
    resetStats: () => void;
  };
}

export const useSceneStore = create<SceneStore>((set) => ({
  config: { ...DEFAULT_CONFIG },
  position: { x: 0, y: DEFAULT_CONFIG.stepHeight, z: 0, stairIndex: 0 },
  stats: { stairCount: 0, totalTime: 0, walking: false },
  cameraMode: 'firstPerson',
  controlsLocked: false,

  actions: {
    setConfig: (newConfig) =>
      set((state) => ({
        config: { ...state.config, ...newConfig },
      })),
    resetConfig: () => set({ config: { ...DEFAULT_CONFIG } }),
    setPosition: (newPosition) =>
      set((state) => ({
        position: { ...state.position, ...newPosition },
      })),
    incrementStairCount: () =>
      set((state) => ({
        stats: { ...state.stats, stairCount: state.stats.stairCount + 1 },
      })),
    setWalking: (walking) =>
      set((state) => ({
        stats: { ...state.stats, walking },
      })),
    updateTotalTime: (delta) =>
      set((state) => ({
        stats: { ...state.stats, totalTime: state.stats.totalTime + delta },
      })),
    setCameraMode: (mode) => set({ cameraMode: mode }),
    toggleCameraMode: () =>
      set((state) => ({
        cameraMode:
          state.cameraMode === 'firstPerson' ? 'thirdPerson' : 'firstPerson',
      })),
    setControlsLocked: (locked) => set({ controlsLocked: locked }),
    resetStats: () =>
      set({
        stats: { stairCount: 0, totalTime: 0, walking: false },
        position: { x: 0, y: DEFAULT_CONFIG.stepHeight, z: 0, stairIndex: 0 },
      }),
  },
}));

export const useConfig = () => useSceneStore((state) => state.config);
export const usePosition = () => useSceneStore((state) => state.position);
export const useStats = () => useSceneStore((state) => state.stats);
export const useCameraMode = () => useSceneStore((state) => state.cameraMode);
export const useSceneActions = () => useSceneStore((state) => state.actions);
