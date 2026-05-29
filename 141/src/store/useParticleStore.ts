import { create } from 'zustand'
import { ParticleConfig, DEFAULT_CONFIG } from '@/types'

interface ParticleStore extends ParticleConfig {
  particleCount: number
  fps: number
  setConfig: (config: Partial<ParticleConfig>) => void
  setParticleCount: (count: number) => void
  setFps: (fps: number) => void
  resetConfig: () => void
  exportConfig: () => string
  importConfig: (json: string) => boolean
}

export const useParticleStore = create<ParticleStore>((set, get) => ({
  ...DEFAULT_CONFIG,
  particleCount: 0,
  fps: 0,

  setConfig: (config) => set(config as Partial<ParticleStore>),

  setParticleCount: (count) => set({ particleCount: count }),

  setFps: (fps) => set({ fps }),

  resetConfig: () => set({ ...DEFAULT_CONFIG, particleCount: 0 }),

  exportConfig: () => {
    const state = get()
    const config: ParticleConfig = {
      text: state.text,
      particleSize: state.particleSize,
      particleShape: state.particleShape,
      motionMode: state.motionMode,
      font: state.font,
      thickness: state.thickness,
      colorStart: state.colorStart,
      colorEnd: state.colorEnd,
      showNebula: state.showNebula,
      autoRotateCamera: state.autoRotateCamera,
      opacity: state.opacity,
      fadeDirection: state.fadeDirection,
    }
    return JSON.stringify(config, null, 2)
  },

  importConfig: (json) => {
    try {
      const config = JSON.parse(json) as ParticleConfig
      set(config as Partial<ParticleStore>)
      return true
    } catch {
      return false
    }
  },
}))
