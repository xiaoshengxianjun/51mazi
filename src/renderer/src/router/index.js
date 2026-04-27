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
    path: '/setting-manager',
    name: 'SettingManager',
    component: () => import('@renderer/views/SettingManager.vue')
  },
  {
    path: '/outline-manager',
    name: 'OutlineManager',
    component: () => import('@renderer/views/OutlineManager.vue')
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
  },
  {
    path: '/novel-download',
    name: 'NovelDownload',
    component: () => import('@renderer/views/NovelDownload.vue')
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
    // 优先检查本窗口 sessionStorage（同窗口内跳转路由时的快速判断）
    const sessionAuthenticated = sessionStorage.getItem('bookshelfAuthenticated') === 'true'
    if (sessionAuthenticated) {
      next()
      return
    }

    // sessionStorage 中没有标记时（新窗口场景），向主进程查询当前会话的认证状态。
    // 主进程的 bookshelfAuthenticated 变量在应用启动时为 false，
    // 用户在任意窗口完成书架密码验证后即被设为 true，重启应用后自动重置。
    const mainProcessAuthenticated = await window.electron?.getBookshelfAuthenticated?.()
    if (mainProcessAuthenticated) {
      // 同步到本窗口 sessionStorage，避免后续每次路由跳转都发起 IPC 调用
      sessionStorage.setItem('bookshelfAuthenticated', 'true')
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
