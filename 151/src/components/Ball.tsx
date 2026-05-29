import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'
import { Vector3 } from '@/types/game'
import { BALL_RADIUS } from '@/utils/physics'

interface BallProps {
  position: Vector3
  isCharging: boolean
  chargePower: number
  jumpDirection: Vector3
}

export default function Ball({ position, isCharging, chargePower, jumpDirection }: BallProps) {
  const meshRef = useRef<Mesh>(null)
  const arrowRef = useRef<Mesh>(null)

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 2
      meshRef.current.rotation.z += delta * 1.5
    }

    if (arrowRef.current && isCharging) {
      const scale = 0.5 + chargePower * 2
      arrowRef.current.scale.set(scale, scale, scale)
      arrowRef.current.visible = true

      const angle = Math.atan2(jumpDirection.x, jumpDirection.z)
      arrowRef.current.rotation.y = angle
    } else if (arrowRef.current) {
      arrowRef.current.visible = false
    }
  })

  const ballColor = isCharging ? `hsl(${120 - chargePower * 120}, 100%, 50%)` : '#00d4ff'

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
        <meshStandardMaterial
          color={ballColor}
          emissive={ballColor}
          emissiveIntensity={isCharging ? 0.5 + chargePower * 0.5 : 0.2}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      <mesh ref={arrowRef} position={[0, 0.5, -0.8]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <coneGeometry args={[0.2, 0.6, 8]} />
        <meshBasicMaterial color="#ff6b6b" transparent opacity={0.8} />
      </mesh>

      <pointLight color={ballColor} intensity={isCharging ? 2 : 1} distance={5} />
    </group>
  )
}
