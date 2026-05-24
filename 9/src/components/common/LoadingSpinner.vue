<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullscreen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  fullscreen: false
})

const sizeClass = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10'
}

const textSizeClass = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base'
}
</script>

<template>
  <div
    v-if="fullscreen"
    class="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50"
  >
    <div class="flex flex-col items-center gap-3">
      <Loader2 :class="[sizeClass[size], 'text-primary-500 animate-spin']" />
      <p v-if="text" :class="[textSizeClass[size], 'text-neutral-600']">{{ text }}</p>
    </div>
  </div>

  <div v-else class="flex flex-col items-center justify-center py-8">
    <div class="flex flex-col items-center gap-3">
      <Loader2 :class="[sizeClass[size], 'text-primary-500 animate-spin']" />
      <p v-if="text" :class="[textSizeClass[size], 'text-neutral-600']">{{ text }}</p>
    </div>
  </div>
</template>
