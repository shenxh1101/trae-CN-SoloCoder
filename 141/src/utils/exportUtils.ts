import { useParticleStore } from '@/store/useParticleStore'
import { ParticleConfig, DEFAULT_CONFIG } from '@/types'

export function exportConfigAsJson(): void {
  const store = useParticleStore.getState()
  const json = store.exportConfig()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = `particle-config-${Date.now()}.json`
  link.href = url
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function validateConfig(config: Record<string, unknown>): Partial<ParticleConfig> | null {
  const validKeys = new Set(Object.keys(DEFAULT_CONFIG))
  const validMotionModes = new Set(['static', 'float', 'rotate'])
  const validShapes = new Set(['circle', 'square', 'star'])
  const validFonts = new Set(['default', 'artistic'])
  const validFadeDirections = new Set(['none', 'in', 'out'])

  const result: Record<string, unknown> = {}

  if (typeof config.text === 'string' && config.text.length <= 20) {
    result.text = config.text
  }
  if (typeof config.particleSize === 'number' && config.particleSize >= 0.5 && config.particleSize <= 8) {
    result.particleSize = config.particleSize
  }
  if (typeof config.particleShape === 'string' && validShapes.has(config.particleShape)) {
    result.particleShape = config.particleShape
  }
  if (typeof config.motionMode === 'string' && validMotionModes.has(config.motionMode)) {
    result.motionMode = config.motionMode
  }
  if (typeof config.font === 'string' && validFonts.has(config.font)) {
    result.font = config.font
  }
  if (typeof config.thickness === 'number' && config.thickness >= 1 && config.thickness <= 10) {
    result.thickness = config.thickness
  }
  if (typeof config.colorStart === 'string' && /^#[0-9a-fA-F]{6}$/.test(config.colorStart)) {
    result.colorStart = config.colorStart
  }
  if (typeof config.colorEnd === 'string' && /^#[0-9a-fA-F]{6}$/.test(config.colorEnd)) {
    result.colorEnd = config.colorEnd
  }
  if (typeof config.showNebula === 'boolean') {
    result.showNebula = config.showNebula
  }
  if (typeof config.autoRotateCamera === 'boolean') {
    result.autoRotateCamera = config.autoRotateCamera
  }
  if (typeof config.opacity === 'number' && config.opacity >= 0 && config.opacity <= 1) {
    result.opacity = config.opacity
  }
  if (typeof config.fadeDirection === 'string' && validFadeDirections.has(config.fadeDirection)) {
    result.fadeDirection = config.fadeDirection
  }

  const validResult: Partial<ParticleConfig> = {}
  for (const key of Object.keys(result)) {
    if (validKeys.has(key)) {
      (validResult as Record<string, unknown>)[key] = result[key]
    }
  }

  return Object.keys(validResult).length > 0 ? validResult : null
}

export function importConfigFromJson(): Promise<boolean> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        resolve(false)
        return
      }
      try {
        const text = await file.text()
        const raw = JSON.parse(text) as Record<string, unknown>
        const validated = validateConfig(raw)
        if (validated) {
          const store = useParticleStore.getState()
          store.setConfig(validated)
          resolve(true)
        } else {
          resolve(false)
        }
      } catch {
        resolve(false)
      }
    }
    input.click()
  })
}
