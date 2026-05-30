import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useCrystalBallStore } from '@/store/crystalBallStore'

export function SceneEffects() {
  const glowIntensity = useCrystalBallStore((s) => s.glowIntensity)

  return (
    <EffectComposer>
      <Bloom
        intensity={glowIntensity * 0.5}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
    </EffectComposer>
  )
}
