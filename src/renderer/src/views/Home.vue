<template>
  <div class="home-page">
    <!-- 左侧导航栏 -->
    <div class="sidebar">
      <div class="logo">
        <img src="/src/assets/images/logo_big.png" alt="logo" class="logo-img" />
      </div>
      <div class="menu">
        <div class="menu-item active">
          <i class="el-icon-document"></i>
          我的书架
        </div>
        <div class="menu-item" @click="showThemeDialog = true">
          <i class="el-icon-setting"></i>
          主题设置
        </div>
        <div class="menu-item" @click="showDirDialog = true">
          <i class="el-icon-setting"></i>
          系统设置
        </div>
        <div class="menu-item" @click="goToUserGuide">
          <i class="el-icon-reading"></i>
          写作指南
        </div>
        <div class="menu-item" @click="showHelpDialog = true">
          <i class="el-icon-question"></i>
          帮助中心
        </div>
        <div class="menu-item" @click="showSponsorDialog = true">
          <i class="el-icon-money"></i>
          赞助作者
        </div>
        <div class="menu-item" @click="showPasswordDialog = true">
          <i class="el-icon-lock"></i>
          书架密码
        </div>
      </div>
    </div>

    <!-- 书架区 -->
    <Bookshelf />

    <!-- 选择书籍目录弹窗 -->
    <el-dialog
      v-model="showDirDialog"
      title="请选择书籍主目录"
      width="600px"
      :close-on-click-modal="false"
      :show-close="false"
      align-center
    >
      <el-form label-width="80px">
        <el-form-item label="书籍目录">
          <el-row :gutter="10" style="width: 100%">
            <el-col :span="18">
              <el-input v-model="bookDir" readonly placeholder="请选择目录" />
            </el-col>
            <el-col :span="6">
              <el-button type="primary" style="width: 100%" @click="handleChooseDir">
                选择目录
              </el-button>
            </el-col>
          </el-row>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" :disabled="!bookDir" @click="handleConfirmDir">确定</el-button>
      </template>
    </el-dialog>

    <!-- 主题设置弹框 -->
    <el-dialog v-model="showThemeDialog" title="主题设置" width="600" :close-on-click-modal="false">
      <div class="theme-selector">
        <div
          v-for="theme in availableThemes"
          :key="theme.key"
          class="theme-option"
          :class="{ active: themeStore.currentTheme === theme.key }"
          @click="handleThemeChange(theme.key)"
        >
          <div class="theme-preview" :class="theme.key" :style="getPreviewStyle(theme.key)">
            <div class="preview-content">
              <div class="preview-header"></div>
              <div class="preview-body"></div>
            </div>
          </div>
          <span>{{ theme.name }}</span>
        </div>
      </div>
    </el-dialog>

    <!-- 帮助中心弹框 -->
    <el-dialog v-model="showHelpDialog" title="帮助中心" width="420px" align-center>
      <div class="dialog-content">
        <img :src="qqGroupQrcode" alt="QQ 群二维码" class="dialog-image" />
        <p class="dialog-text">
          问题反馈 / 商务合作邮箱：
          <a class="dialog-link" :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
        </p>
      </div>
    </el-dialog>

    <!-- 赞助作者弹框 -->
    <el-dialog v-model="showSponsorDialog" title="赞助作者" width="420px" align-center center>
      <div class="dialog-content">
        <img :src="rewardQrcode" alt="赞助二维码" class="dialog-image" />
        <p class="dialog-text">各位大哥大姐，求个赏呗，感谢支持！</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="handleConsiderClick">考虑一下</el-button>
        <el-button type="primary" @click="handleRewardClick">朕已恩赏</el-button>
      </template>
    </el-dialog>

    <!-- 书架密码设置组件 -->
    <BookshelfPasswordSettings v-model="showPasswordDialog" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Bookshelf from '@renderer/components/Bookshelf.vue'
import BookshelfPasswordSettings from '@renderer/components/BookshelfPasswordSettings.vue'
import { useThemeStore } from '@renderer/stores/theme'
import { ElDialog, ElMessage } from 'element-plus'

const router = useRouter()
const showDirDialog = ref(false)
const bookDir = ref('')
const showThemeDialog = ref(false)
const showHelpDialog = ref(false)
const showSponsorDialog = ref(false)
const showPasswordDialog = ref(false)
const themeStore = useThemeStore()
const qqGroupQrcode = new URL('../../../../static/51mazi_qq_qrcode.jpg', import.meta.url).href
const rewardQrcode = new URL('../../../../static/wx_reward_qrcode.png', import.meta.url).href
const contactEmail = 'fomazi@163.com'

