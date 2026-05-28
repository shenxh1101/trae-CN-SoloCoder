import { create } from 'zustand'

export type SymmetryMode = 'triangle' | 'square' | 'hexagon' | 'octagon'
export type BackgroundMode = 'black' | 'white' | 'rainbow'

export interface KaleidoscopeConfig {
  symmetryMode: SymmetryMode
  rotationSpeed: number
  colorSpeed: number
  complexity: number
  backgroundMode: BackgroundMode
  mirrorEffect: boolean
  particleMode: boolean
  audioVisualization: boolean
}

interface AppState {
  config: KaleidoscopeConfig
  isFullscreen: boolean
  isMicConnected: boolean
  audioData: number[]
  hue: number
  cameraResetTrigger: number

  setSymmetryMode: (mode: SymmetryMode) => void
  setRotationSpeed: (speed: number) => void
  setColorSpeed: (speed: number) => void
  setComplexity: (complexity: number) => void
  setBackgroundMode: (mode: BackgroundMode) => void
  setMirrorEffect: (enabled: boolean) => void
  setParticleMode: (enabled: boolean) => void
  setAudioVisualization: (enabled: boolean) => void
  setMicConnected: (connected: boolean) => void
  setAudioData: (data: number[]) => void
  setHue: (hue: number) => void
  toggleFullscreen: () => void
  resetCamera: () => void
  exportConfig: () => KaleidoscopeConfig
  importConfig: (config: KaleidoscopeConfig) => void
}

export const DEFAULT_CONFIG: KaleidoscopeConfig = {
  symmetryMode: 'hexagon',
  rotationSpeed: 0.5,
  colorSpeed: 0.5,
  complexity: 5,
  backgroundMode: 'black',
  mirrorEffect: false,
  particleMode: false,
  audioVisualization: false
}

export const SYMMETRY_COUNT: Record<SymmetryMode, number> = {
  triangle: 3,
  square: 4,
  hexagon: 6,
  octagon: 8
}

export const SYMMETRY_LABELS: Record<SymmetryMode, string> = {
  triangle: '三角形',
  square: '正方形',
  hexagon: '六边形',
  octagon: '八边形'
}

export const BACKGROUND_LABELS: Record<BackgroundMode, string> = {
  black: '黑色',
  white: '白色',
  rainbow: '彩虹渐变'
}

export const useKaleidoscopeStore = create<AppState>((set, get) => ({
  config: { ...DEFAULT_CONFIG },
  isFullscreen: false,
  isMicConnected: false,
  audioData: [],
  hue: 0,
  cameraResetTrigger: 0,

  setSymmetryMode: (mode) =>
    set((state) => ({ config: { ...state.config, symmetryMode: mode } })),

  setRotationSpeed: (speed) =>
    set((state) => ({ config: { ...state.config, rotationSpeed: speed } })),

  setColorSpeed: (speed) =>
    set((state) => ({ config: { ...state.config, colorSpeed: speed } })),

  setComplexity: (complexity) =>
    set((state) => ({ config: { ...state.config, complexity } })),

  setBackgroundMode: (mode) =>
    set((state) => ({ config: { ...state.config, backgroundMode: mode } })),

  setMirrorEffect: (enabled) =>
    set((state) => ({ config: { ...state.config, mirrorEffect: enabled } })),

  setParticleMode: (enabled) =>
    set((state) => ({ config: { ...state.config, particleMode: enabled } })),

  setAudioVisualization: (enabled) =>
    set((state) => ({ config: { ...state.config, audioVisualization: enabled } })),

  setMicConnected: (connected) => set({ isMicConnected: connected }),

  setAudioData: (data) => set({ audioData: data }),

  setHue: (hue) => set({ hue }),

  toggleFullscreen: () =>
    set((state) => ({ isFullscreen: !state.isFullscreen })),

  resetCamera: () =>
    set((state) => ({ cameraResetTrigger: state.cameraResetTrigger + 1 })),

  exportConfig: () => ({ ...get().config }),

  importConfig: (config) =>
    set({ config: { ...DEFAULT_CONFIG, ...config } })
}))
