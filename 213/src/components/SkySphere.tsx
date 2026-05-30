import { Sky } from '@react-three/drei'
import { useStore } from '@/store/useStore'

export default function SkySphere() {
  const showSky = useStore((s) => s.showSky)

  if (!showSky) return null

  return (
    <Sky
      distance={450000}
      sunPosition={[100, 20, 100]}
      turbidity={8}
      rayleigh={2}
      mieCoefficient={0.005}
      mieDirectionalG={0.8}
    />
  )
}
