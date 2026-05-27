import * as THREE from 'three'

export function createSphereTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)
  const half = size / 2
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)')
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.3)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export function createCubeTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)
  const margin = 10
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.fillRect(margin, margin, size - margin * 2, size - margin * 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export function createStarTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)
  const cx = size / 2
  const cy = size / 2
  const spikes = 5
  const outerRadius = 28
  const innerRadius = 12
  ctx.beginPath()
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius
    const angle = (Math.PI / spikes) * i - Math.PI / 2
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.fill()
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

const textureCache = new Map<string, THREE.CanvasTexture>()

export function getTextureForShape(shape: string): THREE.CanvasTexture {
  const cached = textureCache.get(shape)
  if (cached) return cached
  let texture: THREE.CanvasTexture
  switch (shape) {
    case 'cube': texture = createCubeTexture(); break
    case 'star': texture = createStarTexture(); break
    default: texture = createSphereTexture(); break
  }
  textureCache.set(shape, texture)
  return texture
}
