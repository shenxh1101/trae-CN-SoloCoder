<script setup lang="ts">
import { computed } from 'vue'
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import Watermark from '@/components/common/Watermark.vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { cn } from '@/lib/utils'

const appStore = useAppStore()
const userStore = useUserStore()

const mainContentClass = computed(() => {
  return cn(
    'flex-1 flex flex-col overflow-hidden transition-all duration-300',
    appStore.sidebarCollapsed ? 'ml-16' : 'ml-64'
  )
})

const watermarkText = computed(() => {
  return appStore.watermark.text || userStore.userInfo?.realName || ''
})
</script>

<template>
  <div class="h-screen w-screen flex overflow-hidden bg-neutral-50">
    <div class="fixed left-0 top-0 h-full z-40">
      <Sidebar />
    </div>

    <div :class="mainContentClass">
      <div class="fixed top-0 right-0 z-30" :class="appStore.sidebarCollapsed ? 'left-16' : 'left-64'">
        <Header />
      </div>

      <main class="flex-1 overflow-auto pt-14">
        <div class="p-4">
          <Breadcrumb />
        </div>

        <div class="p-4 pt-0">
          <slot />
        </div>
      </main>
    </div>

    <Watermark
      v-if="appStore.watermark.enabled && watermarkText"
      :text="watermarkText"
      :enabled="appStore.watermark.enabled"
    />
  </div>
</template>
