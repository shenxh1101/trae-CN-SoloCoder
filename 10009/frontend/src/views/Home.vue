<template>
  <div class="home">
    <div class="header">
      <h1>🎉 幸运大抽奖 🎉</h1>
      <div class="user-info" v-if="user">
        <span>欢迎，{{ maskPhone(user.phone) }}</span>
        <span class="draw-count">今日剩余: {{ profile.remain_draw }}/3</span>
        <button @click="logout">退出</button>
      </div>
    </div>

    <div class="login-box" v-if="!user">
      <h2>登录</h2>
      <div class="form-group">
        <input v-model="phone" placeholder="请输入手机号" maxlength="11" />
        <button @click="sendCode" :disabled="countdown > 0" class="code-btn">
          {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
        </button>
      </div>
      <div class="form-group">
        <input v-model="code" placeholder="请输入验证码" maxlength="6" />
      </div>
      <button @click="doLogin" class="login-btn">登录</button>
      <p class="tip" v-if="lastCode">测试验证码: {{ lastCode }}</p>
    </div>

    <div class="main-content" v-else>
      <div class="lottery-section">
        <div class="prize-grid">
          <div
            v-for="prize in prizes"
            :key="prize.id"
            class="prize-card"
            :class="{ active: selectedPrize && selectedPrize.id === prize.id }"
          >
            <img :src="prize.image_url" :alt="prize.name" />
            <div class="prize-name">{{ prize.name }}</div>
            <div class="prize-stock">库存: {{ prize.stock }}</div>
          </div>
        </div>

        <button
          @click="startDraw"
          :disabled="drawing || profile.remain_draw <= 0"
          class="draw-btn"
        >
          {{ drawing ? '抽奖中...' : profile.remain_draw > 0 ? '开始抽奖' : '今日次数已用完' }}
        </button>
      </div>

      <div class="sidebar">
        <div class="recent-winners">
          <h3>🏆 实时中奖</h3>
          <div class="winner-list">
            <div v-for="(record, index) in recentRecords" :key="index" class="winner-item">
              {{ record.content || record.phone + ' 抽中 ' + record.prizeName }}
            </div>
            <div v-if="recentRecords.length === 0" class="empty">暂无中奖记录</div>
          </div>
        </div>

        <div class="my-records">
          <h3>📋 我的记录</h3>
          <div class="record-list">
            <div v-for="record in myRecords" :key="record.id" class="record-item">
              <span>{{ record.prize_name }}</span>
              <span class="record-time">{{ formatTime(record.created_at) }}</span>
            </div>
            <div v-if="myRecords.length === 0" class="empty">暂无记录</div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="showResult" title="抽奖结果" width="300px" class="result-dialog">
      <div class="result-content">
        <div v-if="drawResult && drawResult.is_win" class="win">
          🎊 恭喜中奖 🎊
          <div class="prize-result">{{ drawResult.prize.name }}</div>
        </div>
        <div v-else class="lose">
          😢 很遗憾
          <div class="prize-result">谢谢参与</div>
        </div>
      </div>
      <template #footer>
        <button @click="showResult = false" class="confirm-btn">确定</button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  sendCode as apiSendCode,
  login as apiLogin,
  getProfile,
  getPrizes,
  draw,
  getMyRecords,
  getRecentRecords
} from '../api'

const user = ref(null)
const phone = ref('')
const code = ref('')
const countdown = ref(0)
const lastCode = ref('')
const profile = ref({ remain_draw: 0 })
const prizes = ref([])
const recentRecords = ref([])
const myRecords = ref([])
const drawing = ref(false)
const drawResult = ref(null)
const showResult = ref(false)
const selectedPrize = ref(null)

let timer = null
let refreshTimer = null

const maskPhone = (p) => p ? p.slice(0, 3) + '****' + p.slice(-4) : ''

const sendCode = async () => {
  if (!phone.value || phone.value.length !== 11) {
    ElMessage.error('请输入正确的手机号')
    return
  }
  try {
    const res = await apiSendCode(phone.value)
    lastCode.value = res.code
    ElMessage.success('验证码发送成功')
    countdown.value = 60
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '发送失败')
  }
}

const doLogin = async () => {
  try {
    const res = await apiLogin(phone.value, code.value)
    localStorage.setItem('token', res.token)
    user.value = res.user
    ElMessage.success('登录成功')
    loadData()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '登录失败')
  }
}

const logout = () => {
  localStorage.removeItem('token')
  user.value = null
  phone.value = ''
  code.value = ''
}

