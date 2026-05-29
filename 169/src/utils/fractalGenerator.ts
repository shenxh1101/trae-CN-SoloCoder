import * as THREE from 'three'
import type { ShapeType, FractalInstance, ColorMode } from '@/types'

const MAX_INSTANCES = 5000

function getFaceNormals(shapeType: ShapeType): THREE.Vector3[] {
  const sqrt3 = Math.sqrt(3)
  const phi = (1 + Math.sqrt(5)) / 2

  switch (shapeType) {
    case 'tetrahedron': {
      const a = 1 / sqrt3
      return [
        new THREE.Vector3(0, 1, 0).normalize(),
        new THREE.Vector3(-a, -1 / 3, -a).normalize(),
        new THREE.Vector3(a, -1 / 3, -a).normalize(),
        new THREE.Vector3(0, -1 / 3, a * 2 / sqrt3).normalize(),
      ]
    }
    case 'cube': {
      return [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, -1),
      ]
    }
    case 'icosahedron': {
      return [
        new THREE.Vector3(0, phi, 1).normalize(),
        new THREE.Vector3(0, phi, -1).normalize(),
        new THREE.Vector3(phi, 1, 0).normalize(),
        new THREE.Vector3(-phi, 1, 0).normalize(),
        new THREE.Vector3(1, 0, phi).normalize(),
        new THREE.Vector3(-1, 0, phi).normalize(),
      ]
    }
  }
}

function getShapeScale(shapeType: ShapeType): number {
  switch (shapeType) {
    case 'tetrahedron': return 0.5
    case 'cube': return 0.42
    case 'icosahedron': return 0.38
  }
}

function getOffsetMultiplier(shapeType: ShapeType): number {
  switch (shapeType) {
    case 'tetrahedron': return 0.9
    case 'cube': return 0.9
    case 'icosahedron': return 0.85
  }
}

export function generateFractalInstances(
  shapeType: ShapeType,
  depth: number
): FractalInstance[] {
  const faceNormals = getFaceNormals(shapeType)
  const childScale = getShapeScale(shapeType)
  const offsetMult = getOffsetMultiplier(shapeType)

  const instances: FractalInstance[] = [{
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 1,
    depth: 0,
  }]

  if (depth <= 0) return instances

  const up = new THREE.Vector3(0, 1, 0)
  const eulerCache = new THREE.Euler()
  const tmpNormal = new THREE.Vector3()
  const tmpPos = new THREE.Vector3()
  const tmpQuat = new THREE.Quaternion()

  function quatToEuler(q: THREE.Quaternion): [number, number, number] {
    eulerCache.setFromQuaternion(q, 'XYZ')
    return [eulerCache.x, eulerCache.y, eulerCache.z]
  }

  function recurse(
    parentPos: THREE.Vector3,
    parentScale: number,
    currentDepth: number,
    parentQuat: THREE.Quaternion
  ) {
    if (currentDepth >= depth) return
    if (instances.length >= MAX_INSTANCES) return

    const s = parentScale * childScale

    for (const normal of faceNormals) {
      if (instances.length >= MAX_INSTANCES) break

      tmpNormal.copy(normal).applyQuaternion(parentQuat).normalize()

      const offset = (parentScale * 0.5) + (s * offsetMult)
      tmpPos.copy(parentPos).addScaledVector(tmpNormal, offset)

      tmpQuat.setFromUnitVectors(up, tmpNormal)

      instances.push({
        position: [tmpPos.x, tmpPos.y, tmpPos.z],
        rotation: quatToEuler(tmpQuat),
        scale: s,
        depth: currentDepth,
      })

      recurse(tmpPos.clone(), s, currentDepth + 1, tmpQuat.clone())
    }
  }

  recurse(
    new THREE.Vector3(0, 0, 0),
    1,
    0,
    new THREE.Quaternion()
  )

  return instances
}

export function computeStats(
  shapeType: ShapeType,
  instances: FractalInstance[]
): { vertices: number; faces: number; instances: number } {
  let vertCount: number
  let faceCount: number

  switch (shapeType) {
    case 'tetrahedron':
      vertCount = 4
      faceCount = 4
      break
    case 'cube':
      vertCount = 8
      faceCount = 6
      break
    case 'icosahedron':
      vertCount = 12
      faceCount = 20
      break
  }

  return {
    vertices: vertCount * instances.length,
    faces: faceCount * instances.length,
    instances: instances.length,
  }
}

export function getInstanceColor(
  depth: number,
  maxDepth: number,
  colorMode: ColorMode,
  index: number
): [number, number, number] {
  switch (colorMode) {
    case 'gradient': {
      const t = maxDepth > 1 ? depth / (maxDepth - 1) : 0
      const hue = 0.75 + t * 0.5
      const color = new THREE.Color().setHSL(hue % 1, 0.9, 0.55)
      return [color.r, color.g, color.b]
    }
    case 'random': {
      const hue = (index * 0.618033988749895) % 1
      const color = new THREE.Color().setHSL(hue, 0.95, 0.6)
      return [color.r, color.g, color.b]
    }
    case 'monochrome': {
      const t = maxDepth > 1 ? depth / (maxDepth - 1) : 0
      const lightness = 0.35 + t * 0.45
      const color = new THREE.Color().setHSL(0.55, 0.85, lightness)
      return [color.r, color.g, color.b]
    }
  }
}
