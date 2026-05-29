import { FontType, ParticlePoint } from '@/types'

const FONT_MAP: Record<FontType, string> = {
  default: 'bold 120px Arial, sans-serif',
  artistic: 'bold 120px "Georgia", "Times New Roman", serif',
}

export function textToParticles(
  text: string,
  font: FontType = 'default',
  thickness: number = 3,
  sampling: number = 3
): ParticlePoint[] {
  if (!text || text.trim() === '') return []

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return []

  const fontStr = FONT_MAP[font]
  ctx.font = fontStr
  const metrics = ctx.measureText(text)
  const textWidth = metrics.width
  const textHeight = 120

  canvas.width = Math.ceil(textWidth) + 40
  canvas.height = textHeight + 40

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.font = fontStr
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 20, canvas.height / 2)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imageData.data

  const points: ParticlePoint[] = []
  const halfW = canvas.width / 2
  const halfH = canvas.height / 2
  const scale = 0.12

  const layerCount = Math.max(1, Math.round(thickness))
  const zSpacing = 0.8

  for (let y = 0; y < canvas.height; y += sampling) {
    for (let x = 0; x < canvas.width; x += sampling) {
      const idx = (y * canvas.width + x) * 4
      const r = pixels[idx]
      if (r > 128) {
        for (let z = 0; z < layerCount; z++) {
          const zOffset = (z - (layerCount - 1) / 2) * zSpacing
          points.push({
            x: (x - halfW) * scale,
            y: -(y - halfH) * scale,
            z: zOffset,
          })
        }
      }
    }
  }

  return points
}

export function getTextBounds(points: ParticlePoint[]): { minX: number; maxX: number } {
  let minX = Infinity
  let maxX = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
  }
  return { minX, maxX }
}
