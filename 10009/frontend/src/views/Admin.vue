<template>
  <div class="admin">
    <div class="header">
      <h1>🎛️ 抽奖管理后台</h1>
      <button @click="logout" class="logout-btn">退出</button>
    </div>

    <div class="tabs">
      <button :class="{ active: activeTab === 'prizes' }" @click="activeTab = 'prizes'">奖品管理</button>
      <button :class="{ active: activeTab === 'records' }" @click="activeTab = 'records'">抽奖记录</button>
    </div>

    <div class="content">
      <div v-if="activeTab === 'prizes'" class="prizes-panel">
        <div class="panel-header">
          <h2>奖品列表</h2>
          <div class="actions">
            <button @click="validateProb" class="validate-btn">验证概率</button>
            <button @click="openAddModal" class="add-btn">+ 添加奖品</button>
          </div>
        </div>

        <div class="prob-info" v-if="probInfo">
          <span>总概率: {{ (probInfo.total * 100).toFixed(2) }}%</span>
          <span :class="probInfo.is_valid ? 'valid' : 'invalid'">
            {{ probInfo.is_valid ? '✅ 概率正确' : '⚠️ 概率不等于100%' }}
          </span>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>排序</th>
              <th>奖品名称</th>
              <th>库存</th>
              <th>概率</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="prize in prizes" :key="prize.id">
              <td>{{ prize.sort_order }}</td>
              <td>{{ prize.name }}</td>
              <td>{{ prize.stock }}</td>
              <td>{{ (prize.probability * 100).toFixed(2) }}%</td>
              <td>
                <span :class="prize.is_enabled ? 'status-on' : 'status-off'">
                  {{ prize.is_enabled ? '启用' : '禁用' }}
                </span>
              </td>
              <td>
                <button @click="openEditModal(prize)" class="edit-btn">编辑</button>
                <button @click="deletePrize(prize.id)" class="delete-btn">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="activeTab === 'records'" class="records-panel">
        <div class="panel-header">
          <h2>抽奖记录</h2>
          <div class="actions">
            <input v-model="searchPhone" placeholder="搜索手机号" @keyup.enter="loadRecords" />
            <select v-model="filterWin" @change="loadRecords">
              <option value="">全部</option>
              <option value="true">中奖</option>
              <option value="false">未中奖</option>
            </select>
            <button @click="exportData" class="export-btn">导出中奖名单</button>
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>手机号</th>
              <th>奖品</th>
              <th>是否中奖</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in records" :key="record.id">
              <td>{{ record.id }}</td>
              <td>{{ record.user_phone }}</td>
              <td>{{ record.prize_name }}</td>
              <td>
                <span :class="record.is_win ? 'win' : 'lose'">
                  {{ record.is_win ? '是' : '否' }}
                </span>
              </td>
              <td>{{ formatTime(record.created_at) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="pagination">
          <button @click="page > 1 && (page--, loadRecords())" :disabled="page <= 1">上一页</button>
          <span>第 {{ page }} 页 / 共 {{ Math.ceil(total / pageSize) }} 页</span>
          <button @click="page < Math.ceil(total / pageSize) && (page++, loadRecords())" :disabled="page >= Math.ceil(total / pageSize)">下一页</button>
        </div>
      </div>
    </div>

    <el-dialog v-model="showModal" :title="editingPrize ? '编辑奖品' : '添加奖品'" width="500px">
      <div class="form">
        <div class="form-item">
          <label>奖品名称</label>
          <input v-model="form.name" placeholder="请输入奖品名称" />
        </div>
        <div class="form-item">
          <label>描述</label>
          <textarea v-model="form.description" placeholder="请输入描述"></textarea>
        </div>
        <div class="form-item">
          <label>图片URL</label>
          <input v-model="form.image_url" placeholder="请输入图片URL" />
        </div>
        <div class="form-row">
          <div class="form-item">
            <label>库存</label>
            <input type="number" v-model.number="form.stock" min="0" />
          </div>
          <div class="form-item">
            <label>概率(0-1)</label>
            <input type="number" v-model.number="form.probability" step="0.01" min="0" max="1" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-item">
            <label>排序</label>
            <input type="number" v-model.number="form.sort_order" />
          </div>
          <div class="form-item">
            <label>启用</label>
            <input type="checkbox" v-model="form.is_enabled" />
          </div>
        </div>
      </div>
      <template #footer>
        <button @click="showModal = false" class="cancel-btn">取消</button>
        <button @click="savePrize" class="save-btn">保存</button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import {
  adminGetPrizes,
  adminCreatePrize,
  adminUpdatePrize,
  adminDeletePrize,
  adminGetRecords,
  exportRecords,
  validateProbability
} from '../api'

const router = useRouter()
const activeTab = ref('prizes')
const prizes = ref([])
const records = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const searchPhone = ref('')
const filterWin = ref('')
const showModal = ref(false)
const editingPrize = ref(null)
const probInfo = ref(null)

const form = ref({
  name: '',
  description: '',
  image_url: '',
  stock: 0,
  probability: 0,
  sort_order: 0,
  is_enabled: true
})

const logout = () => {
  localStorage.removeItem('admin_token')
  router.push('/admin/login')
}

const loadPrizes = async () => {
  prizes.value = await adminGetPrizes()
}

const loadRecords = async () => {
  const params = {
    page: page.value,
    pageSize: pageSize.value
  }
  if (searchPhone.value) params.phone = searchPhone.value
  if (filterWin.value) params.is_win = filterWin.value

  const res = await adminGetRecords(params)
  records.value = res.list
  total.value = res.total
}

const validateProb = async () => {
  probInfo.value = await validateProbability()
  ElMessage.info(`总概率: ${(probInfo.value.total * 100).toFixed(2)}%`)
}

const openAddModal = () => {
  editingPrize.value = null
  form.value = {
    name: '',
    description: '',
    image_url: '',
    stock: 0,
    probability: 0,
    sort_order: 0,
    is_enabled: true
  }
  showModal.value = true
}

const openEditModal = (prize) => {
  editingPrize.value = prize
  form.value = { ...prize }
  showModal.value = true
}

const savePrize = async () => {
  try {
    if (editingPrize.value) {
      await adminUpdatePrize(editingPrize.value.id, form.value)
      ElMessage.success('更新成功')
    } else {
      await adminCreatePrize(form.value)
      ElMessage.success('创建成功')
    }
    showModal.value = false
    loadPrizes()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '保存失败')
  }
}

const deletePrize = async (id) => {
  try {
    await ElMessageBox.confirm('确定删除该奖品？', '提示', { type: 'warning' })
    await adminDeletePrize(id)
    ElMessage.success('删除成功')
    loadPrizes()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const exportData = async () => {
  try {
    const res = await exportRecords()
    const blob = new Blob([res], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `winners_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (e) {
    ElMessage.error('导出失败')
  }
}

const formatTime = (t) => new Date(t).toLocaleString()

onMounted(() => {
  axios.defaults.headers.common['Authorization'] = 'Bearer ' + localStorage.getItem('admin_token')
  loadPrizes()
  loadRecords()
})
</script>

<style scoped>
.admin {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  background: white;
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.header h1 {
  margin: 0;
  font-size: 24px;
}

.logout-btn {
  padding: 8px 20px;
  background: #f56c6c;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.tabs {
  padding: 20px 40px 0;
  display: flex;
  gap: 10px;
}

.tabs button {
  padding: 10px 24px;
  border: none;
  background: white;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  font-size: 16px;
}

.tabs button.active {
  background: #667eea;
  color: white;
}

.content {
  padding: 20px 40px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-header h2 {
  margin: 0;
}

.actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.actions input, .actions select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.add-btn, .export-btn, .validate-btn {
  padding: 8px 16px;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.add-btn { background: #67c23a; }
.export-btn { background: #e6a23c; }
.validate-btn { background: #909399; }

.prob-info {
  background: #fff7e6;
  padding: 12px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  gap: 20px;
}

.prob-info .valid { color: #67c23a; }
.prob-info .invalid { color: #f56c6c; }

.data-table {
  width: 100%;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  border-collapse: collapse;
}

.data-table th, .data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

.data-table th {
  background: #fafafa;
  font-weight: 600;
}

.status-on { color: #67c23a; }
.status-off { color: #909399; }
.win { color: #f56c6c; font-weight: bold; }
.lose { color: #909399; }

.edit-btn, .delete-btn {
  padding: 4px 12px;
  margin-right: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.edit-btn { background: #409eff; color: white; }
.delete-btn { background: #f56c6c; color: white; }

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.pagination button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-item label {
  font-weight: 500;
}

.form-item input, .form-item textarea {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  outline: none;
}

.form-item input:focus, .form-item textarea:focus {
  border-color: #667eea;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.cancel-btn, .save-btn {
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  margin-left: 10px;
}

.cancel-btn {
  background: #f0f0f0;
  border: 1px solid #ddd;
}

.save-btn {
  background: #667eea;
  color: white;
  border: none;
}
</style>
