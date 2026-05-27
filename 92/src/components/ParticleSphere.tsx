import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useParticleStore } from '@/store/useParticleStore'
import { getTextureForShape } from '@/utils/particleTexture'

function generatePositions(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(2 * Math.random() - 1)
    const theta = Math.random() * Math.PI * 2
    const r = radius * Math.cbrt(Math.random())
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)
  }
  return positions
}

function generateColors(count: number): Float32Array {
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const t = i / count
    const hue = t * 0.7
    const color = new THREE.Color()
    color.setHSL(hue, 1, 0.5)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  return colors
}

export default function ParticleSphere() {
  const linesRef = useRef<THREE.LineSegments>(null!)
  const groupRef = useRef<THREE.Group>(null!)
  const materialRef = useRef<THREE.PointsMaterial>(null!)
  const prevMotionMode = useRef<string>('rotateY')

  const particleCount = useParticleStore((s) => s.particleCount)
  const particleSize = useParticleStore((s) => s.particleSize)
  const sphereRadius = useParticleStore((s) => s.sphereRadius)
  const motionMode = useParticleStore((s) => s.motionMode)
  const particleShape = useParticleStore((s) => s.particleShape)
  const showLines = useParticleStore((s) => s.showLines)

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = generatePositions(particleCount, sphereRadius)
    const colors = generateColors(particleCount)
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [particleCount, sphereRadius])

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.map = getTextureForShape(particleShape)
      materialRef.current.needsUpdate = true
    }
  }, [particleShape])

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.size = particleSize
    }
  }, [particleSize])

  useEffect(() => {
    if (prevMotionMode.current !== 'static' && motionMode === 'static') {
      if (groupRef.current) {
        groupRef.current.rotation.set(0, 0, 0)
      }
    }
    prevMotionMode.current = motionMode
  }, [motionMode])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    if (motionMode === 'rotateY') {
      groupRef.current.rotation.y += delta * 0.3
    } else if (motionMode === 'rotateXY') {
      groupRef.current.rotation.y += delta * 0.3
      groupRef.current.rotation.x += delta * 0.15
    }
  })

  useEffect(() => {
    if (!linesRef.current) return
    if (!showLines) {
      linesRef.current.visible = false
      const lineGeo = linesRef.current.geometry as THREE.BufferGeometry
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute([], 3))
      lineGeo.setAttribute('color', new THREE.Float32BufferAttribute([], 3))
      return
    }
    linesRef.current.visible = true
    const posAttr = geometry.getAttribute('position')
    const maxConnections = 2000
    const threshold = sphereRadius * 0.55
    const linePositions: number[] = []
    const lineColors: number[] = []
    let connectionCount = 0
    const step = Math.max(1, Math.floor(particleCount / 400))
    for (let i = 0; i < particleCount && connectionCount < maxConnections; i += step) {
      for (let j = i + step; j < particleCount && connectionCount < maxConnections; j += step) {
        const xi = posAttr.getX(i), yi = posAttr.getY(i), zi = posAttr.getZ(i)
        const xj = posAttr.getX(j), yj = posAttr.getY(j), zj = posAttr.getZ(j)
        const dx = xi - xj
        const dy = yi - yj
        const dz = zi - zj
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < threshold) {
          linePositions.push(xi, yi, zi, xj, yj, zj)
          const opacity = 1 - dist / threshold
          const r = 0.3 * opacity
          const g = 0.6 * opacity
          const b = 1.0 * opacity
          lineColors.push(r, g, b, r, g, b)
          connectionCount++
        }
      }
    }
    const lineGeo = linesRef.current.geometry as THREE.BufferGeometry
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
    lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3))
    lineGeo.attributes.position.needsUpdate = true
    lineGeo.attributes.color.needsUpdate = true
  }, [showLines, geometry, particleCount, sphereRadius])

  return (
    <group ref={groupRef}>
      <points geometry={geometry}>
        <pointsMaterial
          ref={materialRef}
          size={particleSize}
          vertexColors
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          map={getTextureForShape(particleShape)}
          sizeAttenuation
        />
      </points>
      <lineSegments ref={linesRef} visible={showLines}>
        <bufferGeometry />
        <lineBasicMaterial vertexColors transparent opacity={0.3} depthWrite={false} />
      </lineSegments>
    </group>
  )
}
