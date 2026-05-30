import { useMemo } from 'react'
import * as THREE from 'three'
import { useMagicCircleStore, backgrounds } from '@/store/magicCircleStore'

function generateGrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#0a1f0a'
  ctx.fillRect(0, 0, 512, 512)

  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    const brightness = Math.random() * 30
    ctx.fillStyle = `rgba(${20 + brightness}, ${60 + brightness}, ${20 + brightness}, 0.5)`
    ctx.fillRect(x, y, 1, 2 + Math.random() * 3)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

function generateCastleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#1a1510'
  ctx.fillRect(0, 0, 512, 512)

  const tileSize = 64
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const offsetX = y % 2 === 0 ? 0 : tileSize / 2
      const px = x * tileSize + offsetX
      const py = y * tileSize
      
      const brightness = Math.random() * 20
      ctx.fillStyle = `rgb(${40 + brightness}, ${35 + brightness}, ${30 + brightness})`
      ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4)
      
      ctx.strokeStyle = '#0a0805'
      ctx.lineWidth = 2
      ctx.strokeRect(px + 2, py + 2, tileSize - 4, tileSize - 4)
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

function generateVoidTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
  gradient.addColorStop(0, '#0a0a20')
  gradient.addColorStop(0.5, '#050510')
  gradient.addColorStop(1, '#000005')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 512, 512)

  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    const size = Math.random() * 2
    const brightness = Math.random() * 0.5 + 0.3
    ctx.fillStyle = `rgba(150, 150, 255, ${brightness})`
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

export default function Ground() {
  const { background } = useMagicCircleStore()

  const texture = useMemo(() => {
    switch (background) {
      case 'grass':
        return generateGrassTexture()
      case 'castle':
        return generateCastleTexture()
      case 'void':
        return generateVoidTexture()
      default:
        return generateVoidTexture()
    }
  }, [background])

  texture.repeat.set(10, 10)

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial
        map={texture}
        color={backgrounds[background].color}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  )
}
