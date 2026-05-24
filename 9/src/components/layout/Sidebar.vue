<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ChevronLeft,
  ChevronRight,
  Home,
  FileText,
  Users,
  Settings,
  Search,
  Bell,
  BarChart3,
  Folder,
  FolderOpen,
  BookOpen,
  Archive
} from 'lucide-vue-next'
import { useAppStore, type Department } from '@/stores/app'
import { cn } from '@/lib/utils'

const appStore = useAppStore()
const router = useRouter()
const route = useRoute()

const expandedDepts = ref<Set<string>>(new Set())
const activeMenu = ref('document')

const menuItems = [
  { id: 'dashboard', icon: Home, label: '首页', path: '/' },
  { id: 'document', icon: FileText, label: '文档管理', path: '/document' },
  { id: 'template', icon: BookOpen, label: '模板中心', path: '/template' },
  { id: 'approval', icon: BarChart3, label: '审批流程', path: '/approval' },
  { id: 'ranking', icon: BarChart3, label: '知识排行', path: '/ranking' },
  { id: 'recycle', icon: Archive, label: '回收站', path: '/recycle' },
  { id: 'user', icon: Users, label: '用户管理', path: '/user' },
  { id: 'setting', icon: Settings, label: '系统设置', path: '/setting' }
]

const departments: Department[] = [
  {
    id: '1',
    name: '技术部',
    parentId: '0',
    children: [
      { id: '1-1', name: '前端组', parentId: '1' },
      { id: '1-2', name: '后端组', parentId: '1' },
      { id: '1-3', name: '测试组', parentId: '1' }
    ]
  },
  {
    id: '2',
    name: '产品部',
    parentId: '0',
    children: [
      { id: '2-1', name: '产品设计组', parentId: '2' },
      { id: '2-2', name: 'UI设计组', parentId: '2' }
    ]
  },
  {
    id: '3',
    name: '运营部',
    parentId: '0',
    children: [
      { id: '3-1', name: '内容运营组', parentId: '3' },
      { id: '3-2', name: '用户运营组', parentId: '3' }
    ]
  }
]

const sidebarWidth = computed(() => appStore.sidebarCollapsed ? 'w-16' : 'w-64')

function toggleDept(deptId: string) {
  if (expandedDepts.value.has(deptId)) {
    expandedDepts.value.delete(deptId)
  } else {
    expandedDepts.value.add(deptId)
  }
}

function selectDepartment(dept: Department) {
  appStore.setCurrentDepartment(dept)
}

function navigateTo(item: typeof menuItems[0]) {
  activeMenu.value = item.id
  router.push(item.path)
}
</script>

<template>
  <aside
    :class="[
      'h-full bg-white border-r border-neutral-200 flex flex-col transition-all duration-300',
      sidebarWidth
    ]"
  >
    <div class="h-14 flex items-center justify-between px-4 border-b border-neutral-200">
      <div v-if="!appStore.sidebarCollapsed" class="flex items-center gap-2">
        <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
          <BookOpen class="w-5 h-5 text-white" />
        </div>
        <span class="font-semibold text-neutral-800">知识库</span>
      </div>
      <div v-else class="w-full flex justify-center">
        <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
          <BookOpen class="w-5 h-5 text-white" />
        </div>
      </div>
      <button
        v-if="!appStore.sidebarCollapsed"
        @click="appStore.toggleSidebar()"
        class="p-1 hover:bg-neutral-100 rounded transition-colors"
      >
        <ChevronLeft class="w-4 h-4 text-neutral-500" />
      </button>
    </div>

    <div v-if="!appStore.sidebarCollapsed" class="p-3">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          placeholder="搜索..."
          class="w-full pl-9 pr-3 py-2 bg-neutral-100 border border-transparent rounded-lg text-sm focus:outline-none focus:border-primary-300 focus:bg-white transition-colors"
        />
      </div>
    </div>

    <div v-if="!appStore.sidebarCollapsed" class="px-3 py-2">
      <h3 class="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">部门</h3>
      <div class="space-y-1">
        <div v-for="dept in departments" :key="dept.id">
          <div
            class="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-neutral-100 transition-colors"
            :class="{ 'bg-primary-50': appStore.currentDepartment?.id === dept.id }"
            @click="dept.children && dept.children.length > 0 ? toggleDept(dept.id) : selectDepartment(dept)"
          >
            <component
              :is="dept.children && dept.children.length > 0 ? (expandedDepts.has(dept.id) ? FolderOpen : Folder) : Folder"
              class="w-4 h-4 text-neutral-500"
            />
            <span class="text-sm text-neutral-700 flex-1">{{ dept.name }}</span>
            <ChevronRight
              v-if="dept.children && dept.children.length > 0"
              class="w-3 h-3 text-neutral-400 transition-transform"
              :class="{ 'rotate-90': expandedDepts.has(dept.id) }"
            />
          </div>
          <div
            v-if="dept.children && expandedDepts.has(dept.id)"
            class="ml-4 space-y-1 mt-1"
          >
            <div
              v-for="child in dept.children"
              :key="child.id"
              class="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-neutral-100 transition-colors"
              :class="{ 'bg-primary-50': appStore.currentDepartment?.id === child.id }"
              @click="selectDepartment(child)"
            >
              <Folder class="w-3.5 h-3.5 text-neutral-400" />
              <span class="text-sm text-neutral-600">{{ child.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="px-3 py-2 border-t border-neutral-100 mt-auto">
      <h3 v-if="!appStore.sidebarCollapsed" class="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">功能菜单</h3>
      <div class="space-y-1">
        <div
          v-for="item in menuItems"
          :key="item.id"
          class="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-neutral-100 transition-colors"
          :class="{
            'bg-primary-50 text-primary-600': route.path === item.path || activeMenu === item.id
          }"
          @click="navigateTo(item)"
        >
          <component
            :is="item.icon"
            class="w-5 h-5 flex-shrink-0"
            :class="route.path === item.path || activeMenu === item.id ? 'text-primary-500' : 'text-neutral-500'"
          />
          <span
            v-if="!appStore.sidebarCollapsed"
            class="text-sm"
            :class="route.path === item.path || activeMenu === item.id ? 'text-primary-600 font-medium' : 'text-neutral-700'"
          >
            {{ item.label }}
          </span>
          <span
            v-if="appStore.sidebarCollapsed && item.id === 'approval'"
            class="absolute left-14 bg-neutral-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
          >
            {{ item.label }}
          </span>
        </div>
      </div>
    </div>

    <button
      v-if="appStore.sidebarCollapsed"
      @click="appStore.toggleSidebar()"
      class="h-12 border-t border-neutral-200 flex items-center justify-center hover:bg-neutral-100 transition-colors"
    >
      <ChevronRight class="w-5 h-5 text-neutral-500" />
    </button>
  </aside>
</template>
