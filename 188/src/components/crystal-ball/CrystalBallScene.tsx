import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { CrystalBall, InnerCrystal } from './CrystalBall'
import { ParticleRing, StarParticles } from './Particles'
import { GroundReflection, SceneBackground, SceneFog } from './Environment'
import { SceneEffects } from './Effects'
import { useCrystalBallStore } from '@/store/crystalBallStore'
import { useCallback } from 'react'

export function CrystalBallScene() {
  const triggerPulse = useCrystalBallStore((s) => s.triggerPulse)
  const autoRotate = useCrystalBallStore((s) => s.autoRotate)

  const handleClick = useCallback(
    (e: any) => {
      e.stopPropagation()
      triggerPulse()
    },
    [triggerPulse]
  )

  return (
    <Canvas
      camera={{ position: [0, 1, 5], fov: 50 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneBackground />
      <SceneFog />
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 5, 5]} intensity={0.4} color="#8899cc" />
      <pointLight position={[-3, 3, -3]} intensity={0.3} color="#4466aa" />

      <group onClick={handleClick}>
        <CrystalBall />
        <InnerCrystal />
      </group>

      <ParticleRing />
      <StarParticles />
      <GroundReflection />
      <SceneEffects />

      <Environment preset="night" background={false} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2.5}
        maxDistance={10}
        enablePan={false}
        maxPolarAngle={Math.PI * 0.85}
        autoRotate={autoRotate}
        autoRotateSpeed={1.0}
      />
    </Canvas>
  )
}
