import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, getUserInfo as apiGetUserInfo, logout as apiLogout } from '@/api/auth'
import type { LoginParams, LoginResult, UserInfo } from '@/api/auth'

const TOKEN_KEY = 'token'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_INFO_KEY = 'userInfo'

export type UserInfoData = {
  id: number
  username: string
  realName: string
  email: string
  phone: string
  avatar: string
  departmentId: number | null
  departmentName: string | null
  position: string
  isAdmin: boolean
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem(TOKEN_KEY) || '')
  const userInfo = ref<UserInfoData | null>(JSON.parse(localStorage.getItem(USER_INFO_KEY) || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => userInfo.value?.isAdmin || false)
  const userId = computed(() => userInfo.value?.id || null)
  const username = computed(() => userInfo.value?.username || '')
  const realName = computed(() => userInfo.value?.realName || '')
  const avatar = computed(() => userInfo.value?.avatar || '')
  const departmentId = computed(() => userInfo.value?.departmentId || null)
  const departmentName = computed(() => userInfo.value?.departmentName || '')

  async function login(params: LoginParams): Promise<LoginResult> {
    const response = await apiLogin(params)
    
    if (response.code === 200) {
      const result = response.data
      token.value = result.accessToken
      userInfo.value = result.userInfo
      
      localStorage.setItem(TOKEN_KEY, result.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken)
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(result.userInfo))
      
      return result
    }
    
    throw new Error(response.message || '登录失败')
  }

  function setUserInfo(info: UserInfoData): void {
    userInfo.value = info
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(info))
  }

  function logout(): void {
    try {
      apiLogout()
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      token.value = ''
      userInfo.value = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(USER_INFO_KEY)
    }
  }

  async function getUserInfo(): Promise<UserInfoData> {
    try {
      const response = await apiGetUserInfo()
      
      if (response.code === 200) {
        userInfo.value = response.data
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(response.data))
        return response.data
      }
      
      throw new Error(response.message || '获取用户信息失败')
    } catch (error) {
      logout()
      throw error
    }
  }

  function hasRole(role: string | string[]): boolean {
    if (isAdmin.value) {
      return true
    }
    
    if (Array.isArray(role)) {
      return role.some(r => r === 'ADMIN' || r === 'admin')
    }
    return role === 'ADMIN' || role === 'admin'
  }

  function hasPermission(permission: string | string[]): boolean {
    if (isAdmin.value) {
      return true
    }
    
    return true
  }

  function updateUserInfo(info: Partial<UserInfoData>): void {
    if (userInfo.value) {
      userInfo.value = { ...userInfo.value, ...info }
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo.value))
    }
  }

  function clearAuth(): void {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_INFO_KEY)
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    isAdmin,
    userId,
    username,
    realName,
    avatar,
    departmentId,
    departmentName,
    login,
    logout,
    getUserInfo,
    setUserInfo,
    hasRole,
    hasPermission,
    updateUserInfo,
    clearAuth
  }
})
