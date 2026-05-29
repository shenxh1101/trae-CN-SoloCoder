import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'
import { Platform as PlatformType } from '@/types/game'

interface PlatformProps {
  platform: PlatformType
  index: number
}

export default function Platform({ platform, index }: PlatformProps) {
  const meshRef = useRef<Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      const floatOffset = Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.05
      meshRef.current.position.y = platform.position.y + floatOffset
    }
  })

  const color = platform.color || '#2a2a4a'

  return (
    <mesh
      ref={meshRef}
      position={[platform.position.x, platform.position.y, platform.position.z]}
      receiveShadow
      castShadow
    >
      <boxGeometry args={[platform.size.x, platform.size.y, platform.size.z]} />
      <meshStandardMaterial
        color={color}
        metalness={0.5}
        roughness={0.3}
      />
      <mesh position={[0, platform.size.y / 2 + 0.01, 0]}>
        <boxGeometry args={[platform.size.x * 0.95, 0.02, platform.size.z * 0.95]} />
        <meshStandardMaterial
          color="#00d4ff"
          emissive="#00d4ff"
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
        />
      </mesh>
    </mesh>
  )
}
