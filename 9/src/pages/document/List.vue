<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Search, List, Grid, Filter, Plus, ChevronDown, ChevronUp, X, Calendar,
  FileText, Eye, ThumbsUp, MessageSquare, MoreHorizontal, Check
} from 'lucide-vue-next'
import { useDocumentStore } from '@/stores/document'
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import Pagination from '@/components/common/Pagination.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { usePagination } from '@/composables/usePagination'
import { getDocumentList } from '@/api/document'
import type { Document } from '@/api/document'
import { cn } from '@/lib/utils'

const router = useRouter()
const documentStore = useDocumentStore()

const { page, pageSize, total, goto, changePageSize, setTotal, getPaginationParams } = usePagination({ defaultPageSize: 10 })

const searchKeyword = ref('')
const viewMode = ref<'list' | 'grid'>('list')
const showFilterSidebar = ref(true)
const loading = ref(false)
const documents = ref<Document[]>([])

const filters = ref({
  department: '',
  status: '',
  type: '',
  dateRange: '',
  tags: [] as string[]
})

const filterOptions = {
  departments: [
    { id: '1', name: '技术部' },
    { id: '2', name: '产品部' },
    { id: '3', name: '运营部' },
    { id: '4', name: '市场部' },
    { id: '5', name: '人力资源部' }
  ],
  statuses: [
    { value: 'DRAFT', label: '草稿' },
    { value: 'PENDING', label: '待审批' },
    { value: 'PUBLISHED', label: '已发布' },
    { value: 'REJECTED', label: '已驳回' }
  ],
  types: [
    { value: 'policy', label: '政策制度' },
    { value: 'procedure', label: '流程规范' },
    { value: 'guideline', label: '指导手册' },
    { value: 'manual', label: '操作手册' },
    { value: 'other', label: '其他' }
  ],
  dateRanges: [
    { value: 'today', label: '今天' },
    { value: 'week', label: '本周' },
    { value: 'month', label: '本月' },
    { value: 'quarter', label: '本季度' },
    { value: 'year', label: '本年' }
  ],
  tags: ['重要', '紧急', '参考', '必读', '精选']
}

const expandedFilters = ref({
  department: true,
  status: true,
  type: true,
  dateRange: true,
  tags: true
})

function toggleFilter(key: keyof typeof expandedFilters.value) {
  expandedFilters.value[key] = !expandedFilters.value[key]
}

function toggleTag(tag: string) {
  const index = filters.value.tags.indexOf(tag)
  if (index > -1) {
    filters.value.tags.splice(index, 1)
  } else {
    filters.value.tags.push(tag)
  }
}

function clearFilters() {
  filters.value = {
    department: '',
    status: '',
    type: '',
    dateRange: '',
    tags: []
  }
  fetchDocuments()
}

