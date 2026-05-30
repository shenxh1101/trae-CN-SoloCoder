import { create } from 'zustand'

type ColorRGB = { r: number; g: number; b: number }
type CurvePoint = { x: number; y: number }

const DEFAULT_PALETTE: ColorRGB[] = [
  { r: 26, g: 26, b: 78 },
  { r: 26, g: 107, b: 90 },
  { r: 74, g: 140, b: 63 },
  { r: 196, g: 160, b: 53 },
  { r: 212, g: 98, b: 42 },
  { r: 139, g: 26, b: 26 },
]

const DEFAULT_CURVE_POINTS: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 0.25, y: 0.15 },
  { x: 0.75, y: 0.85 },
  { x: 1, y: 1 },
]

interface TerrainStore {
  seed: number
  segments: number
  amplitude: number
  colorPalette: ColorRGB[]
  curvePoints: CurvePoint[]
  showWater: boolean
  showSky: boolean
  autoRotate: boolean
  uploadedImage: string | null
  heightData: Float32Array | null

  setSeed: (seed: number) => void
  setSegments: (segments: number) => void
  setAmplitude: (amplitude: number) => void
  setColorPalette: (palette: ColorRGB[]) => void
  setCurvePoints: (points: CurvePoint[]) => void
  toggleWater: () => void
  toggleSky: () => void
  toggleAutoRotate: () => void
  setUploadedImage: (image: string | null) => void
  setHeightData: (data: Float32Array) => void
  randomizeSeed: () => void
}

export const useStore = create<TerrainStore>()((set) => ({
  seed: 42,
  segments: 128,
  amplitude: 2.0,
  colorPalette: DEFAULT_PALETTE,
  curvePoints: DEFAULT_CURVE_POINTS,
  showWater: false,
  showSky: false,
  autoRotate: true,
  uploadedImage: null,
  heightData: null,

  setSeed: (seed) => set({ seed }),
  setSegments: (segments) => set({ segments }),
  setAmplitude: (amplitude) => set({ amplitude }),
  setColorPalette: (palette) => set({ colorPalette: palette }),
  setCurvePoints: (points) => set({ curvePoints: points }),
  toggleWater: () => set((state) => ({ showWater: !state.showWater })),
  toggleSky: () => set((state) => ({ showSky: !state.showSky })),
  toggleAutoRotate: () => set((state) => ({ autoRotate: !state.autoRotate })),
  setUploadedImage: (image) => set({ uploadedImage: image }),
  setHeightData: (data) => set({ heightData: data }),
  randomizeSeed: () => set({ seed: Math.floor(Math.random() * 99999) + 1 }),
}))
