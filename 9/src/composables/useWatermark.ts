import { ref, onMounted, onUnmounted } from 'vue'

export interface WatermarkOptions {
  width?: number
  height?: number
  fontSize?: number
  fontFamily?: string
  color?: string
  opacity?: number
  rotate?: number
  gapX?: number
  gapY?: number
  zIndex?: number
  position?: 'fixed' | 'absolute'
  targetElement?: HTMLElement | null
}

const WATERMARK_ATTRIBUTE = 'data-watermark'
const DEFAULT_OPTIONS: Required<WatermarkOptions> = {
  width: 300,
  height: 200,
  fontSize: 14,
  fontFamily: 'Noto Sans SC',
  color: 'rgba(0, 0, 0, 0.08)',
  opacity: 0.08,
  rotate: -20,
  gapX: 100,
  gapY: 100,
  zIndex: 9999,
  position: 'fixed',
  targetElement: null
}

export function useWatermark(text: string | (() => string), options: WatermarkOptions = {}) {
  const isVisible = ref(true)
  const watermarkElement = ref<HTMLDivElement | null>(null)
  const mergedOptions = ref<Required<WatermarkOptions>>({ ...DEFAULT_OPTIONS, ...options })
  let observer: MutationObserver | null = null

  const getWatermarkText = (): string => {
    return typeof text === 'function' ? text() : text
  }

  const generateWatermarkImage = (): string => {
    const canvas = document.createElement('canvas')
    const opts = mergedOptions.value
    canvas.width = opts.width + opts.gapX
    canvas.height = opts.height + opts.gapY
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    ctx.rotate((opts.rotate * Math.PI) / 180)
    ctx.font = `${opts.fontSize}px ${opts.fontFamily}`
    ctx.fillStyle = opts.color
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.globalAlpha = opts.opacity

    const watermarkText = getWatermarkText()
    const lines = watermarkText.split('\n')
    const startY = opts.height / 2 - ((lines.length - 1) * opts.fontSize) / 2

    lines.forEach((line, index) => {
      ctx.fillText(line, 20, startY + index * opts.fontSize * 1.5)
    })

    return canvas.toDataURL('image/png')
  }

  const createWatermarkElement = (): HTMLDivElement => {
    const div = document.createElement('div')
    const opts = mergedOptions.value
    const imageUrl = generateWatermarkImage()

    div.setAttribute(WATERMARK_ATTRIBUTE, 'true')
    div.style.cssText = `
      position: ${opts.position};
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: ${opts.zIndex};
      background-image: url(${imageUrl});
      background-repeat: repeat;
      background-position: 0 0;
      background-size: ${opts.width + opts.gapX}px ${opts.height + opts.gapY}px;
    `

    return div
  }

  const getContainer = (): HTMLElement => {
    return mergedOptions.value.targetElement || document.body
  }

  const addWatermark = (): void => {
    if (!isVisible.value) return

    removeWatermark()

    const container = getContainer()
    const element = createWatermarkElement()
    container.appendChild(element)
    watermarkElement.value = element

    setupMutationObserver()
  }

  const removeWatermark = (): void => {
    if (observer) {
      observer.disconnect()
      observer = null
    }

    const container = getContainer()
    const existingElements = container.querySelectorAll(`[${WATERMARK_ATTRIBUTE}="true"]`)
    existingElements.forEach(el => el.remove())

    watermarkElement.value = null
  }

  const setupMutationObserver = (): void => {
    if (observer) {
      observer.disconnect()
    }

    const container = getContainer()

    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const removedNodes = Array.from(mutation.removedNodes)
          const wasWatermarkRemoved = removedNodes.some(
            node => node instanceof HTMLElement && node.hasAttribute(WATERMARK_ATTRIBUTE)
          )
          if (wasWatermarkRemoved) {
            addWatermark()
            return
          }
        }

        if (mutation.type === 'attributes') {
          const target = mutation.target
          if (
            target instanceof HTMLElement &&
            target.hasAttribute(WATERMARK_ATTRIBUTE) &&
            mutation.attributeName === 'style'
          ) {
            addWatermark()
            return
          }
        }
      }
    })

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', WATERMARK_ATTRIBUTE]
    })
  }

  const updateOptions = (newOptions: Partial<WatermarkOptions>): void => {
    mergedOptions.value = { ...mergedOptions.value, ...newOptions }
    if (isVisible.value) {
      addWatermark()
    }
  }

  const updateText = (newText: string | (() => string)): void => {
    if (typeof newText === 'function') {
      ;(text as () => string) = newText
    } else {
      ;(text as string) = newText
    }
    if (isVisible.value) {
      addWatermark()
    }
  }

  const show = (): void => {
    isVisible.value = true
    addWatermark()
  }

  const hide = (): void => {
    isVisible.value = false
    removeWatermark()
  }

  const toggle = (): void => {
    if (isVisible.value) {
      hide()
    } else {
      show()
    }
  }

  onMounted(() => {
    if (isVisible.value) {
      addWatermark()
    }
  })

  onUnmounted(() => {
    removeWatermark()
  })

  return {
    isVisible,
    watermarkElement,
    addWatermark,
    removeWatermark,
    updateOptions,
    updateText,
    show,
    hide,
    toggle
  }
}
