<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Trash2, RotateCcw, FileText, User, Clock, AlertTriangle,
  Search, CheckSquare, Square, ArrowUpDown
} from 'lucide-vue-next'
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import Pagination from '@/components/common/Pagination.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { usePagination } from '@/composables/usePagination'
import { getRecycleList, restoreDocument, permanentlyDelete } from '@/api/recycle'
import type { RecycleItem } from '@/api/recycle'

const router = useRouter()

const documents = ref<RecycleItem[]>([])
const loading = ref(false)
const selectedIds = ref<string[]>([])
const searchKeyword = ref('')
const sortBy = ref<'deletedAt' | 'documentTitle'>('deletedAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

const showRestoreConfirm = ref(false)
const showDeleteConfirm = ref(false)
const pendingAction = ref<'restore' | 'delete'>('restore')
const pendingDocument = ref<RecycleItem | null>(null)
const isBatchAction = ref(false)

const { page, pageSize, total, goto, changePageSize, setTotal, getPaginationParams } = usePagination({ defaultPageSize: 10 })

const allSelected = computed(() => documents.value.length > 0 && documents.value.every(d => selectedIds.value.includes(d.id)))
const hasSelection = computed(() => selectedIds.value.length > 0)

const restoreMessage = computed(() => {
  if (isBatchAction.value) {
    return `确定要恢复选中的 ${selectedIds.value.length} 个文档吗？恢复后文档将返回到原位置。`
  }
  return `确定要恢复 "${pendingDocument.value?.documentTitle}" 吗？恢复后文档将返回到原位置。`
})

const deleteMessage = computed(() => {
  if (isBatchAction.value) {
    return `确定要永久删除选中的 ${selectedIds.value.length} 个文档吗？此操作不可撤销！`
  }
  return `确定要永久删除 "${pendingDocument.value?.documentTitle}" 吗？此操作不可撤销！`
})

const filteredDocuments = computed(() => {
  let result = [...documents.value]
  if (searchKeyword.value) {
    result = result.filter(d =>
      d.documentTitle.includes(searchKeyword.value) ||
      d.deleterName.includes(searchKeyword.value)
    )
  }
  result.sort((a, b) => {
    let comparison = 0
    if (sortBy.value === 'deletedAt') {
      comparison = new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime()
    } else {
      comparison = a.documentTitle.localeCompare(b.documentTitle)
    }
    return sortOrder.value === 'desc' ? -comparison : comparison
  })
  return result
})

function getRemainingDays(deletedAt: string): number {
  const deleted = new Date(deletedAt)
  const expire = new Date(deleted)
  expire.setDate(expire.getDate() + 30)
  const now = new Date()
  const remaining = Math.ceil((expire.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, remaining)
}

function getRemainingClass(days: number): string {
  if (days <= 7) return 'text-danger-600 bg-danger-50'
  if (days <= 14) return 'text-warning-600 bg-warning-50'
  return 'text-success-600 bg-success-50'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function toggleSelect(id: string) {
  const index = selectedIds.value.indexOf(id)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(id)
  }
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = documents.value.map(d => d.id)
  }
}

function confirmRestore(doc: RecycleItem) {
  pendingDocument.value = doc
  pendingAction.value = 'restore'
  isBatchAction.value = false
  showRestoreConfirm.value = true
}

function confirmDelete(doc: RecycleItem) {
  pendingDocument.value = doc
  pendingAction.value = 'delete'
  isBatchAction.value = false
  showDeleteConfirm.value = true
}

function confirmBatchRestore() {
  isBatchAction.value = true
  showRestoreConfirm.value = true
}

function confirmBatchDelete() {
  isBatchAction.value = true
  showDeleteConfirm.value = true
}

async function handleRestore() {
  try {
    if (isBatchAction.value) {
      for (const id of selectedIds.value) {
        await restoreDocument(id)
      }
      documents.value = documents.value.filter(d => !selectedIds.value.includes(d.id))
      selectedIds.value = []
    } else if (pendingDocument.value) {
      await restoreDocument(pendingDocument.value.id)
      documents.value = documents.value.filter(d => d.id !== pendingDocument.value?.id)
    }
    setTotal(documents.value.length)
  } catch (error) {
    console.error('Restore failed:', error)
  }
  showRestoreConfirm.value = false
  pendingDocument.value = null
}

async function handleDelete() {
  try {
    if (isBatchAction.value) {
      for (const id of selectedIds.value) {
        await permanentlyDelete(id)
      }
      documents.value = documents.value.filter(d => !selectedIds.value.includes(d.id))
      selectedIds.value = []
    } else if (pendingDocument.value) {
      await permanentlyDelete(pendingDocument.value.id)
      documents.value = documents.value.filter(d => d.id !== pendingDocument.value?.id)
    }
    setTotal(documents.value.length)
  } catch (error) {
    console.error('Delete failed:', error)
  }
  showDeleteConfirm.value = false
  pendingDocument.value = null
}

function toggleSort(field: 'deletedAt' | 'documentTitle') {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'desc'
  }
}

