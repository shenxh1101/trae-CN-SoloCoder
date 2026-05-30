import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { EARTH_MOON_DISTANCE } from '@/utils/constants'
import { useSolarSystemStore } from '@/store/useSolarSystemStore'

export default function OrbitLine() {
  const showOrbitLine = useSolarSystemStore((s) => s.showOrbitLine)

  const orbitPoints = useMemo(() => {
    const points: [number, number, number][] = []
    const segments = 128
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push([
        Math.cos(angle) * EARTH_MOON_DISTANCE,
        0,
        Math.sin(angle) * EARTH_MOON_DISTANCE,
      ])
    }
    return points
  }, [])

  if (!showOrbitLine) return null

  return (
    <Line
      points={orbitPoints}
      color="#ffd700"
      lineWidth={0.8}
      transparent
      opacity={0.25}
      depthWrite={false}
    />
  )
}
