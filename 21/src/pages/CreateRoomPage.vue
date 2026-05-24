<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import QRCode from 'qrcode'
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Settings,
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  QrCode,
  Link as LinkIcon,
  User,
  Clock,
  ListChecks,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  Shield,
  ArrowRight
} from 'lucide-vue-next'
import type { CreateRoomRequest, CreateRoomResponse } from '../../shared/types'

const router = useRouter()
const route = useRoute()

const title = ref('')
const options = ref(['', ''])
const endTime = ref('')
const creatorName = ref('')
const isAnonymous = ref(true)
const isMultiple = ref(false)
const antiCheat = ref(true)
const showAdvanced = ref(false)
const isLoading = ref(false)
const isCreated = ref(false)
const roomId = ref('')
const shareUrl = ref('')
const qrCodeDataUrl = ref('')
const copied = ref(false)
const errors = ref<Record<string, string>>({})

onMounted(() => {
  if (route.query.topic) {
    title.value = route.query.topic as string
  }
  const now = new Date()
  now.setHours(now.getHours() + 1)
  endTime.value = now.toISOString().slice(0, 16)
})

const canAddOption = computed(() => options.value.length < 10)
const canRemoveOption = computed(() => options.value.length > 2)

const minEndTime = computed(() => {
  return new Date().toISOString().slice(0, 16)
})

const addOption = () => {
  if (canAddOption.value) {
    options.value.push('')
  }
}

const removeOption = (index: number) => {
  if (canRemoveOption.value) {
    options.value.splice(index, 1)
  }
}

const validateForm = (): boolean => {
  errors.value = {}

  if (!title.value.trim()) {
    errors.value.title = '请输入投票主题'
  } else if (title.value.trim().length < 2) {
    errors.value.title = '投票主题至少2个字符'
  }

  const validOptions = options.value.filter(o => o.trim())
  if (validOptions.length < 2) {
    errors.value.options = '至少需要2个有效选项'
  }

  if (!endTime.value) {
    errors.value.endTime = '请选择截止时间'
  } else {
    const end = new Date(endTime.value)
    const now = new Date()
    if (end <= now) {
      errors.value.endTime = '截止时间必须晚于当前时间'
    }
  }

  if (!creatorName.value.trim()) {
    errors.value.creatorName = '请输入主持人昵称'
  } else if (creatorName.value.trim().length < 2) {
    errors.value.creatorName = '昵称至少2个字符'
  }

  return Object.keys(errors.value).length === 0
}

const createRoom = async () => {
  if (!validateForm()) return

  isLoading.value = true

  try {
    const validOptions = options.value.filter(o => o.trim())
    const requestBody: CreateRoomRequest = {
      title: title.value.trim(),
      options: validOptions,
      endTime: new Date(endTime.value).getTime(),
      isMultiple: isMultiple.value,
      isAnonymous: isAnonymous.value,
      antiCheat: antiCheat.value,
      creatorName: creatorName.value.trim()
    }

    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    const result = await response.json()

    if (result.success && result.data) {
      const data = result.data as CreateRoomResponse
      roomId.value = data.roomId
      shareUrl.value = data.shareUrl || `${window.location.origin}/room/${data.roomId}`
      
      qrCodeDataUrl.value = await QRCode.toDataURL(shareUrl.value, {
        width: 256,
        margin: 2,
        color: {
          dark: '#00d4ff',
          light: '#0a0f1a'
        }
      })
      
      isCreated.value = true
    } else {
      errors.value.submit = result.error || '创建房间失败，请重试'
    }
  } catch (error) {
    console.error('Create room error:', error)
    errors.value.submit = '网络错误，请重试'
  } finally {
    isLoading.value = false
  }
}

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    console.error('Copy failed:', error)
  }
}

const goToRoom = () => {
  router.push(`/room/${roomId.value}`)
}

const goBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen py-12 px-4 relative overflow-hidden">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/3 left-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl animate-pulse-neon"></div>
      <div class="absolute bottom-1/3 right-1/4 w-96 h-96 bg-neon-pink/10 rounded-full blur-3xl animate-pulse-neon" style="animation-delay: 1s;"></div>
    </div>

    <div class="relative z-10 max-w-3xl mx-auto">
      <button
        @click="goBack"
        class="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-8 group"
      >
        <ArrowLeft class="w-5 h-5 transition-transform group-hover:-translate-x-1" />
        <span>返回首页</span>
      </button>

      <div class="glass-card neon-border-both p-8 md:p-10">
        <div v-if="!isCreated">
          <div class="text-center mb-10">
            <h1 class="font-orbitron text-3xl md:text-4xl font-bold mb-3">
              <span class="bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan to-neon-pink">
                创建投票房间
              </span>
            </h1>
            <p class="text-white/50">配置您的投票参数，发起实时投票</p>
          </div>

          <div class="space-y-6">
            <div>
              <label class="block text-sm text-white/70 mb-2 font-medium flex items-center gap-2">
                <ListChecks class="w-4 h-4 text-neon-cyan" />
                投票主题 <span class="text-neon-pink">*</span>
              </label>
              <input
                v-model="title"
                type="text"
                placeholder="请输入投票主题..."
                :class="['neon-input', errors.title && 'error']"
              />
              <p v-if="errors.title" class="mt-1 text-sm text-red-400">{{ errors.title }}</p>
            </div>

            <div>
              <label class="block text-sm text-white/70 mb-2 font-medium flex items-center gap-2">
                <ListChecks class="w-4 h-4 text-neon-pink" />
                投票选项 <span class="text-neon-pink">*</span>
                <span class="text-white/40 text-xs ml-auto">至少2个，最多10个</span>
              </label>
              <div class="space-y-3">
                <div v-for="(option, index) in options" :key="index" class="flex gap-2">
                  <input
                    v-model="options[index]"
                    type="text"
                    :placeholder="`选项 ${index + 1}`"
                    class="neon-input flex-1"
                  />
                  <button
                    v-if="canRemoveOption"
                    @click="removeOption(index)"
                    class="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 class="w-5 h-5" />
                  </button>
                </div>
              </div>
              <p v-if="errors.options" class="mt-1 text-sm text-red-400">{{ errors.options }}</p>
              <button
                v-if="canAddOption"
                @click="addOption"
                class="mt-3 flex items-center gap-2 text-neon-cyan hover:text-neon-cyan/80 transition-colors text-sm"
              >
                <Plus class="w-4 h-4" />
                添加选项
              </button>
            </div>

            <div>
              <label class="block text-sm text-white/70 mb-2 font-medium flex items-center gap-2">
                <Clock class="w-4 h-4 text-neon-cyan" />
                截止时间 <span class="text-neon-pink">*</span>
              </label>
              <input
                v-model="endTime"
                type="datetime-local"
                :min="minEndTime"
                :class="['neon-input', errors.endTime && 'error']"
              />
              <p v-if="errors.endTime" class="mt-1 text-sm text-red-400">{{ errors.endTime }}</p>
            </div>

            <div>
              <label class="block text-sm text-white/70 mb-2 font-medium flex items-center gap-2">
                <User class="w-4 h-4 text-neon-pink" />
                主持人昵称 <span class="text-neon-pink">*</span>
              </label>
              <input
                v-model="creatorName"
                type="text"
                placeholder="请输入您的昵称..."
                :class="['neon-input', errors.creatorName && 'error']"
              />
              <p v-if="errors.creatorName" class="mt-1 text-sm text-red-400">{{ errors.creatorName }}</p>
            </div>

            <div class="border-t border-white/10 pt-4">
              <button
                @click="showAdvanced = !showAdvanced"
                class="w-full flex items-center justify-between text-white/70 hover:text-white transition-colors"
              >
                <span class="flex items-center gap-2 font-medium">
                  <Settings class="w-4 h-4" />
                  高级设置
                </span>
                <ChevronDown v-if="!showAdvanced" class="w-5 h-5" />
                <ChevronUp v-else class="w-5 h-5" />
              </button>

              <div v-if="showAdvanced" class="mt-4 space-y-4 pl-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <component :is="isAnonymous ? EyeOff : Eye" class="w-5 h-5 text-neon-cyan" />
                    <div>
                      <p class="text-white font-medium">{{ isAnonymous ? '匿名投票' : '实名投票' }}</p>
                      <p class="text-white/40 text-xs">{{ isAnonymous ? '投票者身份隐藏' : '显示投票者昵称' }}</p>
                    </div>
                  </div>
                  <button
                    @click="isAnonymous = !isAnonymous"
                    :class="[
                      'relative w-12 h-6 rounded-full transition-all duration-300',
                      isAnonymous ? 'bg-neon-cyan/30' : 'bg-neon-pink/30'
                    ]"
                  >
                    <span
                      :class="[
                        'absolute top-1 w-4 h-4 rounded-full transition-all duration-300',
                        isAnonymous ? 'left-1 bg-neon-cyan' : 'left-7 bg-neon-pink'
                      ]"
                    ></span>
                  </button>
                </div>

                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <component :is="isMultiple ? CheckSquare : Square" class="w-5 h-5 text-neon-pink" />
                    <div>
                      <p class="text-white font-medium">允许多选</p>
                      <p class="text-white/40 text-xs">{{ isMultiple ? '可选择多个选项' : '只能选择一个选项' }}</p>
                    </div>
                  </div>
                  <button
                    @click="isMultiple = !isMultiple"
                    :class="[
                      'relative w-12 h-6 rounded-full transition-all duration-300',
                      isMultiple ? 'bg-neon-pink/30' : 'bg-white/10'
                    ]"
                  >
                    <span
                      :class="[
                        'absolute top-1 w-4 h-4 rounded-full transition-all duration-300',
                        isMultiple ? 'left-7 bg-neon-pink' : 'left-1 bg-white/50'
                      ]"
                    ></span>
                  </button>
                </div>

                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <Shield class="w-5 h-5 text-neon-cyan" />
                    <div>
                      <p class="text-white font-medium">防刷票机制</p>
                      <p class="text-white/40 text-xs">{{ antiCheat ? 'IP+设备指纹双重验证' : '不启用防刷票' }}</p>
                    </div>
                  </div>
                  <button
                    @click="antiCheat = !antiCheat"
                    :class="[
                      'relative w-12 h-6 rounded-full transition-all duration-300',
                      antiCheat ? 'bg-neon-cyan/30' : 'bg-white/10'
                    ]"
                  >
                    <span
                      :class="[
                        'absolute top-1 w-4 h-4 rounded-full transition-all duration-300',
                        antiCheat ? 'left-7 bg-neon-cyan' : 'left-1 bg-white/50'
                      ]"
                    ></span>
                  </button>
                </div>
              </div>
            </div>

            <p v-if="errors.submit" class="text-sm text-red-400 text-center">{{ errors.submit }}</p>

            <button
              @click="createRoom"
              :disabled="isLoading"
              class="neon-btn-cyan w-full py-4 text-lg font-semibold flex items-center justify-center gap-2"
            >
              <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin" />
              <span>{{ isLoading ? '创建中...' : '创建投票房间' }}</span>
            </button>
          </div>
        </div>

        <div v-else class="text-center">
          <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-neon-cyan to-neon-pink flex items-center justify-center animate-float">
            <Check class="w-10 h-10 text-white" />
          </div>
          
          <h2 class="font-orbitron text-3xl font-bold mb-2">
            <span class="bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan to-neon-pink">
              创建成功！
            </span>
          </h2>
          <p class="text-white/50 mb-8">您的投票房间已创建</p>

          <div class="glass-card p-6 mb-6">
            <div class="flex items-center justify-center gap-2 mb-4 text-white/70">
              <QrCode class="w-5 h-5 text-neon-cyan" />
              <span class="font-medium">扫码加入</span>
            </div>
            <div class="inline-block p-4 bg-white rounded-xl">
              <img :src="qrCodeDataUrl" alt="二维码" class="w-48 h-48" />
            </div>
          </div>

          <div class="glass-card p-4 mb-8">
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <LinkIcon class="w-5 h-5 text-neon-pink flex-shrink-0" />
                <span class="text-white/80 text-sm truncate">{{ shareUrl }}</span>
              </div>
              <button
                @click="copyToClipboard"
                class="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20 transition-all flex-shrink-0"
              >
                <Check v-if="copied" class="w-4 h-4" />
                <Copy v-else class="w-4 h-4" />
                <span>{{ copied ? '已复制' : '复制' }}</span>
              </button>
            </div>
            <div class="mt-3 pt-3 border-t border-white/10 text-left">
              <p class="text-white/50 text-sm">
                房间号: <span class="text-neon-cyan font-mono font-semibold">{{ roomId }}</span>
              </p>
            </div>
          </div>

          <button
            @click="goToRoom"
            class="neon-btn-pink w-full py-4 text-lg font-semibold flex items-center justify-center gap-2"
          >
            <span>进入投票房间</span>
            <ArrowRight class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