async function fetchDocuments() {
  loading.value = true
  try {
    const params = {
      ...getPaginationParams(),
      keyword: searchKeyword.value,
      departmentId: filters.value.department,
      status: filters.value.status ? parseInt(filters.value.status) : undefined,
      category: filters.value.type
    }
    const response = await getDocumentList(params as any)
    if (response.code === 200) {
      documents.value = response.data.content
      setTotal(response.data.totalElements)
    }
  } catch (error) {
    console.error('Failed to fetch documents:', error)
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

function getStatusType(status: string): 'draft' | 'pending' | 'published' | 'rejected' {
  if (!status) return 'draft'
  const s = status.toLowerCase()
  if (s === 'approved') return 'published'
  return s as 'draft' | 'pending' | 'published' | 'rejected'
}

function goToDetail(id: number) {
  router.push(`/document/${id}`)
}

function goToCreate() {
  router.push('/document/create')
}

function handlePageChange(newPage: number) {
  goto(newPage)
  fetchDocuments()
}

function handlePageSizeChange(size: number) {
  changePageSize(size)
  fetchDocuments()
}

onMounted(() => {
  documents.value = [
    {
      id: '1', title: '2024年度产品规划报告', summary: '本年度产品发展方向和重点功能规划',
      category: '产品文档', status: 2, creatorName: '张三', departmentName: '产品部',
      viewCount: 156, likeCount: 23, commentCount: 8, version: 2,
      createdAt: '2024-01-15T10:30:00Z', updatedAt: '2024-01-20T14:20:00Z'
    } as unknown as Document,
    {
      id: '2', title: '系统架构设计规范', summary: '统一技术架构标准，提升代码质量',
      category: '技术文档', status: 1, creatorName: '李四', departmentName: '技术部',
      viewCount: 89, likeCount: 12, commentCount: 3, version: 1,
      createdAt: '2024-01-18T09:00:00Z', updatedAt: '2024-01-18T09:00:00Z'
    } as unknown as Document,
    {
      id: '3', title: '新员工入职培训手册', summary: '帮助新员工快速了解公司文化和工作流程',
      category: '人力资源', status: 2, creatorName: '王五', departmentName: '人力资源部',
      viewCount: 234, likeCount: 45, commentCount: 12, version: 3,
      createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-19T16:30:00Z'
    } as unknown as Document,
    {
      id: '4', title: '财务报销管理制度', summary: '规范公司财务报销流程，明确审批权限',
      category: '财务管理', status: 2, creatorName: '赵六', departmentName: '财务部',
      viewCount: 178, likeCount: 18, commentCount: 5, version: 1,
      createdAt: '2024-01-12T11:00:00Z', updatedAt: '2024-01-12T11:00:00Z'
    } as unknown as Document
  ]
  setTotal(45)
})
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="px-6 py-4 bg-white border-b border-neutral-200">
      <Breadcrumb />
    </div>

    <div class="flex-1 flex overflow-hidden">
      <Transition name="slide">
        <aside v-show="showFilterSidebar" class="w-64 bg-white border-r border-neutral-200 flex flex-col">
          <div class="p-4 border-b border-neutral-100 flex items-center justify-between">
            <h3 class="font-semibold text-neutral-800 flex items-center gap-2">
              <Filter class="w-4 h-4" />
              筛选条件
            </h3>
            <button @click="clearFilters" class="text-xs text-primary-600 hover:text-primary-700">
              重置
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <div class="space-y-2">
              <button @click="toggleFilter('department')" class="w-full flex items-center justify-between text-sm font-medium text-neutral-700">
                部门
                <ChevronDown v-if="!expandedFilters.department" class="w-4 h-4 text-neutral-400" />
                <ChevronUp v-else class="w-4 h-4 text-neutral-400" />
              </button>
              <div v-show="expandedFilters.department" class="space-y-1">
                <label
                  v-for="dept in filterOptions.departments"
                  :key="dept.id"
                  class="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors"
                  :class="{ 'bg-primary-50 text-primary-700': filters.department === dept.id }"
                >
                  <input
                    type="radio"
                    name="department"
                    :value="dept.id"
                    v-model="filters.department"
                    class="w-4 h-4 text-primary-600"
                  />
                  <span class="text-sm">{{ dept.name }}</span>
                </label>
              </div>
            </div>

            <div class="space-y-2">
              <button @click="toggleFilter('status')" class="w-full flex items-center justify-between text-sm font-medium text-neutral-700">
                状态
                <ChevronDown v-if="!expandedFilters.status" class="w-4 h-4 text-neutral-400" />
                <ChevronUp v-else class="w-4 h-4 text-neutral-400" />
              </button>
              <div v-show="expandedFilters.status" class="space-y-1">
                <label
                  v-for="status in filterOptions.statuses"
                  :key="status.value"
                  class="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors"
                  :class="{ 'bg-primary-50 text-primary-700': filters.status === status.value }"
                >
                  <input
                    type="radio"
                    name="status"
                    :value="status.value"
                    v-model="filters.status"
                    class="w-4 h-4 text-primary-600"
                  />
                  <span class="text-sm">{{ status.label }}</span>
                </label>
              </div>
            </div>

            <div class="space-y-2">
              <button @click="toggleFilter('type')" class="w-full flex items-center justify-between text-sm font-medium text-neutral-700">
                类型
                <ChevronDown v-if="!expandedFilters.type" class="w-4 h-4 text-neutral-400" />
                <ChevronUp v-else class="w-4 h-4 text-neutral-400" />
              </button>
              <div v-show="expandedFilters.type" class="space-y-1">
                <label
                  v-for="type in filterOptions.types"
                  :key="type.value"
                  class="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors"
                  :class="{ 'bg-primary-50 text-primary-700': filters.type === type.value }"
                >
                  <input
                    type="radio"
                    name="type"
                    :value="type.value"
                    v-model="filters.type"
                    class="w-4 h-4 text-primary-600"
                  />
                  <span class="text-sm">{{ type.label }}</span>
                </label>
              </div>
            </div>

            <div class="space-y-2">
              <button @click="toggleFilter('dateRange')" class="w-full flex items-center justify-between text-sm font-medium text-neutral-700">
                <span class="flex items-center gap-2">
                  <Calendar class="w-4 h-4" />
                  创建时间
                </span>
                <ChevronDown v-if="!expandedFilters.dateRange" class="w-4 h-4 text-neutral-400" />
                <ChevronUp v-else class="w-4 h-4 text-neutral-400" />
              </button>
              <div v-show="expandedFilters.dateRange" class="space-y-1">
                <label
                  v-for="range in filterOptions.dateRanges"
                  :key="range.value"
                  class="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors"
                  :class="{ 'bg-primary-50 text-primary-700': filters.dateRange === range.value }"
                >
                  <input
                    type="radio"
                    name="dateRange"
                    :value="range.value"
                    v-model="filters.dateRange"
                    class="w-4 h-4 text-primary-600"
                  />
                  <span class="text-sm">{{ range.label }}</span>
                </label>
              </div>
            </div>

            <div class="space-y-2">
              <button @click="toggleFilter('tags')" class="w-full flex items-center justify-between text-sm font-medium text-neutral-700">
                标签
                <ChevronDown v-if="!expandedFilters.tags" class="w-4 h-4 text-neutral-400" />
                <ChevronUp v-else class="w-4 h-4 text-neutral-400" />
              </button>
              <div v-show="expandedFilters.tags" class="flex flex-wrap gap-2">
                <span
                  v-for="tag in filterOptions.tags"
                  :key="tag"
                  @click="toggleTag(tag)"
                  class="px-3 py-1 text-xs rounded-full cursor-pointer transition-all"
                  :class="[
                    filters.tags.includes(tag)
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  ]"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </Transition>

      <div class="flex-1 flex flex-col overflow-hidden bg-neutral-50">
        <div class="px-6 py-4 bg-white border-b border-neutral-200">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-4 flex-1">
              <button
                @click="showFilterSidebar = !showFilterSidebar"
                class="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                :class="{ 'bg-primary-50 text-primary-600': showFilterSidebar }"
              >
                <Filter class="w-5 h-5" />
              </button>

              <div class="relative flex-1 max-w-md">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  v-model="searchKeyword"
                  @keyup.enter="fetchDocuments"
                  type="text"
                  placeholder="搜索文档标题、内容、标签..."
                  class="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                />
              </div>
            </div>

            <div class="flex items-center gap-2">
              <div class="flex bg-neutral-100 rounded-lg p-0.5">
                <button
                  @click="viewMode = 'list'"
                  :class="[
                    'p-2 rounded-md transition-colors',
                    viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-neutral-500 hover:text-neutral-700'
                  ]"
                >
                  <List class="w-5 h-5" />
                </button>
                <button
                  @click="viewMode = 'grid'"
                  :class="[
                    'p-2 rounded-md transition-colors',
                    viewMode === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-neutral-500 hover:text-neutral-700'
                  ]"
                >
                  <Grid class="w-5 h-5" />
                </button>
              </div>

              <button
                @click="goToCreate"
                class="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus class="w-5 h-5" />
                新建文档
              </button>
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
          <LoadingSpinner v-if="loading" text="加载中..." />

          <template v-else>
            <div v-if="viewMode === 'list'" class="space-y-4">
              <div
                v-for="doc in documents"
                :key="doc.id"
                @click="goToDetail(doc.id)"
                class="bg-white rounded-xl p-5 shadow-card hover:shadow-card-hover cursor-pointer transition-all group"
              >
                <div class="flex items-start justify-between">
                  <div class="flex items-start gap-4 flex-1 min-w-0">
                    <div class="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
                      <FileText class="w-6 h-6 text-primary-600" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-3 mb-1">
                        <h3 class="text-base font-semibold text-neutral-800 group-hover:text-primary-600 transition-colors truncate">
                          {{ doc.title }}
                        </h3>
                        <StatusBadge :status="getStatusType(doc.status)" size="sm" />
                      </div>
                      <p class="text-sm text-neutral-500 line-clamp-2 mb-3">{{ doc.summary }}</p>
                      <div class="flex items-center gap-4 text-xs text-neutral-500">
                        <span>{{ doc.creatorName }}</span>
                        <span>{{ doc.departmentName }}</span>
                        <span>{{ formatDate(doc.updatedAt) }}</span>
                        <span class="flex items-center gap-1">
                          <Eye class="w-3.5 h-3.5" /> {{ doc.viewCount }}
                        </span>
                        <span class="flex items-center gap-1">
                          <ThumbsUp class="w-3.5 h-3.5" /> {{ doc.likeCount }}
                        </span>
                        <span class="flex items-center gap-1">
                          <MessageSquare class="w-3.5 h-3.5" /> {{ doc.commentCount }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button class="p-2 rounded-lg hover:bg-neutral-100 opacity-0 group-hover:opacity-100 transition-all">
                    <MoreHorizontal class="w-5 h-5 text-neutral-400" />
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="grid grid-cols-3 gap-4">
              <div
                v-for="doc in documents"
                :key="doc.id"
                @click="goToDetail(doc.id)"
                class="bg-white rounded-xl overflow-hidden shadow-card hover:shadow-card-hover cursor-pointer transition-all group"
              >
                <div class="h-32 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
                  <FileText class="w-12 h-12 text-primary-400 group-hover:scale-110 transition-transform" />
                </div>
                <div class="p-4">
                  <div class="flex items-center justify-between mb-2">
                    <StatusBadge :status="getStatusType(doc.status)" size="sm" />
                    <span class="text-xs text-neutral-400">v{{ doc.version }}</span>
                  </div>
                  <h3 class="text-sm font-semibold text-neutral-800 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                    {{ doc.title }}
                  </h3>
                  <p class="text-xs text-neutral-500 line-clamp-2 mb-3">{{ doc.summary }}</p>
                  <div class="flex items-center justify-between text-xs text-neutral-500">
                    <span>{{ doc.creatorName }}</span>
                    <div class="flex items-center gap-2">
                      <span class="flex items-center gap-1">
                        <Eye class="w-3 h-3" /> {{ doc.viewCount }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <EmptyState v-if="documents.length === 0" type="no-data" />
          </template>
        </div>

        <div class="px-6 py-3 bg-white border-t border-neutral-200">
          <Pagination
            :currentPage="page"
            :pageSize="pageSize"
            :total="total"
            @update:currentPage="handlePageChange"
            @update:pageSize="handlePageSizeChange"
          />
        </div>
      </div>
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
  margin-left: -64px;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
