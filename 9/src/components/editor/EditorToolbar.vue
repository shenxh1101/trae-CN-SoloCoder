<template>
  <div class="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
    <template v-for="group in toolbarGroups" :key="group.name">
      <div class="flex items-center gap-0.5">
        <button
          v-for="item in group.items"
          :key="item.action"
          @click="handleAction(item.action, item.value)"
          :class="[
            'p-2 rounded transition-colors',
            item.isActive
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-600 hover:bg-gray-200',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          ]"
          :title="item.title"
          :disabled="disabled"
        >
          <component :is="item.icon" :size="16" />
        </button>
      </div>
      <div v-if="group.name !== toolbarGroups[toolbarGroups.length - 1]?.name" class="w-px h-6 bg-gray-300 mx-1" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Table,
  Image,
  Link,
  Undo,
  Redo
} from 'lucide-vue-next'

interface ToolbarItem {
  action: string
  icon: any
  title: string
  value?: any
  isActive?: boolean
}

interface ToolbarGroup {
  name: string
  items: ToolbarItem[]
}

interface Props {
  editor?: any
  activeStates?: Record<string, boolean>
  disabled?: boolean
  includeGroups?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  activeStates: () => ({}),
  disabled: false
})

const emit = defineEmits<{
  (e: 'action', action: string, value?: any): void
}>()

const defaultToolbarGroups: ToolbarGroup[] = [
  {
    name: 'history',
    items: [
      { action: 'undo', icon: Undo, title: '撤销' },
      { action: 'redo', icon: Redo, title: '重做' }
    ]
  },
  {
    name: 'format',
    items: [
      { action: 'bold', icon: Bold, title: '加粗' },
      { action: 'italic', icon: Italic, title: '斜体' },
      { action: 'underline', icon: Underline, title: '下划线' },
      { action: 'strike', icon: Strikethrough, title: '删除线' }
    ]
  },
  {
    name: 'heading',
    items: [
      { action: 'heading', icon: Heading1, title: '标题1', value: 1 },
      { action: 'heading', icon: Heading2, title: '标题2', value: 2 },
      { action: 'heading', icon: Heading3, title: '标题3', value: 3 }
    ]
  },
  {
    name: 'list',
    items: [
      { action: 'bulletList', icon: List, title: '无序列表' },
      { action: 'orderedList', icon: ListOrdered, title: '有序列表' }
    ]
  },
  {
    name: 'block',
    items: [
      { action: 'blockquote', icon: Quote, title: '引用' },
      { action: 'codeBlock', icon: Code, title: '代码块' }
    ]
  },
  {
    name: 'insert',
    items: [
      { action: 'table', icon: Table, title: '表格' },
      { action: 'image', icon: Image, title: '图片' },
      { action: 'link', icon: Link, title: '链接' }
    ]
  }
]

const toolbarGroups = computed(() => {
  let groups = defaultToolbarGroups
  if (props.includeGroups?.length) {
    groups = defaultToolbarGroups.filter(g => props.includeGroups!.includes(g.name))
  }
  return groups.map(group => ({
    ...group,
    items: group.items.map(item => ({
      ...item,
      isActive: props.activeStates?.[item.action] ?? 
        (props.editor?.isActive?.(item.action, item.value) ?? false)
    }))
  }))
})

const handleAction = (action: string, value?: any) => {
  if (props.disabled) return
  emit('action', action, value)
}
</script>
