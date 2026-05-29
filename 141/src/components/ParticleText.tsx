import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useParticleStore } from '@/store/useParticleStore'
import { textToParticles } from '@/utils/textUtils'
import {
  PARTICLE_VERTEX_SHADER,
  PARTICLE_FRAGMENT_SHADER,
  shapeToUniform,
  motionToUniform,
  createGradientColorsByPosition,
} from '@/utils/particleUtils'

export default function ParticleText() {
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const fadeRef = useRef({ direction: 'none' as string, progress: 1 })

  const text = useParticleStore((s) => s.text)
  const particleSize = useParticleStore((s) => s.particleSize)
  const particleShape = useParticleStore((s) => s.particleShape)
  const motionMode = useParticleStore((s) => s.motionMode)
  const font = useParticleStore((s) => s.font)
  const thickness = useParticleStore((s) => s.thickness)
  const colorStart = useParticleStore((s) => s.colorStart)
  const colorEnd = useParticleStore((s) => s.colorEnd)
  const opacity = useParticleStore((s) => s.opacity)
  const fadeDirection = useParticleStore((s) => s.fadeDirection)
  const setParticleCount = useParticleStore((s) => s.setParticleCount)

  const geometry = useMemo(() => {
    const layerCount = Math.max(1, Math.round(thickness))
    let sampling = layerCount > 5 ? 4 : 3
    if (text.length > 10) sampling += 1
    if (text.length > 15 && layerCount > 5) sampling += 1
    const particlePoints = textToParticles(text, font, thickness, sampling)
    const count = particlePoints.length
    setParticleCount(count)

    if (count === 0) {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(0), 3))
      geo.setAttribute('aSize', new THREE.Float32BufferAttribute(new Float32Array(0), 1))
      geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(new Float32Array(0), 1))
      geo.setAttribute('aColor', new THREE.Float32BufferAttribute(new Float32Array(0), 3))
      geo.setAttribute('aOpacity', new THREE.Float32BufferAttribute(new Float32Array(0), 1))
      return geo
    }

    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const phases = new Float32Array(count)
    const opacities = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = particlePoints[i].x
      positions[i * 3 + 1] = particlePoints[i].y
      positions[i * 3 + 2] = particlePoints[i].z
      sizes[i] = 0.8 + Math.random() * 0.4
      phases[i] = Math.random() * Math.PI * 2
      opacities[i] = 1.0
    }

    const colors = createGradientColorsByPosition(positions, count, colorStart, colorEnd)

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1))
    geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1))
    geo.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3))
    geo.setAttribute('aOpacity', new THREE.Float32BufferAttribute(opacities, 1))

    return geo
  }, [text, font, thickness, setParticleCount])

  useEffect(() => {
    return () => {
      geometry.dispose()
    }
  }, [geometry])

  useEffect(() => {
    if (!materialRef.current) return
    const colors = geometry.getAttribute('aColor')
    if (colors) {
      const count = colors.count
      if (count === 0) return
      const positions = geometry.getAttribute('position')
      if (positions) {
        const posArray = positions.array as Float32Array
        const newColors = createGradientColorsByPosition(posArray, count, colorStart, colorEnd)
        const colorAttr = colors as THREE.BufferAttribute
        colorAttr.array.set(newColors)
        colorAttr.needsUpdate = true
      }
    }
  }, [colorStart, colorEnd, geometry])

  useEffect(() => {
    fadeRef.current.direction = fadeDirection
    if (fadeDirection === 'in') {
      fadeRef.current.progress = 0
    } else if (fadeDirection === 'out') {
      fadeRef.current.progress = 1
    }
  }, [fadeDirection])

  useFrame((_, delta) => {
    if (!materialRef.current) return

    materialRef.current.uniforms.uTime.value += delta
    materialRef.current.uniforms.uPointSize.value = particleSize
    materialRef.current.uniforms.uShape.value = shapeToUniform(particleShape)
    materialRef.current.uniforms.uMotionMode.value = motionToUniform(motionMode)

    if (fadeRef.current.direction === 'in') {
      fadeRef.current.progress = Math.min(1, fadeRef.current.progress + delta * 1.2)
      materialRef.current.uniforms.uGlobalOpacity.value = opacity * fadeRef.current.progress
      if (fadeRef.current.progress >= 1) {
        fadeRef.current.direction = 'none'
        useParticleStore.getState().setConfig({ fadeDirection: 'none' })
      }
    } else if (fadeRef.current.direction === 'out') {
      fadeRef.current.progress = Math.max(0, fadeRef.current.progress - delta * 1.2)
      materialRef.current.uniforms.uGlobalOpacity.value = opacity * fadeRef.current.progress
      if (fadeRef.current.progress <= 0) {
        fadeRef.current.direction = 'none'
        useParticleStore.getState().setConfig({ fadeDirection: 'none' })
      }
    } else {
      materialRef.current.uniforms.uGlobalOpacity.value = opacity
    }
  })

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointSize: { value: particleSize },
      uShape: { value: shapeToUniform(particleShape) },
      uMotionMode: { value: motionToUniform(motionMode) },
      uGlobalOpacity: { value: opacity },
    }),
    []
  )

  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={PARTICLE_VERTEX_SHADER}
        fragmentShader={PARTICLE_FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
