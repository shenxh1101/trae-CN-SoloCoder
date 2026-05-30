import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'
import { generateTerrainHeightMap } from '@/utils/terrainGenerator'
import { mapHeightToColor } from '@/utils/colorMapper'
import { setTerrainMesh } from '@/utils/terrainMeshRef'

export default function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null)
  const seed = useStore((s) => s.seed)
  const segments = useStore((s) => s.segments)
  const amplitude = useStore((s) => s.amplitude)
  const colorPalette = useStore((s) => s.colorPalette)
  const curvePoints = useStore((s) => s.curvePoints)
  const setHeightData = useStore((s) => s.setHeightData)

  const heightData = useMemo(
    () => generateTerrainHeightMap(seed, segments, amplitude),
    [seed, segments, amplitude]
  )

  useEffect(() => {
    setHeightData(heightData)
  }, [heightData, setHeightData])

  useEffect(() => {
    setTerrainMesh(meshRef.current)
    return () => {
      setTerrainMesh(null)
    }
  }, [])

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(10, 10, segments, segments)
    geo.rotateX(-Math.PI / 2)

    const posAttr = geo.attributes.position as THREE.BufferAttribute
    const count = posAttr.count

    for (let i = 0; i < count; i++) {
      posAttr.setY(i, heightData[i] * amplitude * 1.5)
    }
    posAttr.needsUpdate = true

    geo.computeVertexNormals()

    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const normalizedHeight = heightData[i]
      const color = mapHeightToColor(normalizedHeight, colorPalette, curvePoints)
      colors[i * 3] = color.r / 255
      colors[i * 3 + 1] = color.g / 255
      colors[i * 3 + 2] = color.b / 255
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    return geo
  }, [heightData, segments, amplitude, colorPalette, curvePoints])

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  )
}
