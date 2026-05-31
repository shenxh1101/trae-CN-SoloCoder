import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTreeStore } from '@/store'
import { TREE_PRESETS } from '@/types'
import type { BranchData, LockablePart } from '@/types'

function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

function generateBranchSkeleton(
  startPoint: [number, number, number],
  direction: THREE.Vector3,
  length: number,
  thickness: number,
  depth: number,
  maxDepth: number,
  preset: typeof TREE_PRESETS.oak
): BranchData {
  const endPoint: [number, number, number] = [
    startPoint[0] + direction.x * length,
    startPoint[1] + direction.y * length,
    startPoint[2] + direction.z * length,
  ]

  const branchData: BranchData = {
    id: generateId(),
    startPoint,
    endPoint,
    thickness,
    children: [],
    depth,
    locked: false,
  }

  if (depth >= maxDepth) return branchData

  const branchCount = preset.branchDensity
  const angleRange = preset.branchAngle

  for (let i = 0; i < branchCount; i++) {
    const angle = (i / branchCount) * Math.PI * 2
    const pitch = (angleRange[0] + Math.random() * (angleRange[1] - angleRange[0])) * (Math.PI / 180)
    const droop = preset.droopFactor * (depth / maxDepth)

    const childDir = new THREE.Vector3(
      Math.cos(angle) * Math.sin(pitch),
      Math.cos(pitch) - droop,
      Math.sin(angle) * Math.sin(pitch)
    ).normalize()

    const rotAngle = (i / branchCount) * Math.PI * 2
    childDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotAngle)

    const childLength = length * (0.6 + Math.random() * 0.2)
    const childThickness = thickness * 0.7

    branchData.children.push(
      generateBranchSkeleton(
        endPoint,
        childDir,
        childLength,
        childThickness,
        depth + 1,
        maxDepth,
        preset
      )
    )
  }

  return branchData
}

interface BranchNodeProps {
  branch: BranchData
  isTrunk: boolean
  preset: typeof TREE_PRESETS.oak
  lockedParts: LockablePart[]
}

function BranchNode({ branch, isTrunk, preset, lockedParts }: BranchNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const isLocked = isTrunk
    ? lockedParts.includes('trunk')
    : lockedParts.includes('branches')

  const baseColor = useMemo(() => {
    const c = new THREE.Color('#5c3d2e')
    const progress = branch.depth / preset.maxDepth
    return c.lerp(new THREE.Color(preset.leafColor), progress * 0.5)
  }, [branch.depth, preset])

  useFrame(() => {
    if (!meshRef.current) return

    const { breathValue, windStrength } = useTreeStore.getState()
    const time = performance.now() * 0.001

    const start = new THREE.Vector3(...branch.startPoint)
    const end = new THREE.Vector3(...branch.endPoint)
    const direction = end.clone().sub(start)
    const length = direction.length()
    direction.normalize()

    const breathOffset = isLocked ? 0 : (breathValue - 0.5)
    const windPhase = time * 1.5 + branch.startPoint[1] * 2 + branch.startPoint[0]
    const windOffset = isLocked ? 0 : Math.sin(windPhase) * windStrength * 0.25
    const windOffsetZ = isLocked ? 0 : Math.cos(windPhase * 0.7) * windStrength * 0.15
    const twistAngle = isLocked ? 0 : breathValue * preset.trunkTwist * Math.PI * 0.3

    const mid = start.clone().add(end).multiplyScalar(0.5)
    mid.x += windOffset
    mid.z += windOffsetZ

    meshRef.current.position.copy(mid)

    const axis = new THREE.Vector3(0, 1, 0).cross(direction)
    const axisLength = axis.length()
    if (axisLength > 0.0001) {
      axis.normalize()
      const angle = Math.acos(Math.max(-1, Math.min(1, direction.dot(new THREE.Vector3(0, 1, 0)))))
      const baseQuat = new THREE.Quaternion().setFromAxisAngle(axis, angle)
      const twistQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), twistAngle)
      meshRef.current.quaternion.copy(twistQuat.multiply(baseQuat))
    }

    const breathScaleY = isLocked ? 1 : 0.85 + breathValue * 0.3
    const breathScaleXZ = isLocked ? 1 : 0.9 + breathValue * 0.2
    const lengthStretch = isLocked ? 1 : 1 + breathOffset * 0.3

    meshRef.current.scale.set(
      breathScaleXZ,
      (length / 2) * lengthStretch * breathScaleY,
      breathScaleXZ
    )

    const material = meshRef.current.material as THREE.MeshStandardMaterial
    if (!isLocked) {
      const brightness = 0.6 + breathValue * 0.4
      const lerpedColor = baseColor.clone().multiplyScalar(brightness)
      material.color.copy(lerpedColor)
      material.emissive.copy(baseColor).multiplyScalar(breathValue * 0.15)
    }
  })

  return (
    <group>
      <mesh ref={meshRef} castShadow receiveShadow>
        <cylinderGeometry args={[branch.thickness * 0.65, branch.thickness, 2, 8]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={0.85}
          metalness={0.05}
          emissive={baseColor}
          emissiveIntensity={0.05}
        />
      </mesh>

      {branch.children.map((child) => (
        <BranchNode
          key={child.id}
          branch={child}
          isTrunk={false}
          preset={preset}
          lockedParts={lockedParts}
        />
      ))}
    </group>
  )
}