const loadData = async () => {
  const [profileRes, prizesRes, recordsRes, recentRes] = await Promise.all([
    getProfile(),
    getPrizes(),
    getMyRecords(),
    getRecentRecords()
  ])
  profile.value = profileRes
  prizes.value = prizesRes
  myRecords.value = recordsRes
  recentRecords.value = recentRes
}

const startDraw = async () => {
  if (drawing.value || profile.value.remain_draw <= 0) return
  drawing.value = true
  selectedPrize.value = null

  let rotations = 0
  const animate = setInterval(() => {
    const idx = Math.floor(Math.random() * prizes.value.length)
    selectedPrize.value = prizes.value[idx]
    rotations++
  }, 100)

  try {
    const res = await draw()
    drawResult.value = res

    await new Promise(r => setTimeout(r, 1500))
    clearInterval(animate)

    const target = prizes.value.find(p => p.id === res.prize.id)
    selectedPrize.value = target

    setTimeout(() => {
      showResult.value = true
      drawing.value = false
      loadData()
    }, 500)
  } catch (e) {
    clearInterval(animate)
    drawing.value = false
    ElMessage.error(e.response?.data?.error || '抽奖失败')
  }
}

const formatTime = (t) => new Date(t).toLocaleString()

let eventSource = null

const connectSSE = () => {
  if (eventSource) {
    eventSource.close()
  }
  
  eventSource = new EventSource('/api/records/stream')
  
  eventSource.onmessage = (event) => {
    const msg = event.data
    recentRecords.value.unshift({ content: msg })
    if (recentRecords.value.length > 20) {
      recentRecords.value.pop()
    }
  }
  
  eventSource.onerror = () => {
    console.log('SSE连接断开，3秒后重连...')
    setTimeout(connectSSE, 3000)
  }
}

onMounted(() => {
  const token = localStorage.getItem('token')
  if (token) {
    user.value = { phone: '' }
    loadData()
  }

  connectSSE()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (eventSource) eventSource.close()
})
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  text-align: center;
  color: white;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 36px;
  margin-bottom: 10px;
}

.user-info {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
}

.user-info button {
  padding: 5px 15px;
  border: none;
  border-radius: 20px;
  background: rgba(255,255,255,0.2);
  color: white;
  cursor: pointer;
}

.draw-count {
  background: rgba(255,255,255,0.2);
  padding: 5px 15px;
  border-radius: 20px;
}

.login-box {
  background: white;
  border-radius: 16px;
  padding: 40px;
  max-width: 400px;
  margin: 0 auto;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
}

.login-box h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.form-group {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.form-group input {
  flex: 1;
  padding: 12px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
}

.form-group input:focus {
  border-color: #667eea;
}

.code-btn {
  padding: 12px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
}

.code-btn:disabled {
  background: #ccc;
}

.login-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.tip {
  text-align: center;
  margin-top: 15px;
  color: #999;
  font-size: 14px;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 20px;
}

.lottery-section {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
}

.prize-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.prize-card {
  border: 3px solid #e0e0e0;
  border-radius: 12px;
  padding: 15px;
  text-align: center;
  transition: all 0.3s;
  background: #fafafa;
}

.prize-card.active {
  border-color: #ff6b6b;
  background: #fff5f5;
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(255,107,107,0.5);
}

.prize-card img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 10px;
}

.prize-name {
  font-weight: bold;
  margin-bottom: 5px;
  font-size: 14px;
}

.prize-stock {
  color: #999;
  font-size: 12px;
}

.draw-btn {
  width: 100%;
  padding: 18px;
  font-size: 20px;
  font-weight: bold;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.draw-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(245,87,108,0.4);
}

.draw-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.recent-winners, .my-records {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
}

.recent-winners h3, .my-records h3 {
  margin-bottom: 15px;
  color: #333;
}

.winner-list, .record-list {
  max-height: 300px;
  overflow-y: auto;
}

.winner-item {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
  color: #666;
}

.record-item {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.record-time {
  color: #999;
}

.empty {
  text-align: center;
  color: #ccc;
  padding: 20px;
}

.result-content {
  text-align: center;
  padding: 30px 0;
}

.win {
  color: #f5576c;
  font-size: 24px;
}

.lose {
  color: #999;
  font-size: 24px;
}

.prize-result {
  margin-top: 15px;
  font-size: 20px;
  font-weight: bold;
}

.confirm-btn {
  padding: 10px 30px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .main-content {
    grid-template-columns: 1fr;
  }
}
</style>
