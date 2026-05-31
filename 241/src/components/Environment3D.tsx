import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTreeStore } from '@/store'

const skyVertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const skyFragmentShader = `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  varying vec3 vWorldPosition;
  void main() {
    float h = normalize(vWorldPosition).y;
    float t = clamp(h, 0.0, 1.0);
    t = pow(t, 0.6);
    vec3 color = mix(horizonColor, topColor, t);
    gl_FragColor = vec4(color, 1.0);
  }
`

const groundVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const groundFragmentShader = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vec2 grid = abs(fract(vWorldPos.xz * 0.5) - 0.5);
    float line = min(grid.x, grid.y);
    float gridLine = 1.0 - smoothstep(0.0, 0.05, line);
    vec3 baseGreen = vec3(0.15, 0.35, 0.12);
    vec3 gridColor = vec3(0.1, 0.25, 0.08);
    vec3 color = mix(baseGreen, gridColor, gridLine * 0.5);
    float dist = length(vWorldPos.xz) * 0.03;
    color = mix(color, vec3(0.08, 0.15, 0.06), clamp(dist, 0.0, 0.6));
    gl_FragColor = vec4(color, 1.0);
  }
`

function SkySphere() {
  const uniforms = useMemo(
    () => ({
      topColor: { value: new THREE.Color('#0a1628') },
      horizonColor: { value: new THREE.Color('#f59e0b') },
    }),
    []
  )

  return (
    <mesh>
      <sphereGeometry args={[500, 32, 32]} />
      <shaderMaterial
        vertexShader={skyVertexShader}
        fragmentShader={skyFragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function GroundGrass() {
  const uniforms = useMemo(() => ({}), [])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200, 1, 1]} />
      <shaderMaterial
        vertexShader={groundVertexShader}
        fragmentShader={groundFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}

export default function Environment3D() {
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const directionalRef = useRef<THREE.DirectionalLight>(null)

  useFrame(() => {
    const { breathValue } = useTreeStore.getState()
    const breathFactor = 0.7 + breathValue * 0.6

    if (ambientRef.current) {
      ambientRef.current.intensity = 0.3 * breathFactor
    }
    if (directionalRef.current) {
      directionalRef.current.intensity = 1.2 * breathFactor
    }
  })

  return (
    <>
      <SkySphere />
      <GroundGrass />
      <ambientLight ref={ambientRef} color="#ffeedd" intensity={0.3} />
      <directionalLight
        ref={directionalRef}
        position={[10, 8, -5]}
        color="#ffa040"
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
    </>
  )
}
