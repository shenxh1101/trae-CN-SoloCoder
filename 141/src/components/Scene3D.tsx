import { useRef, useCallback, useEffect } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import ParticleText from './ParticleText'
import NebulaBackground from './NebulaBackground'
import { useParticleStore } from '@/store/useParticleStore'

function SceneContent() {
  const autoRotateCamera = useParticleStore((s) => s.autoRotateCamera)
  const controlsRef = useRef<any>(null)
  const { gl, scene, camera } = useThree()

  const handleScreenshot = useCallback(() => {
    gl.render(scene, camera)
    const canvas = gl.domElement as HTMLCanvasElement
    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `particle-text-${Date.now()}.png`
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [gl, scene, camera])

  useEffect(() => {
    const handler = () => handleScreenshot()
    window.addEventListener('take-screenshot', handler)
    return () => window.removeEventListener('take-screenshot', handler)
  }, [handleScreenshot])

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />

      <ParticleText />
      <NebulaBackground />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        autoRotate={autoRotateCamera}
        autoRotateSpeed={2}
        minDistance={5}
        maxDistance={80}
      />
    </>
  )
}

function FPSMonitor() {
  const setFps = useParticleStore((s) => s.setFps)
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())

  useFrame(() => {
    frameCount.current++
    const now = performance.now()
    if (now - lastTime.current >= 1000) {
      setFps(frameCount.current)
      frameCount.current = 0
      lastTime.current = now
    }
  })

  return null
}

export default function Scene3D() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 30], fov: 60, near: 0.1, far: 200 }}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
        }}
        style={{ background: 'transparent' }}
      >
        <color attach="background" args={['#0a0a0f']} />
        <fog attach="fog" args={['#0a0a0f', 60, 150]} />
        <SceneContent />
        <FPSMonitor />
      </Canvas>
    </div>
  )
}
