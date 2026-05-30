import { create } from 'zustand'

type OrbitSpeed = 0.5 | 1 | 2 | 5
type CameraMode = 'global' | 'lunar'

interface SolarSystemStore {
  cameraMode: CameraMode
  orbitSpeed: OrbitSpeed
  showOrbitLine: boolean
  showAtmosphere: boolean
  showStarField: boolean
  autoRotate: boolean
  earthMoonDistance: number
  setCameraMode: (mode: CameraMode) => void
  setOrbitSpeed: (speed: OrbitSpeed) => void
  toggleOrbitLine: () => void
  toggleAtmosphere: () => void
  toggleStarField: () => void
  toggleAutoRotate: () => void
  setEarthMoonDistance: (distance: number) => void
}

export const useSolarSystemStore = create<SolarSystemStore>((set) => ({
  cameraMode: 'global',
  orbitSpeed: 1,
  showOrbitLine: true,
  showAtmosphere: true,
  showStarField: true,
  autoRotate: true,
  earthMoonDistance: 8.0,
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setOrbitSpeed: (speed) => set({ orbitSpeed: speed }),
  toggleOrbitLine: () => set((s) => ({ showOrbitLine: !s.showOrbitLine })),
  toggleAtmosphere: () => set((s) => ({ showAtmosphere: !s.showAtmosphere })),
  toggleStarField: () => set((s) => ({ showStarField: !s.showStarField })),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  setEarthMoonDistance: (distance) => set({ earthMoonDistance: distance }),
}))
