import { useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import MagicCircle from './MagicCircle'
import ParticleSystem from './ParticleSystem'
import Ground from './Ground'
import { useMagicCircleStore, colorThemes, backgrounds } from '@/store/magicCircleStore'
import { useAudio } from '@/hooks/useAudio'

function AutoRotateCamera() {
  const { autoRotateCamera } = useMagicCircleStore()
  const { camera } = useThree()
  const angleRef = useRef(0)

  useFrame((_, delta) => {
    if (autoRotateCamera) {
      angleRef.current += delta * 0.2
      const radius = 12
      camera.position.x = Math.sin(angleRef.current) * radius
      camera.position.z = Math.cos(angleRef.current) * radius
      camera.lookAt(0, 0, 0)
    }
  })

  return null
}

function SceneContent() {
  const { soundEnabled, isExploding, background, colorTheme } = useMagicCircleStore()
  const { playExplosionSound } = useAudio(soundEnabled)

  useEffect(() => {
    if (isExploding) {
      playExplosionSound()
    }
  }, [isExploding, playExplosionSound])

  const theme = colorThemes[colorTheme]
  const bgColor = backgrounds[background].color

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[bgColor, 15, 40]} />
      
      <ambientLight intensity={0.3} color={theme.ambient} />
      <pointLight position={[5, 5, 5]} intensity={0.5} color={theme.primary} />
      <pointLight position={[-5, 5, -5]} intensity={0.3} color={theme.secondary} />

      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

      <MagicCircle />
      <ParticleSystem />
      <Ground />

      <OrbitControls 
        enablePan={false}
        minDistance={5}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.1}
      />

      <AutoRotateCamera />

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

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 5, 12], fov: 60 }}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
    >
      <SceneContent />
    </Canvas>
  )
}
