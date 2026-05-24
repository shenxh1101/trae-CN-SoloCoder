import { ref, computed } from 'vue'
import {
  getDocument,
  getDocumentList,
  getDocumentVersions,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadImage,
  type Document,
  type DocumentVersion,
  type CreateDocumentRequest,
  type UpdateDocumentRequest,
  type DocumentListParams,
  type PageResult
} from '@/api/document'

export function useDocument(docId?: number) {
  const document = ref<Document | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchDocument(id?: number) {
    const targetId = id || docId
    if (!targetId) return null

    loading.value = true
    error.value = null
    try {
      const response = await getDocument(targetId)
      if (response.code === 200) {
        document.value = response.data
        return response.data
      }
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
    return null
  }

  return {
    document: computed(() => document.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchDocument
  }
}

export function useDocumentList() {
  const documents = ref<Document[]>([])
  const total = ref(0)
  const loading = ref(false)
  const params = ref<DocumentListParams>({
    page: 0,
    size: 20,
    sortBy: 'updatedAt',
    sortDir: 'desc'
  })

  async function fetchDocuments(newParams?: Partial<DocumentListParams>) {
    if (newParams) {
      params.value = { ...params.value, ...newParams }
    }

    loading.value = true
    try {
      const response = await getDocumentList(params.value)
      if (response.code === 200) {
        documents.value = response.data.content
        total.value = response.data.totalElements
        return response.data
      }
    } catch (e) {
      console.error('Failed to fetch documents:', e)
    } finally {
      loading.value = false
    }
    return null
  }

  function setParams(newParams: Partial<DocumentListParams>) {
    params.value = { ...params.value, ...newParams }
  }

  function resetParams() {
    params.value = {
      page: 0,
      size: 20,
      sortBy: 'updatedAt',
      sortDir: 'desc'
    }
  }

  return {
    documents: computed(() => documents.value),
    total: computed(() => total.value),
    loading: computed(() => loading.value),
    params: computed(() => params.value),
    fetchDocuments,
    setParams,
    resetParams
  }
}

export function useDocumentVersions(docId: number) {
  const versions = ref<DocumentVersion[]>([])
  const loading = ref(false)

  async function fetchVersions() {
    loading.value = true
    try {
      const response = await getDocumentVersions(docId)
      if (response.code === 200) {
        versions.value = response.data
      }
    } catch (e) {
      console.error('Failed to fetch versions:', e)
    } finally {
      loading.value = false
    }
  }

  return {
    versions: computed(() => versions.value),
    loading: computed(() => loading.value),
    fetchVersions
  }
}

export function useAutoSave() {
  const lastSaved = ref<Date | null>(null)
  const saving = ref(false)
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  function autoSave(saveFn: () => Promise<void>, delay = 30000) {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }

    saveTimer = setTimeout(async () => {
      saving.value = true
      try {
        await saveFn()
        lastSaved.value = new Date()
      } finally {
        saving.value = false
      }
    }, delay)
  }

  function cancelAutoSave() {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
  }

  return {
    lastSaved: computed(() => lastSaved.value),
    saving: computed(() => saving.value),
    autoSave,
    cancelAutoSave
  }
}

export function usePasteImageUpload() {
  async function handlePaste(event: ClipboardEvent, editorRef: any) {
    const items = event.clipboardData?.items
    if (!items) return

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        event.preventDefault()
        const file = item.getAsFile()
        if (file) {
          try {
            const response = await uploadImage(file)
            if (response.code === 200) {
              const imageUrl = response.data
              if (editorRef.value && typeof editorRef.value.insertImage === 'function') {
                editorRef.value.insertImage(imageUrl)
              }
            }
          } catch (e) {
            console.error('Failed to upload image:', e)
          }
        }
        break
      }
    }
  }

  return {
    handlePaste
  }
}

export async function createNewDocument(data: CreateDocumentRequest): Promise<Document | null> {
  try {
    const response = await createDocument(data)
    if (response.code === 200) {
      return response.data
    }
  } catch (e) {
    console.error('Failed to create document:', e)
  }
  return null
}

export async function saveDocument(id: number, data: UpdateDocumentRequest): Promise<Document | null> {
  try {
    const response = await updateDocument(id, data)
    if (response.code === 200) {
      return response.data
    }
  } catch (e) {
    console.error('Failed to save document:', e)
  }
  return null
}

export async function removeDocument(id: number): Promise<boolean> {
  try {
    const response = await deleteDocument(id)
    return response.code === 200
  } catch (e) {
    console.error('Failed to delete document:', e)
    return false
  }
}
