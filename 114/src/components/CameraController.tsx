import { useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useKaleidoscopeStore } from '@/store/useKaleidoscopeStore'

export function CameraController() {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const cameraResetTrigger = useKaleidoscopeStore((state) => state.cameraResetTrigger)

  useEffect(() => {
    if (controlsRef.current) {
      camera.position.set(0, 0, 5)
      controlsRef.current?.reset()
    }
  }, [cameraResetTrigger, camera])

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={2}
      maxDistance={15}
      enablePan={false}
    />
  )
}
