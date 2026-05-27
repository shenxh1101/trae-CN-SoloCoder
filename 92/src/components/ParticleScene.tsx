import { useState, useMemo, useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import ParticleSphere from './ParticleSphere'
import ControlPanel from './ControlPanel'
import InfoOverlay from './InfoOverlay'
import { useParticleStore } from '@/store/useParticleStore'

function StarField() {
  const positions = useMemo(() => {
    const count = 2000
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 200
      pos[i * 3 + 1] = (Math.random() - 0.5) * 200
      pos[i * 3 + 2] = (Math.random() - 0.5) * 200
    }
    return pos
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2000}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.3} color="#ffffff" transparent opacity={0.8} sizeAttenuation />
    </points>
  )
}

function SceneSetup() {
  const background = useParticleStore((s) => s.background)
  const trailEffect = useParticleStore((s) => s.trailEffect)
  const { scene, gl } = useThree()
  const trailQuadRef = useRef<THREE.Mesh | null>(null)

  const getBgHex = () => {
    if (background === 'white') return '#ffffff'
    if (background === 'starfield') return '#0a0a1a'
    return '#000000'
  }

  useEffect(() => {
    if (background === 'white') {
      scene.background = new THREE.Color('#ffffff')
    } else if (background === 'black') {
      scene.background = new THREE.Color('#000000')
    } else {
      scene.background = new THREE.Color('#050510')
    }
  }, [background, scene])

  useEffect(() => {
    if (trailEffect) {
      gl.autoClear = false
      if (!trailQuadRef.current) {
        const bgMat = new THREE.MeshBasicMaterial({
          color: getBgHex(),
          transparent: true,
          opacity: 0.08,
          depthWrite: false,
          depthTest: false,
        })
        const bgMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(500, 500),
          bgMat
        )
        bgMesh.renderOrder = -999
        bgMesh.position.z = -100
        bgMesh.frustumCulled = false
        scene.add(bgMesh)
        trailQuadRef.current = bgMesh
      }
    } else {
      gl.autoClear = true
      if (trailQuadRef.current) {
        scene.remove(trailQuadRef.current)
        trailQuadRef.current.geometry.dispose()
        ;(trailQuadRef.current.material as THREE.Material).dispose()
        trailQuadRef.current = null
      }
      gl.clear()
    }
  }, [trailEffect, gl, scene])

  useEffect(() => {
    if (trailQuadRef.current) {
      ;(trailQuadRef.current.material as THREE.MeshBasicMaterial).color.set(getBgHex())
    }
  }, [background])

  return null
}

function CameraControls() {
  const autoRotate = useParticleStore((s) => s.autoRotate)
  return (
    <OrbitControls
      autoRotate={autoRotate}
      autoRotateSpeed={1.5}
      enableDamping
      dampingFactor={0.05}
      minDistance={3}
      maxDistance={30}
    />
  )
}

function ScreenshotHelper() {
  const screenshotTrigger = useParticleStore((s) => s.screenshotTrigger)
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    if (screenshotTrigger === 0) return
    const wasAutoClear = gl.autoClear
    gl.autoClear = true
    gl.clear()
    gl.render(scene, camera)
    const dataUrl = gl.domElement.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `particle-sphere-${screenshotTrigger}.png`
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    gl.autoClear = wasAutoClear
  }, [screenshotTrigger, gl, scene, camera])
  return null
}

export default function ParticleScene() {
  const background = useParticleStore((s) => s.background)
  const [panelOpen, setPanelOpen] = useState(true)
  const triggerScreenshot = useParticleStore((s) => s.triggerScreenshot)

  return (
    <div className="w-screen h-screen relative overflow-hidden">
      <Canvas
        gl={{ preserveDrawingBuffer: true, antialias: true, alpha: false }}
        camera={{ position: [0, 0, 12], fov: 60 }}
      >
        <SceneSetup />
        <ParticleSphere />
        <CameraControls />
        <ScreenshotHelper />
        {background === 'starfield' && <StarField />}
      </Canvas>

      <InfoOverlay />

      <button
        onClick={() => setPanelOpen(!panelOpen)}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all lg:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {panelOpen ? (
            <path d="M18 6L6 18M6 6l12 12" />
          ) : (
            <>
              <path d="M12 5v14M5 12h14" />
            </>
          )}
        </svg>
      </button>

      <ControlPanel open={panelOpen} onScreenshot={triggerScreenshot} />
    </div>
  )
}
