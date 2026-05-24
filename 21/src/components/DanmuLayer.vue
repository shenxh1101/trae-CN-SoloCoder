<template>
  <div class="danmu-layer fixed inset-0 pointer-events-none overflow-hidden z-40">
    <div
      v-for="danmu in activeDanmus"
      :key="danmu.id"
      class="danmu-item absolute whitespace-nowrap px-4 py-2 rounded-full"
      :style="getDanmuStyle(danmu)"
      @animationend="handleAnimationEnd(danmu.id)"
    >
      <span class="font-medium">{{ danmu.userName }}：</span>
      <span>{{ danmu.content }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { Danmu } from '../../shared/types'

interface DanmuItem extends Danmu {
  top?: number
  speed?: number
  color?: string
}

const props = defineProps<{
  danmus: Danmu[]
}>()

const activeDanmus = ref<DanmuItem[]>([])
const processedIds = ref<Set<string>>(new Set())

const colors = [
  '#00d4ff',
  '#ff00ff',
  '#ffffff',
  '#ffff00',
  '#00ff88',
]

const getDanmuStyle = (danmu: DanmuItem) => {
  return {
    top: `${danmu.top}%`,
    color: danmu.color,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(10px)',
    border: `1px solid ${danmu.color}40`,
    textShadow: `0 0 10px ${danmu.color}80`,
    animation: `danmu-fly ${danmu.speed}s linear forwards`,
    right: '-100%',
  }
}

const generateRandomTop = () => {
  const usedTops = activeDanmus.value.map((d) => d.top)
  let top: number
  let attempts = 0

  do {
    top = Math.floor(Math.random() * 60) + 15
    attempts++
  } while (usedTops.some((t) => t && Math.abs(t - top) < 8) && attempts < 20)

  return top
}

const addDanmu = (danmu: Danmu) => {
  if (processedIds.value.has(danmu.id)) return

  processedIds.value.add(danmu.id)

  const newDanmu: DanmuItem = {
    ...danmu,
    top: generateRandomTop(),
    speed: Math.random() * 8 + 10,
    color: colors[Math.floor(Math.random() * colors.length)],
  }

  activeDanmus.value.push(newDanmu)
}

const handleAnimationEnd = (id: string) => {
  const index = activeDanmus.value.findIndex((d) => d.id === id)
  if (index !== -1) {
    activeDanmus.value.splice(index, 1)
    processedIds.value.delete(id)
  }
}

watch(
  () => props.danmus,
  (newDanmus) => {
    newDanmus.forEach((danmu) => {
      if (!processedIds.value.has(danmu.id)) {
        addDanmu(danmu)
      }
    })
  },
  { deep: true }
)

onMounted(() => {
  props.danmus.forEach((danmu) => {
    addDanmu(danmu)
  })
})

onUnmounted(() => {
  processedIds.value.clear()
  activeDanmus.value = []
})
</script>

<style scoped>
.danmu-layer {
  background: transparent;
}

.danmu-item {
  font-size: 14px;
  will-change: transform;
  transform: translateZ(0);
}

@keyframes danmu-fly {
  0% {
    right: -100%;
    opacity: 0;
  }
  5% {
    opacity: 1;
  }
  95% {
    opacity: 1;
  }
  100% {
    right: 110%;
    opacity: 0;
  }
}
</style>
