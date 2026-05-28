import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useKaleidoscopeStore, type BackgroundMode } from '@/store/useKaleidoscopeStore'

interface Background3DProps {
  mode: BackgroundMode
}

export function Background3D({ mode }: Background3DProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const colorSpeed = useKaleidoscopeStore((state) => state.config.colorSpeed)

  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(50, 32, 32)
  }, [])

  useFrame(({ clock }) => {
    if (!meshRef.current || mode !== 'rainbow') return

    const material = meshRef.current.material as THREE.ShaderMaterial
    const time = clock.getElapsedTime()
    material.uniforms.uTime.value = time * colorSpeed * 0.5
  })

  const rainbowShader = useMemo(
    () => ({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        void main() {
          float hue = vNormal.x * 0.5 + 0.5 + uTime * 0.1;
          vec3 color = cos(hue * 6.28318 + vec3(0.0, 2.0944, 4.1888)) * 0.5 + 0.5;
          gl_FragColor = vec4(color * 0.3, 1.0);
        }
      `
    }),
    []
  )

  if (mode === 'black') {
    return (
      <mesh ref={meshRef} geometry={geometry}>
        <meshBasicMaterial color="#000000" side={THREE.BackSide} />
      </mesh>
    )
  }

  if (mode === 'white') {
    return (
      <mesh ref={meshRef} geometry={geometry}>
        <meshBasicMaterial color="#f0f0f0" side={THREE.BackSide} />
      </mesh>
    )
  }

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        uniforms={rainbowShader.uniforms}
        vertexShader={rainbowShader.vertexShader}
        fragmentShader={rainbowShader.fragmentShader}
        side={THREE.BackSide}
      />
    </mesh>
  )
}
