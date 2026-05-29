import { create } from 'zustand';
import * as THREE from 'three';
import { SceneConfig, BeamData, ColorMode, BackgroundColor } from '../types';
import { generateColor } from '../utils/colorUtils';
import { exportConfig } from '../utils/exportUtils';

function calculateGridSize(count: number): { gridSize: number; spacing: number } {
  const gridSize = Math.ceil(Math.sqrt(count));
  const spacing = Math.max(0.8, 15 / gridSize);
  return { gridSize, spacing };
}

function generateBeamData(config: SceneConfig): BeamData[] {
  const beams: BeamData[] = [];
  const { gridSize, spacing } = calculateGridSize(config.beamCount);
  const halfGrid = (gridSize - 1) / 2;
  let id = 0;

  for (let i = 0; i < gridSize && id < config.beamCount; i++) {
    for (let j = 0; j < gridSize && id < config.beamCount; j++) {
      const x = (i - halfGrid) * spacing + (Math.random() - 0.5) * spacing * 0.3;
      const z = (j - halfGrid) * spacing + (Math.random() - 0.5) * spacing * 0.3;
      const height = config.beamMinHeight + Math.random() * (config.beamMaxHeight - config.beamMinHeight);
      
      beams.push({
        id: id,
        x,
        z,
        height,
        color: generateColor(config.colorMode),
        pulseOffset: Math.random() * Math.PI * 2,
        pulseStrength: 0.6 + Math.random() * 0.4,
      });
      id++;
    }
  }

  return beams;
}

const initialConfig: SceneConfig = {
  beamCount: 400,
  beamMinHeight: 3,
  beamMaxHeight: 12,
  beamRadius: 0.15,
  pulseSpeed: 1.0,
  colorMode: 'rainbow',
  backgroundColor: 'black',
  enableMirror: false,
  enableFog: false,
  enableParticles: false,
  autoRotate: false,
  ...calculateGridSize(400),
};

interface SceneState {
  config: SceneConfig;
  beamData: BeamData[];
  screenshotTrigger: number;
  actions: {
    setBeamCount: (count: number) => void;
    setHeightRange: (min: number, max: number) => void;
    setBeamRadius: (radius: number) => void;
    setPulseSpeed: (speed: number) => void;
    setColorMode: (mode: ColorMode) => void;
    setBackgroundColor: (bg: BackgroundColor) => void;
    toggleMirror: () => void;
    toggleFog: () => void;
    toggleParticles: () => void;
    toggleAutoRotate: () => void;
    regenerateBeams: () => void;
    triggerScreenshot: () => void;
    exportConfig: () => void;
  };
}

export const useSceneStore = create<SceneState>((set, get) => ({
  config: initialConfig,
  beamData: generateBeamData(initialConfig),
  screenshotTrigger: 0,

  actions: {
    setBeamCount: (count: number) => {
      const { gridSize, spacing } = calculateGridSize(count);
      const newConfig = { ...get().config, beamCount: count, gridSize, spacing };
      set({ config: newConfig, beamData: generateBeamData(newConfig) });
    },

    setHeightRange: (min: number, max: number) => {
      const newConfig = { ...get().config, beamMinHeight: min, beamMaxHeight: max };
      set({ config: newConfig, beamData: generateBeamData(newConfig) });
    },

    setBeamRadius: (radius: number) => {
      set({ config: { ...get().config, beamRadius: radius } });
    },

    setPulseSpeed: (speed: number) => {
      set({ config: { ...get().config, pulseSpeed: speed } });
    },

    setColorMode: (mode: ColorMode) => {
      const newConfig = { ...get().config, colorMode: mode };
      set({ config: newConfig, beamData: generateBeamData(newConfig) });
    },

    setBackgroundColor: (bg: BackgroundColor) => {
      set({ config: { ...get().config, backgroundColor: bg } });
    },

    toggleMirror: () => {
      set({ config: { ...get().config, enableMirror: !get().config.enableMirror } });
    },

    toggleFog: () => {
      set({ config: { ...get().config, enableFog: !get().config.enableFog } });
    },

    toggleParticles: () => {
      set({ config: { ...get().config, enableParticles: !get().config.enableParticles } });
    },

    toggleAutoRotate: () => {
      set({ config: { ...get().config, autoRotate: !get().config.autoRotate } });
    },

    regenerateBeams: () => {
      set({ beamData: generateBeamData(get().config) });
    },

    triggerScreenshot: () => {
      set({ screenshotTrigger: get().screenshotTrigger + 1 });
    },

    exportConfig: () => {
      exportConfig(get().config);
    },
  },
}));

export const useConfig = () => useSceneStore((state) => state.config);
export const useBeamData = () => useSceneStore((state) => state.beamData);
export const useScreenshotTrigger = () => useSceneStore((state) => state.screenshotTrigger);
export const useSceneActions = () => useSceneStore((state) => state.actions);
