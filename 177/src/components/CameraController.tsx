import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { EARTH_MOON_DISTANCE, MOON_RADIUS } from '@/utils/constants'
import { useSolarSystemStore } from '@/store/useSolarSystemStore'

export default function CameraController() {
  const controlsRef = useRef<any>(null)
  const { camera } = useThree()
  const cameraMode = useSolarSystemStore((s) => s.cameraMode)
  const autoRotate = useSolarSystemStore((s) => s.autoRotate)
  const orbitSpeed = useSolarSystemStore((s) => s.orbitSpeed)

  const moonAngleRef = useRef(0)
  const lerpRef = useRef(0)

  useEffect(() => {
    if (cameraMode === 'global') {
      camera.position.set(15, 10, 15)
      camera.lookAt(0, 0, 0)
      lerpRef.current = 0
      moonAngleRef.current = 0
    }
  }, [cameraMode])

  useFrame((state, delta) => {
    if (cameraMode === 'lunar') {
      moonAngleRef.current += (2 * Math.PI / 3) * delta * orbitSpeed
      const angle = moonAngleRef.current
      const moonPos = new THREE.Vector3(
        Math.cos(angle) * EARTH_MOON_DISTANCE,
        0,
        Math.sin(angle) * EARTH_MOON_DISTANCE
      )
      const dirToEarth = new THREE.Vector3(0, 0, 0).sub(moonPos).normalize()
      const cameraTarget = moonPos.clone().add(
        dirToEarth.clone().multiplyScalar(MOON_RADIUS * 3)
      ).add(new THREE.Vector3(0, MOON_RADIUS * 1.5, 0))

      lerpRef.current = Math.min(lerpRef.current + delta * 2, 1)
      const t = lerpRef.current
      camera.position.lerp(cameraTarget, t * 0.05)
      const lookTarget = new THREE.Vector3(0, 0, 0)
      camera.lookAt(lookTarget)

      if (controlsRef.current) {
        controlsRef.current.enabled = false
      }
    } else {
      if (controlsRef.current) {
        controlsRef.current.enabled = true
      }
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      autoRotate={cameraMode === 'global' && autoRotate}
      autoRotateSpeed={0.5}
      minDistance={5}
      maxDistance={60}
      enablePan={false}
    />
  )
}
