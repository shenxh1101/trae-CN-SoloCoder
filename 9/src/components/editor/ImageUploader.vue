<template>
  <div class="relative">
    <div
      ref="dropZoneRef"
      @drop="handleDrop"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @paste="handlePaste"
      :class="[
        'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
      ]"
    >
      <input
        ref="fileInputRef"
        type="file"
        :accept="accept"
        multiple
        class="hidden"
        @change="handleFileSelect"
      />
      <Upload class="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <p class="text-gray-600 mb-2">拖拽图片到此处或点击上传</p>
      <p class="text-sm text-gray-400">支持 {{ accept }}，单张最大 {{ maxSizeMB }}MB</p>
    </div>

    <div v-if="uploadingFiles.length > 0" class="mt-4 space-y-2">
      <div
        v-for="file in uploadingFiles"
        :key="file.id"
        class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
      >
        <Image class="w-10 h-10 text-gray-400 flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-700 truncate">{{ file.name }}</p>
          <div class="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="h-full bg-blue-500 transition-all duration-300"
              :style="{ width: `${file.progress}%` }"
            />
          </div>
        </div>
        <span class="text-sm text-gray-500 w-12 text-right">{{ file.progress }}%</span>
        <button
          v-if="file.status === 'uploading'"
          @click="cancelUpload(file.id)"
          class="p-1 text-gray-400 hover:text-red-500"
        >
          <X class="w-5 h-5" />
        </button>
        <CheckCircle v-else-if="file.status === 'success'" class="w-5 h-5 text-green-500" />
        <XCircle v-else class="w-5 h-5 text-red-500" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Upload, Image, X, CheckCircle, XCircle } from 'lucide-vue-next'
import { uploadImage, type UploadImageResult } from '@/api/document'

interface UploadingFile {
  id: string
  name: string
  size: number
  progress: number
  status: 'uploading' | 'success' | 'error'
  file?: File
}

interface Props {
  maxSize?: number
  accept?: string
  autoUpload?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxSize: 5 * 1024 * 1024,
  accept: 'image/*',
  autoUpload: true
})

const emit = defineEmits<{
  (e: 'upload-success', result: UploadImageResult): void
  (e: 'upload-error', error: Error, fileName: string): void
  (e: 'files-selected', files: File[]): void
}>()

const dropZoneRef = ref<HTMLElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const uploadingFiles = ref<UploadingFile[]>([])
const abortControllers = ref<Map<string, AbortController>>(new Map())

const maxSizeMB = computed(() => Math.round(props.maxSize / 1024 / 1024))

const generateId = () => Math.random().toString(36).substring(2, 9)

const validateFile = (file: File): boolean => {
  if (file.size > props.maxSize) {
    emit('upload-error', new Error(`文件大小超过限制，最大${maxSizeMB.value}MB`), file.name)
    return false
  }
  if (!file.type.startsWith('image/')) {
    emit('upload-error', new Error('只支持图片文件'), file.name)
    return false
  }
  return true
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  processFiles(files)
  input.value = ''
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  event.preventDefault()
  const files = Array.from(event.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'))
  processFiles(files)
}

const handlePaste = (event: ClipboardEvent) => {
  const items = Array.from(event.clipboardData?.items || [])
  const files: File[] = []
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }
  if (files.length > 0) {
    event.preventDefault()
    processFiles(files)
  }
}

const processFiles = (files: File[]) => {
  const validFiles = files.filter(validateFile)
  if (validFiles.length === 0) return

  emit('files-selected', validFiles)

  if (props.autoUpload) {
    validFiles.forEach(file => uploadFile(file))
  }
}

const uploadFile = async (file: File) => {
  const id = generateId()
  const uploadingFile: UploadingFile = {
    id,
    name: file.name,
    size: file.size,
    progress: 0,
    status: 'uploading',
    file
  }
  uploadingFiles.value.push(uploadingFile)

  const abortController = new AbortController()
  abortControllers.value.set(id, abortController)

  try {
    const result = await uploadImage(file)
    uploadingFile.progress = 100
    uploadingFile.status = 'success'
    emit('upload-success', result.data)
  } catch (error) {
    uploadingFile.status = 'error'
    emit('upload-error', error as Error, file.name)
  } finally {
    abortControllers.value.delete(id)
    setTimeout(() => {
      const index = uploadingFiles.value.findIndex(f => f.id === id)
      if (index > -1) uploadingFiles.value.splice(index, 1)
    }, 2000)
  }
}

const cancelUpload = (id: string) => {
  const controller = abortControllers.value.get(id)
  if (controller) {
    controller.abort()
    abortControllers.value.delete(id)
  }
  const index = uploadingFiles.value.findIndex(f => f.id === id)
  if (index > -1) uploadingFiles.value.splice(index, 1)
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

defineExpose({
  triggerFileInput,
  uploadFile,
  processFiles
})
</script>
