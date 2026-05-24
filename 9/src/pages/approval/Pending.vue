<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Clock, User, Calendar, FileText, Check, X, Filter, ChevronDown,
  Search, Calendar as CalendarIcon, MoreHorizontal, Square, CheckSquare
} from 'lucide-vue-next'
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import Pagination from '@/components/common/Pagination.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { usePagination } from '@/composables/usePagination'
import { getPendingApprovals, getMySubmittedApprovals, getMyApprovedApprovals, processApproval } from '@/api/approval'
import type { Approval } from '@/api/approval'
import { cn } from '@/lib/utils'

const router = useRouter()

type TabType = 'pending' | 'initiated' | 'approved'

const activeTab = ref<TabType>('pending')
const approvals = ref<Approval[]>([])
const loading = ref(false)
const selectedIds = ref<number[]>([])
const showBatchAction = ref(false)
const showFilter = ref(false)
const showProcessDialog = ref(false)
const processType = ref<'APPROVED' | 'REJECTED'>('APPROVED')
const processComment = ref('')
const currentApproval = ref<Approval | null>(null)
const showBatchDialog = ref(false)
const batchType = ref<'APPROVED' | 'REJECTED'>('APPROVED')
const batchComment = ref('')

const filters = ref({
  type: '',
  dateRange: ''
})

const { page, pageSize, total, goto, changePageSize, setTotal, getPaginationParams } = usePagination({ defaultPageSize: 10 })

const tabs = [
  { key: 'pending' as TabType, label: '待我审批', count: 3 },
  { key: 'initiated' as TabType, label: '我发起的', count: 5 },
  { key: 'approved' as TabType, label: '我已审批', count: 12 }
]

const allSelected = computed(() => approvals.value.length > 0 && selectedIds.value.length === approvals.value.length)
const hasSelection = computed(() => selectedIds.value.length > 0)

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function getStatusType(status: string): 'draft' | 'pending' | 'published' | 'rejected' {
  const s = status.toLowerCase()
  if (s === 'approved') return 'published'
  if (s === 'rejected') return 'rejected'
  if (s === 'pending') return 'pending'
  return 'draft'
}

function switchTab(tab: TabType) {
  activeTab.value = tab
  selectedIds.value = []
  fetchApprovals()
}

function toggleSelect(id: number) {
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
    selectedIds.value = approvals.value.map(a => a.id)
  }
}

function openProcess(approval: Approval, type: 'APPROVED' | 'REJECTED') {
  currentApproval.value = approval
  processType.value = type
  processComment.value = ''
  showProcessDialog.value = true
}

async function confirmProcess() {
  if (!currentApproval.value) return
  try {
    await processApproval({
      approvalId: currentApproval.value.id,
      action: processType.value,
      comment: processComment.value
    })
    showProcessDialog.value = false
    fetchApprovals()
  } catch (error) {
    console.error('Process failed:', error)
  }
}

function openBatchProcess(type: 'APPROVED' | 'REJECTED') {
  if (selectedIds.value.length === 0) return
  batchType.value = type
  batchComment.value = ''
  showBatchDialog.value = true
}

async function confirmBatchProcess() {
  try {
    for (const id of selectedIds.value) {
      await processApproval({
        approvalId: id,
        action: batchType.value,
        comment: batchComment.value || `批量${batchType.value === 'APPROVED' ? '通过' : '驳回'}`
      })
    }
    showBatchDialog.value = false
    selectedIds.value = []
    fetchApprovals()
  } catch (error) {
    console.error('Batch process failed:', error)
  }
}

function goToDocument(documentId: number) {
  router.push(`/document/${documentId}`)
}

async function fetchApprovals() {
  loading.value = true
  try {
    const { page: pageNum, pageSize: size } = getPaginationParams()
    let response
    if (activeTab.value === 'pending') {
      response = await getPendingApprovals(pageNum, size)
    } else if (activeTab.value === 'initiated') {
      response = await getMySubmittedApprovals(pageNum, size)
    } else {
      response = await getMyApprovedApprovals(pageNum, size)
    }
    if (response.code === 200) {
      approvals.value = response.data.content
      setTotal(response.data.totalElements)
    }
  } catch (error) {
    console.error('Failed to fetch approvals:', error)
  } finally {
    loading.value = false
  }
}

function handlePageChange(newPage: number) {
  goto(newPage)
  fetchApprovals()
}

function handlePageSizeChange(size: number) {
  changePageSize(size)
  fetchApprovals()
}

