import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useStore } from '@/store/useStore'

export default function WaterPlane() {
  const meshRef = useRef<THREE.Mesh>(null)
  const showWater = useStore((s) => s.showWater)

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.position.y = 0.15 + Math.sin(clock.elapsedTime * 0.5) * 0.02
    }
  })

  if (!showWater) return null

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]}>
      <planeGeometry args={[12, 12]} />
      <meshStandardMaterial
        color="#1a6b9a"
        opacity={0.6}
        transparent
        metalness={0.3}
        roughness={0.2}
      />
    </mesh>
  )
}
