<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ArrowLeft, Clock, User, RotateCcw, GitCompare, Check, X,
  ChevronDown, ChevronRight, Eye, FileText
} from 'lucide-vue-next'
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { getDocumentVersions, rollbackVersion, getDocumentDetail } from '@/api/document'
import type { DocumentVersion } from '@/api/document'
import { cn } from '@/lib/utils'

const router = useRouter()
const route = useRoute()
const documentId = route.params.id as string

const versions = ref<DocumentVersion[]>([])
const loading = ref(false)
const documentTitle = ref('')
const selectedVersions = ref<number[]>([])
const showCompare = ref(false)
const showRollbackDialog = ref(false)
const rollbackVersionId = ref(0)
const expandedVersion = ref(0)

const canCompare = computed(() => selectedVersions.value.length === 2)

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN')
}

function goBack() {
  router.back()
}

function toggleVersionSelection(id: number) {
  const index = selectedVersions.value.indexOf(id)
  if (index > -1) {
    selectedVersions.value.splice(index, 1)
  } else if (selectedVersions.value.length < 2) {
    selectedVersions.value.push(id)
  }
}

function toggleExpand(id: number) {
  expandedVersion.value = expandedVersion.value === id ? 0 : id
}

function startRollback(versionId: number) {
  rollbackVersionId.value = versionId
  showRollbackDialog.value = true
}

async function confirmRollback() {
  try {
    await rollbackVersion(Number(documentId), Number(rollbackVersionId.value))
    showRollbackDialog.value = false
    fetchVersions()
  } catch (error) {
    console.error('Rollback failed:', error)
  }
}

function openCompare() {
  showCompare.value = true
}

function closeCompare() {
  showCompare.value = false
}

function clearSelection() {
  selectedVersions.value = []
}

function viewVersion(version: DocumentVersion) {
  router.push(`/document/${documentId}?version=${version.id}`)
}

