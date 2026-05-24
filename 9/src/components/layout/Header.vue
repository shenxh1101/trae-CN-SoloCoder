<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Search, Bell, ChevronDown, Settings, LogOut, User, Moon, Sun } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { useTheme } from '@/composables/useTheme'

const appStore = useAppStore()
const userStore = useUserStore()
const { isDark, toggleTheme } = useTheme()

const searchQuery = ref('')
const showUserMenu = ref(false)
const showNotifications = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)
const notificationRef = ref<HTMLElement | null>(null)

const notifications = [
  { id: 1, title: '新文档待审批', time: '5分钟前', unread: true },
  { id: 2, title: '您的文档已发布', time: '1小时前', unread: true },
  { id: 3, title: '系统更新通知', time: '昨天', unread: false }
]

function handleClickOutside(event: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    showUserMenu.value = false
  }
  if (notificationRef.value && !notificationRef.value.contains(event.target as Node)) {
    showNotifications.value = false
  }
}

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value
  showNotifications.value = false
}

function toggleNotificationPanel() {
  showNotifications.value = !showNotifications.value
  showUserMenu.value = false
}

function handleLogout() {
  userStore.logout()
  showUserMenu.value = false
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <header class="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-4">
    <div class="flex items-center gap-4 flex-1">
      <div class="relative max-w-md w-full">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索文档、模板、用户..."
          class="w-full pl-10 pr-4 py-2 bg-neutral-100 border border-transparent rounded-lg text-sm focus:outline-none focus:border-primary-300 focus:bg-white transition-colors"
        />
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        @click="toggleTheme()"
        class="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
        :title="isDark ? '切换到亮色模式' : '切换到暗色模式'"
      >
        <component :is="isDark ? Sun : Moon" class="w-5 h-5 text-neutral-500" />
      </button>

      <div ref="notificationRef" class="relative">
        <button
          @click="toggleNotificationPanel()"
          class="p-2 hover:bg-neutral-100 rounded-lg transition-colors relative"
        >
          <Bell class="w-5 h-5 text-neutral-500" />
          <span
            v-if="notifications.filter(n => n.unread).length > 0"
            class="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full"
          />
        </button>

        <div
          v-if="showNotifications"
          class="absolute right-0 top-full mt-2 w-80 bg-white border border-neutral-200 rounded-lg shadow-card z-50 animate-fade-in"
        >
          <div class="p-3 border-b border-neutral-100">
            <h3 class="font-medium text-neutral-800">通知</h3>
          </div>
          <div class="max-h-80 overflow-y-auto">
            <div
              v-for="notification in notifications"
              :key="notification.id"
              class="p-3 border-b border-neutral-50 hover:bg-neutral-50 cursor-pointer transition-colors"
              :class="{ 'bg-primary-50/50': notification.unread }"
            >
              <div class="flex items-start gap-3">
                <div
                  v-if="notification.unread"
                  class="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"
                />
                <div v-else class="w-2 h-2 mt-2 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-neutral-800">{{ notification.title }}</p>
                  <p class="text-xs text-neutral-400 mt-1">{{ notification.time }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="p-2 border-t border-neutral-100">
            <button class="w-full text-sm text-primary-500 hover:text-primary-600 py-1">
            查看全部通知
            </button>
          </div>
        </div>
      </div>

      <div ref="userMenuRef" class="relative">
        <button
          @click="toggleUserMenu()"
          class="flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <User class="w-4 h-4 text-primary-600" />
          </div>
          <div class="text-left hidden sm:block">
            <p class="text-sm font-medium text-neutral-800">
              {{ userStore.userInfo?.realName || '用户' }}
            </p>
            <p class="text-xs text-neutral-500">
              {{ userStore.userInfo?.departmentName || '' }}
            </p>
          </div>
          <ChevronDown class="w-4 h-4 text-neutral-400" />
        </button>

        <div
          v-if="showUserMenu"
          class="absolute right-0 top-full mt-2 w-56 bg-white border border-neutral-200 rounded-lg shadow-card z-50 animate-fade-in"
        >
          <div class="p-4 border-b border-neutral-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <User class="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p class="font-medium text-neutral-800">
                  {{ userStore.userInfo?.realName || '用户' }}
                </p>
                <p class="text-sm text-neutral-500">
                  {{ userStore.userInfo?.email || '' }}
                </p>
              </div>
            </div>
          </div>
          <div class="p-2">
            <button
              class="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
            >
              <User class="w-4 h-4" />
              个人中心
            </button>
            <button
              class="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
            >
              <Settings class="w-4 h-4" />
              系统设置
            </button>
          </div>
          <div class="p-2 border-t border-neutral-100">
            <button
              @click="handleLogout()"
              class="w-full flex items-center gap-3 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 rounded-md transition-colors"
            >
              <LogOut class="w-4 h-4" />
              退出登录
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