async function fetchDocuments() {
  loading.value = true
  try {
    const response = await getRecycleList(getPaginationParams() as any)
    if (response.code === 0) {
      documents.value = response.data.list
      setTotal(response.data.total)
    }
  } catch (error) {
    console.error('Failed to fetch documents:', error)
  } finally {
    loading.value = false
  }
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
    { id: '1', documentId: 'd1', documentTitle: 'Q4季度工作计划报告.docx', category: 'report', deleterId: '1', deleterName: '张三', deletedAt: '2024-12-20T10:00:00Z', expireAt: '2025-01-19T10:00:00Z' },
    { id: '2', documentId: 'd2', documentTitle: '技术方案评审会议纪要.docx', category: 'report', deleterId: '2', deleterName: '李四', deletedAt: '2024-12-18T14:30:00Z', expireAt: '2025-01-17T14:30:00Z' },
    { id: '3', documentId: 'd3', documentTitle: '2024年度财务预算表.xlsx', category: 'report', deleterId: '3', deleterName: '王五', deletedAt: '2024-12-15T09:00:00Z', expireAt: '2025-01-14T09:00:00Z' },
    { id: '4', documentId: 'd4', documentTitle: '产品需求文档V2.0.docx', category: 'plan', deleterId: '4', deleterName: '赵六', deletedAt: '2024-12-10T16:00:00Z', expireAt: '2025-01-09T16:00:00Z' },
    { id: '5', documentId: 'd5', documentTitle: '员工绩效考核管理制度.docx', category: 'policy', deleterId: '5', deleterName: '孙七', deletedAt: '2024-12-05T11:00:00Z', expireAt: '2025-01-04T11:00:00Z' }
  ]
  setTotal(5)
})
</script>

