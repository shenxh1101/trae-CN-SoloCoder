import { useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { Level, Vector3 } from '@/types/game'
import Platform from './Platform'
import TargetPoint from './TargetPoint'
import StarItem from './StarItem'

interface EditorSceneProps {
  level: Level
  editorMode: 'platform' | 'target' | 'star' | 'none'
  onAddElement: (type: 'platform' | 'target' | 'star', position: Vector3) => void
}

function EditorLogic({ level, editorMode, onAddElement }: EditorSceneProps) {
  const { camera, gl } = useThree()
  const lastClickRef = useRef<number>(0)

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      console.log('[EditorScene] mousedown triggered, editorMode:', editorMode)
      if (editorMode === 'none') {
        console.log('[EditorScene] editorMode is none, skipping')
        return
      }

      const now = Date.now()
      if (now - lastClickRef.current < 300) {
        console.log('[EditorScene] debounce skip')
        return
      }
      lastClickRef.current = now

      const rect = gl.domElement.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      console.log('[EditorScene] screen coords:', { x, y })

      const raycaster = new THREE.Raycaster()
      const mouse = new THREE.Vector2(x, y)
      raycaster.setFromCamera(mouse, camera)

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const intersect = new THREE.Vector3()
      raycaster.ray.intersectPlane(plane, intersect)

      console.log('[EditorScene] intersect:', intersect)
      if (intersect) {
        const pos = { x: intersect.x, y: Math.max(0, intersect.y), z: intersect.z }
        console.log('[EditorScene] calling onAddElement with type:', editorMode, 'pos:', pos)
        onAddElement(editorMode, pos)
      } else {
        console.log('[EditorScene] no intersection found')
      }
    }

    const canvas = gl.domElement
    console.log('[EditorScene] adding event listener to canvas:', canvas)
    canvas.addEventListener('mousedown', handleMouseDown)

    return () => {
      console.log('[EditorScene] removing event listener')
      canvas.removeEventListener('mousedown', handleMouseDown)
    }
  }, [gl, camera, editorMode, onAddElement])

  useFrame(() => {
    const targetCamPos = new THREE.Vector3(10, 15, 20)
    camera.position.lerp(targetCamPos, 0.02)
    camera.lookAt(5, 0, 5)
  })

  const nextTargetIndex = level.targets.findIndex((t) => !t.reached)

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#00d4ff" />

      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.5} />
      </mesh>

      <gridHelper args={[100, 50, '#333355', '#222244']} position={[0, 0.01, 0]} />

      {level.platforms.map((platform, index) => (
        <Platform key={`editor-platform-${index}`} platform={platform} index={index} />
      ))}

      {level.targets.map((target, index) => (
        <TargetPoint
          key={`editor-target-${target.id}`}
          target={target}
          index={index}
          isNext={index === nextTargetIndex}
        />
      ))}

      {level.stars.map((star, index) => (
        <StarItem key={`editor-star-${star.id}`} star={star} index={index} />
      ))}

      {editorMode !== 'none' && (
        <>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[100, 100]} />
            <meshBasicMaterial color="#00d4ff" transparent opacity={0.08} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 0.7, 32]} />
            <meshBasicMaterial color="#ff6b6b" transparent opacity={0.5} />
          </mesh>
        </>
      )}
    </>
  )
}

export default function EditorScene({ level, editorMode, onAddElement }: EditorSceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [10, 15, 20], fov: 60 }}
      gl={{ antialias: true }}
      className="absolute inset-0"
    >
      <fog attach="fog" args={['#0a0a1a', 40, 100]} />
      <color attach="background" args={['#0a0a1a']} />
      <EditorLogic level={level} editorMode={editorMode} onAddElement={onAddElement} />
    </Canvas>
  )
}
