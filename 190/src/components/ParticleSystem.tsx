import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMagicCircleStore, colorThemes } from '@/store/magicCircleStore'

const PARTICLE_COUNT = 500
const EXPLOSION_PARTICLE_COUNT = 200

export default function ParticleSystem() {
  const beamParticlesRef = useRef<THREE.Points>(null)
  const explosionParticlesRef = useRef<THREE.Points>(null)
  
  const { particleBeamEnabled, colorTheme, isExploding, glowIntensity } = useMagicCircleStore()
  const theme = colorThemes[colorTheme]

  const beamGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const velocities = new Float32Array(PARTICLE_COUNT * 3)
    const lifetimes = new Float32Array(PARTICLE_COUNT)
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 0.5
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = Math.random() * 10
      positions[i * 3 + 2] = Math.sin(angle) * radius
      
      velocities[i * 3] = 0
      velocities[i * 3 + 1] = 0.5 + Math.random() * 1
      velocities[i * 3 + 2] = 0
      
      lifetimes[i] = Math.random()
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geo.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1))
    
    return geo
  }, [])

  const explosionGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(EXPLOSION_PARTICLE_COUNT * 3)
    const velocities = new Float32Array(EXPLOSION_PARTICLE_COUNT * 3)
    const lifetimes = new Float32Array(EXPLOSION_PARTICLE_COUNT)
    
    for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 0.5
      positions[i * 3 + 2] = 0
      
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const speed = 0.1 + Math.random() * 0.3
      
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed
      velocities[i * 3 + 1] = Math.cos(phi) * speed + 0.1
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed
      
      lifetimes[i] = 0
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geo.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1))
    
    return geo
  }, [])

  const beamMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      color: theme.primary,
      size: 0.1,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  }, [])

  const explosionMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      color: theme.primary,
      size: 0.15,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  }, [])

  useEffect(() => {
    beamMaterial.color.set(theme.primary)
    explosionMaterial.color.set(theme.primary)
  }, [colorTheme, theme.primary, beamMaterial, explosionMaterial])

  useEffect(() => {
    if (isExploding && explosionParticlesRef.current) {
      const positions = explosionGeometry.attributes.position.array as Float32Array
      const velocities = explosionGeometry.attributes.velocity.array as Float32Array
      const lifetimes = explosionGeometry.attributes.lifetime.array as Float32Array
      
      for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
        positions[i * 3] = 0
        positions[i * 3 + 1] = 0.5
        positions[i * 3 + 2] = 0
        
        const theta = Math.random() * Math.PI * 2
        const phi = Math.random() * Math.PI
        const speed = 0.1 + Math.random() * 0.3
        
        velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed
        velocities[i * 3 + 1] = Math.cos(phi) * speed + 0.1
        velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed
        
        lifetimes[i] = 1
      }
      
      explosionGeometry.attributes.position.needsUpdate = true
      explosionGeometry.attributes.velocity.needsUpdate = true
      explosionGeometry.attributes.lifetime.needsUpdate = true
    }
  }, [isExploding, explosionGeometry])

  useFrame((_, delta) => {
    if (particleBeamEnabled && beamParticlesRef.current) {
      const positions = beamGeometry.attributes.position.array as Float32Array
      const velocities = beamGeometry.attributes.velocity.array as Float32Array
      const lifetimes = beamGeometry.attributes.lifetime.array as Float32Array
      
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[i * 3 + 1] += velocities[i * 3 + 1] * delta * 5
        lifetimes[i] -= delta * 0.3
        
        if (positions[i * 3 + 1] > 10 || lifetimes[i] <= 0) {
          const angle = Math.random() * Math.PI * 2
          const radius = Math.random() * 0.5
          positions[i * 3] = Math.cos(angle) * radius
          positions[i * 3 + 1] = 0
          positions[i * 3 + 2] = Math.sin(angle) * radius
          lifetimes[i] = 1
        }
      }
      
      beamGeometry.attributes.position.needsUpdate = true
      beamGeometry.attributes.lifetime.needsUpdate = true
      beamMaterial.opacity = 0.6 * glowIntensity
    }

    if (explosionParticlesRef.current) {
      const positions = explosionGeometry.attributes.position.array as Float32Array
      const velocities = explosionGeometry.attributes.velocity.array as Float32Array
      const lifetimes = explosionGeometry.attributes.lifetime.array as Float32Array
      
      let hasActiveParticles = false
      
      for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
        if (lifetimes[i] > 0) {
          hasActiveParticles = true
          positions[i * 3] += velocities[i * 3]
          positions[i * 3 + 1] += velocities[i * 3 + 1]
          positions[i * 3 + 2] += velocities[i * 3 + 2]
          
          velocities[i * 3 + 1] -= 0.002
          lifetimes[i] -= delta * 2
        }
      }
      
      if (hasActiveParticles) {
        explosionGeometry.attributes.position.needsUpdate = true
        explosionGeometry.attributes.lifetime.needsUpdate = true
        const maxLifetime = Math.max(...Array.from(lifetimes))
        explosionMaterial.opacity = maxLifetime * glowIntensity
      }
    }
  })

  return (
    <>
      {particleBeamEnabled && (
        <points ref={beamParticlesRef} geometry={beamGeometry} material={beamMaterial} />
      )}
      <points ref={explosionParticlesRef} geometry={explosionGeometry} material={explosionMaterial} />
    </>
  )
}
