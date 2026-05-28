import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useKaleidoscopeStore } from '@/store/useKaleidoscopeStore'

interface ParticlesProps {
  count?: number
}

export function Particles({ count = 300 }: ParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const particleMode = useKaleidoscopeStore((state) => state.config.particleMode)
  const colorSpeed = useKaleidoscopeStore((state) => state.config.colorSpeed)
  const audioData = useKaleidoscopeStore((state) => state.audioData)
  const audioVisualization = useKaleidoscopeStore((state) => state.config.audioVisualization)

  const { positions, velocities, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 2 + Math.random() * 2

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      velocities[i * 3] = (Math.random() - 0.5) * 0.01
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01

      sizes[i] = Math.random() * 2 + 1
    }

    return { positions, velocities, sizes }
  }, [count])

  useFrame(({ clock }) => {
    if (!pointsRef.current || !particleMode) return

    const geometry = pointsRef.current.geometry
    const posArray = geometry.attributes.position.array as Float32Array
    const time = clock.getElapsedTime()

    let audioMultiplier = 1
    if (audioVisualization && audioData.length > 0) {
      const avgAudio = audioData.reduce((a, b) => a + b, 0) / audioData.length
      audioMultiplier = 1 + avgAudio * 2
    }

    for (let i = 0; i < count; i++) {
      const i3 = i * 3

      posArray[i3] += velocities[i3] * audioMultiplier
      posArray[i3 + 1] += velocities[i3 + 1] * audioMultiplier
      posArray[i3 + 2] += velocities[i3 + 2] * audioMultiplier

      const distance = Math.sqrt(
        posArray[i3] ** 2 + posArray[i3 + 1] ** 2 + posArray[i3 + 2] ** 2
      )

      if (distance > 4) {
        const scale = 4 / distance
        posArray[i3] *= scale
        posArray[i3 + 1] *= scale
        posArray[i3 + 2] *= scale
        velocities[i3] *= -1
        velocities[i3 + 1] *= -1
        velocities[i3 + 2] *= -1
      }
    }

    geometry.attributes.position.needsUpdate = true

    const hue = (time * colorSpeed * 10) % 360
    const material = pointsRef.current.material as THREE.PointsMaterial
    material.color = new THREE.Color().setHSL(hue / 360, 1, 0.6)
    material.size = 0.05 * audioMultiplier
  })

  if (!particleMode) return null

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}
