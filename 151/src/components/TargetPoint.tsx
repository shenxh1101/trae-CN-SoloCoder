import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'
import { TargetPoint as TargetType } from '@/types/game'

interface TargetPointProps {
  target: TargetType
  index: number
  isNext: boolean
}

export default function TargetPoint({ target, index, isNext }: TargetPointProps) {
  const meshRef = useRef<Mesh>(null)
  const ringRef = useRef<Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02
      meshRef.current.position.y = target.position.y + Math.sin(state.clock.elapsedTime * 2 + index) * 0.2
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.03
      ringRef.current.rotation.x += 0.01
    }
  })

  const baseColor = target.reached ? '#00ff88' : (isNext ? '#ff6b6b' : '#ffd93d')
  const emissiveIntensity = target.reached ? 0.8 : (isNext ? 1 : 0.5)

  if (target.reached) {
    return (
      <group position={[target.position.x, target.position.y, target.position.z]}>
        <mesh ref={meshRef}>
          <torusGeometry args={[0.4, 0.08, 16, 32]} />
          <meshStandardMaterial
            color="#00ff88"
            emissive="#00ff88"
            emissiveIntensity={0.8}
            transparent
            opacity={0.6}
          />
        </mesh>
        <pointLight color="#00ff88" intensity={1} distance={3} />
      </group>
    )
  }

  return (
    <group position={[target.position.x, target.position.y, target.position.z]}>
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.3, 0.3, 0.6, 16]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={0.8}
        />
      </mesh>

      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.6, 0.03, 16, 32]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={emissiveIntensity * 0.5}
          transparent
          opacity={0.5}
        />
      </mesh>

      {isNext && (
        <mesh position={[0, 1, 0]}>
          <coneGeometry args={[0.2, 0.5, 8]} />
          <meshBasicMaterial color="#ff6b6b" transparent opacity={0.8} />
        </mesh>
      )}

      <pointLight color={baseColor} intensity={isNext ? 2 : 1} distance={4} />
    </group>
  )
}
