import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useKaleidoscopeStore, SYMMETRY_COUNT, type SymmetryMode } from '@/store/useKaleidoscopeStore'

interface KaleidoscopeGeometryProps {
  symmetryMode: SymmetryMode
  complexity: number
}

export function KaleidoscopeGeometry({ symmetryMode, complexity }: KaleidoscopeGeometryProps) {
  const groupRef = useRef<THREE.Group>(null)
  const rotationSpeed = useKaleidoscopeStore((state) => state.config.rotationSpeed)
  const colorSpeed = useKaleidoscopeStore((state) => state.config.colorSpeed)
  const audioData = useKaleidoscopeStore((state) => state.audioData)
  const audioVisualization = useKaleidoscopeStore((state) => state.config.audioVisualization)
  const setHue = useKaleidoscopeStore((state) => state.setHue)
  const mirrorEffect = useKaleidoscopeStore((state) => state.config.mirrorEffect)

  const symmetryCount = SYMMETRY_COUNT[symmetryMode]

  const shapes = useMemo(() => {
    const result: {
      position: [number, number, number]
      scale: number
      rotationOffset: number
      shapeType: number
    }[] = []

    const layers = Math.min(complexity, 10)
    const shapesPerLayer = Math.floor(complexity * 2)

    for (let layer = 0; layer < layers; layer++) {
      const layerRadius = (layer + 1) * (1.5 / layers)
      for (let i = 0; i < shapesPerLayer; i++) {
        const angle = (i / shapesPerLayer) * Math.PI * 2
        const offsetAngle = (layer % 2) * (Math.PI / shapesPerLayer)
        result.push({
          position: [
            Math.cos(angle + offsetAngle) * layerRadius,
            Math.sin(angle + offsetAngle) * layerRadius,
            (layer - layers / 2) * 0.1
          ],
          scale: 0.1 + (1 - layer / layers) * 0.2,
          rotationOffset: angle + layer * 0.5,
          shapeType: (layer + i) % 4
        })
      }
    }
    return result
  }, [complexity])

  const createShapeGeometry = (shapeType: number): THREE.BufferGeometry => {
    switch (shapeType) {
      case 0:
        return new THREE.TetrahedronGeometry(1, 0)
      case 1:
        return new THREE.OctahedronGeometry(1, 0)
      case 2:
        return new THREE.IcosahedronGeometry(1, 0)
      default:
        return new THREE.TorusGeometry(0.7, 0.3, 8, 16)
    }
  }

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const time = clock.getElapsedTime()
      groupRef.current.rotation.z = time * rotationSpeed * 0.5

      const hue = (time * colorSpeed * 20) % 360
      setHue(hue)

      let audioScale = 1
      if (audioVisualization && audioData.length > 0) {
        const avgAudio = audioData.reduce((a, b) => a + b, 0) / audioData.length
        audioScale = 1 + avgAudio * 0.5
      }

      let meshIndex = 0
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = Array.isArray(child.material)
            ? child.material[0]
            : child.material
          const mat = material as THREE.MeshStandardMaterial

          const shapeHue = (hue + (meshIndex / shapes.length) * 120) % 360
          const color = new THREE.Color().setHSL(shapeHue / 360, 0.8, 0.5)
          mat.color = color
          mat.emissive = color
          mat.emissiveIntensity = 0.3

          if (audioVisualization && audioData.length > 0) {
            const audioIdx = meshIndex % audioData.length
            const audioValue = audioData[audioIdx] || 0
            const shapeIdx = meshIndex % shapes.length
            child.scale.setScalar(shapes[shapeIdx].scale * (1 + audioValue * 0.8))
          }

          const shapeIdx = meshIndex % shapes.length
          child.rotation.x = time * rotationSpeed * 0.3 + shapes[shapeIdx].rotationOffset
          child.rotation.y = time * rotationSpeed * 0.2 + shapes[shapeIdx].rotationOffset * 0.5

          meshIndex++
        }
      })

      groupRef.current.scale.setScalar(audioScale)
    }
  })

  const symmetrySegments = useMemo(() => {
    const segments = []
    for (let i = 0; i < symmetryCount; i++) {
      const angle = (i / symmetryCount) * Math.PI * 2
      segments.push(
        <group key={i} rotation={[0, 0, angle]}>
          {shapes.map((shape, j) => (
            <mesh
              key={j}
              position={shape.position as [number, number, number]}
              scale={shape.scale}
              geometry={createShapeGeometry(shape.shapeType)}
            >
              <meshStandardMaterial
                metalness={0.3}
                roughness={0.2}
                transparent
                opacity={0.9}
              />
            </mesh>
          ))}
        </group>
      )
    }
    return segments
  }, [symmetryCount, shapes])

  return (
    <group ref={groupRef}>
      {symmetrySegments}
      {mirrorEffect && (
        <>
          <group rotation={[Math.PI, 0, 0]} position={[0, 0, -0.5]}>
            {symmetrySegments.map((seg, i) => (
              <group key={`mirror-${i}`}>
                {seg}
              </group>
            ))}
          </group>
          <group rotation={[0, Math.PI, 0]} position={[0, 0, 0.5]}>
            {symmetrySegments.map((seg, i) => (
              <group key={`mirror2-${i}`}>
                {seg}
              </group>
            ))}
          </group>
        </>
      )}
    </group>
  )
}
