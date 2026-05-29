export type ShapeType = 'tetrahedron' | 'cube' | 'icosahedron'
export type BackgroundMode = 'black' | 'darkBlue' | 'gradient'
export type ColorMode = 'gradient' | 'random' | 'monochrome'

export interface FractalParams {
  depth: number
  shapeType: ShapeType
  rotationSpeed: number
  scaleSpeed: number
  backgroundMode: BackgroundMode
  colorMode: ColorMode
  wireframe: boolean
  autoOrbit: boolean
}

export interface FractalInstance {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  depth: number
}

export interface FractalStats {
  vertices: number
  faces: number
  instances: number
}
