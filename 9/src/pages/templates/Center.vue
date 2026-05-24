<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  LayoutTemplate, Eye, FileText, User, Clock, X, Plus,
  Search, Grid, List, ChevronRight
} from 'lucide-vue-next'
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import Pagination from '@/components/common/Pagination.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { usePagination } from '@/composables/usePagination'
import { getTemplateList, getTemplateDetail } from '@/api/template'
import type { DocumentTemplate } from '@/api/template'
import { cn } from '@/lib/utils'

const router = useRouter()

const templates = ref<DocumentTemplate[]>([])
const loading = ref(false)
const selectedCategory = ref('all')
const viewMode = ref<'grid' | 'list'>('grid')
const searchKeyword = ref('')
const showPreview = ref(false)
const previewTemplate = ref<DocumentTemplate | null>(null)
const showCreateDialog = ref(false)
const selectedTemplateForCreate = ref<DocumentTemplate | null>(null)

const categories = [
  { value: 'all', label: '全部模板', count: 24 },
  { value: 'policy', label: '政策制度', count: 8 },
  { value: 'procedure', label: '流程规范', count: 6 },
  { value: 'report', label: '报告总结', count: 5 },
  { value: 'plan', label: '计划方案', count: 5 }
]

const { page, pageSize, total, goto, changePageSize, setTotal, getPaginationParams } = usePagination({ defaultPageSize: 12 })

const filteredTemplates = computed(() => {
  let result = templates.value
  if (selectedCategory.value !== 'all') {
    result = result.filter(t => t.category === selectedCategory.value)
  }
  if (searchKeyword.value) {
    result = result.filter(t =>
      t.name.includes(searchKeyword.value) ||
      t.description.includes(searchKeyword.value)
    )
  }
  return result
})

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function openPreview(template: DocumentTemplate) {
  previewTemplate.value = template
  showPreview.value = true
}

function closePreview() {
  showPreview.value = false
  previewTemplate.value = null
}

function startCreate(template: DocumentTemplate) {
  selectedTemplateForCreate.value = template
  showCreateDialog.value = true
}

async function confirmCreate() {
  if (selectedTemplateForCreate.value) {
    router.push(`/document/create?templateId=${selectedTemplateForCreate.value.id}`)
  }
  showCreateDialog.value = false
}

async function fetchTemplates() {
  loading.value = true
  try {
    const params = {
      ...getPaginationParams(),
      category: selectedCategory.value !== 'all' ? selectedCategory.value : undefined
    }
    const response = await getTemplateList(params as any)
    if (response.code === 200) {
      templates.value = response.data.content
      setTotal(response.data.totalElements)
    }
  } catch (error) {
    console.error('Failed to fetch templates:', error)
  } finally {
    loading.value = false
  }
}

function handlePageChange(newPage: number) {
  goto(newPage)
  fetchTemplates()
}

function handlePageSizeChange(size: number) {
  changePageSize(size)
  fetchTemplates()
}