function LeafParticles({
  branches,
  preset,
  lockedParts,
}: {
  branches: BranchData[]
  preset: typeof TREE_PRESETS.oak
  lockedParts: LockablePart[]
}) {
  const pointsRef = useRef<THREE.Points>(null)
  const geometryRef = useRef<THREE.BufferGeometry>(null)
  const materialRef = useRef<THREE.PointsMaterial>(null)
  const isLocked = lockedParts.includes('leaves')

  const leafData = useMemo(() => {
    const tipPositions: [number, number, number][] = []

    const collectTips = (branch: BranchData) => {
      if (branch.depth >= preset.maxDepth - 1 || branch.children.length === 0) {
        tipPositions.push(branch.endPoint)
        for (let i = 0; i < 2; i++) {
          tipPositions.push([
            branch.endPoint[0] + (Math.random() - 0.5) * 0.8,
            branch.endPoint[1] + (Math.random() - 0.5) * 0.8,
            branch.endPoint[2] + (Math.random() - 0.5) * 0.8,
          ])
        }
      }
      branch.children.forEach(collectTips)
    }

    branches.forEach(collectTips)

    const pos = new Float32Array(tipPositions.length * 3)
    const basePos = new Float32Array(tipPositions.length * 3)
    const phases = new Float32Array(tipPositions.length)

    tipPositions.forEach((p, i) => {
      pos[i * 3] = p[0]
      pos[i * 3 + 1] = p[1]
      pos[i * 3 + 2] = p[2]
      basePos[i * 3] = p[0]
      basePos[i * 3 + 1] = p[1]
      basePos[i * 3 + 2] = p[2]
      phases[i] = Math.random() * Math.PI * 2
    })

    return { positions: pos, basePositions: basePos, phases, count: tipPositions.length }
  }, [branches, preset])

  useEffect(() => {
    if (!geometryRef.current) return
    geometryRef.current.setAttribute(
      'position',
      new THREE.BufferAttribute(leafData.positions, 3)
    )
  }, [leafData.positions])

  const leafTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 30)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.9)')
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.4)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.ellipse(32, 32, 28, 20, Math.PI / 4, 0, Math.PI * 2)
    ctx.fill()
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }, [])

  useFrame(() => {
    if (!pointsRef.current || !geometryRef.current) return

    const { breathValue, windStrength } = useTreeStore.getState()
    const time = performance.now() * 0.001

    const posAttr = geometryRef.current.attributes.position as THREE.BufferAttribute
    if (!posAttr) return
    const arr = posAttr.array as Float32Array

    for (let i = 0; i < leafData.count; i++) {
      const bx = leafData.basePositions[i * 3]
      const by = leafData.basePositions[i * 3 + 1]
      const bz = leafData.basePositions[i * 3 + 2]
      const phase = leafData.phases[i]

      if (!isLocked) {
        const breathSpread = (breathValue - 0.3) * 0.6
        const windX = Math.sin(time * 2.0 + phase) * windStrength * 0.3
        const windZ = Math.cos(time * 1.5 + phase) * windStrength * 0.2
        const flutter = Math.sin(time * 3.5 + phase * 2) * 0.05

        arr[i * 3] = bx + windX + breathSpread * Math.cos(phase)
        arr[i * 3 + 1] = by + flutter + breathSpread * 0.2
        arr[i * 3 + 2] = bz + windZ + breathSpread * Math.sin(phase)
      } else {
        arr[i * 3] = bx
        arr[i * 3 + 1] = by
        arr[i * 3 + 2] = bz
      }
    }

    posAttr.needsUpdate = true

    if (materialRef.current) {
      if (!isLocked) {
        const brightness = 0.4 + breathValue * 0.6
        const color = new THREE.Color(preset.leafColor).multiplyScalar(brightness)
        materialRef.current.color.copy(color)
        materialRef.current.opacity = 0.6 + breathValue * 0.4
        materialRef.current.size = preset.leafSize * (0.8 + breathValue * 0.4)
      } else {
        materialRef.current.color.set(preset.leafColor)
        materialRef.current.opacity = 0.7
      }
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geometryRef} />
      <pointsMaterial
        ref={materialRef}
        map={leafTexture}
        size={preset.leafSize}
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color={preset.leafColor}
        sizeAttenuation
      />
    </points>
  )
}

export default function AbstractTree() {
  const { treePreset, setBranchData } = useTreeStore()
  const preset = TREE_PRESETS[treePreset]

  const rootBranch = useMemo(() => {
    const trunkLength = 4 + Math.random() * 1
    return generateBranchSkeleton(
      [0, 0, 0],
      new THREE.Vector3(0, 1, 0),
      trunkLength,
      preset.trunkThickness,
      0,
      preset.maxDepth,
      preset
    )
  }, [treePreset, preset])

  useEffect(() => {
    setBranchData(rootBranch)
  }, [rootBranch, setBranchData])

  const lockedParts = useTreeStore((s) => s.lockedParts)

  return (
    <group position={[0, 0, 0]}>
      <BranchNode
        branch={rootBranch}
        isTrunk={true}
        preset={preset}
        lockedParts={lockedParts}
      />
      <LeafParticles
        branches={[rootBranch]}
        preset={preset}
        lockedParts={lockedParts}
      />
    </group>
  )
}
