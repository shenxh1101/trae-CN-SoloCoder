<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ArrowLeft, Edit3, History, Shield, Download, ThumbsUp, Star,
  Eye, MessageSquare, Calendar, User, Tag, Hash, ChevronDown, ChevronRight,
  Send, AtSign, Reply, MoreHorizontal
} from 'lucide-vue-next'
import { marked } from 'marked'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { getDocumentDetail, getDocumentLinks } from '@/api/document'
import { getComments, createComment } from '@/api/comment'
import type { Document } from '@/api/document'
import type { Comment } from '@/api/comment'
import { cn } from '@/lib/utils'

const router = useRouter()
const route = useRoute()

const document = ref<Document | null>(null)
const loading = ref(false)
const isLiked = ref(false)
const isFavorited = ref(false)
const likeCount = ref(0)
const comments = ref<Comment[]>([])
const commentContent = ref('')
const showMentionList = ref(false)
const activeTocItem = ref('')
const expandedToc = ref(true)
const contentType = ref<'MARKDOWN' | 'RICH_TEXT'>('MARKDOWN')

interface TocItem {
  id: string
  text: string
  level: number
}

const toc = ref<TocItem[]>([
  { id: 'section-1', text: '1. 背景介绍', level: 1 },
  { id: 'section-2', text: '2. 目标与范围', level: 1 },
  { id: 'section-2-1', text: '2.1 核心目标', level: 2 },
  { id: 'section-2-2', text: '2.2 适用范围', level: 2 },
  { id: 'section-3', text: '3. 详细方案', level: 1 },
  { id: 'section-4', text: '4. 实施计划', level: 1 }
])

const contentHtml = computed(() => {
  if (!document.value) return ''
  if (contentType.value === 'MARKDOWN') {
    return marked(document.value.content || '') as string
  }
  return document.value.content || ''
})

const statusType = computed(() => {
  if (!document.value) return 'draft'
  const status = document.value.status.toLowerCase()
  if (status === 'approved') return 'published'
  return status as 'draft' | 'pending' | 'published' | 'rejected'
})

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function goBack() {
  router.back()
}

function goToEdit() {
  router.push(`/document/${document.value?.id}/edit`)
}

function goToVersions() {
  router.push(`/document/${document.value?.id}/versions`)
}

function toggleLike() {
  isLiked.value = !isLiked.value
  likeCount.value += isLiked.value ? 1 : -1
}

function toggleFavorite() {
  isFavorited.value = !isFavorited.value
}

function scrollToSection(id: string) {
  activeTocItem.value = id
  const element = window.document.getElementById(id)
  element?.scrollIntoView({ behavior: 'smooth' })
}

async function submitComment() {
  if (!commentContent.value.trim()) return
  try {
    const response = await createComment({
      documentId: document.value?.id || '',
      content: commentContent.value
    } as any)
    if (response.code === 0) {
      commentContent.value = ''
      fetchComments()
    }
  } catch (error) {
    console.error('Failed to submit comment:', error)
  }
}

async function fetchComments() {
  try {
    const response = await getComments({ documentId: route.params.id as string, page: 1, pageSize: 100 })
    if (response.code === 0) {
      comments.value = response.data.list
    }
  } catch (error) {
    console.error('Failed to fetch comments:', error)
  }
}

async function fetchDocument() {
  loading.value = true
  try {
    const response = await getDocumentDetail(Number(route.params.id))
    if (response.code === 200) {
      document.value = response.data
      likeCount.value = response.data.likeCount
    }
  } catch (error) {
    console.error('Failed to fetch document:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  document.value = {
    id: 1,
    title: '2024年度产品规划报告',
    content: '# 2024年度产品规划报告\n\n## 1. 背景介绍\n\n随着市场竞争的加剧，我们需要制定清晰的产品发展战略...\n\n## 2. 目标与范围\n\n### 2.1 核心目标\n\n本年度的核心目标是提升用户体验，增加用户活跃度...\n\n### 2.2 适用范围\n\n本规划适用于所有产品线...',
    summary: '本年度产品发展方向和重点功能规划',
    contentType: 'MARKDOWN',
    contentHtml: '',
    categoryId: 1,
    categoryName: '规划文档',
    tags: '',
    status: 'APPROVED',
    creatorId: 1,
    creatorName: '张三',
    departmentId: 1,
    departmentName: '产品部',
    viewCount: 156,
    likeCount: 23,
    commentCount: 8,
    favoriteCount: 5,
    version: 2,
    enableWatermark: true,
    watermarkText: '',
    isDeleted: false,
    deletedAt: '',
    publishedAt: '2024-01-16T08:00:00Z',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-20T14:20:00Z'
  }
  likeCount.value = 23
  contentType.value = 'MARKDOWN'

  comments.value = [
    {
      id: '1',
      documentId: '1',
      content: '这份规划非常全面，特别是关于用户增长的部分很有见地。',
      parentId: null,
      userId: '2',
      username: '李四',
      userAvatar: '',
      likeCount: 5,
      isLiked: false,
      createdAt: '2024-01-17T10:30:00Z',
      updatedAt: '2024-01-17T10:30:00Z',
      replies: [
        {
          id: '2',
          documentId: '1',
          content: '同意，我也认为这部分是重点。',
          parentId: '1',
          userId: '3',
          username: '王五',
          userAvatar: '',
          likeCount: 2,
          isLiked: false,
          createdAt: '2024-01-17T11:00:00Z',
          updatedAt: '2024-01-17T11:00:00Z'
        }
      ]
    }
  ] as Comment[]
})
</script>

