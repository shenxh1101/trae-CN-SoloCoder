import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'transferred'
export type ApprovalType = 'document' | 'department' | 'permission' | 'other'

export interface ApprovalItem {
  id: string
  type: ApprovalType
  title: string
  description: string
  documentId?: string
  documentTitle?: string
  applicantId: string
  applicantName: string
  applicantDepartment: string
  approverId: string
  approverName: string
  status: ApprovalStatus
  remark?: string
  createdAt: string
  approvedAt?: string
  rejectedAt?: string
  transferredTo?: string
  transferredToName?: string
}

export interface ApprovalStatistics {
  pending: number
  approved: number
  rejected: number
  transferred: number
  total: number
}

export interface ApprovalFilter {
  status: ApprovalStatus | ''
  type: ApprovalType | ''
  dateRange: [string, string] | null
  page: number
  pageSize: number
}

const defaultFilter: ApprovalFilter = {
  status: '',
  type: '',
  dateRange: null,
  page: 1,
  pageSize: 20
}

export const useApprovalStore = defineStore('approval', () => {
  const pendingCount = ref<number>(0)
  const approvals = ref<ApprovalItem[]>([])
  const total = ref<number>(0)
  const loading = ref<boolean>(false)
  const filter = ref<ApprovalFilter>({ ...defaultFilter })
  const statistics = ref<ApprovalStatistics>({
    pending: 0,
    approved: 0,
    rejected: 0,
    transferred: 0,
    total: 0
  })
  const currentApproval = ref<ApprovalItem | null>(null)

  const pendingApprovals = computed(() => 
    approvals.value.filter(a => a.status === 'pending')
  )

  const hasPending = computed(() => pendingCount.value > 0)

  const filteredApprovals = computed(() => {
    let result = [...approvals.value]
    
    if (filter.value.status) {
      result = result.filter(a => a.status === filter.value.status)
    }
    if (filter.value.type) {
      result = result.filter(a => a.type === filter.value.type)
    }
    if (filter.value.dateRange) {
      const [start, end] = filter.value.dateRange
      result = result.filter(a => {
        const date = new Date(a.createdAt)
        return date >= new Date(start) && date <= new Date(end)
      })
    }
    
    return result
  })

  function setPendingCount(count: number): void {
    pendingCount.value = count
  }

  function incrementPendingCount(): void {
    pendingCount.value++
    statistics.value.pending++
    statistics.value.total++
  }

  function decrementPendingCount(): void {
    if (pendingCount.value > 0) {
      pendingCount.value--
    }
  }

  function setApprovals(items: ApprovalItem[], totalCount: number): void {
    approvals.value = items
    total.value = totalCount
  }

  function setLoading(isLoading: boolean): void {
    loading.value = isLoading
  }

  function setCurrentApproval(approval: ApprovalItem | null): void {
    currentApproval.value = approval
  }

  function updateFilter(params: Partial<ApprovalFilter>): void {
    filter.value = { ...filter.value, ...params }
    if (params.page === undefined) {
      filter.value.page = 1
    }
  }

  function resetFilter(): void {
    filter.value = { ...defaultFilter }
  }

  function setStatistics(stats: Partial<ApprovalStatistics>): void {
    statistics.value = { ...statistics.value, ...stats }
  }

  function addApproval(approval: ApprovalItem): void {
    approvals.value.unshift(approval)
    total.value++
    if (approval.status === 'pending') {
      incrementPendingCount()
    }
  }

  function approve(id: string, remark?: string): Promise<void> {
    return new Promise((resolve) => {
      const item = approvals.value.find(a => a.id === id)
      if (item) {
        item.status = 'approved'
        item.remark = remark
        item.approvedAt = new Date().toISOString()
        statistics.value.approved++
        statistics.value.pending--
        decrementPendingCount()
      }
      if (currentApproval.value?.id === id && item) {
        currentApproval.value = { ...item }
      }
      resolve()
    })
  }

  function reject(id: string, remark?: string): Promise<void> {
    return new Promise((resolve) => {
      const item = approvals.value.find(a => a.id === id)
      if (item) {
        item.status = 'rejected'
        item.remark = remark
        item.rejectedAt = new Date().toISOString()
        statistics.value.rejected++
        statistics.value.pending--
        decrementPendingCount()
      }
      if (currentApproval.value?.id === id && item) {
        currentApproval.value = { ...item }
      }
      resolve()
    })
  }

  function transfer(id: string, targetUserId: string, targetUserName: string, remark?: string): Promise<void> {
    return new Promise((resolve) => {
      const item = approvals.value.find(a => a.id === id)
      if (item) {
        item.status = 'transferred'
        item.remark = remark
        item.transferredTo = targetUserId
        item.transferredToName = targetUserName
        statistics.value.transferred++
        statistics.value.pending--
        decrementPendingCount()
      }
      if (currentApproval.value?.id === id && item) {
        currentApproval.value = { ...item }
      }
      resolve()
    })
  }

  function batchApprove(ids: string[], remark?: string): Promise<void> {
    return Promise.all(ids.map(id => approve(id, remark))).then(() => undefined)
  }

  function batchReject(ids: string[], remark?: string): Promise<void> {
    return Promise.all(ids.map(id => reject(id, remark))).then(() => undefined)
  }

  function batchTransfer(ids: string[], targetUserId: string, targetUserName: string, remark?: string): Promise<void> {
    return Promise.all(ids.map(id => transfer(id, targetUserId, targetUserName, remark))).then(() => undefined)
  }

  function removeApproval(id: string): void {
    const index = approvals.value.findIndex(a => a.id === id)
    if (index > -1) {
      const item = approvals.value[index]
      if (item.status === 'pending') {
        decrementPendingCount()
        statistics.value.pending--
      }
      statistics.value[item.status]--
      statistics.value.total--
      approvals.value.splice(index, 1)
      total.value--
    }
    if (currentApproval.value?.id === id) {
      currentApproval.value = null
    }
  }

  function getApprovalById(id: string): ApprovalItem | undefined {
    return approvals.value.find(a => a.id === id)
  }

  function setPage(page: number): void {
    filter.value.page = page
  }

  function setPageSize(size: number): void {
    filter.value.pageSize = size
    filter.value.page = 1
  }

  function fetchStatistics(): Promise<ApprovalStatistics> {
    return new Promise((resolve) => {
      const stats: ApprovalStatistics = {
        pending: pendingCount.value,
        approved: 0,
        rejected: 0,
        transferred: 0,
        total: 0
      }
      approvals.value.forEach(a => {
        stats.total++
        if (a.status === 'approved') stats.approved++
        else if (a.status === 'rejected') stats.rejected++
        else if (a.status === 'transferred') stats.transferred++
      })
      statistics.value = stats
      resolve(stats)
    })
  }

  return {
    pendingCount,
    approvals,
    total,
    loading,
    filter,
    statistics,
    currentApproval,
    pendingApprovals,
    hasPending,
    filteredApprovals,
    setPendingCount,
    incrementPendingCount,
    decrementPendingCount,
    setApprovals,
    setLoading,
    setCurrentApproval,
    updateFilter,
    resetFilter,
    setStatistics,
    addApproval,
    approve,
    reject,
    transfer,
    batchApprove,
    batchReject,
    batchTransfer,
    removeApproval,
    getApprovalById,
    setPage,
    setPageSize,
    fetchStatistics
  }
})
