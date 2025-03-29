import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    // component: () => import('../views/Home.vue')
    component: () => import('../App.vue')
  }
  // 在这里添加更多路由配置
]

const router = createRouter({
  // 在 Electron 中使用 hash 模式
  history: createWebHashHistory(),
  routes
})

export default router
