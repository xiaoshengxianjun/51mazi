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
        <div class="menu-item" @click="handleCheckUpdate">
          <i class="el-icon-refresh"></i>
          检查更新
        </div>
        <div class="menu-item" @click="handleOpenDeepSeekSettings">
          <i class="el-icon-setting"></i>
          AI 设置
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

    <!-- DeepSeek AI 设置 -->
    <DeepSeekSettings ref="deepSeekSettingsRef" />

    <!-- 更新提示弹框 -->
    <el-dialog
      v-model="showUpdateDialog"
      :title="updateDialogTitle"
      width="500px"
      :close-on-click-modal="false"
      align-center
    >
      <div class="update-dialog-content">
        <div v-if="updateInfo">
          <p class="update-text">
            <strong>新版本：{{ updateInfo.version }}</strong>
          </p>
          <p v-if="updateInfo.releaseDate" class="update-text">
            发布日期：{{ formatDate(updateInfo.releaseDate) }}
          </p>
          <div v-if="updateInfo.releaseNotes" class="update-notes">
            <p><strong>更新内容：</strong></p>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="release-notes" v-html="formatReleaseNotes(updateInfo.releaseNotes)"></div>
          </div>
        </div>
        <div v-if="isDownloading" class="download-progress">
          <el-progress
            :percentage="downloadProgress"
            :status="downloadProgress === 100 ? 'success' : ''"
          />
          <p class="progress-text">正在下载更新... {{ Math.round(downloadProgress) }}%</p>
        </div>
        <div v-if="isDownloaded" class="download-complete">
          <el-alert type="success" :closable="false">
            <template #title>
              <span>更新已下载完成，点击"立即安装"重启应用以完成更新</span>
            </template>
          </el-alert>
        </div>
      </div>
      <template #footer>
        <el-button v-if="!isDownloading && !isDownloaded" @click="showUpdateDialog = false">
          稍后提醒
        </el-button>
        <el-button
          v-if="!isDownloading && !isDownloaded"
          type="primary"
          @click="handleDownloadUpdate"
        >
          下载更新
        </el-button>
        <el-button
          v-if="isDownloaded"
          type="primary"
          :loading="isInstalling"
          @click="handleInstallUpdate"
        >
          立即安装
        </el-button>
      </template>
    </el-dialog>

    <!-- 感谢gif图片遮罩层 -->
    <Transition name="fade">
      <div v-if="showRewardGif" class="reward-gif-overlay" @click="showRewardGif = false">
        <img :src="xiezhulongenGif" alt="谢主隆恩" class="reward-gif-image" />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Bookshelf from '@renderer/components/Bookshelf.vue'
import BookshelfPasswordSettings from '@renderer/components/BookshelfPasswordSettings.vue'
import DeepSeekSettings from '@renderer/components/DeepSeekSettings.vue'
import { useThemeStore } from '@renderer/stores/theme'
import { ElDialog, ElMessage, ElProgress, ElAlert } from 'element-plus'

const router = useRouter()
const showDirDialog = ref(false)
const bookDir = ref('')
const showThemeDialog = ref(false)
const showHelpDialog = ref(false)
const showSponsorDialog = ref(false)
const showPasswordDialog = ref(false)
const showDeepSeekDialog = ref(false)
const showRewardGif = ref(false)
const themeStore = useThemeStore()
const deepSeekSettingsRef = ref(null)
const qqGroupQrcode = new URL('../../../../static/51mazi_qq_qrcode.jpg', import.meta.url).href
const rewardQrcode = new URL('../../../../static/wx_reward_qrcode.png', import.meta.url).href
const xiezhulongenGif = new URL('../assets/images/xiezhulongen.gif', import.meta.url).href
const contactEmail = 'fomazi@163.com'

// 更新相关状态
const showUpdateDialog = ref(false)
const updateInfo = ref(null)
const isDownloading = ref(false)
const isDownloaded = ref(false)
const isInstalling = ref(false)
const downloadProgress = ref(0)
const currentVersion = ref('')
const updateDialogTitle = ref('检查更新')

// 定时器 ID
let sponsorDialogTimer = null

// 打开 DeepSeek 设置
function handleOpenDeepSeekSettings() {
  if (deepSeekSettingsRef.value) {
    deepSeekSettingsRef.value.open()
  }
}

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
  // 获取当前版本
  await getCurrentVersion()
  // 监听更新事件
  setupUpdateListeners()
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

    // 显示感谢gif图片
    showRewardGif.value = true
    // 3秒后自动隐藏
    setTimeout(() => {
      showRewardGif.value = false
    }, 3000)

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

