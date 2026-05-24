<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PieChart,
  BarChart3,
  Download,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Users,
  Clock,
  ListChecks,
  User as UserIcon,
  Calendar,
} from 'lucide-vue-next'
import ResultChart from '../components/ResultChart.vue'
import { getResults } from '../utils/api'
import { useFingerprint } from '../composables/useFingerprint'
import type { Option, VoteRecord } from '../../shared/types'

const route = useRoute()
const router = useRouter()
const roomId = route.params.id as string

const { getVisitorId } = useFingerprint()

const isLoading = ref(true)
const error = ref('')
const chartType = ref<'pie' | 'bar'>('pie')
const options = ref<Option[]>([])
const totalVotes = ref(0)
const voteRecords = ref<Array<Omit<VoteRecord, 'ip' | 'fingerprint'>>>([])
const roomTitle = ref('')
const isHost = ref(false)
const isAnonymous = ref(true)
const createdAt = ref(0)
const endedAt = ref(0)
const creatorId = ref('')

const sortedOptions = computed(() => {
  return [...options.value].sort((a, b) => b.votes - a.votes)
})

const winner = computed(() => {
  if (options.value.length === 0) return null
  return sortedOptions.value[0]
})

onMounted(async () => {
  try {
    isLoading.value = true
    error.value = ''

    const fp = await getVisitorId()
    const userId = `user_${fp.slice(0, 16)}`

    const response = await getResults(roomId, userId)
    if (!response.success || !response.data) {
      error.value = response.error || '获取结果失败'
      return
    }

    options.value = response.data.options
    totalVotes.value = response.data.totalVotes
    voteRecords.value = response.data.voteRecords || []

    const roomInfo = await fetch(`/api/rooms/${roomId}`)
    const roomData = await roomInfo.json()
    if (roomData.success && roomData.data) {
      roomTitle.value = roomData.data.title
      isAnonymous.value = roomData.data.isAnonymous
      createdAt.value = roomData.data.createdAt
      endedAt.value = roomData.data.endedAt || Date.now()
      creatorId.value = roomData.data.creatorId
      isHost.value = roomData.data.creatorId === userId
    }
  } catch (err) {
    console.error('Get results error:', err)
    error.value = '加载失败，请刷新页面重试'
  } finally {
    isLoading.value = false
  }
})

function getPercentage(votes: number) {
  if (totalVotes.value === 0) return 0
  return ((votes / totalVotes.value) * 100).toFixed(1)
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(start: number, end: number) {
  const diff = end - start
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours > 0) {
    return `${hours}小时${remainingMinutes}分钟`
  }
  return `${minutes}分钟`
}

