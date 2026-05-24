<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useAppStore } from '@/stores/app'

interface Props {
  text: string
  enabled?: boolean
  fontSize?: number
  color?: string
  opacity?: number
  rotate?: number
  gap?: number
}

const props = withDefaults(defineProps<Props>(), {
  enabled: true,
  fontSize: 14,
  color: 'rgba(0, 0, 0, 0.15)',
  opacity: 0.15,
  rotate: -25,
  gap: 100
})

const appStore = useAppStore()
const watermarkStyle = ref('')

const config = computed(() => ({
  fontSize: props.fontSize || appStore.watermark.fontSize,
  color: props.color || appStore.watermark.color,
  opacity: props.opacity || appStore.watermark.opacity,
  rotate: props.rotate || appStore.watermark.rotate,
  gap: props.gap || appStore.watermark.gap
}))

function generateWatermark() {
  if (!props.enabled || !props.text) {
    watermarkStyle.value = ''
    return
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { fontSize, color, opacity, rotate, gap } = config.value
  const textWidth = ctx.measureText(props.text).width
  const canvasWidth = Math.abs(textWidth * Math.cos((rotate * Math.PI) / 180)) + gap
  const canvasHeight = Math.abs(textWidth * Math.sin((rotate * Math.PI) / 180)) + gap

  canvas.width = canvasWidth
  canvas.height = canvasHeight

  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
  ctx.fillStyle = color
  ctx.globalAlpha = opacity
  ctx.translate(canvasWidth / 2, canvasHeight / 2)
  ctx.rotate((rotate * Math.PI) / 180)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(props.text, 0, 0)

  const dataUrl = canvas.toDataURL('image/png')
  watermarkStyle.value = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    background-image: url(${dataUrl});
    background-repeat: repeat;
  `
}

onMounted(() => {
  generateWatermark()
})

watch(
  () => [props.text, props.enabled, props.fontSize, props.color, props.opacity, props.rotate, props.gap],
  () => {
    generateWatermark()
  },
  { deep: true }
)
</script>

<template>
  <div v-if="enabled && text" :style="watermarkStyle" />
</template>
