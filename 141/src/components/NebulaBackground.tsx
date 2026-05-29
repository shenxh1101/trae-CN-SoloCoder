import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useParticleStore } from '@/store/useParticleStore'

const NEBULA_COUNT = 2000

const NEBULA_VERTEX = `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  
  uniform float uTime;
  
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    vColor = aColor;
    
    vec3 pos = position;
    pos.x += sin(uTime * 0.1 + aPhase) * 0.5;
    pos.y += cos(uTime * 0.15 + aPhase * 1.3) * 0.5;
    pos.z += sin(uTime * 0.08 + aPhase * 0.7) * 0.3;
    
    vAlpha = 0.3 + 0.3 * sin(uTime * 0.5 + aPhase);
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (150.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const NEBULA_FRAGMENT = `
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    float dist = length(gl_PointCoord - 0.5);
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
  }
`

export default function NebulaBackground() {
  const showNebula = useParticleStore((s) => s.showNebula)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const geometry = useMemo(() => {
    const positions = new Float32Array(NEBULA_COUNT * 3)
    const sizes = new Float32Array(NEBULA_COUNT)
    const phases = new Float32Array(NEBULA_COUNT)
    const colors = new Float32Array(NEBULA_COUNT * 3)

    const palette = [
      new THREE.Color('#4c1d95'),
      new THREE.Color('#1e3a5f'),
      new THREE.Color('#312e81'),
      new THREE.Color('#1e1b4b'),
      new THREE.Color('#0c4a6e'),
      new THREE.Color('#581c87'),
    ]

    for (let i = 0; i < NEBULA_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80 - 20
      sizes[i] = 0.5 + Math.random() * 2.0
      phases[i] = Math.random() * Math.PI * 2
      const c = palette[Math.floor(Math.random() * palette.length)]
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1))
    geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1))
    geo.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3))
    return geo
  }, [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    []
  )

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta
    }
  })

  if (!showNebula) return null

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={NEBULA_VERTEX}
        fragmentShader={NEBULA_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
