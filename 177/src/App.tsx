import { Canvas } from '@react-three/fiber'
import Earth from '@/components/Earth'
import Moon from '@/components/Moon'
import StarField from '@/components/StarField'
import OrbitLine from '@/components/OrbitLine'
import Lights from '@/components/Lights'
import CameraController from '@/components/CameraController'
import ControlPanel from '@/components/ControlPanel'
import InfoPanel from '@/components/InfoPanel'
import CameraModeBadge from '@/components/CameraModeBadge'
import { useSolarSystemStore } from '@/store/useSolarSystemStore'

function Scene() {
  const showStarField = useSolarSystemStore((s) => s.showStarField)

  return (
    <>
      <Lights />
      <Earth />
      <Moon />
      <OrbitLine />
      {showStarField && <StarField />}
      <CameraController />
    </>
  )
}

export default function App() {
  return (
    <div className="w-full h-full relative bg-space-900">
      <Canvas
        camera={{ position: [15, 10, 15], fov: 50, near: 0.1, far: 500 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        style={{ background: '#0a0a1a' }}
      >
        <Scene />
      </Canvas>

      <ControlPanel />
      <InfoPanel />
      <CameraModeBadge />

      <div className="fixed top-4 left-4 z-10">
        <h1 className="font-orbitron text-lg text-star-blue tracking-[0.2em]">
          EARTH-MOON
        </h1>
        <p className="text-[10px] text-moon-gray/50 font-noto mt-0.5">
          地月系统3D交互模拟器
        </p>
      </div>
    </div>
  )
}
