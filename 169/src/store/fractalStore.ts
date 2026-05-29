import { create } from 'zustand'
import type { FractalParams, ShapeType, BackgroundMode, ColorMode } from '@/types'

interface FractalStore extends FractalParams {
  setDepth: (depth: number) => void
  setShapeType: (shapeType: ShapeType) => void
  setRotationSpeed: (speed: number) => void
  setScaleSpeed: (speed: number) => void
  setBackgroundMode: (mode: BackgroundMode) => void
  setColorMode: (mode: ColorMode) => void
  setWireframe: (wireframe: boolean) => void
  setAutoOrbit: (autoOrbit: boolean) => void
  setParams: (params: Partial<FractalParams>) => void
}

export const useFractalStore = create<FractalStore>((set) => ({
  depth: 2,
  shapeType: 'cube',
  rotationSpeed: 0.5,
  scaleSpeed: 0.3,
  backgroundMode: 'black',
  colorMode: 'gradient',
  wireframe: false,
  autoOrbit: true,

  setDepth: (depth) => set({ depth }),
  setShapeType: (shapeType) => set({ shapeType }),
  setRotationSpeed: (rotationSpeed) => set({ rotationSpeed }),
  setScaleSpeed: (scaleSpeed) => set({ scaleSpeed }),
  setBackgroundMode: (backgroundMode) => set({ backgroundMode }),
  setColorMode: (colorMode) => set({ colorMode }),
  setWireframe: (wireframe) => set({ wireframe }),
  setAutoOrbit: (autoOrbit) => set({ autoOrbit }),
  setParams: (params) => set(params),
}))
