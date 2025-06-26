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
  },
  {
    path: '/character-profile',
    name: 'CharacterProfile',
    component: () => import('@renderer/views/CharacterProfile.vue')
  },
  {
    path: '/dictionary',
    name: 'Dictionary',
    component: () => import('@renderer/views/Dictionary.vue')
  },
  {
    path: '/map-list',
    name: 'MapList',
    component: () => import('@renderer/views/MapList.vue')
  },
  {
    path: '/map-design',
    name: 'MapDesign',
    component: () => import('@renderer/views/MapDesign.vue')
  }
  // 在这里添加更多路由配置
]

const router = createRouter({
  // 在 Electron 中使用 hash 模式
  history: createWebHashHistory(),
  routes
})

export default router