// 定时器 ID
let sponsorDialogTimer = null

// 检查本地存储是否有bookDir
onMounted(async () => {
  const dir = await window.electronStore?.get('booksDir')
  if (!dir) {
    showDirDialog.value = true
  } else {
    bookDir.value = dir
  }
  // 初始化主题
  await themeStore.initTheme()
  // 检查是否需要自动显示赞助弹框
  await checkAutoShowSponsorDialog()
})

// 清理定时器
onUnmounted(() => {
  if (sponsorDialogTimer) {
    clearTimeout(sponsorDialogTimer)
    sponsorDialogTimer = null
  }
})

// 检查是否需要自动显示赞助弹框
async function checkAutoShowSponsorDialog() {
  try {
    const now = Date.now()
    const oneHour = 60 * 60 * 1000 // 1小时的毫秒数

    // 检查是否是第一次打开首页
    const firstVisitTime = await window.electronStore?.get('home.firstVisitTime')
    if (!firstVisitTime) {
      // 第一次打开首页，记录当前时间
      await window.electronStore?.set('home.firstVisitTime', now)
      // 设置1小时后自动显示
      sponsorDialogTimer = setTimeout(() => {
        showSponsorDialog.value = true
      }, oneHour)
      return
    }

    // 检查最后一次关闭时间和操作
    const lastCloseTime = await window.electronStore?.get('home.sponsorDialogLastCloseTime')
    const lastAction = await window.electronStore?.get('home.sponsorDialogLastAction')
    const considerCount = (await window.electronStore?.get('home.sponsorDialogConsiderCount')) || 0

    // 如果没有关闭记录，说明还没有显示过，使用首次访问逻辑
    if (!lastCloseTime) {
      const elapsed = now - firstVisitTime
      if (elapsed >= oneHour) {
        // 已经过了1小时，立即显示
        showSponsorDialog.value = true
      } else {
        // 还没到1小时，设置定时器
        const remaining = oneHour - elapsed
        sponsorDialogTimer = setTimeout(() => {
          showSponsorDialog.value = true
        }, remaining)
      }
      return
    }

    // 根据上次操作决定下次显示时间
    let nextShowDelay = 0
    if (lastAction === 'reward') {
      // 点击"朕已恩赏"，15天后显示
      nextShowDelay = 15 * 24 * 60 * 60 * 1000 // 15天
    } else if (lastAction === 'consider') {
      // 点击"考虑一下"
      if (considerCount >= 3) {
        // 连续3次点击"考虑一下"，改为1天显示一次
        nextShowDelay = 24 * 60 * 60 * 1000 // 1天
      } else {
        // 前3次点击"考虑一下"，3天后显示
        nextShowDelay = 3 * 24 * 60 * 60 * 1000 // 3天
      }
    }

    // 计算距离上次关闭已经过了多长时间
    const elapsed = now - lastCloseTime
    if (elapsed >= nextShowDelay) {
      // 已经过了设定时间，立即显示
      showSponsorDialog.value = true
    } else {
      // 还没到时间，设置定时器
      const remaining = nextShowDelay - elapsed
      sponsorDialogTimer = setTimeout(() => {
        showSponsorDialog.value = true
      }, remaining)
    }
  } catch (error) {
    console.error('检查自动显示赞助弹框失败:', error)
  }
}

// 处理"考虑一下"点击
async function handleConsiderClick() {
  try {
    showSponsorDialog.value = false

    // 记录关闭时间和操作
    const now = Date.now()
    await window.electronStore?.set('home.sponsorDialogLastCloseTime', now)
    await window.electronStore?.set('home.sponsorDialogLastAction', 'consider')

    // 获取并更新"考虑一下"的连续点击次数
    const considerCount = (await window.electronStore?.get('home.sponsorDialogConsiderCount')) || 0
    const newConsiderCount = considerCount + 1
    await window.electronStore?.set('home.sponsorDialogConsiderCount', newConsiderCount)

    // 根据连续点击次数决定下次显示延迟
    let nextShowDelay = 0
    if (newConsiderCount >= 3) {
      // 连续3次点击"考虑一下"，改为1天显示一次
      nextShowDelay = 24 * 60 * 60 * 1000 // 1天
    } else {
      // 前3次点击"考虑一下"，3天后显示
      nextShowDelay = 3 * 24 * 60 * 60 * 1000 // 3天
    }

    // 清理旧定时器
    if (sponsorDialogTimer) {
      clearTimeout(sponsorDialogTimer)
      sponsorDialogTimer = null
    }

    // 设置新的定时器
    sponsorDialogTimer = setTimeout(() => {
      showSponsorDialog.value = true
    }, nextShowDelay)
  } catch (error) {
    console.error('处理"考虑一下"点击失败:', error)
    showSponsorDialog.value = false
  }
}

