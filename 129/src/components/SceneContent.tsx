import { useRef, useEffect, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import MeteorSystem from './MeteorSystem'
import GroundSilhouette from './GroundSilhouette'
import StarField, { useStarryTexture } from './StarField'
import { useMeteorStore } from '@/store/useMeteorStore'

const bgColors: Record<string, string> = {
  deepBlue: '#050520',
  purple: '#150530',
  starry: '#020210',
}

export default function SceneContent() {
  const { scene, gl } = useThree()
  const { background, autoRotate } = useMeteorStore()
  const controlsRef = useRef<any>(null)

  const starryTexture = useStarryTexture()

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = 1.0
  }, [gl])

  useEffect(() => {
    if (background === 'starry') {
      scene.background = starryTexture
    } else {
      scene.background = new THREE.Color(bgColors[background])
    }
  }, [background, scene, starryTexture])

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate
      controlsRef.current.autoRotateSpeed = 0.5
    }
  })

  return (
    <>
      <ambientLight intensity={0.1} />
      {background !== 'starry' && <StarField />}
      <MeteorSystem />
      <GroundSilhouette />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={true}
        minDistance={20}
        maxDistance={200}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
      />
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}
