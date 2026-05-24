<template>
  <div class="room-control-panel glass-card p-6">
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
        <div
          class="status-indicator w-4 h-4 rounded-full"
          :class="statusConfig.class"
          :style="{ animation: statusConfig.animation }"
        ></div>
        <span class="text-lg font-semibold" :class="statusConfig.textClass">
          {{ statusConfig.text }}
        </span>
      </div>

      <div v-if="room.status !== 'waiting'" class="flex items-center gap-2">
        <svg class="w-5 h-5 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="font-mono text-2xl font-bold" :class="countdownClass">
          {{ formattedTime }}
        </span>
      </div>
    </div>

    <div class="h-1 bg-white/10 rounded-full overflow-hidden">
      <div
        v-if="room.status !== 'waiting'"
        class="h-full rounded-full transition-all duration-1000 ease-linear"
        :class="statusConfig.progressClass"
        :style="{ width: progressPercentage + '%' }"
      ></div>
    </div>

    <div v-if="isHost" class="control-buttons flex flex-wrap gap-3 mt-2">
        <button
          v-if="room.status === 'waiting'"
          class="neon-btn-cyan flex-1 min-w-[120px] flex items-center justify-center gap-2"
          @click="emit('control', 'start')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          开始投票
        </button>

        <button
          v-if="room.status === 'voting'"
          class="neon-btn-pink flex-1 min-w-[120px] flex items-center justify-center gap-2"
          @click="emit('control', 'pause')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          暂停
        </button>

        <button
          v-if="room.status === 'paused'"
          class="neon-btn-cyan flex-1 min-w-[120px] flex items-center justify-center gap-2"
          @click="emit('control', 'resume')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          恢复
        </button>

        <button
          v-if="room.status === 'voting' || room.status === 'paused'"
          class="neon-btn-pink flex-1 min-w-[120px] flex items-center justify-center gap-2"
          @click="emit('control', 'end')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          结束投票
        </button>

        <div
          v-if="room.status === 'ended'"
          class="flex-1 text-center py-3 px-4 bg-neon-pink/10 border border-neon-pink/30 rounded-lg text-neon-pink font-semibold"
        >
          投票已结束
        </div>
      </div>

      <div v-if="!isHost && room.status === 'waiting'" class="text-center text-white/50 py-2">
        等待主持人开始投票...
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Room } from '../../shared/types'

const props = defineProps<{
  room: Room
  isHost: boolean
}>()

const emit = defineEmits<{
  control: [action: 'start' | 'pause' | 'resume' | 'end']
}>()

const now = ref(Date.now())
let timer: number | null = null

const statusConfig = computed(() => {
  const configs: Record<
    Room['status'],
    { text: string; class: string; textClass: string; animation: string; progressClass: string }
  > = {
    waiting: {
      text: '等待中',
      class: 'bg-gray-500',
      textClass: 'text-gray-400',
      animation: 'none',
      progressClass: 'bg-gray-500',
    },
    voting: {
      text: '投票中',
      class: 'bg-green-500',
      textClass: 'text-green-400',
      animation: 'status-pulse 1.5s ease-in-out infinite',
      progressClass: 'bg-gradient-to-r from-neon-cyan to-green-500',
    },
    paused: {
      text: '已暂停',
      class: 'bg-yellow-500',
      textClass: 'text-yellow-400',
      animation: 'status-pulse 2s ease-in-out infinite',
      progressClass: 'bg-yellow-500',
    },
    ended: {
      text: '已结束',
      class: 'bg-gray-500',
      textClass: 'text-gray-400',
      animation: 'none',
      progressClass: 'bg-gray-500',
    },
  }
  return configs[props.room.status]
})

const remainingTime = computed(() => {
  if (props.room.status === 'waiting' || props.room.status === 'ended') {
    return 0
  }
  const remaining = props.room.endTime - now.value
  return Math.max(0, remaining)
})

const progressPercentage = computed(() => {
  if (props.room.status === 'waiting' || !props.room.startedAt) return 0
  const totalDuration = props.room.endTime - props.room.startedAt
  if (totalDuration <= 0) return 0
  const elapsed = now.value - props.room.startedAt
  return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
})

const countdownClass = computed(() => {
  const minutes = Math.floor(remainingTime.value / 60000)
  if (remainingTime.value < 60000) {
    return 'text-red-500 animate-pulse'
  } else if (remainingTime.value < 300000) {
    return 'text-yellow-400'
  }
  return 'text-neon-cyan'
})

const formattedTime = computed(() => {
  const totalSeconds = Math.floor(remainingTime.value / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped>
.room-control-panel {
  position: relative;
}

.status-indicator {
  box-shadow: 0 0 10px currentColor;
}

@keyframes status-pulse {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 5px currentColor, 0 0 10px currentColor;
  }
  50% {
    opacity: 0.7;
    box-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor;
  }
}

.control-buttons button {
  transition: all 0.3s ease;
}

.control-buttons button:hover:not(:disabled) {
  transform: translateY(-2px);
}
</style>
