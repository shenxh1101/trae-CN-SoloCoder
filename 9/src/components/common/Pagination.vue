<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

interface Props {
  currentPage: number
  pageSize: number
  total: number
  pageSizeOptions?: number[]
  showPageSize?: boolean
  showTotal?: boolean
  showQuickJump?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pageSizeOptions: () => [10, 20, 50, 100],
  showPageSize: true,
  showTotal: true,
  showQuickJump: false
})

const emit = defineEmits<{
  'update:currentPage': [page: number]
  'update:pageSize': [size: number]
  'change': [page: number, pageSize: number]
}>()

const totalPages = computed(() => Math.ceil(props.total / props.pageSize))

const displayPages = computed(() => {
  const pages: (number | string)[] = []
  const current = props.currentPage
  const total = totalPages.value

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    pages.push(1)
    if (current > 4) {
      pages.push('...')
    }
    const start = Math.max(2, current - 2)
    const end = Math.min(total - 1, current + 2)
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    if (current < total - 3) {
      pages.push('...')
    }
    pages.push(total)
  }

  return pages
})

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value || page === props.currentPage) return
  emit('update:currentPage', page)
  emit('change', page, props.pageSize)
}

function changePageSize(size: number) {
  emit('update:pageSize', size)
  emit('update:currentPage', 1)
  emit('change', 1, size)
}

function handleQuickJump(input: string) {
  const page = parseInt(input, 10)
  if (!isNaN(page) && page >= 1 && page <= totalPages.value) {
    goToPage(page)
  }
}
</script>

<template>
  <div class="flex items-center justify-between gap-4 py-2">
    <div class="flex items-center gap-4">
      <span v-if="showTotal" class="text-sm text-neutral-500">
        共 {{ total }} 条记录
      </span>

      <div v-if="showPageSize" class="flex items-center gap-2">
        <span class="text-sm text-neutral-500">每页</span>
        <select
          :value="pageSize"
          @change="changePageSize(Number(($event.target as HTMLSelectElement).value))"
          class="px-2 py-1 text-sm border border-neutral-200 rounded-md bg-white focus:outline-none focus:border-primary-300 cursor-pointer"
        >
          <option v-for="size in pageSizeOptions" :key="size" :value="size">
            {{ size }}
          </option>
        </select>
        <span class="text-sm text-neutral-500">条</span>
      </div>
    </div>

    <div class="flex items-center gap-1">
      <button
        @click="goToPage(1)"
        :disabled="currentPage === 1"
        class="p-1.5 rounded-md border border-neutral-200 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronsLeft class="w-4 h-4 text-neutral-600" />
      </button>

      <button
        @click="goToPage(currentPage - 1)"
        :disabled="currentPage === 1"
        class="p-1.5 rounded-md border border-neutral-200 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft class="w-4 h-4 text-neutral-600" />
      </button>

      <template v-for="(page, index) in displayPages" :key="index">
        <button
          v-if="typeof page === 'number'"
          @click="goToPage(page)"
          :class="[
            'min-w-8 h-8 px-2 rounded-md text-sm font-medium transition-colors',
            page === currentPage
              ? 'bg-primary-500 text-white'
              : 'border border-neutral-200 hover:bg-neutral-100 text-neutral-700'
          ]"
        >
          {{ page }}
        </button>
        <span v-else class="px-1 text-neutral-400">{{ page }}</span>
      </template>

      <button
        @click="goToPage(currentPage + 1)"
        :disabled="currentPage === totalPages || totalPages === 0"
        class="p-1.5 rounded-md border border-neutral-200 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight class="w-4 h-4 text-neutral-600" />
      </button>

      <button
        @click="goToPage(totalPages)"
        :disabled="currentPage === totalPages || totalPages === 0"
        class="p-1.5 rounded-md border border-neutral-200 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronsRight class="w-4 h-4 text-neutral-600" />
      </button>

      <div v-if="showQuickJump" class="flex items-center gap-2 ml-2">
        <span class="text-sm text-neutral-500">跳至</span>
        <input
          type="number"
          min="1"
          :max="totalPages"
          @keyup.enter="handleQuickJump(($event.target as HTMLInputElement).value)"
          class="w-16 px-2 py-1 text-sm border border-neutral-200 rounded-md focus:outline-none focus:border-primary-300"
          placeholder="页码"
        />
        <span class="text-sm text-neutral-500">页</span>
      </div>
    </div>
  </div>
</template>
