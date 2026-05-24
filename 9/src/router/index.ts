import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import Login from '@/pages/Login.vue'
import Home from '@/pages/Home.vue'
import DocumentList from '@/pages/document/List.vue'
import DocumentDetail from '@/pages/document/Detail.vue'
import DocumentEdit from '@/pages/document/Edit.vue'
import VersionHistory from '@/pages/document/VersionHistory.vue'
import ApprovalPending from '@/pages/approval/Pending.vue'
import SearchResult from '@/pages/search/Result.vue'
import TemplateCenter from '@/pages/templates/Center.vue'
import RecycleBin from '@/pages/recycle/Bin.vue'
import RankingList from '@/pages/ranking/List.vue'
import { useUserStore } from '@/stores/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false, title: '登录' }
  },
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Home',
        component: Home,
        meta: { title: '工作台', icon: 'LayoutDashboard' }
      },
      {
        path: 'department/:deptId',
        name: 'DepartmentSpace',
        component: DocumentList,
        meta: { title: '部门空间', icon: 'Building2' }
      },
      {
        path: 'documents',
        name: 'DocumentList',
        component: DocumentList,
        meta: { title: '文档列表', icon: 'FileText' }
      },
      {
        path: 'documents/create',
        name: 'DocumentCreate',
        component: DocumentEdit,
        meta: { title: '创建文档', icon: 'FilePlus' }
      },
      {
        path: 'documents/:docId',
        name: 'DocumentDetail',
        component: DocumentDetail,
        meta: { title: '文档详情', icon: 'FileText' }
      },
      {
        path: 'documents/:docId/edit',
        name: 'DocumentEdit',
        component: DocumentEdit,
        meta: { title: '编辑文档', icon: 'Edit3', permission: 'document:edit' }
      },
      {
        path: 'documents/:docId/versions',
        name: 'VersionHistory',
        component: VersionHistory,
        meta: { title: '版本历史', icon: 'History' }
      },
      {
        path: 'documents/:docId/links',
        name: 'DocumentLinks',
        component: DocumentDetail,
        meta: { title: '反向链接图谱', icon: 'GitBranch' }
      },
      {
        path: 'approval/pending',
        name: 'ApprovalPending',
        component: ApprovalPending,
        meta: { title: '待我审批', icon: 'ClipboardCheck', role: ['APPROVER', 'DEPT_MANAGER', 'ADMIN'] }
      },
      {
        path: 'approval/initiated',
        name: 'ApprovalInitiated',
        component: ApprovalPending,
        meta: { title: '我发起的', icon: 'Send' }
      },
      {
        path: 'approval/:approvalId',
        name: 'ApprovalDetail',
        component: ApprovalPending,
        meta: { title: '审批详情', icon: 'ClipboardCheck' }
      },
      {
        path: 'search',
        name: 'SearchResult',
        component: SearchResult,
        meta: { title: '搜索结果', icon: 'Search' }
      },
      {
        path: 'templates',
        name: 'TemplateCenter',
        component: TemplateCenter,
        meta: { title: '模板中心', icon: 'LayoutTemplate' }
      },
      {
        path: 'recycle',
        name: 'RecycleBin',
        component: RecycleBin,
        meta: { title: '回收站', icon: 'Trash2' }
      },
      {
        path: 'ranking',
        name: 'RankingList',
        component: RankingList,
        meta: { title: '热门排行', icon: 'TrendingUp' }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: Home,
        meta: { title: '个人中心', icon: 'User' }
      },
      {
        path: 'admin/users',
        name: 'UserManage',
        component: Home,
        meta: { title: '用户管理', icon: 'Users', role: ['ADMIN'] }
      },
      {
        path: 'admin/departments',
        name: 'DepartmentManage',
        component: Home,
        meta: { title: '部门管理', icon: 'Building2', role: ['ADMIN'] }
      },
      {
        path: 'admin/templates',
        name: 'TemplateManage',
        component: Home,
        meta: { title: '模板管理', icon: 'LayoutTemplate', role: ['ADMIN'] }
      },
      {
        path: 'admin/api-tokens',
        name: 'ApiTokenManage',
        component: Home,
        meta: { title: 'API Token管理', icon: 'Key', role: ['ADMIN'] }
      },
      {
        path: 'admin/settings',
        name: 'SystemSettings',
        component: Home,
        meta: { title: '系统设置', icon: 'Settings', role: ['ADMIN'] }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  const token = userStore.token

  document.title = to.meta.title ? `${to.meta.title} - 企业知识库` : '企业知识库'

  if (to.meta.requiresAuth === false) {
    if (token) {
      next('/')
    } else {
      next()
    }
    return
  }

  if (!token) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if (!userStore.userInfo) {
    try {
      await userStore.getUserInfo()
    } catch (error) {
      userStore.logout()
      next({ path: '/login', query: { redirect: to.fullPath } })
      return
    }
  }

  const roles = to.meta.role as string[] | undefined
  if (roles && roles.length > 0) {
    const hasRequiredRole = roles.some(role => userStore.hasRole(role))
    if (!hasRequiredRole) {
      next('/403')
      return
    }
  }

  const permission = to.meta.permission as string | undefined
  if (permission && !userStore.hasPermission(permission)) {
    next('/403')
    return
  }

  next()
})

export default router
