import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type DocumentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'archived'
export type DocumentType = 'policy' | 'procedure' | 'guideline' | 'manual' | 'other'

export interface Document {
  id: string
  title: string
  content: string
  type: DocumentType
  status: DocumentStatus
  version: string
  authorId: string
  authorName: string
  departmentId: string
  departmentName: string
  tags: string[]
  viewCount: number
  likeCount: number
  createdAt: string
  updatedAt: string
  publishedAt?: string
  expiresAt?: string
}

export interface DocumentSearchParams {
  keyword: string
  type: DocumentType | ''
  status: DocumentStatus | ''
  departmentId: string
  tags: string[]
  dateRange: [string, string] | null
  page: number
  pageSize: number
  sortBy: 'createdAt' | 'updatedAt' | 'viewCount' | 'likeCount' | 'title'
  sortOrder: 'asc' | 'desc'
}

export interface DocumentFilterOptions {
  types: DocumentType[]
  statuses: DocumentStatus[]
  departments: Array<{ id: string; name: string }>
  tags: string[]
}

export interface DocumentState {
  currentDocument: Document | null
  documents: Document[]
  total: number
  loading: boolean
  searchParams: DocumentSearchParams
  filterOptions: DocumentFilterOptions
  selectedDocuments: string[]
  viewMode: 'list' | 'grid' | 'tree'
}

const defaultSearchParams: DocumentSearchParams = {
  keyword: '',
  type: '',
  status: '',
  departmentId: '',
  tags: [],
  dateRange: null,
  page: 1,
  pageSize: 20,
  sortBy: 'updatedAt',
  sortOrder: 'desc'
}

const defaultFilterOptions: DocumentFilterOptions = {
  types: ['policy', 'procedure', 'guideline', 'manual', 'other'],
  statuses: ['draft', 'pending', 'approved', 'rejected', 'archived'],
  departments: [],
  tags: []
}

export const useDocumentStore = defineStore('document', () => {
  const state = ref<DocumentState>({
    currentDocument: null,
    documents: [],
    total: 0,
    loading: false,
    searchParams: { ...defaultSearchParams },
    filterOptions: { ...defaultFilterOptions },
    selectedDocuments: [],
    viewMode: 'list'
  })

  const currentDocument = computed(() => state.value.currentDocument)
  const documents = computed(() => state.value.documents)
  const total = computed(() => state.value.total)
  const loading = computed(() => state.value.loading)
  const searchParams = computed(() => state.value.searchParams)
  const filterOptions = computed(() => state.value.filterOptions)
  const selectedDocuments = computed(() => state.value.selectedDocuments)
  const viewMode = computed(() => state.value.viewMode)

  const hasSelected = computed(() => state.value.selectedDocuments.length > 0)
  const allSelected = computed(() => 
    state.value.documents.length > 0 && 
    state.value.selectedDocuments.length === state.value.documents.length
  )

  function setCurrentDocument(doc: Document | null): void {
    state.value.currentDocument = doc
  }

  function setDocuments(docs: Document[], total: number): void {
    state.value.documents = docs
    state.value.total = total
  }

  function setLoading(loading: boolean): void {
    state.value.loading = loading
  }

  function updateSearchParams(params: Partial<DocumentSearchParams>): void {
    state.value.searchParams = { ...state.value.searchParams, ...params }
    if (params.page === undefined) {
      state.value.searchParams.page = 1
    }
  }

  function resetSearchParams(): void {
    state.value.searchParams = { ...defaultSearchParams }
  }

  function setFilterOptions(options: Partial<DocumentFilterOptions>): void {
    state.value.filterOptions = { ...state.value.filterOptions, ...options }
  }

  function toggleDocumentSelection(id: string): void {
    const index = state.value.selectedDocuments.indexOf(id)
    if (index > -1) {
      state.value.selectedDocuments.splice(index, 1)
    } else {
      state.value.selectedDocuments.push(id)
    }
  }

  function selectAllDocuments(): void {
    if (allSelected.value) {
      state.value.selectedDocuments = []
    } else {
      state.value.selectedDocuments = state.value.documents.map(doc => doc.id)
    }
  }

  function clearSelectedDocuments(): void {
    state.value.selectedDocuments = []
  }

  function setViewMode(mode: 'list' | 'grid' | 'tree'): void {
    state.value.viewMode = mode
  }

  function addDocument(doc: Document): void {
    state.value.documents.unshift(doc)
    state.value.total++
  }

  function updateDocument(id: string, updates: Partial<Document>): void {
    const index = state.value.documents.findIndex(doc => doc.id === id)
    if (index > -1) {
      state.value.documents[index] = { ...state.value.documents[index], ...updates }
    }
    if (state.value.currentDocument?.id === id) {
      state.value.currentDocument = { ...state.value.currentDocument, ...updates }
    }
  }

  function removeDocument(id: string): void {
    state.value.documents = state.value.documents.filter(doc => doc.id !== id)
    state.value.total--
    if (state.value.currentDocument?.id === id) {
      state.value.currentDocument = null
    }
    const selectedIndex = state.value.selectedDocuments.indexOf(id)
    if (selectedIndex > -1) {
      state.value.selectedDocuments.splice(selectedIndex, 1)
    }
  }

  function getDocumentById(id: string): Document | undefined {
    return state.value.documents.find(doc => doc.id === id)
  }

  function batchUpdateDocuments(ids: string[], updates: Partial<Document>): void {
    ids.forEach(id => updateDocument(id, updates))
  }

  function batchRemoveDocuments(ids: string[]): void {
    ids.forEach(id => removeDocument(id))
  }

  function setPage(page: number): void {
    state.value.searchParams.page = page
  }

  function setPageSize(size: number): void {
    state.value.searchParams.pageSize = size
    state.value.searchParams.page = 1
  }

  function setSort(sortBy: DocumentSearchParams['sortBy'], sortOrder: 'asc' | 'desc'): void {
    state.value.searchParams.sortBy = sortBy
    state.value.searchParams.sortOrder = sortOrder
  }

  function toggleSort(sortBy: DocumentSearchParams['sortBy']): void {
    if (state.value.searchParams.sortBy === sortBy) {
      state.value.searchParams.sortOrder = 
        state.value.searchParams.sortOrder === 'asc' ? 'desc' : 'asc'
    } else {
      state.value.searchParams.sortBy = sortBy
      state.value.searchParams.sortOrder = 'desc'
    }
  }

  return {
    state,
    currentDocument,
    documents,
    total,
    loading,
    searchParams,
    filterOptions,
    selectedDocuments,
    viewMode,
    hasSelected,
    allSelected,
    setCurrentDocument,
    setDocuments,
    setLoading,
    updateSearchParams,
    resetSearchParams,
    setFilterOptions,
    toggleDocumentSelection,
    selectAllDocuments,
    clearSelectedDocuments,
    setViewMode,
    addDocument,
    updateDocument,
    removeDocument,
    getDocumentById,
    batchUpdateDocuments,
    batchRemoveDocuments,
    setPage,
    setPageSize,
    setSort,
    toggleSort
  }
})