async function fetchVersions() {
  loading.value = true
  try {
    const response = await getDocumentVersions(Number(documentId))
    if (response.code === 200) {
      versions.value = response.data
    }
    const docResponse = await getDocumentDetail(Number(documentId))
    if (docResponse.code === 200) {
      documentTitle.value = docResponse.data.title
    }
  } catch (error) {
    console.error('Failed to fetch versions:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  documentTitle.value = '2024年度产品规划报告'
  versions.value = [
    {
      id: 4,
      documentId: Number(documentId),
      version: 4,
      title: '2024年度产品规划报告',
      content: '优化了产品路线图部分，增加了Q3和Q4的详细规划...',
      contentHtml: '',
      contentType: 'MARKDOWN',
      creatorId: 1,
      creatorName: '张三',
      changeLog: '更新产品路线图',
      createdAt: '2024-01-20T14:20:00Z'
    },
    {
      id: 3,
      documentId: Number(documentId),
      version: 3,
      title: '2024年度产品规划报告',
      content: '补充了市场分析数据，调整了目标用户画像...',
      contentHtml: '',
      contentType: 'MARKDOWN',
      creatorId: 2,
      creatorName: '李四',
      changeLog: '补充市场分析数据',
      createdAt: '2024-01-18T10:30:00Z'
    },
    {
      id: 2,
      documentId: Number(documentId),
      version: 2,
      title: '2024年度产品规划报告',
      content: '修正了部分数据，优化了文档结构...',
      contentHtml: '',
      contentType: 'MARKDOWN',
      creatorId: 1,
      creatorName: '张三',
      changeLog: '修正数据，优化结构',
      createdAt: '2024-01-16T16:45:00Z'
    },
    {
      id: 1,
      documentId: Number(documentId),
      version: 1,
      title: '2024年度产品规划报告（初稿）',
      content: '初始版本，包含整体框架和核心内容...',
      contentHtml: '',
      contentType: 'MARKDOWN',
      creatorId: 1,
      creatorName: '张三',
      changeLog: '创建文档',
      createdAt: '2024-01-15T09:00:00Z'
    }
  ]
})
</script>

<template>
  <div class="h-full flex flex-col bg-neutral-50">
    <div class="px-6 py-4 bg-white border-b border-neutral-200">
      <Breadcrumb />
    </div>

    <div class="bg-white border-b border-neutral-200">
      <div class="px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="goBack" class="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <ArrowLeft class="w-5 h-5 text-neutral-600" />
          </button>
          <div>
            <h1 class="text-xl font-semibold text-neutral-800">版本历史</h1>
            <p class="text-sm text-neutral-500 mt-0.5">{{ documentTitle }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div v-if="selectedVersions.length > 0" class="flex items-center gap-2 text-sm text-neutral-600">
            <span>已选择 {{ selectedVersions.length }} 个版本</span>
            <button @click="clearSelection" class="text-primary-600 hover:text-primary-700">清除</button>
          </div>
          <button
            @click="openCompare"
            :disabled="!canCompare"
            class="flex items-center gap-2 px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-300 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <GitCompare class="w-4 h-4" /> 对比版本
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-6">
      <LoadingSpinner v-if="loading" text="加载版本历史..." />

      <template v-else>
        <div v-if="versions.length > 0" class="max-w-3xl mx-auto">
          <div class="relative">
            <div class="absolute left-5 top-0 bottom-0 w-0.5 bg-neutral-200" />

            <div v-for="(version, index) in versions" :key="version.id" class="relative mb-6">
              <div class="flex items-start gap-4">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                  :class="index === 0 ? 'bg-primary-500' : 'bg-white border-2 border-neutral-300'"
                >
                  <Clock v-if="index === 0" class="w-5 h-5 text-white" />
                  <FileText v-else class="w-5 h-5 text-neutral-400" />
                </div>

                <div class="flex-1">
                  <div
                    @click="toggleExpand(version.id)"
                    class="bg-white rounded-xl p-4 shadow-card hover:shadow-card-hover cursor-pointer transition-all"
                    :class="{ 'ring-2 ring-primary-500': selectedVersions.includes(version.id) }"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex items-center gap-3">
                        <input
                          type="checkbox"
                          :checked="selectedVersions.includes(version.id)"
                          @click.stop="toggleVersionSelection(version.id)"
                          class="w-4 h-4 text-primary-600 rounded"
                        />
                        <div>
                          <div class="flex items-center gap-2">
                            <h3 class="font-semibold text-neutral-800">v{{ version.version }}</h3>
                            <span v-if="index === 0" class="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">当前版本</span>
                          </div>
                          <p class="text-sm text-neutral-500 mt-0.5">{{ version.changeLog }}</p>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <span v-if="expandedVersion === version.id" class="text-neutral-400">
                          <ChevronDown class="w-5 h-5" />
                        </span>
                        <span v-else class="text-neutral-400">
                          <ChevronRight class="w-5 h-5" />
                        </span>
                      </div>
                    </div>

                    <div class="flex items-center gap-4 mt-3 text-xs text-neutral-500">
                      <span class="flex items-center gap-1">
                        <User class="w-3.5 h-3.5" /> {{ version.creatorName }}
                      </span>
                      <span>{{ formatDate(version.createdAt) }}</span>
                    </div>

                    <div v-show="expandedVersion === version.id" class="mt-4 pt-4 border-t border-neutral-100">
                      <p class="text-sm text-neutral-600 mb-4">{{ version.content }}</p>
                      <div class="flex items-center gap-2">
                        <button
                          @click.stop="viewVersion(version)"
                          class="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                        >
                          <Eye class="w-3.5 h-3.5" /> 查看此版本
                        </button>
                        <button
                          v-if="index !== 0"
                          @click.stop="startRollback(version.id)"
                          class="flex items-center gap-1.5 px-3 py-1.5 text-xs text-warning-600 bg-warning-50 hover:bg-warning-100 rounded-lg transition-colors"
                        >
                          <RotateCcw class="w-3.5 h-3.5" /> 回滚到此版本
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <EmptyState v-else type="no-data" title="暂无版本历史" description="该文档还没有历史版本记录" />
      </template>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCompare" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeCompare" />
          <div class="relative bg-white rounded-xl shadow-xl w-full max-w-6xl mx-4 max-h-[80vh] flex flex-col animate-fade-in animate-slide-up">
            <div class="flex items-center justify-between p-4 border-b border-neutral-100">
              <h3 class="text-lg font-semibold text-neutral-800 flex items-center gap-2">
                <GitCompare class="w-5 h-5 text-primary-600" />
                版本对比
              </h3>
              <button @click="closeCompare" class="p-1 hover:bg-neutral-100 rounded-md transition-colors">
                <X class="w-5 h-5 text-neutral-500" />
              </button>
            </div>
            <div class="flex-1 overflow-hidden flex">
              <div class="flex-1 p-4 border-r border-neutral-100 overflow-y-auto">
                <h4 class="text-sm font-semibold text-neutral-700 mb-2">v3 - 补充市场分析数据</h4>
                <div class="text-sm text-neutral-600 bg-neutral-50 rounded-lg p-4">
                  <p class="mb-2">2. 目标与范围</p>
                  <p class="mb-2">2.1 核心目标</p>
                  <p class="text-danger-600 line-through">- 本年度的核心目标是提升用户体验，增加用户活跃度。</p>
                  <p class="text-success-600">+ 本年度的核心目标是提升用户体验，日活用户增长30%，月活用户增长25%。</p>
                </div>
              </div>
              <div class="flex-1 p-4 overflow-y-auto">
                <h4 class="text-sm font-semibold text-neutral-700 mb-2">v4 - 更新产品路线图</h4>
                <div class="text-sm text-neutral-600 bg-neutral-50 rounded-lg p-4">
                  <p class="mb-2">2. 目标与范围</p>
                  <p class="mb-2">2.1 核心目标</p>
                  <p>本年度的核心目标是提升用户体验，日活用户增长30%，月活用户增长25%。</p>
                </div>
              </div>
            </div>
            <div class="flex justify-end gap-3 p-4 border-t border-neutral-100">
              <button @click="closeCompare" class="px-4 py-2 text-sm text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors">
                关闭
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="showRollbackDialog"
      title="确认回滚"
      message="回滚到此版本会创建一个新的版本，当前版本内容将被替换为所选版本的内容。确定要继续吗？"
      type="warning"
      confirm-text="确认回滚"
      @confirm="confirmRollback"
    />
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
</style>
