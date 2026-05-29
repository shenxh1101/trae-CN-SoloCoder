import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'
import { Star } from '@/types/game'

interface StarItemProps {
  star: Star
  index: number
}

export default function StarItem({ star, index }: StarItemProps) {
  const meshRef = useRef<Mesh>(null)
  const pointsRef = useRef<Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.03
      meshRef.current.rotation.x += 0.01
      meshRef.current.position.y = star.position.y + Math.sin(state.clock.elapsedTime * 3 + index) * 0.15
    }
    if (pointsRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4 + index) * 0.2
      pointsRef.current.scale.set(scale, scale, scale)
    }
  })

  if (star.collected) {
    return null
  }

  return (
    <group position={[star.position.x, star.position.y, star.position.z]}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial
          color="#ffd93d"
          emissive="#ffd93d"
          emissiveIntensity={0.8}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      <mesh ref={pointsRef}>
        <octahedronGeometry args={[0.45, 0]} />
        <meshBasicMaterial
          color="#ffd93d"
          transparent
          opacity={0.2}
          wireframe
        />
      </mesh>

      <pointLight color="#ffd93d" intensity={1.5} distance={5} />
    </group>
  )
}
