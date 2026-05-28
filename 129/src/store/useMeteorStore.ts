import { create } from 'zustand'

export type BackgroundType = 'deepBlue' | 'purple' | 'starry'
export type MeteorColorType = 'white' | 'lightYellow' | 'lightBlue'

interface MeteorState {
  density: number
  speed: number
  trailLength: number
  background: BackgroundType
  flashEnabled: boolean
  musicEnabled: boolean
  soundEnabled: boolean
  autoRotate: boolean
  meteorColor: MeteorColorType
  meteorCount: number
  setDensity: (v: number) => void
  setSpeed: (v: number) => void
  setTrailLength: (v: number) => void
  setBackground: (v: BackgroundType) => void
  setFlashEnabled: (v: boolean) => void
  setMusicEnabled: (v: boolean) => void
  setSoundEnabled: (v: boolean) => void
  setAutoRotate: (v: boolean) => void
  setMeteorColor: (v: MeteorColorType) => void
  setMeteorCount: (v: number) => void
}

export const useMeteorStore = create<MeteorState>((set) => ({
  density: 15,
  speed: 1.0,
  trailLength: 30,
  background: 'deepBlue',
  flashEnabled: true,
  musicEnabled: false,
  soundEnabled: false,
  autoRotate: false,
  meteorColor: 'white',
  meteorCount: 0,
  setDensity: (v) => set({ density: v }),
  setSpeed: (v) => set({ speed: v }),
  setTrailLength: (v) => set({ trailLength: v }),
  setBackground: (v) => set({ background: v }),
  setFlashEnabled: (v) => set({ flashEnabled: v }),
  setMusicEnabled: (v) => set({ musicEnabled: v }),
  setSoundEnabled: (v) => set({ soundEnabled: v }),
  setAutoRotate: (v) => set({ autoRotate: v }),
  setMeteorColor: (v) => set({ meteorColor: v }),
  setMeteorCount: (v) => set({ meteorCount: v }),
}))
