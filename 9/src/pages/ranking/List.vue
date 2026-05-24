<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Trophy, Eye, ThumbsUp, MessageSquare, TrendingUp, FileText,
  User, Calendar, ChevronRight, Crown, Medal
} from 'lucide-vue-next'
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { getWeeklyRanking } from '@/api/ranking'
import type { WeeklyRankingItem } from '@/api/ranking'

const router = useRouter()

type PeriodType = 'week' | 'month'
const activePeriod = ref<PeriodType>('week')
const selectedCategory = ref('all')
const loading = ref(false)
const rankingItems = ref<WeeklyRankingItem[]>([])

const categories = [
  { value: 'all', label: '全部分类' },
  { value: 'policy', label: '政策制度' },
  { value: 'procedure', label: '流程规范' },
  { value: 'report', label: '报告总结' },
  { value: 'plan', label: '计划方案' }
]

const filteredItems = computed(() => {
  let result = rankingItems.value
  if (selectedCategory.value !== 'all') {
    result = result.filter(item => item.category === selectedCategory.value)
  }
  return result
})

function getRankClass(rank: number): string {
  if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white'
  if (rank === 2) return 'bg-gradient-to-r from-slate-400 to-slate-500 text-white'
  if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white'
  return 'bg-neutral-100 text-neutral-600'
}

function getRankIcon(rank: number) {
  if (rank === 1) return Crown
  if (rank <= 3) return Medal
  return null
}

function getScorePercentage(score: number): number {
  const maxScore = Math.max(...rankingItems.value.map(i => i.score), 100)
  return Math.round((score / maxScore) * 100)
}

