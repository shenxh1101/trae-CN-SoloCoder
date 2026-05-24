<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Search, Filter, ChevronDown, SortAsc, Eye, ThumbsUp, Clock,
  User, FileText, Calendar, Building2, X
} from 'lucide-vue-next'
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import Pagination from '@/components/common/Pagination.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { usePagination } from '@/composables/usePagination'
import { search } from '@/api/search'
import type { SearchHit } from '@/api/search'
import { cn } from '@/lib/utils'

const router = useRouter()
const route = useRoute()

const keyword = ref(route.query.q as string || '')
const results = ref<SearchHit[]>([])
const loading = ref(false)
const showFilter = ref(false)
const sortBy = ref<string>('relevance')
const showSortDropdown = ref(false)

const filters = ref({
  department: '',
  type: '',
  dateRange: '',
  creatorId: ''
})

const { page, pageSize, total, goto, changePageSize, setTotal, getPaginationParams } = usePagination({ defaultPageSize: 10 })

const sortOptions = [
  { value: 'relevance', label: '相关度' },
  { value: 'latest', label: '最新发布' },
  { value: 'mostViewed', label: '最多浏览' },
  { value: 'mostLiked', label: '最多点赞' }
]

const departments = [
  { id: '1', name: '技术部' },
  { id: '2', name: '产品部' },
  { id: '3', name: '运营部' },
  { id: '4', name: '市场部' }
]

const types = [
  { value: 'policy', label: '政策制度' },
  { value: 'procedure', label: '流程规范' },
  { value: 'guideline', label: '指导手册' }
]

const dateRanges = [
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'quarter', label: '本季度' }
]

const currentSortLabel = computed(() => sortOptions.find(o => o.value === sortBy.value)?.label || '相关度')

