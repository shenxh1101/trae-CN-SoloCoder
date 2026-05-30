import { useMemo } from 'react'
import * as THREE from 'three'
import { useCrystalBallStore } from '@/store/crystalBallStore'

export function GroundReflection() {
  const reflectionEnabled = useCrystalBallStore((s) => s.reflectionEnabled)
  const crystalColor = useCrystalBallStore((s) => s.crystalColor)
  const COLOR_MAP: Record<string, string> = {
    red: '#ff3366',
    blue: '#3399ff',
    green: '#33ff99',
    purple: '#cc66ff',
  }

  const color = COLOR_MAP[crystalColor]

  if (!reflectionEnabled) return null

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial
        color="#050520"
        metalness={0.9}
        roughness={0.1}
        envMapIntensity={0.5}
        transparent
        opacity={0.6}
      />
    </mesh>
  )
}

export function SceneBackground() {
  const backgroundMode = useCrystalBallStore((s) => s.backgroundMode)

  const color = useMemo(() => {
    return backgroundMode === 'deepBlue' ? '#0a0a2e' : '#050510'
  }, [backgroundMode])

  return <color attach="background" args={[color]} />
}

export function SceneFog() {
  const backgroundMode = useCrystalBallStore((s) => s.backgroundMode)
  const fogColor = backgroundMode === 'deepBlue' ? '#0a0a2e' : '#050510'

  return <fog attach="fog" args={[fogColor, 8, 25]} />
}
