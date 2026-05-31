import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useTreeStore } from '@/store'

export default function CameraController() {
  const controlsRef = useRef<any>(null)
  const autoRotate = useTreeStore((s) => s.autoRotate)
  const cameraOrbitSpeed = useTreeStore((s) => s.cameraOrbitSpeed)

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.update()
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      autoRotate={autoRotate}
      autoRotateSpeed={cameraOrbitSpeed * 10}
      enableDamping
      minDistance={6}
      maxDistance={25}
      target={[0, 3, 0]}
    />
  )
}