// 获取当前版本
async function getCurrentVersion() {
  try {
    const result = await window.electron?.getAppVersion()
    if (result?.version) {
      currentVersion.value = result.version
    }
  } catch (error) {
    console.error('获取当前版本失败:', error)
  }
}

// 设置更新事件监听
function setupUpdateListeners() {
  // 正在检查更新
  window.addEventListener('update-checking', () => {
    updateDialogTitle.value = '正在检查更新...'
    showUpdateDialog.value = true
  })

  // 发现新版本
  window.addEventListener('update-available', (event) => {
    updateInfo.value = event.detail
    updateDialogTitle.value = '发现新版本'
    isDownloading.value = false
    isDownloaded.value = false
    downloadProgress.value = 0
    showUpdateDialog.value = true
  })

  // 当前已是最新版本
  window.addEventListener('update-not-available', () => {
    ElMessage.success('当前已是最新版本')
    if (showUpdateDialog.value) {
      showUpdateDialog.value = false
    }
  })

  // 更新检查出错
  window.addEventListener('update-error', (event) => {
    ElMessage.error(`更新检查失败: ${event.detail.message}`)
    if (showUpdateDialog.value) {
      showUpdateDialog.value = false
    }
  })

  // 下载进度
  window.addEventListener('update-download-progress', (event) => {
    isDownloading.value = true
    downloadProgress.value = event.detail.percent || 0
  })

  // 下载完成
  window.addEventListener('update-downloaded', () => {
    isDownloading.value = false
    isDownloaded.value = true
    downloadProgress.value = 100
    ElMessage.success('更新下载完成')
  })
}

// 手动检查更新
async function handleCheckUpdate() {
  try {
    updateDialogTitle.value = '正在检查更新...'
    showUpdateDialog.value = true
    const result = await window.electron?.checkForUpdate()
    if (!result?.success) {
      ElMessage.warning(result?.message || '检查更新失败')
      showUpdateDialog.value = false
    }
  } catch (error) {
    console.error('检查更新失败:', error)
    ElMessage.error('检查更新失败')
    showUpdateDialog.value = false
  }
}

// 下载更新
async function handleDownloadUpdate() {
  try {
    isDownloading.value = true
    downloadProgress.value = 0
    const result = await window.electron?.downloadUpdate()
    if (!result?.success) {
      ElMessage.error(result?.message || '下载更新失败')
      isDownloading.value = false
    }
  } catch (error) {
    console.error('下载更新失败:', error)
    ElMessage.error('下载更新失败')
    isDownloading.value = false
  }
}

// 安装更新
async function handleInstallUpdate() {
  try {
    isInstalling.value = true
    const result = await window.electron?.quitAndInstall()
    if (!result?.success) {
      ElMessage.error(result?.message || '安装更新失败')
      isInstalling.value = false
    }
  } catch (error) {
    console.error('安装更新失败:', error)
    ElMessage.error('安装更新失败')
    isInstalling.value = false
  }
}

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}

// 格式化更新日志
function formatReleaseNotes(notes) {
  if (!notes) return ''
  // 将换行符转换为 <br>
  if (typeof notes === 'string') {
    return notes.replace(/\n/g, '<br>')
  }
  // 如果是数组，转换为HTML列表
  if (Array.isArray(notes)) {
    return notes.map((note) => `<li>${note}</li>`).join('')
  }
  return String(notes)
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

.update-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.update-text {
  margin: 0;
  font-size: 14px;
  color: var(--text-base);
  line-height: 1.6;
}

.update-notes {
  margin-top: 12px;
  padding: 12px;
  background-color: var(--bg-mute);
  border-radius: 6px;

  p {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: var(--text-base);
  }
}

.release-notes {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.8;
  max-height: 200px;
  overflow-y: auto;
}

.download-progress {
  margin-top: 12px;

  .progress-text {
    margin-top: 8px;
    font-size: 13px;
    color: var(--text-secondary);
    text-align: center;
  }
}

.download-complete {
  margin-top: 12px;
}

.reward-gif-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  cursor: pointer;
}

.reward-gif-image {
  max-width: 500px;
  max-height: 500px;
  object-fit: contain;
  pointer-events: none;
}

// 淡入淡出动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
