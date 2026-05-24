<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ArrowLeft, Save, Send, FileText, Type, Hash, Folder, LayoutTemplate,
  Tag, Check, ChevronDown, AlertCircle
} from 'lucide-vue-next'
import RichTextEditor from '@/components/editor/RichTextEditor.vue'
import MarkdownEditor from '@/components/editor/MarkdownEditor.vue'
import { updateDocument, createDocument } from '@/api/document'
import { submitApproval } from '@/api/approval'
import { getTemplateList } from '@/api/template'
import { getDepartmentList } from '@/api/department'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useDebounceFn } from '@/composables/useDebounce'
import { cn } from '@/lib/utils'

const router = useRouter()
const route = useRoute()

const documentId = route.params.id as string
const isNew = !documentId

const editorMode = ref<'RICH_TEXT' | 'MARKDOWN'>('RICH_TEXT')
const title = ref('')
const content = ref('')
const category = ref('')
const tags = ref<string[]>([])
const tagInput = ref('')
const templateId = ref<string | null>(null)
const departmentId = ref('')
const autoSaveStatus = ref<'saved' | 'saving' | 'unsaved'>('saved')
const showSubmitDialog = ref(false)
const changeLog = ref('')

const templates = ref<Array<{ id: string; name: string }>>([])
const departments = ref<Array<{ id: string; name: string }>>([])
const categories = [
  { value: 'policy', label: '政策制度' },
  { value: 'procedure', label: '流程规范' },
  { value: 'guideline', label: '指导手册' },
  { value: 'manual', label: '操作手册' },
  { value: 'other', label: '其他' }
]
const availableTags = ['重要', '紧急', '参考', '必读', '精选', '待审核', '已审核']

const canSave = computed(() => title.value.trim() && content.value.trim())

const debouncedSave = useDebounceFn(() => {
  handleSave(true)
}, 5000)

watch([title, content], () => {
  autoSaveStatus.value = 'unsaved'
  debouncedSave.run()
})

function addTag() {
  const tag = tagInput.value.trim()
  if (tag && !tags.value.includes(tag)) {
    tags.value.push(tag)
  }
  tagInput.value = ''
}

function removeTag(tag: string) {
  const index = tags.value.indexOf(tag)
  if (index > -1) {
    tags.value.splice(index, 1)
  }
}

function toggleAvailableTag(tag: string) {
  if (tags.value.includes(tag)) {
    removeTag(tag)
  } else {
    tags.value.push(tag)
  }
}

function goBack() {
  if (autoSaveStatus.value === 'unsaved') {
    if (confirm('文档未保存，确定要离开吗？')) {
      router.back()
    }
  } else {
    router.back()
  }
}

async function handleSave(isAuto = false) {
  if (!canSave.value && !isAuto) return
  autoSaveStatus.value = 'saving'
  try {
    const params = {
      title: title.value,
      content: content.value,
      contentType: editorMode.value,
      category: category.value,
      tags: tags.value,
      templateId: templateId.value || undefined,
      departmentId: departmentId.value || undefined
    }
    if (isNew) {
      await createDocument(params as any)
    } else {
      await updateDocument(Number(documentId), params as any)
    }
    autoSaveStatus.value = 'saved'
  } catch (error) {
    autoSaveStatus.value = 'unsaved'
  }
}

async function handleSubmit() {
  if (!canSave.value) return
  try {
    await handleSave()
    showSubmitDialog.value = true
  } catch (error) {
    console.error('Failed to submit:', error)
  }
}

async function confirmSubmit() {
  try {
    await submitApproval({
      documentId: documentId || '',
      type: 'document',
      reason: changeLog.value || '文档审批',
      approverId: '1'
    } as any)
    showSubmitDialog.value = false
    router.back()
  } catch (error) {
    console.error('Failed to submit approval:', error)
  }
}

function toggleEditorMode() {
  editorMode.value = editorMode.value === 'RICH_TEXT' ? 'MARKDOWN' : 'RICH_TEXT'
}

onMounted(() => {
  if (!isNew) {
    title.value = '2024年度产品规划报告'
    content.value = '# 2024年度产品规划报告\n\n## 1. 背景介绍\n\n...'
    editorMode.value = 'MARKDOWN'
    category.value = 'policy'
    tags.value = ['重要']
  }
  templates.value = [
    { id: '1', name: '会议纪要模板' },
    { id: '2', name: '项目计划书模板' },
    { id: '3', name: '技术方案模板' }
  ]
  departments.value = [
    { id: '1', name: '技术部' },
    { id: '2', name: '产品部' },
    { id: '3', name: '运营部' }
  ]
})
</script>

