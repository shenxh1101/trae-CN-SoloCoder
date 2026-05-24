<template>
  <div class="online-users glass-card p-5">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <div
          class="w-2 h-2 rounded-full bg-green-500"
          style="animation: online-pulse 2s ease-in-out infinite"
        ></div>
        <span class="text-white font-semibold">在线用户</span>
        <span class="text-neon-cyan font-bold">({{ users.length }})</span>
      </div>
    </div>

    <div class="flex flex-wrap gap-3">
      <div
        v-for="user in displayUsers"
        :key="user.id"
        class="user-avatar-group relative group"
      >
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm relative overflow-hidden"
          :class="[
            user.role === 'host'
              ? 'bg-gradient-to-br from-neon-pink to-neon-cyan'
              : 'bg-gradient-to-br from-neon-indigo to-white/20',
          ]"
          :style="{
            boxShadow:
              user.role === 'host'
                ? '0 0 10px rgba(255, 0, 255, 0.5), 0 0 20px rgba(0, 212, 255, 0.3)'
                : 'none',
          }"
        >
          <span class="z-10">{{ getInitial(user.name) }}</span>
          <div
            class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"
          ></div>
        </div>

        <div
          v-if="user.role === 'host'"
          class="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-xs"
          title="主持人"
        >
          <svg
            class="w-3 h-3 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        </div>

        <div
          v-if="user.hasVoted"
          class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"
          title="已投票"
        >
          <svg
            class="w-2.5 h-2.5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <div
          class="user-tooltip absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 backdrop-blur-sm rounded-lg text-sm whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50"
        >
          <div class="font-semibold text-white">{{ user.name }}</div>
          <div class="text-xs text-white/60">
            {{ user.role === 'host' ? '主持人' : user.hasVoted ? '已投票' : '投票者' }}
          </div>
          <div
            class="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"
          ></div>
        </div>
      </div>

      <div
        v-if="users.length > maxDisplay"
        class="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm font-semibold text-white/70"
      >
        +{{ users.length - maxDisplay }}
      </div>
    </div>

    <div
      v-if="users.length === 0"
      class="text-center py-4 text-white/40 text-sm"
    >
      暂无在线用户
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { User } from '../../shared/types'

const props = withDefaults(
  defineProps<{
    users: User[]
    maxDisplay?: number
  }>(),
  {
    maxDisplay: 8,
  }
)

const sortedUsers = computed(() => {
  return [...props.users].sort((a, b) => {
    if (a.role === 'host' && b.role !== 'host') return -1
    if (b.role === 'host' && a.role !== 'host') return 1
    if (a.hasVoted && !b.hasVoted) return -1
    if (b.hasVoted && !a.hasVoted) return 1
    return 0
  })
})

const displayUsers = computed(() => {
  return sortedUsers.value.slice(0, props.maxDisplay)
})

const getInitial = (name: string) => {
  return name.charAt(0).toUpperCase()
}
</script>

<style scoped>
.online-users {
  position: relative;
}

.user-avatar-group {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.user-avatar-group:hover {
  transform: translateY(-2px);
}

.user-avatar-group .w-10 {
  transition: all 0.3s ease;
}

.user-avatar-group:hover .w-10 {
  transform: scale(1.1);
}

@keyframes online-pulse {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
  }
  50% {
    opacity: 0.8;
    box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
  }
}
</style>
