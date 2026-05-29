import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, ArrowHelper, Vector3 as ThreeVector3 } from 'three'
import { Wind } from '@/types/game'

interface WindIndicatorProps {
  wind: Wind
}

export default function WindIndicator({ wind }: WindIndicatorProps) {
  const groupRef = useRef<Group>(null)
  const arrowRef = useRef<ArrowHelper>(null)

  useFrame((state) => {
    if (groupRef.current && wind.enabled) {
      groupRef.current.rotation.y += wind.strength * 2
    }
  })

  if (!wind.enabled) return null

  const dir = new ThreeVector3(wind.direction.x, wind.direction.y, wind.direction.z).normalize()
  const origin = new ThreeVector3(0, 0, 0)
  const length = 3 + wind.strength * 10
  const color = 0x00ff88

  return (
    <group ref={groupRef} position={[15, 8, 0]}>
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.8} />
      </mesh>
      <primitive
        object={new ArrowHelper(dir, origin, length, color, 0.5, 0.3)}
        ref={arrowRef}
      />
      <pointLight color="#00ff88" intensity={2} distance={8} />
    </group>
  )
}
