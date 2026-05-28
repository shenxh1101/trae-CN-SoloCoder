import { useMemo, useEffect, useState } from 'react'
import * as THREE from 'three'

const STARRY_IMAGE_URLS = [
  'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=2048&q=80',
  'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=2048&q=80',
  'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=2048&q=80',
]

function generateStarryTexture(): THREE.CanvasTexture {
  const width = 2048
  const height = 1024
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#020208')
  gradient.addColorStop(0.3, '#030318')
  gradient.addColorStop(0.5, '#080828')
  gradient.addColorStop(0.7, '#030318')
  gradient.addColorStop(1, '#020208')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  const milkyWayCenterY = height * 0.45
  const milkyWayWidth = height * 0.15
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * width
    const y = milkyWayCenterY + (Math.random() - 0.5) * milkyWayWidth * (0.5 + Math.random())
    const brightness = Math.random() * 0.15
    const size = Math.random() * 1.5 + 0.5
    const r = 180 + Math.random() * 40
    const g = 170 + Math.random() * 50
    const b = 200 + Math.random() * 55
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${brightness})`
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }

  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const brightness = Math.random() * 0.4 + 0.1
    const size = Math.random() * 0.8 + 0.2
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }

  for (let i = 0; i < 200; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const baseBrightness = Math.random() * 0.5 + 0.5
    const size = Math.random() * 1.5 + 0.8
    const tint = Math.random()
    let r = 255, g = 255, b = 255
    if (tint < 0.3) { r = 255; g = 220; b = 180 }
    else if (tint < 0.5) { r = 180; g = 210; b = 255 }
    else if (tint < 0.6) { r = 255; g = 200; b = 200 }

    const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 4)
    glowGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${baseBrightness * 0.3})`)
    glowGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
    ctx.fillStyle = glowGrad
    ctx.fillRect(x - size * 4, y - size * 4, size * 8, size * 8)

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${baseBrightness})`
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }

  for (let i = 0; i < 30; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const size = Math.random() * 2 + 1.5
    const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 8)
    glowGrad.addColorStop(0, `rgba(255, 255, 255, 0.6)`)
    glowGrad.addColorStop(0.1, `rgba(255, 255, 255, 0.2)`)
    glowGrad.addColorStop(0.5, `rgba(200, 220, 255, 0.05)`)
    glowGrad.addColorStop(1, `rgba(200, 220, 255, 0)`)
    ctx.fillStyle = glowGrad
    ctx.fillRect(x - size * 8, y - size * 8, size * 16, size * 16)

    ctx.fillStyle = `rgba(255, 255, 255, 0.9)`
    ctx.beginPath()
    ctx.arc(x, y, size * 0.8, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function loadImageTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader()
    loader.crossOrigin = 'anonymous'
    loader.load(
      url,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping
        texture.colorSpace = THREE.SRGBColorSpace
        resolve(texture)
      },
      undefined,
      reject
    )
  })
}

async function tryLoadStarryImage(): Promise<THREE.Texture | null> {
  for (const url of STARRY_IMAGE_URLS) {
    try {
      const texture = await loadImageTexture(url)
      return texture
    } catch (_e) {
      continue
    }
  }
  return null
}

export function useStarryTexture(): THREE.Texture {
  const fallbackTexture = useMemo(() => generateStarryTexture(), [])
  const [texture, setTexture] = useState<THREE.Texture>(fallbackTexture)

  useEffect(() => {
    let mounted = true
    tryLoadStarryImage().then((loadedTexture) => {
      if (mounted && loadedTexture) {
        setTexture(loadedTexture)
      }
    })
    return () => { mounted = false }
  }, [fallbackTexture])

  return texture
}

export default function StarField() {
  const { positions, sizes } = useMemo(() => {
    const count = 2000
    const pos = new Float32Array(count * 3)
    const siz = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 200 + Math.random() * 100

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)

      siz[i] = 0.5 + Math.random() * 1.5
    }

    return { positions: pos, sizes: siz }
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={2000}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.8}
        sizeAttenuation
        transparent
        opacity={0.6}
      />
    </points>
  )
}

export { generateStarryTexture }
