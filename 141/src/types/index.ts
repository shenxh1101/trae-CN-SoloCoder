export type MotionMode = 'static' | 'float' | 'rotate'
export type ParticleShape = 'circle' | 'square' | 'star'
export type FontType = 'default' | 'artistic'

export interface ParticleConfig {
  text: string
  particleSize: number
  particleShape: ParticleShape
  motionMode: MotionMode
  font: FontType
  thickness: number
  colorStart: string
  colorEnd: string
  showNebula: boolean
  autoRotateCamera: boolean
  opacity: number
  fadeDirection: 'none' | 'in' | 'out'
}

export interface ParticlePoint {
  x: number
  y: number
  z: number
}

export const DEFAULT_CONFIG: ParticleConfig = {
  text: 'HELLO',
  particleSize: 2.5,
  particleShape: 'circle',
  motionMode: 'float',
  font: 'default',
  thickness: 3,
  colorStart: '#8b5cf6',
  colorEnd: '#06b6d4',
  showNebula: true,
  autoRotateCamera: false,
  opacity: 1,
  fadeDirection: 'none',
}