// 处理"朕已恩赏"点击
async function handleRewardClick() {
  try {
    showSponsorDialog.value = false

    // 记录关闭时间和操作
    const now = Date.now()
    await window.electronStore?.set('home.sponsorDialogLastCloseTime', now)
    await window.electronStore?.set('home.sponsorDialogLastAction', 'reward')

    // 重置"考虑一下"的连续点击次数（因为用户点击了"朕已恩赏"）
    await window.electronStore?.set('home.sponsorDialogConsiderCount', 0)

    // 15天后显示
    const nextShowDelay = 15 * 24 * 60 * 60 * 1000 // 15天

    // 清理旧定时器
    if (sponsorDialogTimer) {
      clearTimeout(sponsorDialogTimer)
      sponsorDialogTimer = null
    }

    // 设置新的定时器
    sponsorDialogTimer = setTimeout(() => {
      showSponsorDialog.value = true
    }, nextShowDelay)
  } catch (error) {
    console.error('处理"朕已恩赏"点击失败:', error)
    showSponsorDialog.value = false
  }
}

// 选择目录
async function handleChooseDir() {
  const result = await window.electron?.selectBooksDir()
  if (result && result.filePaths && result.filePaths[0]) {
    bookDir.value = result.filePaths[0]
    await window.electronStore.set('booksDir', bookDir.value)
    showDirDialog.value = false
  }
}

// 确认目录
async function handleConfirmDir() {
  await window.electronStore.set('booksDir', bookDir.value)
  showDirDialog.value = false
}

// 获取可用主题列表
const availableThemes = themeStore.getAvailableThemes()

// 获取主题预览样式
const getPreviewStyle = (themeKey) => {
  const config = themeStore.getThemeConfig(themeKey)
  return {
    '--preview-bg-primary': config.bgPrimary,
    '--preview-bg-soft': config.bgSoft,
    '--preview-bg-mute': config.bgMute,
    '--preview-border-color': config.borderColor
  }
}

// 处理主题切换
const handleThemeChange = (theme) => {
  themeStore.setTheme(theme)
  const themeName = themeStore.getThemeName(theme)
  ElMessage.success(`已切换到${themeName}主题`)
}

// 跳转到写作指南
const goToUserGuide = () => {
  router.push('/user-guide')
}
</script>

<style lang="scss" scoped>
@use '/src/assets/styles/variables' as *;

.home-page {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: var(--bg-primary);
}

.sidebar {
  width: 200px;
  background-color: var(--bg-soft);
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
}

.logo {
  font-size: 24px;
  font-weight: bold;
  padding: 0 20px;
  margin-bottom: 30px;
}

.logo-img {
  display: block;
  width: 100%;
}

.menu {
  display: flex;
  flex-direction: column;
}

.menu-item {
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: var(--text-base);
  transition: all 0.3s;
}

.menu-item:hover,
.menu-item.active {
  background-color: var(--bg-mute);
  // color: #6366f1;
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 15px;
  border-radius: 8px;
  transition: all 0.3s ease;

  &:hover {
    background-color: var(--bg-mute);
  }

  &.active {
    border: 2px solid var(--primary-color);
    background-color: var(--bg-mute);
  }

  span {
    font-size: 14px;
    color: var(--text-base);
  }
}

.theme-preview {
  width: 100%;
  height: 80px;
  border-radius: 8px;
  border: 2px solid var(--border-color);
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;

  .preview-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  // 使用CSS变量，从主题配置中动态获取颜色
  background: var(--preview-bg-primary);
  border-color: var(--preview-border-color);

  .preview-header {
    height: 20px;
    border-bottom: 1px solid;
    background: var(--preview-bg-soft);
    border-color: var(--preview-border-color);
  }

  .preview-body {
    flex: 1;
    background: var(--preview-bg-mute);
  }
}

.theme-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin: 20px 0;
  padding: 10px;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.dialog-image {
  width: 260px;
  max-width: 100%;
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.dialog-text {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.dialog-link {
  color: var(--primary-color);
}

:deep(.el-radio) {
  display: flex;
  align-items: center;
  margin-right: 0;
  height: 32px;
}
</style>
