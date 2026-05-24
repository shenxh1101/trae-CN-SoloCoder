<script setup lang="ts">
import { computed } from 'vue'
import { Lock } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'

interface Props {
  permission?: string | string[]
  role?: string | string[]
  fallback?: 'hide' | 'disabled' | 'placeholder'
  showPlaceholder?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  fallback: 'hide',
  showPlaceholder: false
})

const userStore = useUserStore()

const hasAccess = computed(() => {
  if (!props.permission && !props.role) {
    return true
  }

  if (props.permission) {
    if (!userStore.hasPermission(props.permission)) {
      return false
    }
  }

  if (props.role) {
    if (!userStore.hasRole(props.role)) {
      return false
    }
  }

  return true
})

const shouldRenderContent = computed(() => {
  return hasAccess.value || props.fallback === 'disabled'
})

const isDisabled = computed(() => {
  return !hasAccess.value && props.fallback === 'disabled'
})
</script>

<template>
  <div v-if="shouldRenderContent" :class="{ 'opacity-50 cursor-not-allowed': isDisabled }">
    <slot :disabled="isDisabled" :has-access="hasAccess" />
  </div>

  <div
    v-else-if="props.fallback === 'placeholder' || showPlaceholder"
    class="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-400 bg-neutral-50 rounded-lg"
  >
    <Lock class="w-4 h-4" />
    <span>无权限</span>
  </div>
</template>
