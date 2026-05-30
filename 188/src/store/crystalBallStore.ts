import { create } from 'zustand'

export type CrystalColor = 'red' | 'blue' | 'green' | 'purple'
export type BackgroundMode = 'deepBlue' | 'starry'

export const COLOR_MAP: Record<CrystalColor, string> = {
  red: '#ff3366',
  blue: '#3399ff',
  green: '#33ff99',
  purple: '#9400d3',
}

interface CrystalBallState {
  transparency: number
  ringSpeed: number
  glowIntensity: number
  crystalColor: CrystalColor
  reflectionEnabled: boolean
  backgroundMode: BackgroundMode
  autoRotate: boolean
  isMuted: boolean
  pulseActive: boolean

  setTransparency: (v: number) => void
  setRingSpeed: (v: number) => void
  setGlowIntensity: (v: number) => void
  setCrystalColor: (c: CrystalColor) => void
  toggleReflection: () => void
  toggleBackground: () => void
  toggleAutoRotate: () => void
  toggleMute: () => void
  triggerPulse: () => void
  exportConfig: () => string
  importConfig: (json: string) => void
}

interface ConfigSchema {
  transparency?: number
  ringSpeed?: number
  glowIntensity?: number
  crystalColor?: CrystalColor
  reflectionEnabled?: boolean
  backgroundMode?: BackgroundMode
  autoRotate?: boolean
  isMuted?: boolean
}

const isValidColor = (c: unknown): c is CrystalColor =>
  c === 'red' || c === 'blue' || c === 'green' || c === 'purple'

const isValidBackground = (b: unknown): b is BackgroundMode =>
  b === 'deepBlue' || b === 'starry'

export const useCrystalBallStore = create<CrystalBallState>((set, get) => ({
  transparency: 0.3,
  ringSpeed: 1.0,
  glowIntensity: 1.5,
  crystalColor: 'blue',
  reflectionEnabled: true,
  backgroundMode: 'starry',
  autoRotate: true,
  isMuted: true,
  pulseActive: false,

  setTransparency: (v) => set({ transparency: v }),
  setRingSpeed: (v) => set({ ringSpeed: v }),
  setGlowIntensity: (v) => set({ glowIntensity: v }),
  setCrystalColor: (c) => set({ crystalColor: c }),
  toggleReflection: () => set((s) => ({ reflectionEnabled: !s.reflectionEnabled })),
  toggleBackground: () =>
    set((s) => ({
      backgroundMode: s.backgroundMode === 'deepBlue' ? 'starry' : 'deepBlue',
    })),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  triggerPulse: () => {
    set({ pulseActive: true })
    setTimeout(() => set({ pulseActive: false }), 800)
  },
  exportConfig: () => {
    const s = get()
    const config = {
      transparency: s.transparency,
      ringSpeed: s.ringSpeed,
      glowIntensity: s.glowIntensity,
      crystalColor: s.crystalColor,
      reflectionEnabled: s.reflectionEnabled,
      backgroundMode: s.backgroundMode,
      autoRotate: s.autoRotate,
      isMuted: s.isMuted,
    }
    return JSON.stringify(config, null, 2)
  },
  importConfig: (json: string) => {
    try {
      const config = JSON.parse(json) as ConfigSchema
      const errors: string[] = []

      if (config.transparency !== undefined) {
        if (typeof config.transparency === 'number' && config.transparency >= 0 && config.transparency <= 1) {
          set({ transparency: config.transparency })
        } else {
          errors.push('transparency 必须是 0-1 之间的数字')
        }
      }
      if (config.ringSpeed !== undefined) {
        if (typeof config.ringSpeed === 'number' && config.ringSpeed >= 0 && config.ringSpeed <= 5) {
          set({ ringSpeed: config.ringSpeed })
        } else {
          errors.push('ringSpeed 必须是 0-5 之间的数字')
        }
      }
      if (config.glowIntensity !== undefined) {
        if (typeof config.glowIntensity === 'number' && config.glowIntensity >= 0.1 && config.glowIntensity <= 5) {
          set({ glowIntensity: config.glowIntensity })
        } else {
          errors.push('glowIntensity 必须是 0.1-5 之间的数字')
        }
      }
      if (config.crystalColor !== undefined) {
        if (isValidColor(config.crystalColor)) {
          set({ crystalColor: config.crystalColor })
        } else {
          errors.push('crystalColor 必须是 red/blue/green/purple 之一')
        }
      }
      if (config.reflectionEnabled !== undefined) {
        if (typeof config.reflectionEnabled === 'boolean') {
          set({ reflectionEnabled: config.reflectionEnabled })
        } else {
          errors.push('reflectionEnabled 必须是布尔值')
        }
      }
      if (config.backgroundMode !== undefined) {
        if (isValidBackground(config.backgroundMode)) {
          set({ backgroundMode: config.backgroundMode })
        } else {
          errors.push('backgroundMode 必须是 deepBlue/starry 之一')
        }
      }
      if (config.autoRotate !== undefined) {
        if (typeof config.autoRotate === 'boolean') {
          set({ autoRotate: config.autoRotate })
        } else {
          errors.push('autoRotate 必须是布尔值')
        }
      }
      if (config.isMuted !== undefined) {
        if (typeof config.isMuted === 'boolean') {
          set({ isMuted: config.isMuted })
        } else {
          errors.push('isMuted 必须是布尔值')
        }
      }

      if (errors.length > 0) {
        console.warn('导入配置时发现以下问题:', errors)
      }
    } catch (e) {
      console.error('无效的配置 JSON:', e)
      throw new Error('配置文件格式错误')
    }
  },
}))
