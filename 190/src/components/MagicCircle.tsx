import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useMagicCircleStore, colorThemes } from '@/store/magicCircleStore'

interface RuneData {
  position: THREE.Vector3
  rotation: number
  text: string
}

type TextureCacheKey = `${string}-${number}-${string}`
const textureCache = new Map<TextureCacheKey, THREE.CanvasTexture>()

function getCachedRuneTexture(text: string, fontSize: number, color: string): THREE.CanvasTexture {
  const key: TextureCacheKey = `${text}-${fontSize}-${color}`
  
  if (textureCache.has(key)) {
    return textureCache.get(key)!
  }

  const canvas = document.createElement('canvas')
  const size = 128
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  
  ctx.clearRect(0, 0, size, size)
  ctx.font = `bold ${fontSize}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 15
  ctx.fillText(text, size / 2, size / 2)
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  textureCache.set(key, texture)
  
  return texture
}

function createCirclePoints(radius: number, segments: number = 128): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    ))
  }
  return points
}

function createStarPoints(radius: number, points: number = 6): THREE.Vector3[] {
  const result: THREE.Vector3[] = []
  for (let i = 0; i <= points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2
    const r = i % 2 === 0 ? radius : radius * 0.5
    result.push(new THREE.Vector3(
      Math.cos(angle) * r,
      0,
      Math.sin(angle) * r
    ))
  }
  return result
}

function createPolygonPoints(radius: number, sides: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= sides; i++) {
    const angle = (i / sides) * Math.PI * 2
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    ))
  }
  return points
}

const runeSymbols = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ']

export default function MagicCircle() {
  const groupRef = useRef<THREE.Group>(null)
  const hitAreaRef = useRef<THREE.Mesh>(null)
  const lineMaterialsRef = useRef<THREE.LineBasicMaterial[]>([])
  const runeMeshesRef = useRef<THREE.Mesh[]>([])
  const timeRef = useRef(0)
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())
  
  const {
    rotationSpeed,
    glowIntensity,
    runeFontSize,
    colorTheme,
    triggerExplosion,
    isExploding,
    resetExplosion
  } = useMagicCircleStore()

  const { camera, gl } = useThree()
  const theme = colorThemes[colorTheme]

  const runeData = useMemo<RuneData[]>(() => {
    const data: RuneData[] = []
    const count = 12
    const radius = 3.5
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      data.push({
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        ),
        rotation: -angle + Math.PI / 2,
        text: runeSymbols[i % runeSymbols.length]
      })
    }
    return data
  }, [])

  const circleGeometries = useMemo(() => {
    return [
      new THREE.BufferGeometry().setFromPoints(createCirclePoints(4)),
      new THREE.BufferGeometry().setFromPoints(createCirclePoints(3.8)),
      new THREE.BufferGeometry().setFromPoints(createCirclePoints(3)),
      new THREE.BufferGeometry().setFromPoints(createStarPoints(3, 6)),
      new THREE.BufferGeometry().setFromPoints(createPolygonPoints(2, 8)),
      new THREE.BufferGeometry().setFromPoints(createCirclePoints(1.5)),
      new THREE.BufferGeometry().setFromPoints(createPolygonPoints(1, 6)),
    ]
  }, [])

  useEffect(() => {
    lineMaterialsRef.current = circleGeometries.map(() => 
      new THREE.LineBasicMaterial({ 
        color: theme.primary,
        transparent: true,
        opacity: 0.9
      })
    )
    return () => {
      lineMaterialsRef.current.forEach(m => m.dispose())
    }
  }, [])

  useEffect(() => {
    lineMaterialsRef.current.forEach(m => {
      m.color.set(theme.primary)
    })
  }, [colorTheme, theme.primary])

  useEffect(() => {
    runeMeshesRef.current.forEach((mesh, i) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const newTexture = getCachedRuneTexture(runeData[i].text, runeFontSize, theme.primary)
      material.map = newTexture
      material.color.set(theme.primary)
      material.needsUpdate = true
    })
  }, [runeFontSize, colorTheme, theme.primary, runeData])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.current.setFromCamera(mouse.current, camera)
      
      const intersects = hitAreaRef.current 
        ? raycaster.current.intersectObject(hitAreaRef.current)
        : []
      
      if (intersects.length > 0) {
        triggerExplosion()
      }
    }

    gl.domElement.addEventListener('click', handleClick)
    return () => gl.domElement.removeEventListener('click', handleClick)
  }, [gl, camera, triggerExplosion])

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * rotationSpeed * 0.5
    }

    timeRef.current += delta
    const breatheIntensity = 0.5 + 0.5 * Math.sin(timeRef.current * 2)
    const currentGlow = glowIntensity * breatheIntensity

    lineMaterialsRef.current.forEach(m => {
      m.opacity = 0.6 + currentGlow * 0.4
    })

    runeMeshesRef.current.forEach(mesh => {
      const material = mesh.material as THREE.MeshBasicMaterial
      material.opacity = 0.7 + currentGlow * 0.3
    })

    if (isExploding) {
      setTimeout(resetExplosion, 500)
    }
  })

  return (
    <group ref={groupRef} position={[0, 0.1, 0]}>
      {circleGeometries.map((geo, i) => (
        <lineSegments 
          key={i} 
          geometry={geo} 
          material={lineMaterialsRef.current[i] || new THREE.LineBasicMaterial({ color: theme.primary })}
        />
      ))}

      {runeData.map((rune, i) => (
        <mesh
          key={`rune-${i}`}
          position={[rune.position.x, 0.02, rune.position.z]}
          rotation={[-Math.PI / 2, 0, rune.rotation]}
          ref={(el) => { if (el) runeMeshesRef.current[i] = el }}
        >
          <planeGeometry args={[0.6, 0.6]} />
          <meshBasicMaterial
            map={getCachedRuneTexture(rune.text, runeFontSize, theme.primary)}
            transparent
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}

      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.5, 32]} />
        <meshBasicMaterial
          color={theme.primary}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.25, 32]} />
        <meshBasicMaterial
          color={theme.secondary}
          transparent
          opacity={0.7}
        />
      </mesh>

      <mesh
        ref={hitAreaRef}
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[4, 32]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      <pointLight
        position={[0, 2, 0]}
        color={theme.primary}
        intensity={glowIntensity * 2}
        distance={10}
      />
    </group>
  )
}
