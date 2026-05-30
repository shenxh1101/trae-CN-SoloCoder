import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getMoonTexture, getMoonBumpTexture } from '@/utils/textures'
import { MOON_RADIUS, EARTH_MOON_DISTANCE, MOON_ORBIT_PERIOD } from '@/utils/constants'
import { useSolarSystemStore } from '@/store/useSolarSystemStore'

export default function Moon() {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  const orbitSpeed = useSolarSystemStore((s) => s.orbitSpeed)

  const moonTexture = useMemo(() => getMoonTexture(), [])
  const moonBumpTexture = useMemo(() => getMoonBumpTexture(), [])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const rotSpeed = (2 * Math.PI) / MOON_ORBIT_PERIOD
    groupRef.current.rotation.y += rotSpeed * delta * orbitSpeed

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3
    }
  })

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} position={[EARTH_MOON_DISTANCE, 0, 0]}>
        <sphereGeometry args={[MOON_RADIUS, 48, 48]} />
        <meshPhongMaterial
          map={moonTexture}
          bumpMap={moonBumpTexture}
          bumpScale={0.08}
          shininess={5}
        />
      </mesh>
    </group>
  )
}
