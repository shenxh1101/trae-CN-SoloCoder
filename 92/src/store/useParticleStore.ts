import { create } from 'zustand'

type MotionMode = 'static' | 'rotateY' | 'rotateXY'
type ParticleShape = 'sphere' | 'cube' | 'star'
type Background = 'black' | 'white' | 'starfield'

interface ParticleStore {
  particleCount: number
  particleSize: number
  sphereRadius: number
  motionMode: MotionMode
  particleShape: ParticleShape
  background: Background
  showLines: boolean
  autoRotate: boolean
  trailEffect: boolean
  screenshotTrigger: number
  setParticleCount: (v: number) => void
  setParticleSize: (v: number) => void
  setSphereRadius: (v: number) => void
  setMotionMode: (v: MotionMode) => void
  setParticleShape: (v: ParticleShape) => void
  setBackground: (v: Background) => void
  setShowLines: (v: boolean) => void
  setAutoRotate: (v: boolean) => void
  setTrailEffect: (v: boolean) => void
  triggerScreenshot: () => void
}

export const useParticleStore = create<ParticleStore>((set) => ({
  particleCount: 3000,
  particleSize: 3,
  sphereRadius: 5,
  motionMode: 'rotateY',
  particleShape: 'sphere',
  background: 'black',
  showLines: false,
  autoRotate: false,
  trailEffect: false,
  screenshotTrigger: 0,
  setParticleCount: (v) => set({ particleCount: v }),
  setParticleSize: (v) => set({ particleSize: v }),
  setSphereRadius: (v) => set({ sphereRadius: v }),
  setMotionMode: (v) => set({ motionMode: v }),
  setParticleShape: (v) => set({ particleShape: v }),
  setBackground: (v) => set({ background: v }),
  setShowLines: (v) => set({ showLines: v }),
  setAutoRotate: (v) => set({ autoRotate: v }),
  setTrailEffect: (v) => set({ trailEffect: v }),
  triggerScreenshot: () => set({ screenshotTrigger: Date.now() }),
}))
