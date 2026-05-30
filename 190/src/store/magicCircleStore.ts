import { create } from 'zustand'

export type ColorTheme = 'blue' | 'red' | 'green' | 'purple'
export type Background = 'grass' | 'castle' | 'void'

export interface MagicCircleConfig {
  rotationSpeed: number
  glowIntensity: number
  runeFontSize: number
  colorTheme: ColorTheme
  background: Background
  particleBeamEnabled: boolean
  soundEnabled: boolean
  autoRotateCamera: boolean
}

interface MagicCircleState extends MagicCircleConfig {
  isExploding: boolean
  triggerExplosion: () => void
  resetExplosion: () => void
  setRotationSpeed: (speed: number) => void
  setGlowIntensity: (intensity: number) => void
  setRuneFontSize: (size: number) => void
  setColorTheme: (theme: ColorTheme) => void
  setBackground: (bg: Background) => void
  setParticleBeamEnabled: (enabled: boolean) => void
  setSoundEnabled: (enabled: boolean) => void
  setAutoRotateCamera: (enabled: boolean) => void
  exportConfig: () => string
}

export const colorThemes = {
  blue: { 
    primary: '#4fc3f7', 
    secondary: '#0288d1', 
    ambient: '#81d4fa',
    name: '蓝色火焰'
  },
  red: { 
    primary: '#ff5252', 
    secondary: '#d32f2f', 
    ambient: '#ff8a80',
    name: '红色火焰'
  },
  green: { 
    primary: '#69f0ae', 
    secondary: '#2e7d32', 
    ambient: '#b9f6ca',
    name: '绿色自然'
  },
  purple: { 
    primary: '#e040fb', 
    secondary: '#7b1fa2', 
    ambient: '#ea80fc',
    name: '紫色暗影'
  }
}

export const backgrounds = {
  grass: { name: '夜晚草地', color: '#0a1f0a' },
  castle: { name: '古堡地砖', color: '#1a1510' },
  void: { name: '虚空', color: '#050510' }
}

export const useMagicCircleStore = create<MagicCircleState>((set, get) => ({
  rotationSpeed: 0.5,
  glowIntensity: 1.0,
  runeFontSize: 32,
  colorTheme: 'blue',
  background: 'void',
  particleBeamEnabled: false,
  soundEnabled: false,
  autoRotateCamera: false,
  isExploding: false,

  triggerExplosion: () => set({ isExploding: true }),
  resetExplosion: () => set({ isExploding: false }),
  setRotationSpeed: (speed: number) => set({ rotationSpeed: speed }),
  setGlowIntensity: (intensity: number) => set({ glowIntensity: intensity }),
  setRuneFontSize: (size: number) => set({ runeFontSize: size }),
  setColorTheme: (theme: ColorTheme) => set({ colorTheme: theme }),
  setBackground: (bg: Background) => set({ background: bg }),
  setParticleBeamEnabled: (enabled: boolean) => set({ particleBeamEnabled: enabled }),
  setSoundEnabled: (enabled: boolean) => set({ soundEnabled: enabled }),
  setAutoRotateCamera: (enabled: boolean) => set({ autoRotateCamera: enabled }),
  
  exportConfig: () => {
    const state = get()
    return JSON.stringify({
      rotationSpeed: state.rotationSpeed,
      glowIntensity: state.glowIntensity,
      runeFontSize: state.runeFontSize,
      colorTheme: state.colorTheme,
      background: state.background,
      particleBeamEnabled: state.particleBeamEnabled,
      soundEnabled: state.soundEnabled,
      autoRotateCamera: state.autoRotateCamera
    }, null, 2)
  }
}))
