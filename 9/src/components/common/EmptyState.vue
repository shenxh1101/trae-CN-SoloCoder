<script setup lang="ts">
import { Inbox, FileText, Search, FolderOpen, AlertCircle } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

type EmptyType = 'default' | 'no-data' | 'no-result' | 'no-folder' | 'error'

interface Props {
  type?: EmptyType
  title?: string
  description?: string
  icon?: any
  showAction?: boolean
  actionText?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  showAction: false,
  actionText: '去创建'
})

const emit = defineEmits<{
  action: []
}>()

const typeConfig: Record<EmptyType, { icon: any; title: string; description: string }> = {
  default: {
    icon: Inbox,
    title: '暂无数据',
    description: '这里还没有内容，快来添加吧'
  },
  'no-data': {
    icon: FileText,
    title: '暂无文档',
    description: '还没有任何文档，点击下方按钮创建第一篇文档'
  },
  'no-result': {
    icon: Search,
    title: '未找到相关内容',
    description: '请尝试更换关键词或筛选条件'
  },
  'no-folder': {
    icon: FolderOpen,
    title: '暂无文件夹',
    description: '还没有创建任何文件夹，点击下方按钮创建'
  },
  error: {
    icon: AlertCircle,
    title: '加载失败',
    description: '数据加载失败，请稍后重试'
  }
}

const displayIcon = () => props.icon || typeConfig[props.type].icon
const displayTitle = () => props.title || typeConfig[props.type].title
const displayDescription = () => props.description || typeConfig[props.type].description

function handleAction() {
  emit('action')
}
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div
      :class="[
        'w-20 h-20 rounded-full flex items-center justify-center mb-4',
        type === 'error' ? 'bg-danger-50' : 'bg-neutral-100'
      ]"
    >
      <component
        :is="displayIcon()"
        :class="[
          'w-10 h-10',
          type === 'error' ? 'text-danger-500' : 'text-neutral-400'
        ]"
      />
    </div>

    <h3 class="text-lg font-medium text-neutral-800 mb-2">
      {{ displayTitle() }}
    </h3>
    <p class="text-sm text-neutral-500 max-w-sm mb-6">
      {{ displayDescription() }}
    </p>

    <button
      v-if="showAction"
      @click="handleAction()"
      :class="[
        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        type === 'error'
          ? 'bg-danger-500 text-white hover:bg-danger-600'
          : 'bg-primary-500 text-white hover:bg-primary-600'
      ]"
    >
      {{ actionText }}
    </button>
  </div>
</template>
