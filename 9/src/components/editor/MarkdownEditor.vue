<template>
  <div class="border border-gray-200 rounded-lg overflow-hidden bg-white">
    <EditorToolbar
      :include-groups="['history', 'format', 'heading', 'list', 'block', 'insert']"
      @action="handleToolbarAction"
    />
    <div class="flex h-[500px]">
      <div class="flex-1 flex flex-col border-r border-gray-200">
        <div class="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200">
          <span class="text-sm font-medium text-gray-600">编辑</span>
          <button
            @click="showPreview = !showPreview"
            :class="[
              'px-2 py-1 text-xs rounded',
              showPreview ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
            ]"
          >
            {{ showPreview ? '关闭预览' : '开启预览' }}
          </button>
        </div>
        <div ref="editorContainerRef" class="flex-1 relative" @paste="handlePaste">
          <codemirror
            v-model="content"
            :style="{ height: '100%' }"
            :tab-size="2"
            :extensions="extensions"
            :placeholder="placeholder"
            @ready="handleEditorReady"
          />
          <div
            v-if="showCompletion"
            class="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px] max-h-[200px] overflow-y-auto"
            :style="{ top: completionPosition.top + 'px', left: completionPosition.left + 'px' }"
          >
            <div
              v-for="(item, index) in completionItems"
              :key="item"
              @click="insertCompletion(item)"
              :class="[
                'px-3 py-2 cursor-pointer text-sm',
                selectedIndex === index ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
              ]"
            >
              {{ item }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="showPreview" class="flex-1 flex flex-col">
        <div class="flex items-center px-3 py-1.5 bg-gray-50 border-b border-gray-200">
          <span class="text-sm font-medium text-gray-600">预览</span>
        </div>
        <div class="flex-1 overflow-auto p-4">
          <div class="prose prose-sm max-w-none" v-html="renderedContent" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, undo, redo } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { EditorSelection, type EditorState } from '@codemirror/state'
import { marked } from 'marked'
import EditorToolbar from './EditorToolbar.vue'
import { uploadImage } from '@/api/document'

interface Props {
  modelValue?: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '请输入Markdown内容...'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const editorContainerRef = ref<HTMLElement | null>(null)
const editorView = ref<EditorView | null>(null)
const showPreview = ref(true)
const showCompletion = ref(false)
const completionItems = ref<string[]>([])
const selectedIndex = ref(0)
const completionPosition = ref({ top: 0, left: 0 })
const content = ref(props.modelValue)

const mockDocuments = ['产品需求文档', '技术方案设计', '开发计划', '测试报告', '用户手册']

const extensions = [
  markdown({ base: markdownLanguage }),
  syntaxHighlighting(defaultHighlightStyle),
  history(),
  keymap.of([...defaultKeymap, ...historyKeymap]),
  EditorView.lineWrapping,
  EditorView.theme({
    '&': { height: '100%' },
    '.cm-content': { padding: '16px', fontFamily: 'Monaco, Menlo, monospace', fontSize: '14px' },
    '.cm-line': { lineHeight: '1.6' }
  })
]

const renderedContent = computed(() => marked.parse(content.value, { breaks: true }) as string)

watch(() => props.modelValue, (value) => {
  if (value !== content.value) content.value = value
})

watch(content, (value) => {
  emit('update:modelValue', value)
  checkWikiLinkCompletion()
})

const handleEditorReady = (payload: { view: EditorView; state: EditorState }) => {
  editorView.value = payload.view
  payload.view.dom.addEventListener('keydown', handleKeyDown)
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (!showCompletion.value) return
  if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex.value = (selectedIndex.value + 1) % completionItems.value.length }
  else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex.value = (selectedIndex.value - 1 + completionItems.value.length) % completionItems.value.length }
  else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertCompletion(completionItems.value[selectedIndex.value]) }
  else if (e.key === 'Escape') { e.preventDefault(); showCompletion.value = false }
}

