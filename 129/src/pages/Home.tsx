import { Canvas } from '@react-three/fiber'
import SceneContent from '@/components/SceneContent'
import ControlPanel from '@/components/ControlPanel'

export default function Home() {
  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      <Canvas
        camera={{ position: [0, 10, 60], fov: 60, near: 0.1, far: 500 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        dpr={[1, 2]}
      >
        <SceneContent />
      </Canvas>
      <ControlPanel />
    </div>
  )
}
