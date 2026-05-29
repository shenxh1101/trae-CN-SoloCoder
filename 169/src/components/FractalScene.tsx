import { useRef, useCallback, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useFractalStore } from '@/store/fractalStore'
import FractalGeometry from './FractalGeometry'
import type { FractalStats } from '@/types'

interface FractalSceneProps {
  onStatsUpdate: (stats: FractalStats) => void
}

function SceneBackground() {
  const backgroundMode = useFractalStore((s) => s.backgroundMode)

  const color = (() => {
    switch (backgroundMode) {
      case 'black': return '#000000'
      case 'darkBlue': return '#0A0A2E'
      case 'gradient': return '#0A0A1A'
    }
  })()

  return <color attach="background" args={[color]} />
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={1.2} color="#FF006E" />
      <pointLight position={[-5, -3, 5]} intensity={0.8} color="#00F5D4" />
      <pointLight position={[0, 5, -5]} intensity={0.6} color="#F5A623" />
      <directionalLight position={[3, 5, 2]} intensity={0.5} />
    </>
  )
}

function GradientBackground() {
  const backgroundMode = useFractalStore((s) => s.backgroundMode)

  if (backgroundMode !== 'gradient') return null

  return (
    <mesh position={[0, 0, -10]} renderOrder={-1}>
      <planeGeometry args={[50, 50]} />
      <shaderMaterial
        depthWrite={false}
        uniforms={{
          uTime: { value: 0 },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          uniform float uTime;
          void main() {
            vec3 color1 = vec3(0.04, 0.0, 0.12);
            vec3 color2 = vec3(0.0, 0.06, 0.18);
            vec3 color3 = vec3(0.08, 0.0, 0.08);
            float t = vUv.y + sin(vUv.x * 3.14 + uTime * 0.2) * 0.1;
            vec3 col = mix(mix(color1, color2, smoothstep(0.0, 0.5, t)), color3, smoothstep(0.5, 1.0, t));
            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  )
}

export default function FractalScene({ onStatsUpdate }: FractalSceneProps) {
  const autoOrbit = useFractalStore((s) => s.autoOrbit)
  const glRef = useRef<THREE.WebGLRenderer | null>(null)

  return (
    <Canvas
      camera={{ position: [0, 2, 5], fov: 60, near: 0.1, far: 100 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneBackground />
      <GradientBackground />
      <Lights />
      <FractalGeometry onStatsUpdate={onStatsUpdate} glRef={glRef} />
      <OrbitControls
        enabled={!autoOrbit}
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={15}
      />
      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  )
}