const checkWikiLinkCompletion = () => {
  if (!editorView.value) return
  const state = editorView.value.state
  const cursor = state.selection.main.head
  const match = state.sliceDoc(0, cursor).match(/\[\[([^\]]*)$/)

  if (match) {
    const filtered = mockDocuments.filter(d => d.toLowerCase().includes(match[1].toLowerCase()))
    if (filtered.length > 0) {
      completionItems.value = filtered
      selectedIndex.value = 0
      showCompletion.value = true
      updateCompletionPosition()
      return
    }
  }
  showCompletion.value = false
}

const updateCompletionPosition = () => {
  if (!editorView.value) return
  const coords = editorView.value.coordsAtPos(editorView.value.state.selection.main.head)
  if (coords && editorContainerRef.value) {
    const rect = editorContainerRef.value.getBoundingClientRect()
    completionPosition.value = { top: coords.bottom - rect.top, left: coords.left - rect.left }
  }
}

const insertCompletion = (title: string) => {
  if (!editorView.value) return
  const state = editorView.value.state
  const cursor = state.selection.main.head
  const match = state.sliceDoc(0, cursor).match(/\[\[([^\]]*)$/)
  if (match) {
    const start = cursor - match[0].length
    editorView.value.dispatch({
      changes: { from: start, to: cursor, insert: `[[${title}]]` },
      selection: EditorSelection.cursor(start + title.length + 4)
    })
  }
  showCompletion.value = false
}

const handlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault()
      const file = item.getAsFile()
      if (file) {
        const result = await uploadImage(file)
        insertAtCursor(`![${file.name}](${result.data.url})`)
      }
      break
    }
  }
}

const insertAtCursor = (text: string) => {
  if (!editorView.value) return
  const state = editorView.value.state
  const { from, to } = state.selection.main
  editorView.value.dispatch({
    changes: { from, to, insert: text },
    selection: EditorSelection.cursor(from + text.length)
  })
  editorView.value.focus()
}

const wrapSelection = (before: string, after: string = before) => {
  if (!editorView.value) return
  const state = editorView.value.state
  const { from, to } = state.selection.main
  const selected = state.sliceDoc(from, to)
  editorView.value.dispatch({
    changes: { from, to, insert: `${before}${selected}${after}` },
    selection: EditorSelection.create([EditorSelection.range(from + before.length, to + before.length)])
  })
  editorView.value.focus()
}

const handleToolbarAction = (action: string, value?: number) => {
  if (!editorView.value) return
  const view = editorView.value
  switch (action) {
    case 'undo':
      undo({ state: view.state as any, dispatch: view.dispatch })
      break
    case 'redo':
      redo({ state: view.state as any, dispatch: view.dispatch })
      break
    case 'bold': wrapSelection('**'); break
    case 'italic': wrapSelection('*'); break
    case 'underline': wrapSelection('<u>', '</u>'); break
    case 'strike': wrapSelection('~~'); break
    case 'heading': insertAtCursor('\n' + '#'.repeat(value || 1) + ' '); break
    case 'bulletList': insertAtCursor('\n- '); break
    case 'orderedList': insertAtCursor('\n1. '); break
    case 'blockquote': insertAtCursor('\n> '); break
    case 'codeBlock': insertAtCursor('\n```\n\n```\n'); break
    case 'table': insertAtCursor('\n| 表头1 | 表头2 | 表头3 |\n| --- | --- | --- |\n| 内容1 | 内容2 | 内容3 |\n'); break
    case 'image': triggerImageUpload(); break
    case 'link': wrapSelection('[', '](url)'); break
  }
}

const triggerImageUpload = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const result = await uploadImage(file)
      insertAtCursor(`![${file.name}](${result.data.url})`)
    }
  }
  input.click()
}

onBeforeUnmount(() => {
  editorView.value?.dom.removeEventListener('keydown', handleKeyDown)
})

defineExpose({ editorView, insertAtCursor, wrapSelection })
</script>

<style>
.prose h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; }
.prose h2 { font-size: 1.5em; font-weight: bold; margin: 0.75em 0; }
.prose h3 { font-size: 1.17em; font-weight: bold; margin: 0.83em 0; }
.prose p { margin: 1em 0; }
.prose ul, .prose ol { padding-left: 2em; margin: 1em 0; }
.prose blockquote { border-left: 3px solid #d1d5db; padding-left: 1em; margin: 1em 0; color: #6b7280; }
.prose pre { background: #f3f4f6; padding: 1em; border-radius: 0.5em; overflow-x: auto; }
.prose code { background: #f3f4f6; padding: 0.2em 0.4em; border-radius: 0.25em; font-family: monospace; }
.prose pre code { background: none; padding: 0; }
.prose a { color: #3b82f6; text-decoration: underline; }
.prose table { border-collapse: collapse; width: 100%; margin: 1em 0; }
.prose td, .prose th { border: 1px solid #d1d5db; padding: 0.5em; }
.prose th { background: #f3f4f6; font-weight: bold; }
.prose img { max-width: 100%; height: auto; }
.cm-editor.cm-focused { outline: none !important; }
</style>
