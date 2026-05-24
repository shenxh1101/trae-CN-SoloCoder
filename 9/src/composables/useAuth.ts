import { ref, computed } from 'vue'
import { useUserStore, type UserInfoData } from '@/stores/user'

export function useLogin() {
  const userStore = useUserStore()

  async function login(username: string, password: string) {
    return userStore.login({ username, password })
  }

  return {
    login,
    isLoggedIn: computed(() => userStore.isLoggedIn),
    userInfo: computed(() => userStore.userInfo)
  }
}

export function useLogout() {
  const userStore = useUserStore()

  function logout() {
    userStore.logout()
  }

  return {
    logout
  }
}

export function useUserInfo() {
  const userStore = useUserStore()

  async function fetchUserInfo() {
    return userStore.getUserInfo()
  }

  return {
    userInfo: computed(() => userStore.userInfo),
    realName: computed(() => userStore.realName),
    avatar: computed(() => userStore.avatar),
    departmentId: computed(() => userStore.departmentId),
    departmentName: computed(() => userStore.departmentName),
    isAdmin: computed(() => userStore.isAdmin),
    fetchUserInfo
  }
}

export function usePermissionCheck() {
  const userStore = useUserStore()

  function hasPermission(permission: string): boolean {
    return userStore.hasPermission(permission)
  }

  function hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(p => userStore.hasPermission(p))
  }

  function hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(p => userStore.hasPermission(p))
  }

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  }
}

export function useRoleCheck() {
  const userStore = useUserStore()

  function hasRole(role: string): boolean {
    return userStore.hasRole(role)
  }

  function hasAnyRole(roles: string[]): boolean {
    return roles.some(r => userStore.hasRole(r))
  }

  function isAdmin(): boolean {
    return userStore.isAdmin
  }

  return {
    hasRole,
    hasAnyRole,
    isAdmin
  }
}
