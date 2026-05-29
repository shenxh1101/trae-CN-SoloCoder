import { useRef, useMemo, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useFractalStore } from '@/store/fractalStore'
import { generateFractalInstances, getInstanceColor, computeStats } from '@/utils/fractalGenerator'
import type { FractalInstance, FractalStats } from '@/types'

interface FractalGeometryProps {
  onStatsUpdate: (stats: FractalStats) => void
  glRef: React.MutableRefObject<THREE.WebGLRenderer | null>
}

function getBaseGeometry(shapeType: string): THREE.BufferGeometry {
  switch (shapeType) {
    case 'tetrahedron': return new THREE.TetrahedronGeometry(1, 0)
    case 'cube': return new THREE.BoxGeometry(1, 1, 1)
    case 'icosahedron': return new THREE.IcosahedronGeometry(1, 0)
    default: return new THREE.BoxGeometry(1, 1, 1)
  }
}

export default function FractalGeometry({ onStatsUpdate, glRef }: FractalGeometryProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { camera, gl } = useThree()

  const depth = useFractalStore((s) => s.depth)
  const shapeType = useFractalStore((s) => s.shapeType)
  const rotationSpeed = useFractalStore((s) => s.rotationSpeed)
  const scaleSpeed = useFractalStore((s) => s.scaleSpeed)
  const colorMode = useFractalStore((s) => s.colorMode)
  const wireframe = useFractalStore((s) => s.wireframe)
  const autoOrbit = useFractalStore((s) => s.autoOrbit)

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorObj = useMemo(() => new THREE.Color(), [])

  const geometry = useMemo(() => getBaseGeometry(shapeType), [shapeType])

  const instances = useMemo(
    () => generateFractalInstances(shapeType, depth),
    [shapeType, depth]
  )

  const stats = useMemo(
    () => computeStats(shapeType, instances),
    [shapeType, instances]
  )

  const prevStatsRef = useRef<FractalStats | null>(null)
  const prevColorModeRef = useRef(colorMode)

  const updateInstances = useCallback(() => {
    if (!meshRef.current) return
    const mesh = meshRef.current

    for (let i = 0; i < instances.length; i++) {
      const inst: FractalInstance = instances[i]
      dummy.position.set(...inst.position)
      dummy.rotation.set(...inst.rotation)
      dummy.scale.setScalar(inst.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      const [r, g, b] = getInstanceColor(inst.depth, depth, colorMode, i)
      colorObj.setRGB(r, g, b)
      mesh.setColorAt(i, colorObj)
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.count = instances.length
  }, [instances, colorMode, depth, dummy, colorObj])

  useEffect(() => {
    if (
      !prevStatsRef.current ||
      prevStatsRef.current.vertices !== stats.vertices ||
      prevStatsRef.current.faces !== stats.faces ||
      prevStatsRef.current.instances !== stats.instances
    ) {
      prevStatsRef.current = stats
      onStatsUpdate(stats)
    }
  }, [stats, onStatsUpdate])

  useEffect(() => {
    updateInstances()
    prevColorModeRef.current = colorMode
  }, [instances, colorMode, updateInstances])

  const groupRef = useRef<THREE.Group>(null)
  const orbitAngleRef = useRef(0)
  const scalePhaseRef = useRef(0)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * rotationSpeed * 0.5
      groupRef.current.rotation.x += delta * rotationSpeed * 0.15
    }

    if (autoOrbit && camera) {
      orbitAngleRef.current += delta * 0.3
      const radius = 5
      camera.position.x = Math.sin(orbitAngleRef.current) * radius
      camera.position.z = Math.cos(orbitAngleRef.current) * radius
      camera.position.y = Math.sin(orbitAngleRef.current * 0.5) * 1.5
      camera.lookAt(0, 0, 0)
    }

    if (groupRef.current && scaleSpeed > 0) {
      scalePhaseRef.current += delta * scaleSpeed * 0.5
      const s = 1 + Math.sin(scalePhaseRef.current) * 0.15
      groupRef.current.scale.setScalar(s)
    }

    if (glRef) {
      glRef.current = gl
    }
  })

  return (
    <group ref={groupRef}>
      <instancedMesh
        key={`${shapeType}-${depth}`}
        ref={meshRef}
        args={[geometry, undefined, Math.max(instances.length, 1)]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          wireframe={wireframe}
          roughness={0.3}
          metalness={0.6}
          vertexColors
          flatShading
        />
      </instancedMesh>
    </group>
  )
}