function exportResults() {
  const exportData = {
    roomId,
    title: roomTitle.value,
    totalVotes: totalVotes.value,
    createdAt: formatDate(createdAt.value),
    endedAt: formatDate(endedAt.value),
    duration: formatDuration(createdAt.value, endedAt.value),
    isAnonymous: isAnonymous.value,
    results: sortedOptions.value.map((opt, index) => ({
      rank: index + 1,
      option: opt.text,
      votes: opt.votes,
      percentage: `${getPercentage(opt.votes)}%`,
    })),
    voteRecords: !isAnonymous.value && isHost.value ? voteRecords.value : undefined,
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vote-results-${roomId}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function goBack() {
  router.push('/')
}

function getOptionText(optionIds: string[]) {
  return optionIds
    .map(id => options.value.find(o => o.id === id)?.text || '未知选项')
    .join(', ')
}
</script>

<template>
  <div class="min-h-screen py-8 px-4 relative overflow-hidden">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl animate-pulse-neon"></div>
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-pink/10 rounded-full blur-3xl animate-pulse-neon" style="animation-delay: 1s;"></div>
    </div>

    <div class="relative z-10 max-w-5xl mx-auto">
      <button
        @click="goBack"
        class="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft class="w-5 h-5 transition-transform group-hover:-translate-x-1" />
        <span>返回首页</span>
      </button>

      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <div class="text-center">
          <Loader2 class="w-12 h-12 text-neon-cyan animate-spin mx-auto mb-4" />
          <p class="text-white/70">加载结果中...</p>
        </div>
      </div>

      <div v-else-if="error" class="glass-card neon-border-both p-8 text-center max-w-md mx-auto">
        <AlertCircle class="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 class="text-2xl font-bold text-white mb-2">出错了</h2>
        <p class="text-white/70 mb-6">{{ error }}</p>
        <button @click="goBack" class="neon-btn-cyan">
          返回首页
        </button>
      </div>

      <div v-else class="space-y-6">
        <div class="glass-card neon-border-both p-6 md:p-8 text-center">
          <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-neon-cyan to-neon-pink flex items-center justify-center animate-float">
            <CheckCircle class="w-10 h-10 text-white" />
          </div>
          <h1 class="font-orbitron text-2xl md:text-3xl font-bold mb-2">
            <span class="bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan to-neon-pink">
              {{ roomTitle }}
            </span>
          </h1>
          <p class="text-white/50">投票结果报告</p>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div class="glass-card p-4">
              <Users class="w-5 h-5 text-neon-cyan mx-auto mb-2" />
              <div class="text-2xl font-bold text-neon-cyan font-orbitron">{{ totalVotes }}</div>
              <div class="text-white/50 text-sm">总票数</div>
            </div>
            <div class="glass-card p-4">
              <ListChecks class="w-5 h-5 text-neon-pink mx-auto mb-2" />
              <div class="text-2xl font-bold text-neon-pink font-orbitron">{{ options.length }}</div>
              <div class="text-white/50 text-sm">选项数</div>
            </div>
            <div class="glass-card p-4">
              <Calendar class="w-5 h-5 text-neon-cyan mx-auto mb-2" />
              <div class="text-2xl font-bold text-neon-cyan font-orbitron">
                {{ formatDuration(createdAt, endedAt) }}
              </div>
              <div class="text-white/50 text-sm">持续时间</div>
            </div>
            <div class="glass-card p-4">
              <Clock class="w-5 h-5 text-neon-pink mx-auto mb-2" />
              <div class="text-lg font-bold text-neon-pink font-orbitron truncate">
                {{ formatDate(endedAt) }}
              </div>
              <div class="text-white/50 text-sm">结束时间</div>
            </div>
          </div>

          <div v-if="winner" class="mt-8 glass-card p-6 border-neon-cyan/30">
            <p class="text-white/50 text-sm mb-2">🎉 获胜选项</p>
            <p class="text-2xl font-bold text-white">{{ winner.text }}</p>
            <p class="text-neon-cyan mt-2">
              <span class="text-3xl font-bold font-orbitron">{{ winner.votes }}</span>
              <span class="text-white/50 ml-1">票</span>
              <span class="text-white/50 ml-2">({{ getPercentage(winner.votes) }}%)</span>
            </p>
          </div>
        </div>

        <div class="glass-card p-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 class="text-xl font-bold text-white">结果图表</h2>
            <div class="flex items-center gap-2">
              <button
                @click="chartType = 'pie'"
                :class="[
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                  chartType === 'pie'
                    ? 'bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan'
                    : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'
                ]"
              >
                <PieChart class="w-4 h-4" />
                <span>饼图</span>
              </button>
              <button
                @click="chartType = 'bar'"
                :class="[
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                  chartType === 'bar'
                    ? 'bg-neon-pink/20 border border-neon-pink/50 text-neon-pink'
                    : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'
                ]"
              >
                <BarChart3 class="w-4 h-4" />
                <span>柱状图</span>
              </button>
            </div>
          </div>

          <div class="py-4">
            <ResultChart :options="options" :chart-type="chartType" />
          </div>
        </div>

        <div class="glass-card p-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 class="text-xl font-bold text-white">详细统计</h2>
            <button
              @click="exportResults"
              class="neon-btn-cyan flex items-center gap-2"
            >
              <Download class="w-4 h-4" />
              <span>导出结果</span>
            </button>
          </div>

          <div class="space-y-3">
            <div
              v-for="(option, index) in sortedOptions"
              :key="option.id"
              class="glass-card p-4 relative overflow-hidden"
            >
              <div
                class="absolute inset-y-0 left-0 bg-gradient-to-r from-neon-cyan/20 to-transparent transition-all duration-500"
                :style="{ width: `${getPercentage(option.votes)}%` }"
              ></div>
              <div class="relative z-10 flex items-center gap-4">
                <div
                  :class="[
                    'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                    index === 0 ? 'bg-gradient-to-r from-neon-cyan to-neon-pink text-white' : 'bg-white/10 text-white/70'
                  ]"
                >
                  {{ index + 1 }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-white font-medium truncate">{{ option.text }}</p>
                </div>
                <div class="text-right flex-shrink-0">
                  <p class="text-neon-cyan font-bold">
                    {{ option.votes }}
                    <span class="text-white/40 text-sm font-normal">票</span>
                  </p>
                  <p class="text-white/40 text-sm">{{ getPercentage(option.votes) }}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="!isAnonymous && isHost && voteRecords.length > 0"
          class="glass-card p-6"
        >
          <div class="flex items-center gap-2 mb-6">
            <UserIcon class="w-5 h-5 text-neon-pink" />
            <h2 class="text-xl font-bold text-white">投票记录</h2>
            <span class="text-white/40 text-sm ml-auto">共 {{ voteRecords.length }} 条记录</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-white/10">
                  <th class="text-left py-3 px-4 text-white/50 font-medium">投票者</th>
                  <th class="text-left py-3 px-4 text-white/50 font-medium">选择选项</th>
                  <th class="text-left py-3 px-4 text-white/50 font-medium">投票时间</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="record in voteRecords"
                  :key="record.id"
                  class="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      <div
                        :class="[
                          'w-2 h-2 rounded-full',
                          record.userId === creatorId ? 'bg-neon-pink' : 'bg-neon-cyan'
                        ]"
                      ></div>
                      <span class="text-white">{{ record.userName }}</span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-neon-cyan">{{ getOptionText(record.optionIds) }}</td>
                  <td class="py-3 px-4 text-white/50">{{ formatDate(record.timestamp) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
