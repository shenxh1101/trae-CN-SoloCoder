import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCrystalBallStore, COLOR_MAP } from '@/store/crystalBallStore'

export function CrystalBall() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const transparency = useCrystalBallStore((s) => s.transparency)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.15
    }
  })

  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#aaccff'),
        transparent: true,
        opacity: 1 - transparency * 0.7,
        transmission: 0.9,
        roughness: 0.05,
        metalness: 0.0,
        ior: 1.5,
        thickness: 1.5,
        envMapIntensity: 1.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [transparency]
  )

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[1.2, 64, 64]} />
    </mesh>
  )
}

export function InnerCrystal() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const lightRef = useRef<THREE.PointLight>(null!)
  const crystalColor = useCrystalBallStore((s) => s.crystalColor)
  const glowIntensity = useCrystalBallStore((s) => s.glowIntensity)
  const pulseActive = useCrystalBallStore((s) => s.pulseActive)
  const pulseRef = useRef(0)
  const colorRef = useRef<THREE.Color>(new THREE.Color(COLOR_MAP[crystalColor]))

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.15
      meshRef.current.rotation.y += delta * 0.3
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2
    }

    if (pulseActive) {
      pulseRef.current = Math.min(pulseRef.current + delta * 8, 4)
    } else {
      pulseRef.current = Math.max(pulseRef.current - delta * 4, 0)
    }

    colorRef.current.set(COLOR_MAP[crystalColor])

    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial
      mat.color.copy(colorRef.current)
      mat.emissive.copy(colorRef.current)
      mat.emissiveIntensity = glowIntensity + pulseRef.current
    }
    if (lightRef.current) {
      lightRef.current.color.copy(colorRef.current)
      lightRef.current.intensity = glowIntensity * 2 + pulseRef.current * 3
    }
  })

  return (
    <group>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial
          color={COLOR_MAP[crystalColor]}
          emissive={COLOR_MAP[crystalColor]}
          emissiveIntensity={glowIntensity}
          toneMapped={false}
        />
      </mesh>
      <pointLight ref={lightRef} color={COLOR_MAP[crystalColor]} intensity={glowIntensity * 2} distance={5} />
    </group>
  )
}