<template>
  <div class="h-full flex flex-col bg-neutral-50">
    <div class="bg-white border-b border-neutral-200">
      <div class="px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="goBack" class="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <ArrowLeft class="w-5 h-5 text-neutral-600" />
          </button>
          <div>
            <h1 class="text-lg font-semibold text-neutral-800">{{ isNew ? '新建文档' : '编辑文档' }}</h1>
            <div class="flex items-center gap-2 mt-0.5">
              <span v-if="autoSaveStatus === 'saved'" class="text-xs text-success-600 flex items-center gap-1">
                <Check class="w-3.5 h-3.5" /> 已保存
              </span>
              <span v-else-if="autoSaveStatus === 'saving'" class="text-xs text-primary-600">保存中...</span>
              <span v-else class="text-xs text-warning-600 flex items-center gap-1">
                <AlertCircle class="w-3.5 h-3.5" /> 未保存
              </span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex bg-neutral-100 rounded-lg p-0.5">
            <button
              @click="toggleEditorMode"
              :class="[
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
                editorMode === 'RICH_TEXT'
                  ? 'bg-white shadow-sm text-primary-600'
                  : 'text-neutral-500 hover:text-neutral-700'
              ]"
            >
              <Type class="w-4 h-4" /> 富文本
            </button>
            <button
              @click="toggleEditorMode"
              :class="[
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
                editorMode === 'MARKDOWN'
                  ? 'bg-white shadow-sm text-primary-600'
                  : 'text-neutral-500 hover:text-neutral-700'
              ]"
            >
              <Hash class="w-4 h-4" /> Markdown
            </button>
          </div>
          <button
            @click="handleSave()"
            :disabled="!canSave"
            class="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Save class="w-4 h-4" /> 保存
          </button>
          <button
            @click="handleSubmit"
            :disabled="!canSave"
            class="flex items-center gap-2 px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Send class="w-4 h-4" /> 提交审批
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden">
      <aside class="w-56 bg-white border-r border-neutral-200 p-4 overflow-y-auto">
        <h4 class="text-sm font-semibold text-neutral-800 mb-3">文档目录</h4>
        <div class="space-y-1 text-sm text-neutral-600">
          <div class="py-1.5 px-2 bg-primary-50 text-primary-600 rounded-md">1. 背景介绍</div>
          <div class="py-1.5 px-2 hover:bg-neutral-50 rounded-md cursor-pointer pl-4">1.1 行业现状</div>
          <div class="py-1.5 px-2 hover:bg-neutral-50 rounded-md cursor-pointer pl-4">1.2 问题分析</div>
          <div class="py-1.5 px-2 hover:bg-neutral-50 rounded-md cursor-pointer">2. 目标与范围</div>
          <div class="py-1.5 px-2 hover:bg-neutral-50 rounded-md cursor-pointer">3. 详细方案</div>
          <div class="py-1.5 px-2 hover:bg-neutral-50 rounded-md cursor-pointer">4. 实施计划</div>
        </div>
      </aside>

      <main class="flex-1 overflow-y-auto p-6">
        <div class="max-w-4xl mx-auto">
          <input
            v-model="title"
            type="text"
            placeholder="请输入文档标题"
            class="w-full px-4 py-3 text-2xl font-bold border-0 border-b-2 border-transparent focus:border-primary-500 focus:outline-none mb-6 bg-transparent"
          />
          <RichTextEditor v-if="editorMode === 'RICH_TEXT'" v-model="content" class="min-h-[500px]" />
          <MarkdownEditor v-else v-model="content" class="min-h-[500px]" />
        </div>
      </main>

      <aside class="w-72 bg-white border-l border-neutral-200 p-4 overflow-y-auto">
        <div class="space-y-5">
          <div>
            <label class="flex items-center gap-2 text-sm font-semibold text-neutral-800 mb-2">
              <FileText class="w-4 h-4" /> 文档标题
            </label>
            <input
              v-model="title"
              type="text"
              placeholder="请输入标题"
              class="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <div>
            <label class="flex items-center gap-2 text-sm font-semibold text-neutral-800 mb-2">
              <Folder class="w-4 h-4" /> 所属分类
            </label>
            <div class="relative">
              <select
                v-model="category"
                class="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 appearance-none cursor-pointer"
              >
                <option value="">请选择分类</option>
                <option v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
              </select>
              <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label class="flex items-center gap-2 text-sm font-semibold text-neutral-800 mb-2">
              <LayoutTemplate class="w-4 h-4" /> 使用模板
            </label>
            <div class="relative">
              <select
                v-model="templateId"
                class="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 appearance-none cursor-pointer"
              >
                <option :value="null">不使用模板</option>
                <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
              </select>
              <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label class="flex items-center gap-2 text-sm font-semibold text-neutral-800 mb-2">
              <Tag class="w-4 h-4" /> 标签
            </label>
            <div class="flex flex-wrap gap-1.5 mb-2">
              <span
                v-for="tag in tags"
                :key="tag"
                class="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-600 text-xs rounded-full"
              >
                {{ tag }}
                <button @click="removeTag(tag)" class="hover:text-primary-700">×</button>
              </span>
            </div>
            <div class="flex gap-2 mb-2">
              <input
                v-model="tagInput"
                type="text"
                @keyup.enter="addTag"
                placeholder="输入标签后回车"
                class="flex-1 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="tag in availableTags"
                :key="tag"
                @click="toggleAvailableTag(tag)"
                class="px-2 py-0.5 text-xs rounded-full cursor-pointer transition-all"
                :class="[
                  tags.includes(tag)
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
    </div>

    <ConfirmDialog
      v-model="showSubmitDialog"
      title="提交审批"
      type="info"
      confirm-text="确认提交"
      @confirm="confirmSubmit"
    >
      <div class="space-y-3">
        <p class="text-sm text-neutral-600">提交后文档将进入审批流程，审批通过后正式发布。</p>
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">变更说明</label>
          <textarea
            v-model="changeLog"
            placeholder="请输入本次变更的说明（可选）"
            rows="3"
            class="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 resize-none"
          />
        </div>
      </div>
    </ConfirmDialog>
  </div>
</template>
