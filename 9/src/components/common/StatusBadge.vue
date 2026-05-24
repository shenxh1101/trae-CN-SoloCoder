<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

type StatusType = 'draft' | 'pending' | 'published' | 'rejected'

interface Props {
  status: StatusType
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

interface StatusConfig {
  label: string
  bgClass: string
  textClass: string
  dotClass: string
}

const statusConfig: Record<StatusType, StatusConfig> = {
  draft: {
    label: '草稿',
    bgClass: 'bg-neutral-100',
    textClass: 'text-neutral-600',
    dotClass: 'bg-neutral-400'
  },
  pending: {
    label: '待审批',
    bgClass: 'bg-warning-50',
    textClass: 'text-warning-600',
    dotClass: 'bg-warning-500'
  },
  published: {
    label: '已发布',
    bgClass: 'bg-success-50',
    textClass: 'text-success-600',
    dotClass: 'bg-success-500'
  },
  rejected: {
    label: '已驳回',
    bgClass: 'bg-danger-50',
    textClass: 'text-danger-600',
    dotClass: 'bg-danger-500'
  }
}

const config = computed(() => statusConfig[props.status])

const sizeClass = computed(() => ({
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm'
}[props.size]))

const dotSizeClass = computed(() => ({
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2'
}[props.size]))
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      config.bgClass,
      config.textClass,
      sizeClass
    ]"
  >
    <span :class="['rounded-full', dotSizeClass, config.dotClass]" />
    {{ config.label }}
  </span>
</template>
