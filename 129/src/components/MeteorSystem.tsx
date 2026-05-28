import { useRef, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMeteorStore } from '@/store/useMeteorStore'
import { playMeteorSound } from '@/utils/audioManager'

const MAX_METEORS = 50
const MAX_TRAIL = 60
const TOTAL_PARTICLES = MAX_METEORS * MAX_TRAIL
const SPAWN_RANGE = 120
const SPAWN_Y_MIN = 30
const SPAWN_Y_MAX = 90

interface MeteorData {
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  maxLife: number
  isFireball: boolean
  trailPositions: THREE.Vector3[]
  soundPlayed: boolean
}

const vertexShader = `
  attribute float aOpacity;
  attribute float aSize;
  attribute float aBrightness;
  varying float vOpacity;
  varying float vBrightness;
  void main() {
    vOpacity = aOpacity;
    vBrightness = aBrightness;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  uniform vec3 uColor;
  varying float vOpacity;
  varying float vBrightness;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    float coreGlow = pow(glow, 1.2);
    float outerGlow = pow(glow, 3.0) * 0.4;
    float finalGlow = coreGlow + outerGlow;
    vec3 brightColor = mix(uColor, vec3(1.0), vBrightness * 0.5);
    float alpha = vOpacity * finalGlow;
    gl_FragColor = vec4(brightColor * alpha * vBrightness, alpha);
  }
`

function createMeteor(flashEnabled: boolean): MeteorData {
  const isFireball = flashEnabled && Math.random() < 0.08
  const x = (Math.random() - 0.5) * SPAWN_RANGE
  const y = SPAWN_Y_MIN + Math.random() * (SPAWN_Y_MAX - SPAWN_Y_MIN)
  const z = (Math.random() - 0.5) * SPAWN_RANGE
  const angle = Math.random() * Math.PI * 0.5 + Math.PI * 0.25
  const speed = (0.8 + Math.random() * 1.2) * (isFireball ? 1.5 : 1)
  const vx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1)
  const vy = -Math.sin(angle) * speed * 0.6 - speed * 0.4
  const vz = (Math.random() - 0.5) * speed * 0.3

  return {
    position: new THREE.Vector3(x, y, z),
    velocity: new THREE.Vector3(vx, vy, vz),
    life: 1.0,
    maxLife: 2 + Math.random() * 3,
    isFireball,
    trailPositions: [],
    soundPlayed: false,
  }
}

