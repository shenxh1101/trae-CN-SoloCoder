import { create } from 'zustand'

interface StoreState {
  snowflakeCount: number
  snowfallSpeed: number
  isNight: boolean
  fogDensity: number
  windStrength: number
  isAutoOrbit: boolean
  isMusicMuted: boolean
  snowmanWaving: boolean

  setSnowflakeCount: (v: number) => void
  setSnowfallSpeed: (v: number) => void
  setIsNight: (v: boolean) => void
  setFogDensity: (v: number) => void
  setWindStrength: (v: number) => void
  setIsAutoOrbit: (v: boolean) => void
  setIsMusicMuted: (v: boolean) => void
  setSnowmanWaving: (v: boolean) => void
  toggleNight: () => void
  toggleAutoOrbit: () => void
  toggleMusicMuted: () => void
}

export const useStore = create<StoreState>((set) => ({
  snowflakeCount: 800,
  snowfallSpeed: 1.0,
  isNight: false,
  fogDensity: 0.02,
  windStrength: 0,
  isAutoOrbit: false,
  isMusicMuted: true,
  snowmanWaving: false,

  setSnowflakeCount: (v) => set({ snowflakeCount: v }),
  setSnowfallSpeed: (v) => set({ snowfallSpeed: v }),
  setIsNight: (v) => set({ isNight: v }),
  setFogDensity: (v) => set({ fogDensity: v }),
  setWindStrength: (v) => set({ windStrength: v }),
  setIsAutoOrbit: (v) => set({ isAutoOrbit: v }),
  setIsMusicMuted: (v) => set({ isMusicMuted: v }),
  setSnowmanWaving: (v) => set({ snowmanWaving: v }),
  toggleNight: () => set((s) => ({ isNight: !s.isNight })),
  toggleAutoOrbit: () => set((s) => ({ isAutoOrbit: !s.isAutoOrbit })),
  toggleMusicMuted: () => set((s) => ({ isMusicMuted: !s.isMusicMuted })),
}))