onMounted(() => {
  approvals.value = [
    {
      id: '1', documentId: '1', documentTitle: '关于调整部门架构的通知',
      type: 'document', status: 0, initiatorId: '2', initiatorName: '王总',
      currentApproverId: '1', currentApproverName: '张三',
      createdAt: '2024-01-20T10:00:00Z', reason: '组织架构优化'
    },
    {
      id: '2', documentId: '2', documentTitle: '2024年Q1预算方案',
      type: 'document', status: 0, initiatorId: '3', initiatorName: '李总监',
      currentApproverId: '1', currentApproverName: '张三',
      createdAt: '2024-01-19T15:30:00Z', reason: '季度预算审批'
    },
    {
      id: '3', documentId: '3', documentTitle: '员工福利制度修订方案',
      type: 'document', status: 0, initiatorId: '4', initiatorName: '赵经理',
      currentApproverId: '1', currentApproverName: '张三',
      createdAt: '2024-01-18T11:00:00Z', reason: '福利政策调整'
    }
  ] as unknown as Approval[]
  setTotal(15)
})
</script>

<template>
  <div class="h-full flex flex-col bg-neutral-50">
    <div class="px-6 py-4 bg-white border-b border-neutral-200">
      <Breadcrumb />
    </div>

    <div class="bg-white border-b border-neutral-200">
      <div class="px-6">
        <div class="flex items-center gap-1">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="switchTab(tab.key)"
            :class="[
              'px-5 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            ]"
          >
            {{ tab.label }}
            <span
              v-if="tab.count > 0"
              :class="[
                'ml-2 px-1.5 py-0.5 text-xs rounded-full',
                activeTab === tab.key ? 'bg-primary-100 text-primary-600' : 'bg-neutral-100 text-neutral-600'
              ]"
            >
              {{ tab.count }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <div class="bg-white border-b border-neutral-200 px-6 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="搜索文档标题、发起人..."
              class="pl-9 pr-4 py-2 w-64 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <button
            @click="showFilter = !showFilter"
            :class="[
              'flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors',
              showFilter ? 'bg-primary-50 text-primary-600' : 'text-neutral-600 hover:bg-neutral-100'
            ]"
          >
            <Filter class="w-4 h-4" /> 筛选
          </button>
        </div>
        <div v-if="activeTab === 'pending'" class="flex items-center gap-2">
          <button
            v-if="hasSelection"
            @click="openBatchProcess('APPROVED')"
            class="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-success-500 hover:bg-success-600 rounded-lg transition-colors"
          >
            <Check class="w-4 h-4" /> 批量通过 ({{ selectedIds.length }})
          </button>
          <button
            v-if="hasSelection"
            @click="openBatchProcess('REJECTED')"
            class="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-danger-500 hover:bg-danger-600 rounded-lg transition-colors"
          >
            <X class="w-4 h-4" /> 批量驳回 ({{ selectedIds.length }})
          </button>
        </div>
      </div>

      <div v-show="showFilter" class="mt-3 pt-3 border-t border-neutral-100 flex items-center gap-6">
        <div class="flex items-center gap-2">
          <span class="text-sm text-neutral-500">审批类型：</span>
          <select
            v-model="filters.type"
            class="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
          >
            <option value="">全部</option>
            <option value="document">文档审批</option>
            <option value="department">部门调整</option>
            <option value="permission">权限申请</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-neutral-500">时间范围：</span>
          <div class="relative">
            <CalendarIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <select
              v-model="filters.dateRange"
              class="pl-9 pr-8 py-1.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 appearance-none"
            >
              <option value="">全部时间</option>
              <option value="today">今天</option>
              <option value="week">本周</option>
              <option value="month">本月</option>
              <option value="quarter">本季度</option>
            </select>
            <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          </div>
        </div>
        <button
          @click="fetchApprovals"
          class="px-4 py-1.5 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          应用筛选
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="approvals.length > 0" class="bg-white rounded-xl shadow-card overflow-hidden">
        <table class="w-full">
          <thead class="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th class="py-3 px-4 text-left w-10">
                <button @click="toggleSelectAll" class="text-neutral-400 hover:text-primary-600">
                  <CheckSquare v-if="allSelected" class="w-5 h-5 text-primary-600" />
                  <Square v-else class="w-5 h-5" />
                </button>
              </th>
              <th class="py-3 px-4 text-left text-sm font-medium text-neutral-500">文档标题</th>
              <th class="py-3 px-4 text-left text-sm font-medium text-neutral-500">发起人</th>
              <th class="py-3 px-4 text-left text-sm font-medium text-neutral-500">发起时间</th>
              <th class="py-3 px-4 text-left text-sm font-medium text-neutral-500">状态</th>
              <th class="py-3 px-4 text-left text-sm font-medium text-neutral-500">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr
              v-for="approval in approvals"
              :key="approval.id"
              class="hover:bg-neutral-50 transition-colors"
            >
              <td class="py-3 px-4">
                <button @click="toggleSelect(approval.id)" class="text-neutral-400 hover:text-primary-600">
                  <CheckSquare v-if="selectedIds.includes(approval.id)" class="w-5 h-5 text-primary-600" />
                  <Square v-else class="w-5 h-5" />
                </button>
              </td>
              <td class="py-3 px-4">
                <div
                  @click="goToDocument(approval.documentId)"
                  class="text-sm text-neutral-800 font-medium hover:text-primary-600 cursor-pointer transition-colors"
                >
                  {{ approval.documentTitle }}
                </div>
                <p class="text-xs text-neutral-500 mt-0.5">{{ approval.applyReason }}</p>
              </td>
              <td class="py-3 px-4">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center">
                    <User class="w-4 h-4 text-primary-600" />
                  </div>
                  <span class="text-sm text-neutral-700">{{ approval.submitterName }}</span>
                </div>
              </td>
              <td class="py-3 px-4">
                <span class="text-sm text-neutral-600">{{ formatDate(approval.createdAt) }}</span>
              </td>
              <td class="py-3 px-4">
                <StatusBadge :status="getStatusType(approval.status)" size="sm" />
              </td>
              <td class="py-3 px-4">
                <div v-if="activeTab === 'pending'" class="flex items-center gap-2">
                  <button
                    @click="openProcess(approval, 'APPROVED')"
                    class="flex items-center gap-1 px-3 py-1.5 text-sm text-success-600 hover:bg-success-50 rounded-lg transition-colors"
                  >
                    <Check class="w-4 h-4" /> 通过
                  </button>
                  <button
                    @click="openProcess(approval, 'REJECTED')"
                    class="flex items-center gap-1 px-3 py-1.5 text-sm text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                  >
                    <X class="w-4 h-4" /> 驳回
                  </button>
                </div>
                <button v-else class="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors">
                  <MoreHorizontal class="w-5 h-5 text-neutral-400" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <EmptyState
        v-else
        type="no-data"
        :title="activeTab === 'pending' ? '暂无待审批' : activeTab === 'initiated' ? '暂无发起的审批' : '暂无已审批'"
        :description="activeTab === 'pending' ? '你还没有待处理的审批事项' : '还没有发起过审批流程'"
      />
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

    <ConfirmDialog
      v-model="showProcessDialog"
      :title="processType === 'APPROVED' ? '审批通过' : '审批驳回'"
      :type="processType === 'APPROVED' ? 'success' : 'danger'"
      :confirm-text="processType === 'APPROVED' ? '确认通过' : '确认驳回'"
      @confirm="confirmProcess"
    >
      <div class="space-y-3">
        <p class="text-sm text-neutral-600">
          {{ processType === 'APPROVED' ? '确定要通过该审批吗？' : '确定要驳回该审批吗？' }}
        </p>
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">审批意见</label>
          <textarea
            v-model="processComment"
            :placeholder="processType === 'APPROVED' ? '请输入审批意见（可选）' : '请输入驳回原因'"
            rows="3"
            class="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 resize-none"
          />
        </div>
      </div>
    </ConfirmDialog>

    <ConfirmDialog
      v-model="showBatchDialog"
      :title="batchType === 'APPROVED' ? '批量通过' : '批量驳回'"
      :type="batchType === 'APPROVED' ? 'success' : 'danger'"
      :confirm-text="batchType === 'APPROVED' ? '确认批量通过' : '确认批量驳回'"
      @confirm="confirmBatchProcess"
    >
      <div class="space-y-3">
        <p class="text-sm text-neutral-600">
          {{ batchType === 'APPROVED' ? `确定要批量通过选中的 ${selectedIds.length} 条审批吗？` : `确定要批量驳回选中的 ${selectedIds.length} 条审批吗？` }}
        </p>
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">审批意见</label>
          <textarea
            v-model="batchComment"
            :placeholder="batchType === 'APPROVED' ? '请输入审批意见（可选）' : '请输入驳回原因'"
            rows="3"
            class="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 resize-none"
          />
        </div>
      </div>
    </ConfirmDialog>
  </div>
</template>
