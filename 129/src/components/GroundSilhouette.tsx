import { useMemo } from 'react'
import * as THREE from 'three'

export default function GroundSilhouette() {
  const mountainShape = useMemo(() => {
    const shape = new THREE.Shape()
    const points: [number, number][] = [
      [-120, -5],
      [-100, -2],
      [-80, 3],
      [-65, 1],
      [-50, 8],
      [-35, 4],
      [-20, 12],
      [-5, 6],
      [10, 15],
      [25, 10],
      [35, 18],
      [45, 12],
      [55, 7],
      [70, 14],
      [85, 8],
      [95, 3],
      [110, 6],
      [120, -2],
      [120, -20],
      [-120, -20],
    ]

    shape.moveTo(points[0][0], points[0][1])
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i][0], points[i][1])
    }

    return shape
  }, [])

  const geometry = useMemo(() => {
    const geo = new THREE.ShapeGeometry(mountainShape)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [mountainShape])

  return (
    <mesh geometry={geometry} position={[0, -15, -30]}>
      <meshBasicMaterial color="#0a0a15" side={THREE.DoubleSide} />
    </mesh>
  )
}
