import * as THREE from 'three'

function createEarthTexture(): THREE.CanvasTexture {
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size / 2
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0, '#c8dce8')
  gradient.addColorStop(0.1, '#1a6fc4')
  gradient.addColorStop(0.3, '#1a8f44')
  gradient.addColorStop(0.45, '#2d7a3a')
  gradient.addColorStop(0.55, '#1a6fc4')
  gradient.addColorStop(0.7, '#1a8f44')
  gradient.addColorStop(0.9, '#1a6fc4')
  gradient.addColorStop(1, '#c8dce8')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const landColors = ['#2d7a3a', '#3d8a4a', '#4d9a5a', '#1d6a2a', '#2a7035', '#3a8045']
  const continents: { x: number; y: number; w: number; h: number; points: number }[] = [
    { x: 200, y: 120, w: 120, h: 160, points: 12 },
    { x: 350, y: 80, w: 180, h: 120, points: 10 },
    { x: 500, y: 130, w: 100, h: 200, points: 14 },
    { x: 600, y: 100, w: 140, h: 140, points: 11 },
    { x: 700, y: 140, w: 160, h: 100, points: 9 },
    { x: 150, y: 250, w: 80, h: 60, points: 8 },
    { x: 440, y: 250, w: 60, h: 80, points: 7 },
    { x: 780, y: 220, w: 100, h: 80, points: 8 },
  ]

  continents.forEach((c) => {
    ctx.beginPath()
    ctx.fillStyle = landColors[Math.floor(Math.random() * landColors.length)]
    for (let i = 0; i < c.points; i++) {
      const angle = (i / c.points) * Math.PI * 2
      const rx = c.w / 2 * (0.6 + Math.random() * 0.8)
      const ry = c.h / 2 * (0.6 + Math.random() * 0.8)
      const px = c.x + Math.cos(angle) * rx
      const py = c.y + Math.sin(angle) * ry
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
  })

  for (let i = 0; i < 40; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const r = 5 + Math.random() * 15
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r)
    grd.addColorStop(0, 'rgba(45, 122, 58, 0.5)')
    grd.addColorStop(1, 'rgba(26, 111, 196, 0.0)')
    ctx.fillStyle = grd
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  return tex
}

function createCloudTexture(): THREE.CanvasTexture {
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size / 2
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < 120; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const w = 30 + Math.random() * 100
    const h = 10 + Math.random() * 30
    const opacity = 0.15 + Math.random() * 0.35

    const grd = ctx.createRadialGradient(x, y, 0, x, y, w / 2)
    grd.addColorStop(0, `rgba(255, 255, 255, ${opacity})`)
    grd.addColorStop(0.5, `rgba(255, 255, 255, ${opacity * 0.5})`)
    grd.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = grd
    ctx.fillRect(x - w / 2, y - h / 2, w, h)
  }

  for (let i = 0; i < 30; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const r = 20 + Math.random() * 60
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r)
    grd.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
    grd.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  return tex
}

function createMoonTexture(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size / 2
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#a8a8a8'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const brightness = 140 + Math.random() * 80
    ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2)
  }

  const craters: { x: number; y: number; r: number }[] = []
  for (let i = 0; i < 50; i++) {
    craters.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 3 + Math.random() * 20,
    })
  }

  craters.forEach((c) => {
    const grd = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r)
    grd.addColorStop(0, 'rgba(80, 80, 80, 0.6)')
    grd.addColorStop(0.7, 'rgba(100, 100, 100, 0.3)')
    grd.addColorStop(0.85, 'rgba(180, 180, 180, 0.4)')
    grd.addColorStop(1, 'rgba(150, 150, 150, 0)')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2)
    ctx.fill()
  })

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  return tex
}

function createMoonBumpTexture(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size / 2
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const v = 100 + Math.random() * 56
    ctx.fillStyle = `rgb(${v}, ${v}, ${v})`
    ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 3)
  }

  for (let i = 0; i < 50; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const r = 3 + Math.random() * 20
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r)
    grd.addColorStop(0, 'rgba(40, 40, 40, 0.8)')
    grd.addColorStop(0.7, 'rgba(60, 60, 60, 0.4)')
    grd.addColorStop(0.85, 'rgba(200, 200, 200, 0.6)')
    grd.addColorStop(1, 'rgba(128, 128, 128, 0)')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  return tex
}

let earthTex: THREE.CanvasTexture | null = null
let cloudTex: THREE.CanvasTexture | null = null
let moonTex: THREE.CanvasTexture | null = null
let moonBumpTex: THREE.CanvasTexture | null = null

export function getEarthTexture() {
  if (!earthTex) earthTex = createEarthTexture()
  return earthTex
}

export function getCloudTexture() {
  if (!cloudTex) cloudTex = createCloudTexture()
  return cloudTex
}

export function getMoonTexture() {
  if (!moonTex) moonTex = createMoonTexture()
  return moonTex
}

export function getMoonBumpTexture() {
  if (!moonBumpTex) moonBumpTex = createMoonBumpTexture()
  return moonBumpTex
}