onMounted(() => {
  templates.value = [
    {
      id: 1, name: '会议纪要模板', description: '标准会议纪要格式，包含会议主题、参会人员、决议事项等内容',
      category: 'procedure', contentType: 'MARKDOWN',
      content: '## 会议纪要\n\n### 会议主题\n\n### 参会人员\n\n### 决议事项',
      contentHtml: '<h2>会议纪要</h2><h3>会议主题</h3><h3>参会人员</h3><h3>决议事项</h3>',
      icon: 'file-text', color: '#3b82f6',
      usageCount: 156, isSystem: true, isEnabled: true, enabled: true, isPublic: true,
      creatorId: 0, creatorName: '系统模板',
      createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-15T10:00:00Z'
    },
    {
      id: 2, name: '项目计划书模板', description: '完整的项目计划书模板，包括项目背景、目标、实施方案、时间进度等',
      category: 'plan', contentType: 'MARKDOWN',
      content: '## 项目计划书\n\n### 项目背景\n\n### 项目目标\n\n### 实施方案\n\n### 时间进度',
      contentHtml: '<h2>项目计划书</h2><h3>项目背景</h3><h3>项目目标</h3><h3>实施方案</h3><h3>时间进度</h3>',
      icon: 'target', color: '#10b981',
      usageCount: 128, isSystem: true, isEnabled: true, enabled: true, isPublic: true,
      creatorId: 0, creatorName: '系统模板',
      createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-10T08:00:00Z'
    },
    {
      id: 3, name: '技术方案评审模板', description: '技术方案评审标准模板，用于评审技术方案的可行性和合理性',
      category: 'procedure', contentType: 'MARKDOWN',
      content: '## 技术方案评审\n\n### 方案概述\n\n### 技术选型\n\n### 可行性分析',
      contentHtml: '<h2>技术方案评审</h2><h3>方案概述</h3><h3>技术选型</h3><h3>可行性分析</h3>',
      icon: 'code', color: '#8b5cf6',
      usageCount: 98, isSystem: false, isEnabled: true, enabled: true, isPublic: true,
      creatorId: 1, creatorName: '技术部',
      createdAt: '2024-01-05T00:00:00Z', updatedAt: '2024-01-12T14:00:00Z'
    },
    {
      id: 4, name: '员工绩效考核表', description: '季度/年度员工绩效考核表格模板',
      category: 'report', contentType: 'MARKDOWN',
      content: '## 员工绩效考核表\n\n### 工作业绩\n\n### 工作能力\n\n### 工作态度',
      contentHtml: '<h2>员工绩效考核表</h2><h3>工作业绩</h3><h3>工作能力</h3><h3>工作态度</h3>',
      icon: 'clipboard-list', color: '#f59e0b',
      usageCount: 87, isSystem: false, isEnabled: true, enabled: true, isPublic: true,
      creatorId: 2, creatorName: '人力资源部',
      createdAt: '2024-01-02T00:00:00Z', updatedAt: '2024-01-08T09:00:00Z'
    },
    {
      id: 5, name: '财务预算报告模板', description: '年度/季度财务预算报告标准格式',
      category: 'report', contentType: 'MARKDOWN',
      content: '## 财务预算报告\n\n### 收入预算\n\n### 支出预算\n\n### 预算分析',
      contentHtml: '<h2>财务预算报告</h2><h3>收入预算</h3><h3>支出预算</h3><h3>预算分析</h3>',
      icon: 'dollar-sign', color: '#06b6d4',
      usageCount: 76, isSystem: false, isEnabled: true, enabled: true, isPublic: true,
      creatorId: 3, creatorName: '财务部',
      createdAt: '2024-01-03T00:00:00Z', updatedAt: '2024-01-11T11:00:00Z'
    },
    {
      id: 6, name: '公司规章制度模板', description: '公司规章制度标准格式，适用于各类制度发布',
      category: 'policy', contentType: 'MARKDOWN',
      content: '## 公司规章制度\n\n### 总则\n\n### 具体条款\n\n### 附则',
      contentHtml: '<h2>公司规章制度</h2><h3>总则</h3><h3>具体条款</h3><h3>附则</h3>',
      icon: 'book-open', color: '#ef4444',
      usageCount: 65, isSystem: false, isEnabled: true, enabled: true, isPublic: true,
      creatorId: 4, creatorName: '行政部',
      createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-05T16:00:00Z'
    }
  ]
  setTotal(24)
})
</script>

