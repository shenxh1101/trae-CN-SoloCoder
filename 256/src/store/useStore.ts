import { create } from 'zustand';
import { FluidParams, EnvSettings, RecordState, DeformationMode, BackgroundMode } from '@/types';

interface AppState {
  fluidParams: FluidParams;
  envSettings: EnvSettings;
  recordState: RecordState;
  audioEnabled: boolean;
  audioAmplitude: number;

  setFlowSpeed: (speed: number) => void;
  setSmoothness: (smoothness: number) => void;
  setMode: (mode: DeformationMode) => void;
  setAmplitude: (amplitude: number) => void;
  setHueSpeed: (speed: number) => void;

  setBackground: (bg: BackgroundMode) => void;
  setBackgroundColor: (color: string) => void;
  setAmbientLight: (enabled: boolean) => void;
  setPointLight: (enabled: boolean) => void;
  setAutoRotate: (enabled: boolean) => void;

  setRecording: (isRecording: boolean) => void;
  setRecordProgress: (progress: number) => void;

  setAudioEnabled: (enabled: boolean) => void;
  setAudioAmplitude: (amplitude: number) => void;
}

export const useStore = create<AppState>((set) => ({
  fluidParams: {
    flowSpeed: 50,
    smoothness: 50,
    mode: 'turbulence',
    amplitude: 1,
    hueSpeed: 1,
  },
  envSettings: {
    background: 'solid',
    backgroundColor: '#0a0a0f',
    ambientLight: true,
    pointLight: true,
    autoRotate: true,
  },
  recordState: {
    isRecording: false,
    progress: 0,
  },
  audioEnabled: false,
  audioAmplitude: 0,

  setFlowSpeed: (speed) =>
    set((state) => ({ fluidParams: { ...state.fluidParams, flowSpeed: speed } })),
  setSmoothness: (smoothness) =>
    set((state) => ({ fluidParams: { ...state.fluidParams, smoothness } })),
  setMode: (mode) =>
    set((state) => ({ fluidParams: { ...state.fluidParams, mode } })),
  setAmplitude: (amplitude) =>
    set((state) => ({ fluidParams: { ...state.fluidParams, amplitude } })),
  setHueSpeed: (hueSpeed) =>
    set((state) => ({ fluidParams: { ...state.fluidParams, hueSpeed } })),

  setBackground: (background) =>
    set((state) => ({ envSettings: { ...state.envSettings, background } })),
  setBackgroundColor: (backgroundColor) =>
    set((state) => ({ envSettings: { ...state.envSettings, backgroundColor } })),
  setAmbientLight: (ambientLight) =>
    set((state) => ({ envSettings: { ...state.envSettings, ambientLight } })),
  setPointLight: (pointLight) =>
    set((state) => ({ envSettings: { ...state.envSettings, pointLight } })),
  setAutoRotate: (autoRotate) =>
    set((state) => ({ envSettings: { ...state.envSettings, autoRotate } })),

  setRecording: (isRecording) =>
    set((state) => ({ recordState: { ...state.recordState, isRecording } })),
  setRecordProgress: (progress) =>
    set((state) => ({ recordState: { ...state.recordState, progress } })),

  setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
  setAudioAmplitude: (audioAmplitude) => set({ audioAmplitude }),
}));
