import { Canvas } from '@react-three/fiber'
import { KaleidoscopeGeometry } from './KaleidoscopeGeometry'
import { Particles } from './Particles'
import { Background3D } from './Background3D'
import { CameraController } from './CameraController'
import { PostProcessing } from './PostProcessing'
import { useKaleidoscopeStore } from '@/store/useKaleidoscopeStore'

export function Scene3D() {
  const config = useKaleidoscopeStore((state) => state.config)

  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 60 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00ffff" />
      <pointLight position={[0, 10, -10]} intensity={0.5} color="#ff00ff" />

      <Background3D mode={config.backgroundMode} />
      <KaleidoscopeGeometry
        symmetryMode={config.symmetryMode}
        complexity={config.complexity}
        key={`${config.symmetryMode}-${config.complexity}`}
      />
      <Particles count={300} />
      <CameraController />
      <PostProcessing />
    </Canvas>
  )
}
