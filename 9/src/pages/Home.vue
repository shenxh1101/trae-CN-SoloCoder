<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus, FileText, Clock, Star, TrendingUp, Trophy, Eye, ThumbsUp, MessageSquare,
  ChevronRight, User, AlertCircle, Loader2
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { getRecentDocuments, getPopularDocuments, type Document } from '@/api/document'

const router = useRouter()
const userStore = useUserStore()

const recentDocuments = ref<Document[]>([])
const hotDocuments = ref<Document[]>([])
const loading = ref(true)

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '凌晨好'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 22) return '晚上好'
  return '夜深了'
})

const quickActions = [
  { icon: Plus, label: '创建文档', color: 'bg-primary-500', route: '/documents/create' },
  { icon: FileText, label: '我的文档', color: 'bg-success-500', route: '/documents' },
  { icon: Clock, label: '待审批', color: 'bg-warning-500', route: '/approval/pending' },
  { icon: Star, label: '收藏夹', color: 'bg-amber-500', route: '/documents?filter=favorite' }
]

function getRankClass(rank: number): string {
  if (rank === 1) return 'bg-amber-500 text-white'
  if (rank === 2) return 'bg-neutral-400 text-white'
  if (rank === 3) return 'bg-orange-500 text-white'
  return 'bg-neutral-100 text-neutral-600'
}

function navigateTo(route: string) {
  router.push(route)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}天前`
  if (hours > 0) return `${hours}小时前`
  if (minutes > 0) return `${minutes}分钟前`
  return '刚刚'
}

function getStatusType(status: string): 'draft' | 'pending' | 'published' | 'rejected' {
  if (!status) return 'draft'
  const s = status.toLowerCase()
  if (s === 'approved') return 'published'
  return s as 'draft' | 'pending' | 'published' | 'rejected'
}

async function fetchData() {
  loading.value = true
  try {
    const [recentRes, popularRes] = await Promise.all([
      getRecentDocuments(0, 5),
      getPopularDocuments(0, 5)
    ])
    
    if (recentRes.code === 200) {
      recentDocuments.value = recentRes.data.content
    }
    
    if (popularRes.code === 200) {
      hotDocuments.value = popularRes.data.content
    }
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl p-6 text-white">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold mb-2">
            {{ greeting }}，{{ userStore.realName || '用户' }} 👋
          </h1>
          <p class="text-primary-100">今天是 {{ new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) }}</p>
        </div>
        <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
          <img v-if="userStore.avatar" :src="userStore.avatar" alt="avatar" class="w-full h-full object-cover" />
          <User v-else class="w-8 h-8" />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        v-for="action in quickActions"
        :key="action.label"
        @click="navigateTo(action.route)"
        class="bg-white rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all cursor-pointer group"
      >
        <div :class="[action.color, 'w-12 h-12 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform']">
          <component :is="action.icon" class="w-6 h-6 text-white" />
        </div>
        <div class="flex items-center justify-between">
          <span class="font-medium text-neutral-800">{{ action.label }}</span>
          <ChevronRight class="w-5 h-5 text-neutral-400 group-hover:text-primary-500 transition-colors" />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 bg-white rounded-xl shadow-card">
        <div class="flex items-center justify-between p-4 border-b border-neutral-100">
          <h2 class="font-semibold text-neutral-800">最近文档</h2>
          <button @click="navigateTo('/documents')" class="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            查看全部 <ChevronRight class="w-4 h-4" />
          </button>
        </div>
        
        <LoadingSpinner v-if="loading" class="py-12" />
        
        <div v-else-if="recentDocuments.length > 0">
          <table class="w-full">
            <thead class="bg-neutral-50">
              <tr>
                <th class="text-left py-3 px-4 text-sm font-medium text-neutral-500">文档标题</th>
                <th class="text-left py-3 px-4 text-sm font-medium text-neutral-500 hidden md:table-cell">创建人</th>
                <th class="text-left py-3 px-4 text-sm font-medium text-neutral-500">更新时间</th>
                <th class="text-left py-3 px-4 text-sm font-medium text-neutral-500 hidden sm:table-cell">状态</th>
                <th class="text-left py-3 px-4 text-sm font-medium text-neutral-500 hidden lg:table-cell">浏览量</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="doc in recentDocuments"
                :key="doc.id"
                @click="navigateTo(`/documents/${doc.id}`)"
                class="border-t border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors"
              >
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2">
                    <FileText class="w-4 h-4 text-neutral-400 flex-shrink-0" />
                    <span class="text-sm text-neutral-800 font-medium truncate max-w-xs">{{ doc.title }}</span>
                  </div>
                </td>
                <td class="py-3 px-4 text-sm text-neutral-600 hidden md:table-cell">{{ doc.creatorName || '-' }}</td>
                <td class="py-3 px-4 text-sm text-neutral-500">{{ formatRelativeTime(doc.updatedAt) }}</td>
                <td class="py-3 px-4 hidden sm:table-cell">
                  <StatusBadge :status="getStatusType(doc.status)" size="sm" />
                </td>
                <td class="py-3 px-4 text-sm text-neutral-500 hidden lg:table-cell">{{ doc.viewCount || 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState v-else type="no-data" title="暂无文档" description="还没有任何文档，创建一个开始吧" class="py-8">
          <template #action>
            <button @click="navigateTo('/documents/create')" class="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              创建文档
            </button>
          </template>
        </EmptyState>
      </div>

      <div class="bg-white rounded-xl shadow-card">
        <div class="flex items-center justify-between p-4 border-b border-neutral-100">
          <div class="flex items-center gap-2">
            <Trophy class="w-5 h-5 text-amber-500" />
            <h2 class="font-semibold text-neutral-800">热门文档</h2>
          </div>
          <button @click="navigateTo('/ranking')" class="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            排行榜 <ChevronRight class="w-4 h-4" />
          </button>
        </div>
        
        <LoadingSpinner v-if="loading" class="py-12" />
        
        <div v-else-if="hotDocuments.length > 0" class="p-4">
          <div
            v-for="(doc, index) in hotDocuments"
            :key="doc.id"
            @click="navigateTo(`/documents/${doc.id}`)"
            class="flex items-center gap-3 py-3 border-b border-neutral-50 last:border-0 hover:bg-neutral-50 -mx-4 px-4 cursor-pointer transition-colors"
          >
            <span :class="['w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', getRankClass(index + 1)]">
              {{ index + 1 }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-neutral-800 font-medium truncate">{{ doc.title }}</p>
              <div class="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                <span class="flex items-center gap-1">
                  <Eye class="w-3.5 h-3.5" /> {{ doc.viewCount || 0 }}
                </span>
                <span class="flex items-center gap-1">
                  <ThumbsUp class="w-3.5 h-3.5" /> {{ doc.likeCount || 0 }}
                </span>
              </div>
            </div>
            <TrendingUp v-if="index < 3" class="w-4 h-4 text-success-500 flex-shrink-0" />
          </div>
        </div>
        <EmptyState v-else type="no-data" title="暂无数据" description="热门文档排行榜稍后将更新" class="py-8" />
      </div>
    </div>
  </div>
</template>
