<template>
  <div
    class="vote-option-card relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300"
    :class="[
      isSelected ? 'ring-2 ring-neon-cyan shadow-neon-cyan' : '',
      disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/10',
    ]"
    @click="handleClick"
  >
    <div class="glass-card p-5 relative z-10">
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-3 flex-1">
          <div
            class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300"
            :class="[
              isSelected
                ? 'border-neon-cyan bg-neon-cyan/20'
                : 'border-white/30 bg-white/5',
            ]"
          >
            <div
              v-if="isSelected"
              class="w-3 h-3 rounded-full bg-neon-cyan"
            ></div>
          </div>
          <span class="text-white font-medium text-lg flex-1">{{
            option.text
          }}</span>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-right">
            <span
              class="text-2xl font-bold neon-text-cyan font-mono counter"
              :data-value="option.votes"
            >
              {{ displayVotes }}
            </span>
            <span class="text-white/60 text-sm ml-1">票</span>
          </div>
          <div class="text-right min-w-[60px]">
            <span class="text-xl font-bold text-neon-pink font-mono">
              {{ percentage.toFixed(1) }}%
            </span>
          </div>
        </div>
      </div>

      <div class="progress-bar-container h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          class="progress-bar h-full rounded-full transition-all duration-700 ease-out relative"
          :style="{ width: animatedWidth }"
        >
          <div
            class="absolute inset-0 bg-gradient-to-r from-neon-cyan to-neon-pink animate-gradient"
          ></div>
          <div
            class="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-60"
            :style="{ animation: 'shimmer 2s ease-in-out infinite' }"
          ></div>
        </div>
      </div>
    </div>

    <div
      v-if="isSelected"
      class="selected-glow absolute inset-0 pointer-events-none"
    >
      <div
        class="absolute inset-0 rounded-xl"
        :style="{
          animation: 'neon-pulse 1.5s ease-in-out infinite',
          boxShadow: '0 0 20px rgba(0, 212, 255, 0.5), inset 0 0 20px rgba(0, 212, 255, 0.1)',
        }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { Option } from '../../shared/types'

const props = defineProps<{
  option: Option
  totalVotes: number
  isSelected: boolean
  disabled: boolean
  isMultiple: boolean
}>()

const emit = defineEmits<{
  select: [optionId: string]
}>()

const displayVotes = ref(0)
const animatedWidth = ref('0%')
let animationFrame: number | null = null

const percentage = computed(() => {
  if (props.totalVotes === 0) return 0
  return (props.option.votes / props.totalVotes) * 100
})

const animateNumber = (from: number, to: number, duration: number = 500) => {
  const startTime = performance.now()

  const update = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easeProgress = 1 - Math.pow(1 - progress, 3)
    displayVotes.value = Math.round(from + (to - from) * easeProgress)

    if (progress < 1) {
      animationFrame = requestAnimationFrame(update)
    }
  }

  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
  animationFrame = requestAnimationFrame(update)
}

const handleClick = () => {
  if (!props.disabled) {
    emit('select', props.option.id)
  }
}

watch(
  () => props.option.votes,
  (newVal, oldVal) => {
    animateNumber(oldVal ?? 0, newVal)
  }
)

watch(
  () => percentage.value,
  (newVal) => {
    requestAnimationFrame(() => {
      animatedWidth.value = `${newVal}%`
    })
  }
)

onMounted(() => {
  displayVotes.value = 0
  animatedWidth.value = '0%'
  requestAnimationFrame(() => {
    animateNumber(0, props.option.votes)
    animatedWidth.value = `${percentage.value}%`
  })
})
</script>

<style scoped>
.vote-option-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.vote-option-card:hover:not(.opacity-60) {
  border-color: rgba(0, 212, 255, 0.3);
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(300%);
  }
}

@keyframes neon-pulse {
  0%,
  100% {
    opacity: 0.5;
    box-shadow: 0 0 15px rgba(0, 212, 255, 0.4),
      inset 0 0 15px rgba(0, 212, 255, 0.1);
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 30px rgba(0, 212, 255, 0.6),
      0 0 60px rgba(0, 212, 255, 0.3),
      inset 0 0 20px rgba(0, 212, 255, 0.15);
  }
}

.progress-bar-container {
  position: relative;
}

.progress-bar {
  position: relative;
  overflow: hidden;
}
</style>
