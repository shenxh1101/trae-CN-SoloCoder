<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock, Eye, EyeOff, Building2, Loader2 } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { login, ldapLogin, type LoginParams, type LdapLoginParams } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

type LoginMode = 'normal' | 'ldap'

const loginMode = ref<LoginMode>('normal')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const form = reactive<LoginParams>({
  username: '',
  password: ''
})

const errors = reactive({
  username: '',
  password: ''
})

const usernameValid = computed(() => {
  if (!form.username) return true
  return form.username.length >= 3
})

const passwordValid = computed(() => {
  if (!form.password) return true
  return form.password.length >= 6
})

function validateForm(): boolean {
  let valid = true
  errors.username = ''
  errors.password = ''
  errorMessage.value = ''

  if (!form.username) {
    errors.username = '请输入用户名'
    valid = false
  } else if (form.username.length < 3) {
    errors.username = '用户名至少3个字符'
    valid = false
  }

  if (!form.password) {
    errors.password = '请输入密码'
    valid = false
  } else if (form.password.length < 6) {
    errors.password = '密码至少6个字符'
    valid = false
  }

  return valid
}

async function handleLogin() {
  if (!validateForm()) return

  loading.value = true
  errorMessage.value = ''

  try {
    if (loginMode.value === 'ldap') {
      const ldapParams: LdapLoginParams = { username: form.username }
      const response = await ldapLogin(ldapParams)
      
      if (response.code === 200) {
        const { accessToken, userInfo } = response.data
        localStorage.setItem('token', accessToken)
        userStore.setUserInfo(userInfo)
        
        const redirect = route.query.redirect as string || '/'
        router.push(redirect)
      } else {
        errorMessage.value = response.message || '登录失败'
      }
    } else {
      const response = await login(form)
      
      if (response.code === 200) {
        const { accessToken, refreshToken, userInfo } = response.data
        localStorage.setItem('token', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        userStore.setUserInfo(userInfo)
        
        const redirect = route.query.redirect as string || '/'
        router.push(redirect)
      } else {
        errorMessage.value = response.message || '登录失败'
      }
    }
  } catch (error: any) {
    console.error('Login failed:', error)
    errorMessage.value = error.message || '用户名或密码错误'
  } finally {
    loading.value = false
  }
}

function toggleLoginMode(mode: LoginMode) {
  loginMode.value = mode
  errorMessage.value = ''
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 via-primary-500 to-blue-400 p-4">
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
    </div>

    <div class="relative w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
          <Building2 class="w-8 h-8 text-primary-600" />
        </div>
        <h1 class="text-3xl font-bold text-white mb-2">企业知识库</h1>
        <p class="text-primary-100">高效管理 · 知识共享 · 协同办公</p>
      </div>

      <div class="bg-white rounded-2xl shadow-2xl p-8">
        <div class="flex mb-6 bg-neutral-100 rounded-lg p-1">
          <button
            @click="toggleLoginMode('normal')"
            :class="[
              'flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all',
              loginMode === 'normal'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            ]"
          >
            账号密码登录
          </button>
          <button
            @click="toggleLoginMode('ldap')"
            :class="[
              'flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all',
              loginMode === 'ldap'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            ]"
          >
            LDAP登录
          </button>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-2">用户名</label>
            <div class="relative">
              <User class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                v-model="form.username"
                type="text"
                placeholder="请输入用户名"
                :class="[
                  'w-full pl-10 pr-4 py-3 rounded-lg border transition-colors focus:outline-none',
                  errors.username
                    ? 'border-danger-500 focus:border-danger-500 focus:ring-2 focus:ring-danger-100'
                    : 'border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
                ]"
              />
            </div>
            <p v-if="errors.username" class="mt-1 text-sm text-danger-500">{{ errors.username }}</p>
          </div>

          <div v-if="loginMode === 'normal'">
            <label class="block text-sm font-medium text-neutral-700 mb-2">密码</label>
            <div class="relative">
              <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                :class="[
                  'w-full pl-10 pr-12 py-3 rounded-lg border transition-colors focus:outline-none',
                  errors.password
                    ? 'border-danger-500 focus:border-danger-500 focus:ring-2 focus:ring-danger-100'
                    : 'border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
                ]"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <Eye v-if="!showPassword" class="w-5 h-5" />
                <EyeOff v-else class="w-5 h-5" />
              </button>
            </div>
            <p v-if="errors.password" class="mt-1 text-sm text-danger-500">{{ errors.password }}</p>
          </div>

          <div v-if="errorMessage" class="p-3 bg-danger-50 border border-danger-200 rounded-lg">
            <p class="text-sm text-danger-600">{{ errorMessage }}</p>
          </div>

          <div class="flex items-center justify-between">
            <label class="flex items-center">
              <input type="checkbox" class="w-4 h-4 text-primary-600 rounded border-neutral-300 focus:ring-primary-500" />
              <span class="ml-2 text-sm text-neutral-600">记住我</span>
            </label>
            <a href="#" class="text-sm text-primary-600 hover:text-primary-700">忘记密码?</a>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Loader2 v-if="loading" class="w-5 h-5 animate-spin" />
            <span>{{ loading ? '登录中...' : '登 录' }}</span>
          </button>
        </form>

        <p v-if="loginMode === 'ldap'" class="mt-4 text-xs text-center text-neutral-500">
          LDAP登录需使用公司统一身份认证账号
        </p>
      </div>

      <p class="mt-6 text-center text-sm text-primary-100">
        © 2024 企业知识库系统 v1.0.0
      </p>
    </div>
  </div>
</template>
