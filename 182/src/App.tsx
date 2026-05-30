import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Suspense } from 'react'
import Pyraminx from './components/Pyraminx/Pyraminx'
import ControlPanel from './components/UI/ControlPanel'
import StepsPanel from './components/UI/StepsPanel'
import TopBar from './components/UI/TopBar'
import { useAppStore } from './store/appStore'

function App() {
  const { autoRotate } = useAppStore()

  return (
    <div className="w-full h-full relative bg-space-dark overflow-hidden">
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 2, 5], fov: 50 }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
        >
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00f5ff" />
          <Suspense fallback={null}>
            <Pyraminx />
            <OrbitControls 
              enableDamping 
              dampingFactor={0.05}
              autoRotate={autoRotate}
              autoRotateSpeed={0.5}
              minDistance={3}
              maxDistance={15}
            />
            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
          </Suspense>
        </Canvas>
      </div>

      <TopBar />
      <ControlPanel />
      <StepsPanel />

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/50 text-sm">
        <span className="font-mono">拖拽空白处旋转视角 | 点击并拖拽魔方层进行旋转 | 长按移动端旋转层</span>
      </div>
    </div>
  )
}

export default App
