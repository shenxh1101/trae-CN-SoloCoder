<template>
  <div class="border border-gray-200 rounded-lg overflow-hidden bg-white">
    <EditorToolbar
      v-if="editable"
      :editor="editor"
      :disabled="!editor"
      @action="handleToolbarAction"
    />
    <div
      ref="editorContainerRef"
      class="relative"
      @paste="handlePaste"
    >
      <EditorContent
        v-if="editor"
        :editor="editor"
        class="prose prose-sm max-w-none p-4 min-h-[300px] focus:outline-none"
      />
      <div
        v-else
        class="p-4 min-h-[300px] text-gray-400 flex items-center justify-center"
      >
        加载中...
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showLinkDialog"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        @click.self="showLinkDialog = false"
      >
        <div class="bg-white rounded-lg p-6 w-96 shadow-xl">
          <h3 class="text-lg font-semibold mb-4">插入链接</h3>
          <input
            v-model="linkUrl"
            type="text"
            placeholder="输入链接地址"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            @keyup.enter="insertLink"
          />
          <div class="flex justify-end gap-2">
            <button
              @click="showLinkDialog = false"
              class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <button
              @click="insertLink"
              class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useEditor, EditorContent, Extension, mergeAttributes } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import EditorToolbar from './EditorToolbar.vue'
import { uploadImage, type UploadImageResult } from '@/api/document'

const WikiLink = Extension.create({
  name: 'wikiLink',
  parseHTML() {
    return [{ tag: 'span[data-wiki-link]' }]
  },
  renderHTML({ node }) {
    return [
      'span',
      mergeAttributes({ 'data-wiki-link': 'true', class: 'text-blue-500 hover:underline cursor-pointer' }),
      `[[${node.attrs.title}]]`
    ]
  },
  addInputRules() {
    return [
      {
        find: /\[\[([^\]]+)\]\]$/,
        handler: ({ state, range, match }) => {
          const title = match[1]
          const tr = state.tr.insertText(`[[${title}]]`, range.from, range.to)
          return tr
        }
      }
    ]
  }
})

interface Props {
  modelValue?: string
  placeholder?: string
  editable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '请输入内容...',
  editable: true
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:contentHtml', value: string): void
  (e: 'image-upload', result: UploadImageResult): void
}>()

const editorContainerRef = ref<HTMLElement | null>(null)
const showLinkDialog = ref(false)
const linkUrl = ref('')

const editor = useEditor({
  editable: props.editable,
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] }
    }),
    Underline,
    Placeholder.configure({ placeholder: props.placeholder }),
    Image.configure({ inline: true, allowBase64: true }),
    Link.configure({ openOnClick: false }),
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    WikiLink
  ],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
    emit('update:contentHtml', editor.getHTML())
  }
})

watch(() => props.modelValue, (value) => {
  const isSame = editor.value?.getHTML() === value
  if (!isSame && editor.value) {
    editor.value.commands.setContent(value, false)
  }
})

watch(() => props.editable, (value) => {
  editor.value?.setEditable(value)
})

const handlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault()
      const file = item.getAsFile()
      if (file) {
        try {
          const result = await uploadImage(file)
          emit('image-upload', result.data)
          editor.value?.chain().focus().setImage({ src: result.data.url }).run()
        } catch (error) {
          console.error('图片上传失败:', error)
        }
      }
      break
    }
  }
}

const handleToolbarAction = (action: string, value?: any) => {
  if (!editor.value) return

  const chain = editor.value.chain().focus()

  switch (action) {
    case 'undo':
      chain.undo().run()
      break
    case 'redo':
      chain.redo().run()
      break
    case 'bold':
      chain.toggleBold().run()
      break
    case 'italic':
      chain.toggleItalic().run()
      break
    case 'underline':
      chain.toggleUnderline().run()
      break
    case 'strike':
      chain.toggleStrike().run()
      break
    case 'heading':
      chain.toggleHeading({ level: value }).run()
      break
    case 'bulletList':
      chain.toggleBulletList().run()
      break
    case 'orderedList':
      chain.toggleOrderedList().run()
      break
    case 'blockquote':
      chain.toggleBlockquote().run()
      break
    case 'codeBlock':
      chain.toggleCodeBlock().run()
      break
    case 'table':
      chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      break
    case 'image':
      triggerImageUpload()
      break
    case 'link':
      linkUrl.value = editor.value.getAttributes('link').href || ''
      showLinkDialog.value = true
      break
  }
}

const triggerImageUpload = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      try {
        const result = await uploadImage(file)
        emit('image-upload', result.data)
        editor.value?.chain().focus().setImage({ src: result.data.url }).run()
      } catch (error) {
        console.error('图片上传失败:', error)
      }
    }
  }
  input.click()
}

const insertLink = () => {
  if (!linkUrl.value) {
    editor.value?.chain().focus().unsetLink().run()
  } else {
    editor.value?.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.value }).run()
  }
  showLinkDialog.value = false
  linkUrl.value = ''
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})

defineExpose({
  editor
})
</script>

<style>
.ProseMirror h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; }
.ProseMirror h2 { font-size: 1.5em; font-weight: bold; margin: 0.75em 0; }
.ProseMirror h3 { font-size: 1.17em; font-weight: bold; margin: 0.83em 0; }
.ProseMirror p { margin: 1em 0; }
.ProseMirror ul, .ProseMirror ol { padding-left: 2em; margin: 1em 0; }
.ProseMirror blockquote { border-left: 3px solid #d1d5db; padding-left: 1em; margin: 1em 0; color: #6b7280; }
.ProseMirror pre { background: #f3f4f6; padding: 1em; border-radius: 0.5em; overflow-x: auto; }
.ProseMirror code { background: #f3f4f6; padding: 0.2em 0.4em; border-radius: 0.25em; font-family: monospace; }
.ProseMirror a { color: #3b82f6; text-decoration: underline; }
.ProseMirror table { border-collapse: collapse; width: 100%; margin: 1em 0; }
.ProseMirror td, .ProseMirror th { border: 1px solid #d1d5db; padding: 0.5em; }
.ProseMirror th { background: #f3f4f6; font-weight: bold; }
.ProseMirror img { max-width: 100%; height: auto; }
.ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #9ca3af; pointer-events: none; height: 0; }
</style>
