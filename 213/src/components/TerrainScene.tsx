import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useStore } from '@/store/useStore'
import Terrain from '@/components/Terrain'
import WaterPlane from '@/components/WaterPlane'
import SkySphere from '@/components/SkySphere'

export default function TerrainScene() {
  const autoRotate = useStore((s) => s.autoRotate)
  const showWater = useStore((s) => s.showWater)
  const showSky = useStore((s) => s.showSky)

  return (
    <Canvas
      camera={{ position: [8, 6, 8], fov: 50, near: 0.1, far: 1000 }}
      gl={{ preserveDrawingBuffer: true }}
      style={{ background: '#0a0e17' }}
    >
      <fog attach="fog" args={['#0a0e17', 15, 40]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.0} castShadow />
      <hemisphereLight args={['#87ceeb', '#362907', 0.3]} />
      <OrbitControls
        autoRotate={autoRotate}
        autoRotateSpeed={1.5}
        enableDamping
        maxPolarAngle={Math.PI * 0.45}
        minDistance={3}
        maxDistance={25}
      />
      <Terrain />
      {showWater && <WaterPlane />}
      {showSky && <SkySphere />}
    </Canvas>
  )
}