function getScoreBarColor(rank: number): string {
  if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-500'
  if (rank === 2) return 'bg-gradient-to-r from-slate-400 to-slate-500'
  if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-700'
  return 'bg-gradient-to-r from-primary-400 to-primary-500'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function viewDocument(id: string) {
  router.push(`/document/${id}`)
}

async function fetchRanking() {
  loading.value = true
  try {
    const response = await getWeeklyRanking()
    if (response.code === 0) {
      rankingItems.value = response.data
    }
  } catch (error) {
    console.error('Failed to fetch ranking:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  rankingItems.value = [
    {
      documentId: '1', documentTitle: '2024年度公司战略规划报告', rank: 1, score: 98.5,
      viewCount: 1256, likeCount: 328, commentCount: 86,
      category: 'plan', creatorName: '战略规划部'
    },
    {
      documentId: '2', documentTitle: '员工手册V3.0版', rank: 2, score: 92.3,
      viewCount: 987, likeCount: 256, commentCount: 45,
      category: 'policy', creatorName: '人力资源部'
    },
    {
      documentId: '3', documentTitle: '项目审批流程规范', rank: 3, score: 88.7,
      viewCount: 756, likeCount: 189, commentCount: 38,
      category: 'procedure', creatorName: '项目管理部'
    },
    {
      documentId: '4', documentTitle: 'Q4季度工作总结报告', rank: 4, score: 85.2,
      viewCount: 634, likeCount: 145, commentCount: 28,
      category: 'report', creatorName: '各部门汇总'
    },
    {
      documentId: '5', documentTitle: '2024年财务预算方案', rank: 5, score: 82.1,
      viewCount: 567, likeCount: 134, commentCount: 24,
      category: 'plan', creatorName: '财务部'
    },
    {
      documentId: '6', documentTitle: '产品开发流程管理制度', rank: 6, score: 79.8,
      viewCount: 489, likeCount: 112, commentCount: 19,
      category: 'policy', creatorName: '产品部'
    },
    {
      documentId: '7', documentTitle: '市场推广计划方案', rank: 7, score: 76.5,
      viewCount: 423, likeCount: 98, commentCount: 15,
      category: 'plan', creatorName: '市场部'
    },
    {
      documentId: '8', documentTitle: '技术评审会议纪要模板', rank: 8, score: 73.2,
      viewCount: 378, likeCount: 87, commentCount: 12,
      category: 'report', creatorName: '技术部'
    }
  ]
})
</script>

<template>
  <div class="h-full flex flex-col bg-neutral-50">
    <div class="px-6 py-4 bg-white border-b border-neutral-200">
      <Breadcrumb />
    </div>

    <div class="bg-gradient-to-r from-primary-600 to-blue-600 px-6 py-8 text-white">
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
          <Trophy class="w-8 h-8" />
        </div>
        <div>
          <h1 class="text-2xl font-bold">热门排行榜</h1>
          <p class="text-white/80 mt-1">根据浏览、点赞、评论等多维度综合计算</p>
        </div>
      </div>
    </div>

    <div class="bg-white border-b border-neutral-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button
            @click="activePeriod = 'week'; fetchRanking()"
            :class="[
              'px-6 py-2.5 text-sm font-medium rounded-lg transition-all',
              activePeriod === 'week'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                : 'text-neutral-600 hover:bg-neutral-100'
            ]"
          >
            周排行榜
          </button>
          <button
            @click="activePeriod = 'month'; fetchRanking()"
            :class="[
              'px-6 py-2.5 text-sm font-medium rounded-lg transition-all',
              activePeriod === 'month'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                : 'text-neutral-600 hover:bg-neutral-100'
            ]"
          >
            月排行榜
          </button>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-neutral-500">分类筛选：</span>
          <select
            v-model="selectedCategory"
            @change="fetchRanking()"
            class="px-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 bg-white"
          >
            <option v-for="cat in categories" :key="cat.value" :value="cat.value">
              {{ cat.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="filteredItems.length > 0" class="space-y-3">
        <div
          v-for="(item, index) in filteredItems"
          :key="item.documentId"
          class="bg-white rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all cursor-pointer group"
          @click="viewDocument(item.documentId)"
        >
          <div class="flex items-start gap-5">
            <div class="flex-shrink-0">
              <div
                :class="[
                  'w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg',
                  getRankClass(item.rank)
                ]"
              >
                <Crown v-if="item.rank === 1" class="w-6 h-6" />
                <Medal v-else-if="item.rank <= 3" class="w-6 h-6" />
                <span v-else>{{ item.rank }}</span>
              </div>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <h3 class="text-lg font-semibold text-neutral-800 group-hover:text-primary-600 transition-colors">
                    {{ item.documentTitle }}
                  </h3>
                  <span class="px-2.5 py-1 bg-primary-50 text-primary-600 text-xs font-medium rounded-full">
                    {{ categories.find(c => c.value === item.category)?.label }}
                  </span>
                </div>
                <div class="flex items-center gap-2 text-2xl font-bold text-primary-600">
                  <TrendingUp class="w-6 h-6" />
                  {{ item.score }}
                  <span class="text-sm font-normal text-neutral-400">分</span>
                </div>
              </div>

              <div class="mb-4">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs text-neutral-500">综合得分</span>
                  <span class="text-xs font-medium text-primary-600">{{ getScorePercentage(item.score) }}%</span>
                </div>
                <div class="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    :class="['h-full rounded-full transition-all duration-500', getScoreBarColor(item.rank)]"
                    :style="{ width: getScorePercentage(item.score) + '%' }"
                  />
                </div>
              </div>

              <div class="flex items-center gap-8">
                <div class="flex items-center gap-1.5 text-sm text-neutral-500">
                  <Eye class="w-4 h-4 text-neutral-400" />
                  浏览 <span class="font-medium text-neutral-700">{{ item.viewCount }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-sm text-neutral-500">
                  <ThumbsUp class="w-4 h-4 text-neutral-400" />
                  点赞 <span class="font-medium text-neutral-700">{{ item.likeCount }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-sm text-neutral-500">
                  <MessageSquare class="w-4 h-4 text-neutral-400" />
                  评论 <span class="font-medium text-neutral-700">{{ item.commentCount }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-sm text-neutral-500">
                  <User class="w-4 h-4 text-neutral-400" />
                  {{ item.creatorName }}
                </div>
              </div>
            </div>

            <div class="flex-shrink-0 flex items-center">
              <ChevronRight class="w-5 h-5 text-neutral-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </div>
      </div>

      <EmptyState v-else type="no-result" title="暂无排行数据" description="选择其他分类或时间段查看" />
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