function highlightKeyword(text: string, keyword: string): string {
  if (!keyword) return text
  const regex = new RegExp(`(${keyword})`, 'gi')
  return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 px-0.5 rounded">$1</mark>')
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function getStatusType(status: string): 'draft' | 'pending' | 'published' | 'rejected' {
  const s = status.toLowerCase()
  if (s === 'approved') return 'published'
  return s as 'draft' | 'pending' | 'published' | 'rejected'
}

function goToDetail(id: number) {
  router.push(`/document/${id}`)
}

function handleSearch() {
  router.push({ query: { ...route.query, q: keyword.value } })
  fetchResults()
}

function clearKeyword() {
  keyword.value = ''
  handleSearch()
}

async function fetchResults() {
  loading.value = true
  try {
    const params = {
      ...getPaginationParams(),
      keyword: keyword.value,
      ...filters.value
    }
    const response = await search(params as any)
    if (response.code === 200) {
      results.value = response.data.content
      setTotal(response.data.totalElements)
    }
  } catch (error) {
    console.error('Search failed:', error)
  } finally {
    loading.value = false
  }
}

function handlePageChange(newPage: number) {
  goto(newPage)
  fetchResults()
}

function handlePageSizeChange(size: number) {
  changePageSize(size)
  fetchResults()
}

watch(() => route.query.q, (newQ) => {
  keyword.value = newQ as string || ''
  fetchResults()
})

onMounted(() => {
  results.value = [
    {
      id: 1, title: '2024年度产品规划报告', summary: '本年度产品发展方向和重点功能规划，包含产品路线图、目标用户分析、市场竞争分析等内容...',
      content: '',
      departmentId: 2, departmentName: '产品部',
      categoryId: 1, categoryName: '产品文档',
      creatorId: 1, creatorName: '张三',
      status: 'APPROVED',
      viewCount: 156, likeCount: 23, commentCount: 5,
      tags: '规划,产品,2024',
      score: 95.5,
      highlightTitle: '',
      highlightSummary: '',
      highlightContent: '',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-20T14:20:00Z'
    },
    {
      id: 2, title: '产品研发流程规范', summary: '规范产品研发流程，包括需求分析、产品设计、开发测试、上线发布等各个环节...',
      content: '',
      departmentId: 1, departmentName: '技术部',
      categoryId: 2, categoryName: '技术文档',
      creatorId: 2, creatorName: '李四',
      status: 'APPROVED',
      viewCount: 89, likeCount: 12, commentCount: 3,
      tags: '研发,流程,规范',
      score: 88.2,
      highlightTitle: '',
      highlightSummary: '',
      highlightContent: '',
      createdAt: '2024-01-18T09:00:00Z',
      updatedAt: '2024-01-19T10:00:00Z'
    }
  ]
  setTotal(28)
})
</script>

<template>
  <div class="h-full flex flex-col bg-neutral-50">
    <div class="px-6 py-4 bg-white border-b border-neutral-200">
      <Breadcrumb />
    </div>

    <div class="bg-white border-b border-neutral-200 px-6 py-4">
      <div class="flex items-center gap-4">
        <div class="relative flex-1 max-w-2xl">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            v-model="keyword"
            @keyup.enter="handleSearch"
            type="text"
            placeholder="搜索文档标题、内容、标签..."
            class="w-full pl-12 pr-10 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
          <button v-if="keyword" @click="clearKeyword" class="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-100 rounded-full">
            <X class="w-4 h-4 text-neutral-400" />
          </button>
        </div>
        <button
          @click="handleSearch"
          class="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
        >
          <Search class="w-5 h-5" /> 搜索
        </button>
      </div>
      <div v-if="keyword" class="mt-3 text-sm text-neutral-500">
        找到 <span class="text-primary-600 font-semibold">{{ total }}</span> 条与 "<span class="text-primary-600 font-semibold">{{ keyword }}</span>" 相关的结果
      </div>
    </div>

    <div class="bg-white border-b border-neutral-200 px-6 py-3 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <button
          @click="showFilter = !showFilter"
          :class="[
            'flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors',
            showFilter ? 'bg-primary-50 text-primary-600' : 'text-neutral-600 hover:bg-neutral-100'
          ]"
        >
          <Filter class="w-4 h-4" /> 筛选条件
        </button>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm text-neutral-500">排序：</span>
        <div class="relative">
          <button
            @click="showSortDropdown = !showSortDropdown"
            class="flex items-center gap-1.5 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <SortAsc class="w-4 h-4" />
            {{ currentSortLabel }}
            <ChevronDown class="w-4 h-4 text-neutral-400" />
          </button>
          <div
            v-show="showSortDropdown"
            class="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-neutral-100 py-1 z-10"
          >
            <button
              v-for="option in sortOptions"
              :key="option.value"
              @click="sortBy = option.value; showSortDropdown = false; fetchResults()"
              :class="[
                'w-full px-4 py-2 text-sm text-left transition-colors',
                sortBy === option.value ? 'bg-primary-50 text-primary-600' : 'text-neutral-700 hover:bg-neutral-50'
              ]"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden">
      <Transition name="slide">
        <aside v-show="showFilter" class="w-56 bg-white border-r border-neutral-200 p-4 overflow-y-auto">
          <div class="space-y-5">
            <div>
              <h4 class="text-sm font-semibold text-neutral-800 mb-2">部门</h4>
              <div class="space-y-1">
                <label
                  v-for="dept in departments"
                  :key="dept.id"
                  class="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors"
                  :class="{ 'bg-primary-50 text-primary-700': filters.department === dept.id }"
                >
                  <input type="radio" name="department" :value="dept.id" v-model="filters.department" class="w-4 h-4 text-primary-600" />
                  <Building2 class="w-4 h-4" />
                  <span class="text-sm">{{ dept.name }}</span>
                </label>
              </div>
            </div>
            <div>
              <h4 class="text-sm font-semibold text-neutral-800 mb-2">文档类型</h4>
              <div class="space-y-1">
                <label
                  v-for="type in types"
                  :key="type.value"
                  class="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors"
                  :class="{ 'bg-primary-50 text-primary-700': filters.type === type.value }"
                >
                  <input type="radio" name="type" :value="type.value" v-model="filters.type" class="w-4 h-4 text-primary-600" />
                  <FileText class="w-4 h-4" />
                  <span class="text-sm">{{ type.label }}</span>
                </label>
              </div>
            </div>
            <div>
              <h4 class="text-sm font-semibold text-neutral-800 mb-2">时间范围</h4>
              <div class="space-y-1">
                <label
                  v-for="range in dateRanges"
                  :key="range.value"
                  class="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors"
                  :class="{ 'bg-primary-50 text-primary-700': filters.dateRange === range.value }"
                >
                  <input type="radio" name="dateRange" :value="range.value" v-model="filters.dateRange" class="w-4 h-4 text-primary-600" />
                  <Calendar class="w-4 h-4" />
                  <span class="text-sm">{{ range.label }}</span>
                </label>
              </div>
            </div>
            <div>
              <h4 class="text-sm font-semibold text-neutral-800 mb-2">创建人</h4>
              <div class="relative">
                <User class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  v-model="filters.creatorId"
                  type="text"
                  placeholder="搜索创建人..."
                  class="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
            <button
              @click="fetchResults"
              class="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors"
            >
              应用筛选
            </button>
          </div>
        </aside>
      </Transition>

      <main class="flex-1 overflow-y-auto p-6">
        <div v-if="results.length > 0" class="space-y-4 max-w-4xl mx-auto">
          <div
            v-for="result in results"
            :key="result.id"
            @click="goToDetail(result.id)"
            class="bg-white rounded-xl p-5 shadow-card hover:shadow-card-hover cursor-pointer transition-all"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3 mb-2">
                  <h3
                    class="text-base font-semibold text-neutral-800 hover:text-primary-600 transition-colors"
                    v-html="highlightKeyword(result.title, keyword)"
                  />
                  <StatusBadge :status="getStatusType(result.status)" size="sm" />
                </div>
                <p
                  class="text-sm text-neutral-600 line-clamp-2 mb-3"
                  v-html="highlightKeyword(result.summary, keyword)"
                />
                <div class="flex items-center gap-4 text-xs text-neutral-500">
                  <span class="flex items-center gap-1">
                    <User class="w-3.5 h-3.5" /> {{ result.creatorName }}
                  </span>
                  <span class="flex items-center gap-1">
                    <Building2 class="w-3.5 h-3.5" /> {{ result.departmentName }}
                  </span>
                  <span class="flex items-center gap-1">
                    <Clock class="w-3.5 h-3.5" /> {{ formatDate(result.createdAt) }}
                  </span>
                  <span class="flex items-center gap-1">
                    <Eye class="w-3.5 h-3.5" /> {{ result.viewCount }}
                  </span>
                  <span class="flex items-center gap-1">
                    <ThumbsUp class="w-3.5 h-3.5" /> {{ result.likeCount }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <EmptyState v-else-if="keyword" type="no-result" />
        <EmptyState v-else type="no-data" title="输入关键词搜索" description="请在上方搜索框中输入关键词开始搜索" />

        <div v-if="results.length > 0" class="mt-6">
          <Pagination
            :currentPage="page"
            :pageSize="pageSize"
            :total="total"
            @update:currentPage="handlePageChange"
            @update:pageSize="handlePageSizeChange"
          />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  width: 0;
  opacity: 0;
  margin-left: -56px;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
