import { ref, type Ref } from 'vue'
import { useRouter, useRoute, type NavigationGuardNext } from 'vue-router'
import { useUserStore } from '../stores/user'
import {
  getDocumentPermissions,
  getDepartmentPermissions,
  type DocumentPermission,
  type DepartmentPermission
} from '../api/permission'
import type { PermissionType } from '../types/document'

const permissionCache = new Map<string, boolean>()

export function hasDocumentPermission(
  docId: string | number,
  permission: PermissionType
): { hasPermission: Ref<boolean>; loading: Ref<boolean>; error: Ref<string | null>; check: () => Promise<boolean> } {
  const userStore = useUserStore()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasPermission = ref(false)

  const checkPermissionLevel = (
    userPermission: string,
    requiredPermission: PermissionType
  ): boolean => {
    const permissionLevels: Record<PermissionType, number> = {
      DENY: -1,
      VIEW: 1,
      EDIT: 2,
      MANAGE: 3
    }

    const userLevel = permissionLevels[userPermission as PermissionType] || 0
    const requiredLevel = permissionLevels[requiredPermission] || 0

    return userLevel >= requiredLevel && userLevel !== -1
  }

  const check = async (): Promise<boolean> => {
    const cacheKey = `doc:${docId}:${permission}`
    if (permissionCache.has(cacheKey)) {
      hasPermission.value = permissionCache.get(cacheKey)!
      return hasPermission.value
    }

    if (userStore.hasPermission('*')) {
      hasPermission.value = true
      permissionCache.set(cacheKey, true)
      return true
    }

    loading.value = true
    error.value = null
    try {
      const response = await getDocumentPermissions(String(docId))
      if (response.code === 200) {
        const permissions = response.data
        const userId = userStore.userInfo?.id
        const departmentId = userStore.userInfo?.departmentId

        let userPermission: DocumentPermission | undefined
        let deptPermission: DocumentPermission | undefined

        for (const p of permissions) {
          if (p.targetType === 'user' && String(p.targetId) === String(userId)) {
            userPermission = p
          }
          if (p.targetType === 'department' && String(p.targetId) === String(departmentId)) {
            deptPermission = p
          }
        }

        const effectivePermission = userPermission || deptPermission
        let result = false

        if (effectivePermission) {
          result = checkPermissionLevel(effectivePermission.permission, permission)
        } else {
          result = permission === 'VIEW'
        }

        hasPermission.value = result
        permissionCache.set(cacheKey, result)
        return result
      }
      error.value = response.message || '权限检查失败'
      hasPermission.value = false
      return false
    } catch (err) {
      error.value = err instanceof Error ? err.message : '权限检查失败'
      hasPermission.value = false
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    hasPermission,
    loading,
    error,
    check
  }
}

export function hasDepartmentPermission(
  deptId: string | number,
  permission: PermissionType
): { hasPermission: Ref<boolean>; loading: Ref<boolean>; error: Ref<string | null>; check: () => Promise<boolean> } {
  const userStore = useUserStore()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasPermission = ref(false)

  const checkPermissionLevel = (
    userPermission: string,
    requiredPermission: PermissionType
  ): boolean => {
    const permissionLevels: Record<PermissionType, number> = {
      DENY: -1,
      VIEW: 1,
      EDIT: 2,
      MANAGE: 3
    }

    const userLevel = permissionLevels[userPermission as PermissionType] || 0
    const requiredLevel = permissionLevels[requiredPermission] || 0

    return userLevel >= requiredLevel && userLevel !== -1
  }

  const check = async (): Promise<boolean> => {
    const cacheKey = `dept:${deptId}:${permission}`
    if (permissionCache.has(cacheKey)) {
      hasPermission.value = permissionCache.get(cacheKey)!
      return hasPermission.value
    }

    if (userStore.hasPermission('*')) {
      hasPermission.value = true
      permissionCache.set(cacheKey, true)
      return true
    }

    const userDeptId = userStore.userInfo?.departmentId
    if (String(userDeptId) === String(deptId)) {
      hasPermission.value = true
      permissionCache.set(cacheKey, true)
      return true
    }

    loading.value = true
    error.value = null
    try {
      const response = await getDepartmentPermissions(String(deptId))
      if (response.code === 200) {
        const permissions = response.data
        const userId = userStore.userInfo?.id

        let userPermission: DepartmentPermission | undefined
        let deptPermission: DepartmentPermission | undefined

        for (const p of permissions) {
          if (p.targetType === 'user' && String(p.targetId) === String(userId)) {
            userPermission = p
          }
          if (p.targetType === 'department') {
            deptPermission = p
          }
        }

        const effectivePermission = userPermission || deptPermission
        let result = false

        if (effectivePermission) {
          result = checkPermissionLevel(effectivePermission.permission, permission)
        }

        hasPermission.value = result
        permissionCache.set(cacheKey, result)
        return result
      }
      error.value = response.message || '权限检查失败'
      hasPermission.value = false
      return false
    } catch (err) {
      error.value = err instanceof Error ? err.message : '权限检查失败'
      hasPermission.value = false
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    hasPermission,
    loading,
    error,
    check
  }
}

export function usePermissionGuard() {
  const router = useRouter()
  const route = useRoute()
  const userStore = useUserStore()
  const checking = ref(false)

  const clearPermissionCache = (): void => {
    permissionCache.clear()
  }

  const canAccessRoute = async (
    to: ReturnType<typeof useRoute>
  ): Promise<{ allowed: boolean; redirect?: string }> => {
    const meta = to.meta as { requiresAuth?: boolean; permissions?: string[]; roles?: string[] }

    if (!meta.requiresAuth) {
      return { allowed: true }
    }

    if (!userStore.isLoggedIn) {
      return { allowed: false, redirect: '/login' }
    }

    if (meta.roles && meta.roles.length > 0) {
      const hasRequiredRole = meta.roles.some(role => userStore.hasRole(role))
      if (!hasRequiredRole) {
        return { allowed: false, redirect: '/403' }
      }
    }

    if (meta.permissions && meta.permissions.length > 0) {
      const hasRequiredPermission = meta.permissions.some(perm => userStore.hasPermission(perm))
      if (!hasRequiredPermission) {
        return { allowed: false, redirect: '/403' }
      }
    }

    const docId = to.params.docId as string | undefined
    if (docId) {
      const requiredPermission = (to.meta as { documentPermission?: PermissionType })?.documentPermission || 'VIEW'
      const { check } = hasDocumentPermission(docId, requiredPermission)
      const hasDocPermission = await check()
      if (!hasDocPermission) {
        return { allowed: false, redirect: '/403' }
      }
    }

    return { allowed: true }
  }

  const setupGuard = (): void => {
    router.beforeEach(async (to, _from, next: NavigationGuardNext) => {
      checking.value = true
      try {
        const result = await canAccessRoute(to as unknown as ReturnType<typeof useRoute>)
        if (result.allowed) {
          next()
        } else if (result.redirect) {
          next(result.redirect)
        } else {
          next(false)
        }
      } catch (err) {
        console.error('Permission guard error:', err)
        next('/403')
      } finally {
        checking.value = false
      }
    })
  }

  return {
    checking,
    canAccessRoute,
    setupGuard,
    clearPermissionCache
  }
}
