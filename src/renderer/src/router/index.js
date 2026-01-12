import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/auth',
    name: 'Auth',
    component: () => import('@renderer/views/Auth.vue')
  },
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
  },
  {
    path: '/relationship-list',
    name: 'RelationshipList',
    component: () => import('@renderer/views/RelationshipList.vue')
  },
  {
    path: '/relationship-design',
    name: 'RelationshipDesign',
    component: () => import('@renderer/views/RelationshipDesign.vue')
  },
  {
    path: '/user-guide',
    name: 'UserGuide',
    component: () => import('@renderer/views/UserGuide.vue')
  },
  {
    path: '/events-sequence',
    name: 'EventsSequence',
    component: () => import('@renderer/views/EventsSequence.vue')
  },
  {
    path: '/organization-list',
    name: 'OrganizationList',
    component: () => import('@renderer/views/OrganizationList.vue')
  },
  {
    path: '/organization-design',
    name: 'OrganizationDesign',
    component: () => import('@renderer/views/OrganizationDesign.vue')
  }
  // 在这里添加更多路由配置
]

const router = createRouter({
  // 在 Electron 中使用 hash 模式
  history: createWebHashHistory(),
  routes
})

// 路由守卫：检查书架密码
router.beforeEach(async (to, from, next) => {
  // 如果访问认证页面，直接通过
  if (to.name === 'Auth') {
    next()
    return
  }

  // 检查是否有书架密码
  const password = await window.electronStore?.get('bookshelfPassword')
  if (password) {
    // 有密码，检查是否已认证（通过sessionStorage记录）
    const isAuthenticated = sessionStorage.getItem('bookshelfAuthenticated') === 'true'
    if (isAuthenticated) {
      // 已认证，直接通过
      next()
    } else {
      // 未认证，跳转到认证页面
      next({ name: 'Auth' })
    }
  } else {
    // 没有密码，直接通过
    next()
  }
})

export default router
