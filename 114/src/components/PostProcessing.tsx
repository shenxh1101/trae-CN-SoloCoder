import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useKaleidoscopeStore } from '@/store/useKaleidoscopeStore'

export function PostProcessing() {
  const mirrorEffect = useKaleidoscopeStore((state) => state.config.mirrorEffect)

  return (
    <EffectComposer>
      <Bloom
        intensity={1.5}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
    </EffectComposer>
  )
}
