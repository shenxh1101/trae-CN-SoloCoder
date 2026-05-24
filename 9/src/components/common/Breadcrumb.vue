<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Home, ChevronRight } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'

interface BreadcrumbItem {
  label: string
  path?: string
}

const appStore = useAppStore()
const route = useRoute()
const router = useRouter()

const routeBreadcrumbMap: Record<string, BreadcrumbItem[]> = {
  '/': [{ label: '首页', path: '/' }],
  '/document': [
    { label: '首页', path: '/' },
    { label: '文档管理' }
  ],
  '/template': [
    { label: '首页', path: '/' },
    { label: '模板中心' }
  ],
  '/approval': [
    { label: '首页', path: '/' },
    { label: '审批流程' }
  ],
  '/ranking': [
    { label: '首页', path: '/' },
    { label: '知识排行' }
  ],
  '/recycle': [
    { label: '首页', path: '/' },
    { label: '回收站' }
  ],
  '/user': [
    { label: '首页', path: '/' },
    { label: '用户管理' }
  ],
  '/setting': [
    { label: '首页', path: '/' },
    { label: '系统设置' }
  ]
}

const breadcrumbItems = computed(() => {
  if (appStore.breadcrumb.length > 0) {
    return appStore.breadcrumb.map((label, index, arr) => ({
      label,
      path: index < arr.length - 1 ? undefined : undefined
    }))
  }

  const path = route.path
  if (routeBreadcrumbMap[path]) {
    return routeBreadcrumbMap[path]
  }

  const segments = path.split('/').filter(Boolean)
  const items: BreadcrumbItem[] = [{ label: '首页', path: '/' }]

  segments.forEach((segment, index) => {
    const currentPath = '/' + segments.slice(0, index + 1).join('/')
    items.push({
      label: segment.charAt(0).toUpperCase() + segment.slice(1),
      path: index < segments.length - 1 ? currentPath : undefined
    })
  })

  return items
})

function navigateTo(path?: string) {
  if (path) {
    router.push(path)
  }
}
</script>

<template>
  <nav class="flex items-center gap-1 text-sm">
    <template v-for="(item, index) in breadcrumbItems" :key="index">
      <div
        v-if="index === 0 && item.path"
        class="flex items-center gap-1 cursor-pointer hover:text-primary-500 transition-colors text-neutral-500"
        @click="navigateTo(item.path)"
      >
        <Home class="w-3.5 h-3.5" />
        <span>{{ item.label }}</span>
      </div>
      <div
        v-else-if="item.path"
        class="flex items-center gap-1 cursor-pointer hover:text-primary-500 transition-colors text-neutral-500"
        @click="navigateTo(item.path)"
      >
        <ChevronRight class="w-3.5 h-3.5 text-neutral-300" />
        <span>{{ item.label }}</span>
      </div>
      <div v-else class="flex items-center gap-1 text-neutral-800 font-medium">
        <ChevronRight class="w-3.5 h-3.5 text-neutral-300" />
        <span>{{ item.label }}</span>
      </div>
    </template>
  </nav>
</template>
