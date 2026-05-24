<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QRCode from 'qrcode'
import {
  Share2,
  Copy,
  Check,
  Clock,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  Shield,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  User as UserIcon,
  QrCode,
  ListChecks,
  Settings,
} from 'lucide-vue-next'
import { useSocket } from '../composables/useSocket'
import { useFingerprint } from '../composables/useFingerprint'
import { useRoomStore } from '../stores/room'
import { getRoom, verifyVote } from '../utils/api'
import type { User, Room } from '../../shared/types'
import VoteOptionCard from '../components/VoteOptionCard.vue'
import DanmuLayer from '../components/DanmuLayer.vue'
import RoomControlPanel from '../components/RoomControlPanel.vue'
import OnlineUsers from '../components/OnlineUsers.vue'

const route = useRoute()
const router = useRouter()
const roomId = route.params.id as string

const {
  connect,
  disconnect,
  joinRoom,
  leaveRoom,
  sendVote,
  sendDanmu,
  controlVote,
  onUserJoined,
  onUserLeft,
  onVoteUpdated,
  onDanmuReceived,
  onVoteStatusChanged,
  onVoteEnded,
} = useSocket()

const { getVisitorId, visitorId } = useFingerprint()
const roomStore = useRoomStore()

const isLoading = ref(true)
const error = ref('')
const qrCodeDataUrl = ref('')
const shareUrl = ref('')
const copied = ref(false)
const showMobilePanel = ref<'info' | 'danmu' | null>(null)

const selectedOptions = ref<string[]>([])
const danmuInput = ref('')
const userName = ref('')
const showNameInput = ref(true)
const isSubmitting = ref(false)
const isSendingDanmu = ref(false)

const room = computed(() => roomStore.room)
const currentUser = computed(() => roomStore.currentUser)
const isHost = computed(() => roomStore.isHost)
const isVoting = computed(() => roomStore.isVoting)
const isEnded = computed(() => roomStore.isEnded)
const hasVoted = computed(() => roomStore.hasVoted)
const onlineCount = computed(() => roomStore.onlineCount)
const totalVotes = computed(() => roomStore.totalVotes)

const participationRate = computed(() => {
  if (onlineCount.value === 0) return 0
  return ((totalVotes.value / onlineCount.value) * 100).toFixed(1)
})