<template>
  <div class="h-full flex flex-col bg-neutral-50">
    <div class="px-6 py-4 bg-white border-b border-neutral-200">
      <Breadcrumb />
    </div>

    <div class="bg-white border-b border-neutral-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <Trash2 class="w-8 h-8 text-danger-500" />
          <div>
            <h1 class="text-xl font-semibold text-neutral-800">回收站</h1>
            <p class="text-sm text-neutral-500 mt-1">文档删除后将保留30天，到期自动永久删除</p>
          </div>
        </div>
        <div v-if="hasSelection" class="flex items-center gap-2">
          <button
            @click="confirmBatchRestore"
            class="flex items-center gap-2 px-4 py-2 text-sm text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors font-medium"
          >
            <RotateCcw class="w-4 h-4" /> 批量恢复 ({{ selectedIds.length }})
          </button>
          <button
            @click="confirmBatchDelete"
            class="flex items-center gap-2 px-4 py-2 text-sm text-danger-600 bg-danger-50 hover:bg-danger-100 rounded-lg transition-colors font-medium"
          >
            <Trash2 class="w-4 h-4" /> 批量永久删除 ({{ selectedIds.length }})
          </button>
        </div>
      </div>
    </div>

    <div class="bg-white border-b border-neutral-200 px-6 py-3">
      <div class="flex items-center justify-between">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索已删除的文档..."
            class="pl-9 pr-4 py-2 w-72 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <div class="text-sm text-neutral-500">
          共 <span class="text-neutral-800 font-medium">{{ total }}</span> 个文档
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="filteredDocuments.length > 0" class="bg-white rounded-xl shadow-card overflow-hidden">
        <table class="w-full">
          <thead class="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th class="w-12 px-4 py-3 text-left">
                <button @click="toggleSelectAll" class="text-neutral-400 hover:text-neutral-600">
                  <CheckSquare v-if="allSelected" class="w-5 h-5 text-primary-600" />
                  <Square v-else class="w-5 h-5" />
                </button>
              </th>
              <th
                class="px-4 py-3 text-left text-sm font-semibold text-neutral-600 cursor-pointer hover:bg-neutral-100"
                @click="toggleSort('documentTitle')"
              >
                <div class="flex items-center gap-1">
                  文档名称
                  <ArrowUpDown class="w-4 h-4" :class="{ 'text-primary-600': sortBy === 'documentTitle' }" />
                </div>
              </th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-neutral-600">删除人</th>
              <th
                class="px-4 py-3 text-left text-sm font-semibold text-neutral-600 cursor-pointer hover:bg-neutral-100"
                @click="toggleSort('deletedAt')"
              >
                <div class="flex items-center gap-1">
                  删除时间
                  <ArrowUpDown class="w-4 h-4" :class="{ 'text-primary-600': sortBy === 'deletedAt' }" />
                </div>
              </th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-neutral-600">剩余天数</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-neutral-600">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr
              v-for="doc in filteredDocuments"
              :key="doc.id"
              class="hover:bg-neutral-50 transition-colors"
              :class="{ 'bg-primary-50/50': selectedIds.includes(doc.id) }"
            >
              <td class="px-4 py-4">
                <button @click="toggleSelect(doc.id)" class="text-neutral-400 hover:text-neutral-600">
                  <CheckSquare v-if="selectedIds.includes(doc.id)" class="w-5 h-5 text-primary-600" />
                  <Square v-else class="w-5 h-5" />
                </button>
              </td>
              <td class="px-4 py-4">
                <div class="flex items-center gap-3">
                  <FileText class="w-5 h-5 text-neutral-400" />
                  <span class="font-medium text-neutral-800">{{ doc.documentTitle }}</span>
                </div>
              </td>
              <td class="px-4 py-4">
                <div class="flex items-center gap-2 text-sm text-neutral-600">
                  <User class="w-4 h-4 text-neutral-400" />
                  {{ doc.deleterName }}
                </div>
              </td>
              <td class="px-4 py-4">
                <div class="flex items-center gap-2 text-sm text-neutral-600">
                  <Clock class="w-4 h-4 text-neutral-400" />
                  {{ formatDate(doc.deletedAt) }}
                </div>
              </td>
              <td class="px-4 py-4">
                <span
                  :class="[
                    'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full',
                    getRemainingClass(getRemainingDays(doc.deletedAt))
                  ]"
                >
                  <AlertTriangle v-if="getRemainingDays(doc.deletedAt) <= 7" class="w-3.5 h-3.5" />
                  {{ getRemainingDays(doc.deletedAt) }} 天后删除
                </span>
              </td>
              <td class="px-4 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="confirmRestore(doc)"
                    class="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <RotateCcw class="w-4 h-4" /> 恢复
                  </button>
                  <button
                    @click="confirmDelete(doc)"
                    class="flex items-center gap-1.5 px-3 py-1.5 text-sm text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                  >
                    <Trash2 class="w-4 h-4" /> 永久删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <EmptyState v-else type="no-result" title="回收站为空" description="暂无已删除的文档" />

      <div v-if="filteredDocuments.length > 0" class="mt-6">
        <Pagination
          :currentPage="page"
          :pageSize="pageSize"
          :total="total"
          @update:currentPage="handlePageChange"
          @update:pageSize="handlePageSizeChange"
        />
      </div>
    </div>

    <ConfirmDialog
      v-model="showRestoreConfirm"
      :title="isBatchAction ? '批量恢复文档' : '恢复文档'"
      :message="restoreMessage"
      confirmText="恢复"
      cancelText="取消"
      type="info"
      @confirm="handleRestore"
    />

    <ConfirmDialog
      v-model="showDeleteConfirm"
      :title="isBatchAction ? '批量永久删除' : '永久删除文档'"
      :message="deleteMessage"
      confirmText="永久删除"
      cancelText="取消"
      type="danger"
      @confirm="handleDelete"
    />
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