export default function MeteorSystem() {
  const pointsRef = useRef<THREE.Points>(null)
  const meteorsRef = useRef<MeteorData[]>([])
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const { density, speed, trailLength, flashEnabled, soundEnabled, meteorColor, setMeteorCount } = useMeteorStore()

  const colorMap = useMemo(() => ({
    white: new THREE.Color(1, 1, 1),
    lightYellow: new THREE.Color(1, 0.95, 0.7),
    lightBlue: new THREE.Color(0.7, 0.85, 1),
  }), [])

  const { positions, opacities, sizes, brightnesses } = useMemo(() => {
    const pos = new Float32Array(TOTAL_PARTICLES * 3)
    const opa = new Float32Array(TOTAL_PARTICLES)
    const siz = new Float32Array(TOTAL_PARTICLES)
    const bri = new Float32Array(TOTAL_PARTICLES)
    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      pos[i * 3] = 0
      pos[i * 3 + 1] = -1000
      pos[i * 3 + 2] = 0
      opa[i] = 0
      siz[i] = 0
      bri[i] = 0
    }
    return { positions: pos, opacities: opa, sizes: siz, brightnesses: bri }
  }, [])

  const respawnMeteor = useCallback((meteor: MeteorData) => {
    const m = createMeteor(flashEnabled)
    meteor.position.copy(m.position)
    meteor.velocity.copy(m.velocity)
    meteor.life = m.life
    meteor.maxLife = m.maxLife
    meteor.isFireball = m.isFireball
    meteor.trailPositions = []
    meteor.soundPlayed = false
  }, [flashEnabled])

  useFrame((_state, delta) => {
    if (!pointsRef.current) return
    const geometry = pointsRef.current.geometry
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    const opaAttr = geometry.getAttribute('aOpacity') as THREE.BufferAttribute
    const sizAttr = geometry.getAttribute('aSize') as THREE.BufferAttribute
    const briAttr = geometry.getAttribute('aBrightness') as THREE.BufferAttribute

    const meteors = meteorsRef.current
    const targetCount = density

    while (meteors.length < targetCount) {
      meteors.push(createMeteor(flashEnabled))
    }

    const clampedDelta = Math.min(delta, 0.05)
    let activeCount = 0

    for (let m = 0; m < meteors.length; m++) {
      const meteor = meteors[m]

      if (m >= targetCount) {
        meteor.life = 0
      }

      meteor.position.addScaledVector(meteor.velocity, speed * clampedDelta * 15)
      meteor.life -= clampedDelta / meteor.maxLife

      if (meteor.life <= 0 || meteor.position.y < -20) {
        if (m < targetCount) {
          respawnMeteor(meteor)
        } else {
          continue
        }
      }

      if (soundEnabled && !meteor.soundPlayed && meteor.life < 0.85) {
        meteor.soundPlayed = true
        playMeteorSound(meteor.isFireball)
      }

      meteor.trailPositions.unshift(meteor.position.clone())
      const maxTrail = Math.min(trailLength, MAX_TRAIL)
      if (meteor.trailPositions.length > maxTrail) {
        meteor.trailPositions.length = maxTrail
      }

      const baseIdx = m * MAX_TRAIL
      const baseSize = meteor.isFireball ? 4.5 : 2.5
      const headBrightness = meteor.isFireball ? 2.2 : 1.4

      for (let t = 0; t < MAX_TRAIL; t++) {
        const idx = baseIdx + t
        if (t < meteor.trailPositions.length) {
          const tp = meteor.trailPositions[t]
          posAttr.setXYZ(idx, tp.x, tp.y, tp.z)

          const normalizedT = t / meteor.trailPositions.length
          const fade = Math.pow(1 - normalizedT, 0.6)
          const lifeFade = Math.pow(Math.max(0, meteor.life), 0.8)

          if (t === 0) {
            opaAttr.setX(idx, 1.0 * lifeFade)
            sizAttr.setX(idx, baseSize * 2.5)
            briAttr.setX(idx, headBrightness * lifeFade)
          } else if (t === 1) {
            opaAttr.setX(idx, 0.9 * lifeFade)
            sizAttr.setX(idx, baseSize * 1.8)
            briAttr.setX(idx, (headBrightness * 0.85) * lifeFade)
          } else if (t === 2) {
            opaAttr.setX(idx, 0.8 * lifeFade)
            sizAttr.setX(idx, baseSize * 1.4)
            briAttr.setX(idx, (headBrightness * 0.7) * lifeFade)
          } else {
            opaAttr.setX(idx, fade * 0.85 * lifeFade)
            sizAttr.setX(idx, baseSize * fade * lifeFade * 0.9)
            briAttr.setX(idx, fade * lifeFade * (meteor.isFireball ? 1.3 : 0.9))
          }
        } else {
          posAttr.setXYZ(idx, 0, -1000, 0)
          opaAttr.setX(idx, 0)
          sizAttr.setX(idx, 0)
          briAttr.setX(idx, 0)
        }
      }

      if (meteor.life > 0) activeCount++
    }

    posAttr.needsUpdate = true
    opaAttr.needsUpdate = true
    sizAttr.needsUpdate = true
    briAttr.needsUpdate = true

    if (materialRef.current) {
      materialRef.current.uniforms.uColor.value = colorMap[meteorColor]
    }

    setMeteorCount(activeCount)
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={TOTAL_PARTICLES}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aOpacity"
          array={opacities}
          count={TOTAL_PARTICLES}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aSize"
          array={sizes}
          count={TOTAL_PARTICLES}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aBrightness"
          array={brightnesses}
          count={TOTAL_PARTICLES}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{ uColor: { value: colorMap[meteorColor] } }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