const remainingTime = computed(() => {
  if (!room.value?.endTime) return '--:--:--'
  const now = Date.now()
  const diff = room.value.endTime - now
  if (diff <= 0) return '00:00:00'
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const statusText = computed(() => {
  if (!room.value) return ''
  const statusMap: Record<string, string> = {
    waiting: '等待开始',
    voting: '投票进行中',
    paused: '已暂停',
    ended: '已结束',
  }
  return statusMap[room.value.status] || ''
})

const statusColor = computed(() => {
  if (!room.value) return 'text-white/50'
  const colorMap: Record<string, string> = {
    waiting: 'text-yellow-400',
    voting: 'text-neon-cyan',
    paused: 'text-orange-400',
    ended: 'text-neon-pink',
  }
  return colorMap[room.value.status] || 'text-white/50'
})

const isViewer = computed(() => currentUser.value?.role === 'viewer')

let timeInterval: number | null = null

onMounted(async () => {
  await initPage()
  timeInterval = window.setInterval(() => {}, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
  if (roomId && currentUser.value) {
    leaveRoom(roomId, currentUser.value.id)
  }
  disconnect()
  roomStore.reset()
})

async function initPage() {
  try {
    isLoading.value = true
    error.value = ''

    const fp = await getVisitorId()

    const roomResponse = await getRoom(roomId)
    if (!roomResponse.success || !roomResponse.data) {
      error.value = roomResponse.error || '房间不存在'
      return
    }

    roomStore.setRoom(roomResponse.data as unknown as Room)

    shareUrl.value = `${window.location.origin}/room/${roomId}`
    qrCodeDataUrl.value = await QRCode.toDataURL(shareUrl.value, {
      width: 256,
      margin: 2,
      color: {
        dark: '#00d4ff',
        light: '#0a0f1a',
      },
    })

    const storedName = localStorage.getItem('vote_user_name')
    if (storedName) {
      userName.value = storedName
      showNameInput.value = false
      await verifyAndJoin(fp, storedName)
    }

    setupSocketListeners()
    connect()
  } catch (err) {
    console.error('Init page error:', err)
    error.value = '加载失败，请刷新页面重试'
  } finally {
    isLoading.value = false
  }
}

async function verifyAndJoin(fp: string, name: string) {
  try {
    const verifyResponse = await verifyVote(roomId, {
      fingerprint: fp,
      ip: '',
    })

    if (verifyResponse.success && verifyResponse.data) {
      const { allowed, hasVoted: voted, role } = verifyResponse.data
      const userId = `user_${fp.slice(0, 16)}`

      const user: User = {
        id: userId,
        name,
        fingerprint: fp,
        lastIp: '',
        hasVoted: voted,
        role,
      }

      roomStore.setUserInfo(user)
      joinRoom(roomId, userId, name, fp)

      if (!allowed) {
        error.value = '您已被禁止参与此投票'
      }
    }
  } catch (err) {
    console.error('Verify error:', err)
  }
}

async function handleNameSubmit() {
  if (!userName.value.trim() || userName.value.trim().length < 2) {
    return
  }

  localStorage.setItem('vote_user_name', userName.value.trim())
  showNameInput.value = false
  await verifyAndJoin(visitorId.value, userName.value.trim())
}

function setupSocketListeners() {
  onUserJoined(({ user, onlineCount: count }) => {
    roomStore.addUser(user)
    roomStore.updateOnlineCount(count)
  })

  onUserLeft(({ userId, onlineCount: count }) => {
    roomStore.removeUser(userId)
    roomStore.updateOnlineCount(count)
  })

  onVoteUpdated(({ options }) => {
    roomStore.updateOptions(options)
  })

  onDanmuReceived((danmu) => {
    roomStore.addDanmu(danmu)
  })

  onVoteStatusChanged(({ status, endTime }) => {
    roomStore.updateStatus(status, endTime)
  })

  onVoteEnded(({ finalResults }) => {
    roomStore.updateOptions(finalResults)
    roomStore.updateStatus('ended')
    setTimeout(() => {
      router.push(`/room/${roomId}/results`)
    }, 2000)
  })
}

function toggleOption(optionId: string) {
  if (hasVoted.value || isViewer.value || !isVoting.value) return

  if (room.value?.isMultiple) {
    const index = selectedOptions.value.indexOf(optionId)
    if (index >= 0) {
      selectedOptions.value.splice(index, 1)
    } else {
      selectedOptions.value.push(optionId)
    }
  } else {
    selectedOptions.value = [optionId]
  }
}

async function handleVote() {
  if (selectedOptions.value.length === 0 || !currentUser.value || isSubmitting.value) return

  isSubmitting.value = true
  try {
    sendVote(
      roomId,
      selectedOptions.value,
      currentUser.value.id,
      currentUser.value.name,
      visitorId.value
    )
    roomStore.setHasVoted(true)
    selectedOptions.value = []
  } finally {
    isSubmitting.value = false
  }
}

async function handleSendDanmu() {
  if (!danmuInput.value.trim() || !currentUser.value || isSendingDanmu.value) return

  isSendingDanmu.value = true
  try {
    sendDanmu(
      roomId,
      currentUser.value.id,
      currentUser.value.name,
      danmuInput.value.trim()
    )
    danmuInput.value = ''
  } finally {
    isSendingDanmu.value = false
  }
}

function handleControl(action: 'start' | 'pause' | 'resume' | 'end') {
  if (!currentUser.value || !isHost.value) return
  controlVote(roomId, currentUser.value.id, action)
}

async function copyShareUrl() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Copy failed:', err)
  }
}

function goBack() {
  router.push('/')
}

function goToResults() {
  router.push(`/room/${roomId}/results`)
}
</script>

<template>
  <div class="min-h-screen relative overflow-hidden">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl animate-pulse-neon"></div>
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-pink/10 rounded-full blur-3xl animate-pulse-neon" style="animation-delay: 1s;"></div>
    </div>

    <div v-if="isLoading" class="relative z-10 min-h-screen flex items-center justify-center">
      <div class="text-center">
        <Loader2 class="w-12 h-12 text-neon-cyan animate-spin mx-auto mb-4" />
        <p class="text-white/70">加载中...</p>
      </div>
    </div>

    <div v-else-if="error" class="relative z-10 min-h-screen flex items-center justify-center px-4">
      <div class="glass-card neon-border-both p-8 text-center max-w-md">
        <AlertCircle class="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 class="text-2xl font-bold text-white mb-2">出错了</h2>
        <p class="text-white/70 mb-6">{{ error }}</p>
        <button @click="goBack" class="neon-btn-cyan">
          返回首页
        </button>
      </div>
    </div>

    <div v-else-if="showNameInput" class="relative z-10 min-h-screen flex items-center justify-center px-4">
      <div class="glass-card neon-border-both p-8 text-center max-w-md w-full">
        <UserIcon class="w-16 h-16 text-neon-cyan mx-auto mb-4" />
        <h2 class="text-2xl font-bold text-white mb-2">欢迎加入投票</h2>
        <p class="text-white/70 mb-6">请输入您的昵称</p>
        <div class="space-y-4">
          <input
            v-model="userName"
            type="text"
            placeholder="请输入昵称..."
            class="neon-input text-center"
            maxlength="20"
            @keyup.enter="handleNameSubmit"
          />
          <button
            @click="handleNameSubmit"
            :disabled="!userName.trim() || userName.trim().length < 2"
            class="neon-btn-cyan w-full"
          >
            加入投票
          </button>
        </div>
      </div>
    </div>

    <div v-else class="relative z-10">
      <header class="sticky top-0 z-20 backdrop-blur-xl bg-neon-darker/80 border-b border-white/10">
        <div class="max-w-7xl mx-auto px-4 py-4">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div class="flex-1 min-w-0">
              <h1 class="font-orbitron text-xl md:text-2xl font-bold truncate">
                <span class="bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan to-neon-pink">
                  {{ room?.title }}
                </span>
              </h1>
              <div class="flex flex-wrap items-center gap-3 mt-2 text-sm">
                <span class="text-white/50">房间号:</span>
                <span class="text-neon-cyan font-mono font-semibold">{{ roomId }}</span>
                <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', statusColor]">
                  {{ statusText }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="copyShareUrl"
                class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-all"
              >
                <Check v-if="copied" class="w-4 h-4 text-neon-cyan" />
                <Share2 v-else class="w-4 h-4" />
                <span class="hidden sm:inline">{{ copied ? '已复制' : '分享' }}</span>
              </button>
              <button
                v-if="isEnded"
                @click="goToResults"
                class="neon-btn-pink"
              >
                查看结果
              </button>
            </div>
          </div>
        </div>
      </header>

      <div class="md:hidden flex border-b border-white/10">
        <button
          @click="showMobilePanel = showMobilePanel === 'info' ? null : 'info'"
          :class="['flex-1 py-3 text-sm font-medium transition-colors', showMobilePanel === 'info' ? 'text-neon-cyan' : 'text-white/50']"
        >
          信息
        </button>
        <button
          @click="showMobilePanel = showMobilePanel === 'danmu' ? null : 'danmu'"
          :class="['flex-1 py-3 text-sm font-medium transition-colors', showMobilePanel === 'danmu' ? 'text-neon-pink' : 'text-white/50']"
        >
          弹幕
        </button>
      </div>

      <div class="max-w-7xl mx-auto px-4 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside v-if="showMobilePanel === 'info' || !showMobilePanel" class="lg:col-span-3 space-y-4">
            <div class="glass-card neon-border-cyan p-4">
              <div class="flex items-center justify-center gap-2 mb-3 text-white/70">
                <QrCode class="w-4 h-4 text-neon-cyan" />
                <span class="font-medium text-sm">扫码加入</span>
              </div>
              <div class="flex justify-center p-3 bg-white rounded-xl">
                <img :src="qrCodeDataUrl" alt="二维码" class="w-32 h-32" />
              </div>
              <div class="mt-3 flex items-center justify-between gap-2 text-sm">
                <span class="text-white/50 truncate">{{ shareUrl }}</span>
                <button @click="copyShareUrl" class="text-neon-cyan hover:text-neon-cyan/80">
                  <Copy class="w-4 h-4" />
                </button>
              </div>
            </div>

            <OnlineUsers :users="room?.onlineUsers || []" />

            <div class="glass-card p-4">
              <div class="flex items-center gap-2 mb-3">
                <Settings class="w-4 h-4 text-neon-pink" />
                <span class="text-white/70 font-medium text-sm">投票设置</span>
              </div>
              <div class="space-y-3 text-sm">
                <div class="flex items-center gap-2">
                  <component :is="room?.isAnonymous ? EyeOff : Eye" class="w-4 h-4 text-neon-cyan" />
                  <span class="text-white/70">{{ room?.isAnonymous ? '匿名投票' : '实名投票' }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <component :is="room?.isMultiple ? CheckSquare : Square" class="w-4 h-4 text-neon-pink" />
                  <span class="text-white/70">{{ room?.isMultiple ? '多选投票' : '单选投票' }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <Shield class="w-4 h-4 text-neon-cyan" />
                  <span class="text-white/70">{{ room?.antiCheat ? '防刷票已启用' : '防刷票未启用' }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <Clock class="w-4 h-4 text-neon-pink" />
                  <span class="text-white/70">剩余时间:</span>
                  <span class="text-neon-cyan font-mono font-semibold ml-auto">{{ remainingTime }}</span>
                </div>
              </div>
            </div>

            <RoomControlPanel
              v-if="room && !isEnded"
              :room="room"
              :isHost="isHost"
              @control="handleControl"
            />
          </aside>

          <main class="lg:col-span-6 space-y-6">
            <div class="glass-card p-4">
              <div class="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div class="text-3xl font-bold text-neon-cyan font-orbitron">{{ totalVotes }}</div>
                  <div class="text-white/50 text-sm">总票数</div>
                </div>
                <div>
                  <div class="text-3xl font-bold text-neon-pink font-orbitron">{{ participationRate }}%</div>
                  <div class="text-white/50 text-sm">参与率</div>
                </div>
              </div>
            </div>

            <div
              v-if="isViewer"
              class="glass-card border-yellow-500/30 p-4 flex items-center gap-3"
            >
              <AlertCircle class="w-6 h-6 text-yellow-400 flex-shrink-0" />
              <p class="text-yellow-400">您是观众，无法投票</p>
            </div>

            <div
              v-else-if="hasVoted"
              class="glass-card border-neon-cyan/30 p-4 flex items-center gap-3"
            >
              <CheckCircle class="w-6 h-6 text-neon-cyan flex-shrink-0" />
              <p class="text-neon-cyan">您已成功投票，感谢参与！</p>
            </div>

            <div v-else-if="!isVoting && !isEnded" class="glass-card p-8 text-center">
              <Clock class="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <p class="text-white/70">投票尚未开始，请等待主持人开启投票</p>
            </div>

            <div v-else-if="isEnded" class="glass-card p-8 text-center">
              <CheckCircle class="w-12 h-12 text-neon-pink mx-auto mb-4" />
              <p class="text-white/70 mb-4">投票已结束</p>
              <button @click="goToResults" class="neon-btn-pink">
                查看最终结果
              </button>
            </div>

            <div v-else class="space-y-3">
              <div class="flex items-center gap-2 mb-2">
                <ListChecks class="w-4 h-4 text-neon-cyan" />
                <span class="text-white/70 text-sm">
                  {{ room?.isMultiple ? '请选择一个或多个选项' : '请选择一个选项' }}
                </span>
              </div>

              <VoteOptionCard
                v-for="option in room?.options"
                :key="option.id"
                :option="option"
                :totalVotes="totalVotes"
                :isSelected="selectedOptions.includes(option.id)"
                :disabled="hasVoted || isViewer || !isVoting"
                :isMultiple="!!room?.isMultiple"
                @select="toggleOption"
              />

              <button
                @click="handleVote"
                :disabled="selectedOptions.length === 0 || isSubmitting || hasVoted || isViewer || !isVoting"
                class="neon-btn-cyan w-full py-4 text-lg font-semibold flex items-center justify-center gap-2"
              >
                <Loader2 v-if="isSubmitting" class="w-5 h-5 animate-spin" />
                <span>{{ isSubmitting ? '提交中...' : '确认投票' }}</span>
              </button>
            </div>
          </main>

          <aside v-if="showMobilePanel === 'danmu' || !showMobilePanel" class="lg:col-span-3 space-y-4">
            <div class="glass-card neon-border-pink p-4 h-[500px] flex flex-col">
              <div class="flex items-center gap-2 mb-3">
                <Send class="w-4 h-4 text-neon-pink" />
                <span class="text-white/70 font-medium text-sm">实时弹幕</span>
              </div>

              <div class="flex-1 flex items-center justify-center mb-3">
                <span class="text-white/30 text-sm">弹幕已在全屏显示</span>
              </div>

              <div class="flex gap-2">
                <input
                  v-model="danmuInput"
                  type="text"
                  placeholder="发送弹幕..."
                  class="neon-input flex-1 py-2 text-sm"
                  maxlength="50"
                  @keyup.enter="handleSendDanmu"
                />
                <button
                  @click="handleSendDanmu"
                  :disabled="!danmuInput.trim() || isSendingDanmu"
                  class="neon-btn-pink px-4 py-2"
                >
                  <Send v-if="!isSendingDanmu" class="w-4 h-4" />
                  <Loader2 v-else class="w-4 h-4 animate-spin" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
    <DanmuLayer :danmus="room?.danmus || []" />
  </div>
</template>

<style scoped>
</style>
