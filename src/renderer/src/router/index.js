import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@renderer/views/Home.vue')
  },
  {
    path: '/editor',
    name: 'Editor',
    component: () => import('@renderer/views/Editor.vue')
  },
  {
    path: '/timeline',
    name: 'Timeline',
    component: () => import('@renderer/views/Timeline.vue')
  }
  // 在这里添加更多路由配置
]

const router = createRouter({
  // 在 Electron 中使用 hash 模式
  history: createWebHashHistory(),
  routes
})

export default router
