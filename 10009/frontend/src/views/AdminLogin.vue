<template>
  <div class="admin-login">
    <div class="login-box">
      <h2>🔐 管理后台登录</h2>
      <div class="form-group">
        <input v-model="token" placeholder="请输入管理员Token" type="password" />
      </div>
      <button @click="doLogin" class="login-btn">登录</button>
      <p class="tip">默认Token: admin-token-12345</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const token = ref('')

const doLogin = () => {
  if (token.value === 'admin-token-12345') {
    localStorage.setItem('admin_token', token.value)
    ElMessage.success('登录成功')
    router.push('/admin')
  } else {
    ElMessage.error('Token错误')
  }
}
</script>

<style scoped>
.admin-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-box {
  background: white;
  border-radius: 16px;
  padding: 40px;
  width: 400px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
}

.login-box h2 {
  text-align: center;
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group input {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  box-sizing: border-box;
}

.form-group input:focus {
  border-color: #667eea;
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
</style>