<template>
  <div class="h-full flex flex-col bg-neutral-50">
    <div class="px-6 py-4 bg-white border-b border-neutral-200">
      <Breadcrumb />
    </div>

    <div class="bg-white border-b border-neutral-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold text-neutral-800">模板中心</h1>
          <p class="text-sm text-neutral-500 mt-1">选择合适的模板，快速创建文档</p>
        </div>
        <button
          @click="router.push('/document/create')"
          class="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus class="w-5 h-5" /> 空白文档
        </button>
      </div>
    </div>

    <div class="bg-white border-b border-neutral-200 px-6 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1">
          <button
            v-for="cat in categories"
            :key="cat.value"
            @click="selectedCategory = cat.value"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              selectedCategory === cat.value
                ? 'bg-primary-50 text-primary-600'
                : 'text-neutral-600 hover:bg-neutral-100'
            ]"
          >
            {{ cat.label }}
            <span
              :class="[
                'ml-1.5 px-1.5 py-0.5 text-xs rounded-full',
                selectedCategory === cat.value ? 'bg-primary-100 text-primary-600' : 'bg-neutral-100 text-neutral-500'
              ]"
            >
              {{ cat.count }}
            </span>
          </button>
        </div>
        <div class="flex items-center gap-3">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索模板..."
              class="pl-9 pr-4 py-2 w-56 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div class="flex bg-neutral-100 rounded-lg p-0.5">
            <button
              @click="viewMode = 'grid'"
              :class="[
                'p-2 rounded-md transition-colors',
                viewMode === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-neutral-500 hover:text-neutral-700'
              ]"
            >
              <Grid class="w-5 h-5" />
            </button>
            <button
              @click="viewMode = 'list'"
              :class="[
                'p-2 rounded-md transition-colors',
                viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-neutral-500 hover:text-neutral-700'
              ]"
            >
              <List class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="filteredTemplates.length > 0">
        <div v-if="viewMode === 'grid'" class="grid grid-cols-3 gap-5">
          <div
            v-for="template in filteredTemplates"
            :key="template.id"
            class="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all overflow-hidden group"
          >
            <div
              @click="openPreview(template)"
              class="h-40 bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center relative cursor-pointer"
            >
              <LayoutTemplate class="w-16 h-16 text-primary-300 group-hover:scale-110 transition-transform" />
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span class="px-4 py-2 bg-white/90 rounded-lg text-sm text-neutral-700 font-medium flex items-center gap-1.5">
                  <Eye class="w-4 h-4" /> 预览模板
                </span>
              </div>
              <span class="absolute top-3 right-3 px-2 py-0.5 bg-white/90 rounded-full text-xs text-neutral-600">
                {{ template.usageCount }} 次使用
              </span>
            </div>
            <div class="p-4">
              <div class="flex items-start justify-between mb-2">
                <h3 class="font-semibold text-neutral-800 group-hover:text-primary-600 transition-colors cursor-pointer" @click="openPreview(template)">
                  {{ template.name }}
                </h3>
              </div>
              <p class="text-sm text-neutral-500 line-clamp-2 mb-3 h-10">{{ template.description }}</p>
              <div class="flex items-center justify-between">
                <span class="text-xs text-neutral-400 flex items-center gap-1">
                  <User class="w-3.5 h-3.5" /> {{ template.creatorName }}
                </span>
                <button
                  @click="startCreate(template)"
                  class="flex items-center gap-1 px-3 py-1.5 text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors font-medium"
                >
                  <Plus class="w-3.5 h-3.5" /> 使用模板
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="template in filteredTemplates"
            :key="template.id"
            class="bg-white rounded-xl p-4 shadow-card hover:shadow-card-hover transition-all"
          >
            <div class="flex items-center gap-4">
              <div
                @click="openPreview(template)"
                class="w-16 h-16 bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0"
              >
                <LayoutTemplate class="w-8 h-8 text-primary-400" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3 mb-1">
                  <h3
                    @click="openPreview(template)"
                    class="font-semibold text-neutral-800 hover:text-primary-600 transition-colors cursor-pointer"
                  >
                    {{ template.name }}
                  </h3>
                  <span class="px-2 py-0.5 bg-primary-50 text-primary-600 text-xs rounded-full">
                    {{ template.usageCount }} 次使用
                  </span>
                </div>
                <p class="text-sm text-neutral-500 line-clamp-1 mb-2">{{ template.description }}</p>
                <div class="flex items-center gap-4 text-xs text-neutral-400">
                  <span class="flex items-center gap-1"><User class="w-3.5 h-3.5" /> {{ template.creatorName }}</span>
                  <span class="flex items-center gap-1"><Clock class="w-3.5 h-3.5" /> {{ formatDate(template.updatedAt) }}</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="openPreview(template)"
                  class="flex items-center gap-1.5 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <Eye class="w-4 h-4" /> 预览
                </button>
                <button
                  @click="startCreate(template)"
                  class="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                >
                  <Plus class="w-4 h-4" /> 使用
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EmptyState v-else type="no-result" title="未找到模板" description="尝试更换关键词或分类筛选" />

      <div v-if="filteredTemplates.length > 0" class="mt-6">
        <Pagination
          :currentPage="page"
          :pageSize="pageSize"
          :total="total"
          @update:currentPage="handlePageChange"
          @update:pageSize="handlePageSizeChange"
        />
      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showPreview && previewTemplate" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closePreview" />
          <div class="relative bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col animate-fade-in animate-slide-up">
            <div class="flex items-center justify-between p-4 border-b border-neutral-100">
              <h3 class="text-lg font-semibold text-neutral-800">{{ previewTemplate.name }}</h3>
              <button @click="closePreview" class="p-1 hover:bg-neutral-100 rounded-md transition-colors">
                <X class="w-5 h-5 text-neutral-500" />
              </button>
            </div>
            <div class="flex-1 overflow-y-auto p-6">
              <div class="bg-neutral-50 rounded-lg p-6 min-h-[400px]">
                <h1 class="text-2xl font-bold text-center mb-6">{{ previewTemplate.name }}</h1>
                <p class="text-neutral-600 text-center mb-8">{{ previewTemplate.description }}</p>
                <div class="border-t border-neutral-200 pt-6">
                  <p class="text-neutral-700">此处为模板内容预览区域...</p>
                </div>
              </div>
            </div>
            <div class="flex justify-end gap-3 p-4 border-t border-neutral-100">
              <button @click="closePreview" class="px-4 py-2 text-sm text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors">
                关闭
              </button>
              <button
                @click="startCreate(previewTemplate); closePreview()"
                class="flex items-center gap-2 px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                <Plus class="w-4 h-4" /> 使用此模板
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCreateDialog && selectedTemplateForCreate" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showCreateDialog = false" />
          <div class="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 animate-fade-in animate-slide-up">
            <h3 class="text-lg font-semibold text-neutral-800 mb-2">使用模板创建文档</h3>
            <p class="text-sm text-neutral-500 mb-4">
              确定要使用 "<span class="text-primary-600 font-medium">{{ selectedTemplateForCreate.name }}</span>" 模板创建文档吗？
            </p>
            <div class="flex justify-end gap-3 mt-6">
              <button @click="showCreateDialog = false" class="px-4 py-2 text-sm text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors">
                取消
              </button>
              <button @click="confirmCreate" class="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
                确认创建
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
