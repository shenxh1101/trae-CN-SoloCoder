<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Vote, Users, Sparkles, ArrowRight, Zap, ShieldCheck } from 'lucide-vue-next'

const router = useRouter()

const createTopic = ref('')
const roomId = ref('')

const handleCreate = () => {
  if (createTopic.value.trim()) {
    router.push({ path: '/create', query: { topic: createTopic.value.trim() } })
  }
}

const handleJoin = () => {
  if (roomId.value.trim()) {
    router.push(`/room/${roomId.value.trim()}`)
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl animate-pulse-neon"></div>
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-pink/10 rounded-full blur-3xl animate-pulse-neon" style="animation-delay: 1s;"></div>
    </div>

    <div class="relative z-10 max-w-5xl w-full">
      <div class="text-center mb-16 animate-float">
        <div class="flex items-center justify-center gap-3 mb-4">
          <Zap class="w-8 h-8 text-neon-cyan" />
          <span class="text-neon-cyan text-sm font-medium tracking-widest uppercase">Realtime Voting System</span>
          <Zap class="w-8 h-8 text-neon-pink" />
        </div>
        <h1 class="font-orbitron text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight">
          <span class="bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan via-white to-neon-pink animate-gradient">
            实时多人投票系统
          </span>
        </h1>
        <p class="text-xl md:text-2xl text-white/70 font-inter tracking-wide">
          即时互动 · 公平透明
        </p>
        <div class="flex items-center justify-center gap-6 mt-8 text-white/50 text-sm">
          <div class="flex items-center gap-2">
            <ShieldCheck class="w-4 h-4 text-neon-cyan" />
            <span>防刷票机制</span>
          </div>
          <div class="flex items-center gap-2">
            <Sparkles class="w-4 h-4 text-neon-pink" />
            <span>实时统计</span>
          </div>
          <div class="flex items-center gap-2">
            <Users class="w-4 h-4 text-neon-cyan" />
            <span>多人参与</span>
          </div>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-8">
        <div class="glass-card neon-border-cyan p-8 transition-all duration-500 hover:scale-105 hover:shadow-neon-cyan group">
          <div class="flex items-center gap-4 mb-6">
            <div class="w-14 h-14 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center group-hover:bg-neon-cyan/20 transition-all duration-300">
              <Vote class="w-7 h-7 text-neon-cyan" />
            </div>
            <div>
              <h2 class="font-orbitron text-2xl font-bold text-white">创建投票</h2>
              <p class="text-white/50 text-sm">发起一个新的投票房间</p>
            </div>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-white/70 mb-2 font-medium">投票主题</label>
              <input
                v-model="createTopic"
                type="text"
                placeholder="请输入投票主题..."
                class="neon-input"
                @keyup.enter="handleCreate"
              />
            </div>
            <button
              @click="handleCreate"
              :disabled="!createTopic.trim()"
              class="neon-btn-cyan w-full flex items-center justify-center gap-2"
            >
              <span>创建投票</span>
              <ArrowRight class="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        <div class="glass-card neon-border-pink p-8 transition-all duration-500 hover:scale-105 hover:shadow-neon-pink group">
          <div class="flex items-center gap-4 mb-6">
            <div class="w-14 h-14 rounded-xl bg-neon-pink/10 border border-neon-pink/30 flex items-center justify-center group-hover:bg-neon-pink/20 transition-all duration-300">
              <Users class="w-7 h-7 text-neon-pink" />
            </div>
            <div>
              <h2 class="font-orbitron text-2xl font-bold text-white">加入投票</h2>
              <p class="text-white/50 text-sm">输入房间号参与投票</p>
            </div>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-white/70 mb-2 font-medium">房间号</label>
              <input
                v-model="roomId"
                type="text"
                placeholder="请输入房间号..."
                class="neon-input"
                @keyup.enter="handleJoin"
              />
            </div>
            <button
              @click="handleJoin"
              :disabled="!roomId.trim()"
              class="neon-btn-pink w-full flex items-center justify-center gap-2"
            >
              <span>加入房间</span>
              <ArrowRight class="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>

      <div class="text-center mt-16 text-white/30 text-sm">
        <p>© 2024 实时多人投票系统 · 科技驱动未来</p>
      </div>
    </div>
  </div>
</template>
