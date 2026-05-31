import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTreeStore } from '@/store'
import { TREE_PRESETS } from '@/types'

const LEAF_COUNT = 200
const FALL_SPEED_MIN = 0.2
const FALL_SPEED_MAX = 0.6
const SPAWN_RADIUS = 4
const SPAWN_HEIGHT_MIN = 5
const SPAWN_HEIGHT_MAX = 13

function createLeafTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 64, 64)
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(32, 32, 24, 12, Math.PI / 5, 0, Math.PI * 2)
  ctx.fill()
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export default function FallingLeaves() {
  const pointsRef = useRef<THREE.Points>(null)
  const geometryRef = useRef<THREE.BufferGeometry>(null)
  const materialRef = useRef<THREE.PointsMaterial>(null)

  const data = useMemo(() => {
    const pos = new Float32Array(LEAF_COUNT * 3)
    const spd = new Float32Array(LEAF_COUNT)
    const driftPhase = new Float32Array(LEAF_COUNT)
    const driftFreq = new Float32Array(LEAF_COUNT)
    const rotSpeed = new Float32Array(LEAF_COUNT)

    for (let i = 0; i < LEAF_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * SPAWN_RADIUS
      pos[i * 3] = Math.cos(angle) * radius
      pos[i * 3 + 1] = SPAWN_HEIGHT_MIN + Math.random() * (SPAWN_HEIGHT_MAX - SPAWN_HEIGHT_MIN)
      pos[i * 3 + 2] = Math.sin(angle) * radius
      spd[i] = FALL_SPEED_MIN + Math.random() * (FALL_SPEED_MAX - FALL_SPEED_MIN)
      driftPhase[i] = Math.random() * Math.PI * 2
      driftFreq[i] = 0.3 + Math.random() * 1.2
      rotSpeed[i] = 0.5 + Math.random() * 1.5
    }

    return { positions: pos, speeds: spd, driftPhases: driftPhase, driftFreqs: driftFreq, rotSpeeds: rotSpeed }
  }, [])

  useEffect(() => {
    if (!geometryRef.current) return
    geometryRef.current.setAttribute(
      'position',
      new THREE.BufferAttribute(data.positions, 3)
    )
  }, [data.positions])

  const leafTexture = useMemo(() => createLeafTexture(), [])

  useFrame((_, delta) => {
    if (!pointsRef.current || !geometryRef.current) return
    const { windStrength, breathValue, treePreset } = useTreeStore.getState()
    const preset = TREE_PRESETS[treePreset]
    const posAttr = geometryRef.current.attributes.position as THREE.BufferAttribute
    if (!posAttr) return
    const arr = posAttr.array as Float32Array
    const clampedDelta = Math.min(delta, 0.1)
    const time = performance.now() * 0.001

    for (let i = 0; i < LEAF_COUNT; i++) {
      const i3 = i * 3

      arr[i3 + 1] -= data.speeds[i] * clampedDelta

      const drift = Math.sin(time * data.driftFreqs[i] + data.driftPhases[i])
      const driftZ = Math.cos(time * data.driftFreqs[i] * 0.7 + data.driftPhases[i] + 1.0)
      arr[i3] += drift * windStrength * clampedDelta * 2.5
      arr[i3 + 2] += driftZ * windStrength * clampedDelta * 1.5

      arr[i3] += Math.sin(time * data.rotSpeeds[i]) * 0.003

      if (arr[i3 + 1] <= 0.05) {
        const angle = Math.random() * Math.PI * 2
        const radius = Math.random() * SPAWN_RADIUS
        arr[i3] = Math.cos(angle) * radius
        arr[i3 + 1] = SPAWN_HEIGHT_MAX + Math.random() * 2
        arr[i3 + 2] = Math.sin(angle) * radius
      }
    }

    posAttr.needsUpdate = true

    if (materialRef.current) {
      const baseColor = new THREE.Color(preset.leafColor)
      const brightness = 0.5 + breathValue * 0.5
      baseColor.multiplyScalar(brightness)
      materialRef.current.color.copy(baseColor)
      materialRef.current.opacity = 0.4 + breathValue * 0.5
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geometryRef} />
      <pointsMaterial
        ref={materialRef}
        map={leafTexture}
        size={0.3}
        transparent
        opacity={0.65}
        depthWrite={false}
        blending={THREE.NormalBlending}
        color="#4ade80"
        sizeAttenuation
      />
    </points>
  )
}