<template>
  <div class="h-full flex flex-col bg-neutral-50">
    <div class="bg-white border-b border-neutral-200">
      <div class="px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="goBack" class="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <ArrowLeft class="w-5 h-5 text-neutral-600" />
          </button>
          <div>
            <h1 class="text-xl font-semibold text-neutral-800">{{ document?.title }}</h1>
            <div class="flex items-center gap-3 mt-1">
              <StatusBadge :status="statusType" size="sm" />
              <span class="text-xs text-neutral-500">v{{ document?.version }}</span>
              <span class="text-xs text-neutral-500">{{ document?.categoryName }}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button @click="goToEdit" class="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors">
            <Edit3 class="w-4 h-4" /> 编辑
          </button>
          <button @click="goToVersions" class="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors">
            <History class="w-4 h-4" /> 历史版本
          </button>
          <button class="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors">
            <Shield class="w-4 h-4" /> 权限
          </button>
          <button class="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors">
            <Download class="w-4 h-4" /> 导出
          </button>
          <div class="w-px h-6 bg-neutral-200 mx-2" />
          <button
            @click="toggleLike"
            :class="[
              'flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
              isLiked ? 'bg-primary-50 text-primary-600' : 'text-neutral-700 hover:bg-neutral-100'
            ]"
          >
            <ThumbsUp :class="['w-4 h-4', isLiked ? 'fill-current' : '']" /> {{ likeCount }}
          </button>
          <button
            @click="toggleFavorite"
            :class="[
              'flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
              isFavorited ? 'bg-warning-50 text-warning-600' : 'text-neutral-700 hover:bg-neutral-100'
            ]"
          >
            <Star :class="['w-4 h-4', isFavorited ? 'fill-current' : '']" />
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden">
      <aside class="w-64 bg-white border-r border-neutral-200 flex flex-col">
        <button @click="expandedToc = !expandedToc" class="p-4 flex items-center justify-between border-b border-neutral-100">
          <span class="font-semibold text-neutral-800 text-sm">目录导航</span>
          <ChevronDown v-if="expandedToc" class="w-4 h-4 text-neutral-400" />
          <ChevronRight v-else class="w-4 h-4 text-neutral-400" />
        </button>
        <div v-show="expandedToc" class="flex-1 overflow-y-auto p-2">
          <div
            v-for="item in toc"
            :key="item.id"
            @click="scrollToSection(item.id)"
            class="py-2 px-3 text-sm rounded-lg cursor-pointer transition-colors"
            :class="[
              item.level === 2 ? 'pl-6' : '',
              activeTocItem === item.id
                ? 'bg-primary-50 text-primary-600 font-medium'
                : 'text-neutral-600 hover:bg-neutral-50'
            ]"
          >
            {{ item.text }}
          </div>
        </div>
      </aside>

      <main class="flex-1 overflow-y-auto">
        <div class="max-w-4xl mx-auto px-8 py-8">
          <article
            class="prose prose-blue max-w-none"
            v-html="contentHtml"
          />

          <div class="mt-12 border-t border-neutral-200 pt-8">
            <h3 class="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <MessageSquare class="w-5 h-5" />
              评论 ({{ comments.length }})
            </h3>

            <div class="mb-6">
              <div class="relative">
                <textarea
                  v-model="commentContent"
                  placeholder="写下你的评论...（输入 @ 可以提及他人）"
                  rows="3"
                  class="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 resize-none"
                />
                <div class="absolute bottom-3 right-3 flex items-center gap-2">
                  <button class="p-1.5 hover:bg-neutral-100 rounded transition-colors">
                    <AtSign class="w-4 h-4 text-neutral-400" />
                  </button>
                  <button
                    @click="submitComment"
                    :disabled="!commentContent.trim()"
                    class="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-300 text-white text-sm rounded-lg transition-colors"
                  >
                    <Send class="w-4 h-4" /> 发送
                  </button>
                </div>
              </div>
            </div>

            <div v-if="comments.length > 0" class="space-y-6">
              <div v-for="comment in comments" :key="comment.id" class="border-b border-neutral-100 pb-6 last:border-0">
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User class="w-5 h-5 text-primary-600" />
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-sm font-medium text-neutral-800">{{ comment.username }}</span>
                      <span class="text-xs text-neutral-400">{{ formatDate(comment.createdAt) }}</span>
                    </div>
                    <p class="text-sm text-neutral-600 mb-2">{{ comment.content }}</p>
                    <div class="flex items-center gap-4">
                      <button class="text-xs text-neutral-500 hover:text-primary-600 flex items-center gap-1">
                        <Reply class="w-3.5 h-3.5" /> 回复
                      </button>
                      <button class="text-xs text-neutral-500 hover:text-primary-600">
                        <MoreHorizontal class="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div v-if="comment.replies?.length" class="mt-4 pl-4 border-l-2 border-neutral-100 space-y-4">
                      <div v-for="reply in comment.replies" :key="reply.id" class="flex items-start gap-3">
                        <div class="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User class="w-4 h-4 text-neutral-500" />
                        </div>
                        <div class="flex-1">
                          <div class="flex items-center gap-2 mb-1">
                            <span class="text-sm font-medium text-neutral-800">{{ reply.username }}</span>
                            <span class="text-xs text-neutral-400">{{ formatDate(reply.createdAt) }}</span>
                          </div>
                          <p class="text-sm text-neutral-600">{{ reply.content }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <EmptyState v-else type="default" title="暂无评论" description="快来发表第一条评论吧" />
          </div>
        </div>
      </main>

      <aside class="w-72 bg-white border-l border-neutral-200 p-4 overflow-y-auto">
        <div class="space-y-6">
          <div>
            <h4 class="text-sm font-semibold text-neutral-800 mb-3">创建信息</h4>
            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2 text-neutral-600">
                <User class="w-4 h-4 text-neutral-400" />
                <span>{{ document?.creatorName }}</span>
              </div>
              <div class="flex items-center gap-2 text-neutral-600">
                <Calendar class="w-4 h-4 text-neutral-400" />
                <span>{{ formatDate(document?.createdAt || '') }}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-neutral-800 mb-3">更新信息</h4>
            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2 text-neutral-600">
                <Calendar class="w-4 h-4 text-neutral-400" />
                <span>{{ formatDate(document?.updatedAt || '') }}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-neutral-800 mb-3">统计数据</h4>
            <div class="grid grid-cols-3 gap-2">
              <div class="text-center p-2 bg-neutral-50 rounded-lg">
                <Eye class="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                <p class="text-sm font-semibold text-neutral-800">{{ document?.viewCount }}</p>
                <p class="text-xs text-neutral-500">浏览</p>
              </div>
              <div class="text-center p-2 bg-neutral-50 rounded-lg">
                <ThumbsUp class="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                <p class="text-sm font-semibold text-neutral-800">{{ likeCount }}</p>
                <p class="text-xs text-neutral-500">点赞</p>
              </div>
              <div class="text-center p-2 bg-neutral-50 rounded-lg">
                <MessageSquare class="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                <p class="text-sm font-semibold text-neutral-800">{{ comments.length }}</p>
                <p class="text-xs text-neutral-500">评论</p>
              </div>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-neutral-800 mb-3">标签</h4>
            <div class="flex flex-wrap gap-2">
              <span class="px-2.5 py-1 text-xs bg-primary-50 text-primary-600 rounded-full flex items-center gap-1">
                <Tag class="w-3 h-3" /> 重要
              </span>
              <span class="px-2.5 py-1 text-xs bg-warning-50 text-warning-600 rounded-full flex items-center gap-1">
                <Hash class="w-3 h-3" /> 规划
              </span>
              <span class="px-2.5 py-1 text-xs bg-success-50 text-success-600 rounded-full flex items-center gap-1">
                <Hash class="w-3 h-3" /> 2024
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.prose :deep(h1) {
  @apply text-2xl font-bold text-neutral-800 mb-4 mt-8 first:mt-0;
}
.prose :deep(h2) {
  @apply text-xl font-semibold text-neutral-800 mb-3 mt-6;
}
.prose :deep(h3) {
  @apply text-lg font-medium text-neutral-800 mb-2 mt-4;
}
.prose :deep(p) {
  @apply text-neutral-600 leading-relaxed mb-4;
}
.prose :deep(a) {
  @apply text-primary-600 hover:text-primary-700 underline;
}
.prose :deep(ul) {
  @apply list-disc pl-6 mb-4;
}
.prose :deep(ol) {
  @apply list-decimal pl-6 mb-4;
}
.prose :deep(li) {
  @apply text-neutral-600 mb-2;
}
</style>
