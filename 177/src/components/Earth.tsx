import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getEarthTexture, getCloudTexture } from '@/utils/textures'
import { EARTH_RADIUS, EARTH_ROTATION_PERIOD } from '@/utils/constants'
import { useSolarSystemStore } from '@/store/useSolarSystemStore'

const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const atmosphereFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
    vec3 atmosphereColor = vec3(0.3, 0.6, 1.0);
    gl_FragColor = vec4(atmosphereColor, intensity * 0.8);
  }
`

export default function Earth() {
  const earthRef = useRef<THREE.Mesh>(null)
  const cloudRef = useRef<THREE.Mesh>(null)
  const showAtmosphere = useSolarSystemStore((s) => s.showAtmosphere)

  const earthTexture = useMemo(() => getEarthTexture(), [])
  const cloudTexture = useMemo(() => getCloudTexture(), [])

  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      }),
    []
  )

  useFrame((_, delta) => {
    const rotSpeed = (2 * Math.PI) / EARTH_ROTATION_PERIOD
    if (earthRef.current) {
      earthRef.current.rotation.y += rotSpeed * delta
    }
    if (cloudRef.current) {
      cloudRef.current.rotation.y += rotSpeed * 0.8 * delta
    }
  })

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshPhongMaterial
          map={earthTexture}
          shininess={25}
          specular={new THREE.Color(0x333333)}
        />
      </mesh>

      <mesh ref={cloudRef}>
        <sphereGeometry args={[EARTH_RADIUS * 1.01, 64, 64]} />
        <meshPhongMaterial
          map={cloudTexture}
          transparent
          opacity={0.45}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {showAtmosphere && (
        <mesh material={atmosphereMaterial}>
          <sphereGeometry args={[EARTH_RADIUS * 1.15, 64, 64]} />
        </mesh>
      )}
    </group>
  )
}
