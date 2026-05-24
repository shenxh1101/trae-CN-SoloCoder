import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import CreateRoomPage from '@/pages/CreateRoomPage.vue'
import VoteRoomPage from '@/pages/VoteRoomPage.vue'
import ResultsPage from '@/pages/ResultsPage.vue'

// 定义路由配置
const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/create',
    name: 'create-room',
    component: CreateRoomPage,
  },
  {
    path: '/room/:id',
    name: 'vote-room',
    component: VoteRoomPage,
  },
  {
    path: '/room/:id/results',
    name: 'room-results',
    component: ResultsPage,
  },
  {
    path: '/about',
    name: 'about',
    component: {
      template: '<div class="text-center text-xl p-8">About Page - Coming Soon</div>',
    },
  },
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
