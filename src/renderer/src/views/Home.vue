<template>
  <div class="home-page">
    <!-- 左侧导航栏 -->
    <div class="sidebar">
      <div class="logo">
        <img src="/src/assets/images/logo_big.png" alt="logo" class="logo-img" />
      </div>
      <!-- 菜单顺序：主流程 → 设置 → 帮助与维护 → 赞助 -->
      <div class="menu">
        <div class="menu-item active">
          <span class="menu-item-icon" aria-hidden="true">
            <Library v-bind="menuIconProps" />
          </span>
          {{ t('home.menu.bookshelf') }}
        </div>
        <div class="menu-item" @click="goToNovelDownload">
          <span class="menu-item-icon" aria-hidden="true">
            <Download v-bind="menuIconProps" />
          </span>
          {{ t('home.menu.downloadNovel') }}
        </div>
        <div class="menu-item" @click="showPasswordDialog = true">
          <span class="menu-item-icon" aria-hidden="true">
            <Lock v-bind="menuIconProps" />
          </span>
          {{ t('home.menu.bookshelfPassword') }}
        </div>
        <div class="menu-item" @click="showThemeDialog = true">
          <span class="menu-item-icon" aria-hidden="true">
            <Palette v-bind="menuIconProps" />
          </span>
          {{ t('home.menu.themeSetting') }}
        </div>
        <div class="menu-item" @click="showDirDialog = true">
          <span class="menu-item-icon" aria-hidden="true">
            <Settings v-bind="menuIconProps" />
          </span>
          {{ t('home.menu.systemSetting') }}
        </div>
        <div class="menu-item" @click="handleOpenAISettings">
          <span class="menu-item-icon" aria-hidden="true">
            <Sparkles v-bind="menuIconProps" />
          </span>
          {{ t('home.menu.aiSetting') }}
        </div>
        <div class="menu-item" @click="goToUserGuide">
          <span class="menu-item-icon" aria-hidden="true">
            <BookOpenText v-bind="menuIconProps" />
          </span>
          {{ t('home.menu.writingGuide') }}
        </div>
        <div class="menu-item" @click="showHelpDialog = true">
          <span class="menu-item-icon" aria-hidden="true">
            <CircleQuestionMark v-bind="menuIconProps" />
          </span>
          {{ t('home.menu.helpCenter') }}
        </div>
        <div class="menu-item" @click="handleCheckUpdate">
          <span class="menu-item-icon" aria-hidden="true">
            <RefreshCw v-bind="menuIconProps" />
          </span>
          {{ t('home.menu.checkUpdate') }}
        </div>
        <div class="menu-item" @click="showSponsorDialog = true">
          <span class="menu-item-icon" aria-hidden="true">
            <Gift v-bind="menuIconProps" />
          </span>
          {{ t('home.menu.sponsorAuthor') }}
        </div>
      </div>

      <!-- 左下角：当前版本号 -->
      <div class="sidebar-footer">
        <span class="version-text">v{{ currentVersion || '-' }}</span>
      </div>
    </div>

    <!-- 书架区 -->
    <Bookshelf ref="bookshelfRef" />

    <!-- 右上角鼓励提示（调度逻辑已封装到组件，避免首页逻辑混杂） -->
    <EncourageToastScheduler />

    <!-- 系统设置弹窗 -->
    <el-dialog
      v-model="showDirDialog"
      :title="t('home.systemSettings.title')"
      width="700px"
      align-center
      :close-on-click-modal="false"
      :show-close="false"
      @opened="onSystemSettingsOpened"
    >
      <el-form label-width="100px" @submit.prevent="handleConfirmDir">
        <el-form-item :label="t('home.systemSettings.booksDir')" required>
          <el-row :gutter="10" style="width: 100%">
            <el-col :span="18">
              <el-input
                v-model="bookDir"
                readonly
                :placeholder="t('home.systemSettings.selectDirPlaceholder')"
              />
            </el-col>
            <el-col :span="6">
              <el-button type="primary" style="width: 100%" @click="handleChooseDir">
                {{ t('home.systemSettings.selectDir') }}
              </el-button>
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item :label="t('home.systemSettings.updateMode')">
          <el-radio-group
            v-model="updateMode"
            class="update-mode-radios"
            @change="handleUpdateModeChange"
          >
            <el-radio value="auto">{{ t('home.systemSettings.autoUpdate') }}</el-radio>
            <el-radio value="manual">{{ t('home.systemSettings.manualUpdate') }}</el-radio>
          </el-radio-group>
          <div class="setting-desc">
            {{ t('home.systemSettings.updateModeDesc') }}
          </div>
        </el-form-item>
        <el-form-item :label="t('common.language')">
          <el-select v-model="selectedLocale" style="width: 100%">
            <el-option
              v-for="item in localeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" :disabled="!bookDir" @click="handleConfirmDir">
          {{ t('common.confirm') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 主题设置弹框 -->
    <el-dialog v-model="showThemeDialog" :title="t('home.theme.title')" width="600">
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
    <el-dialog v-model="showHelpDialog" :title="t('home.help.title')" width="420px" align-center>
      <div class="dialog-content">
        <img :src="qqGroupQrcode" :alt="t('home.help.qqAlt')" class="dialog-image" />
        <p class="dialog-text">{{ t('home.help.qqGroup') }}：777690109</p>
        <p class="dialog-text">
          {{ t('home.help.contactEmail') }}：
          <a class="dialog-link" :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
        </p>
      </div>
    </el-dialog>

    <!-- 赞助作者弹框 -->
    <el-dialog
      v-model="showSponsorDialog"
      :title="t('home.sponsor.title')"
      width="520px"
      align-center
      center
    >
      <div class="dialog-content">
        <p class="dialog-text">{{ t('home.sponsor.thanks') }}</p>
        <div class="sponsor-qrcodes">
          <div class="sponsor-qrcode-item">
            <img
              :src="wechatPayQrcode"
              :alt="t('home.sponsor.wechatPayAlt')"
              class="dialog-image"
            />
            <span class="sponsor-label">{{ t('home.sponsor.wechatPayLabel') }}</span>
          </div>
          <div class="sponsor-qrcode-item">
            <img :src="alipayQrcode" :alt="t('home.sponsor.alipayAlt')" class="dialog-image" />
            <span class="sponsor-label">{{ t('home.sponsor.alipayLabel') }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="handleConsiderClick">
          {{ t('home.sponsor.consider') }}
        </el-button>
        <el-button type="primary" @click="handleRewardClick">
          {{ t('home.sponsor.rewarded') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 书架密码设置组件 -->
    <BookshelfPasswordSettings v-model="showPasswordDialog" />

    <!-- AI 设置 -->
    <AISettings ref="aiSettingsRef" />

    <!-- 感谢gif图片遮罩层 -->
    <Transition name="fade">
      <div v-if="showRewardGif" class="reward-gif-overlay" @click="showRewardGif = false">
        <img
          :src="xiezhulongenGif"
          :alt="t('home.sponsor.rewardedGifAlt')"
          class="reward-gif-image"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Bookshelf from '@renderer/components/Bookshelf.vue'
import BookshelfPasswordSettings from '@renderer/components/BookshelfPasswordSettings.vue'
import AISettings from '@renderer/components/AISettings.vue'
import EncourageToastScheduler from '@renderer/components/EncourageToastScheduler.vue'
import { useThemeStore } from '@renderer/stores/theme'
import { useAppUpdaterStore } from '@renderer/stores/appUpdater'
import { useI18n } from 'vue-i18n'
import { getCurrentLocale, setLocale } from '@renderer/i18n'
import { ElDialog, ElMessage } from 'element-plus'
import {
  BookOpenText,
  CircleQuestionMark,
  Download,
  Gift,
  Library,
  Lock,
  Palette,
  RefreshCw,
  Settings,
  Sparkles
} from 'lucide-vue-next'

/** 侧栏菜单：统一 Lucide 描边与尺寸，保证风格一致 */
const menuIconProps = { size: 20, strokeWidth: 2 }

const router = useRouter()
const { t } = useI18n()
const showDirDialog = ref(false)
const bookDir = ref('')
/** 更新方式：auto 自动更新（默认） | manual 手动更新 */
const updateMode = ref('auto')
const selectedLocale = ref('zh-CN')
const bookshelfRef = ref(null)
const showThemeDialog = ref(false)
const showHelpDialog = ref(false)
const showSponsorDialog = ref(false)
const showPasswordDialog = ref(false)
const showRewardGif = ref(false)
const themeStore = useThemeStore()
const appUpdaterStore = useAppUpdaterStore()
const aiSettingsRef = ref(null)
const qqGroupQrcode = new URL('../../../../static/QQQRCode.png', import.meta.url).href
const wechatPayQrcode = new URL('../../../../static/WeChatPayQRCode.png', import.meta.url).href
const alipayQrcode = new URL('../../../../static/AliPayQRCode.png', import.meta.url).href
const xiezhulongenGif = new URL('../assets/images/xiezhulongen.gif', import.meta.url).href
const contactEmail = 'fomazi@163.com'

const currentVersion = ref('')
const localeOptions = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' }
]

function getBooksDirValidationMessage(code) {
  switch (code) {
    case 'NOT_EXISTS':
      return t('home.systemSettings.booksDirNotExists')
    case 'NOT_DIRECTORY':
      return t('home.systemSettings.booksDirNotDirectory')
    case 'NOT_READABLE':
      return t('home.systemSettings.booksDirNotReadable')
    case 'NOT_WRITABLE':
      return t('home.systemSettings.booksDirNotWritable')
    case 'EMPTY':
      return t('home.systemSettings.booksDirRequired')
    default:
      return t('home.systemSettings.booksDirInvalid')
  }
}

async function validateBooksDirOrNotify(pathValue) {
  const candidate = String(pathValue || '').trim()
  if (!candidate) {
    ElMessage.warning(t('home.systemSettings.booksDirRequired'))
    return null
  }
  const result = await window.electron?.validateBooksDir?.(candidate)
  if (!result?.valid) {
    ElMessage.warning(getBooksDirValidationMessage(result?.code))
    return null
  }
  return candidate
}

// 定时器 ID
let sponsorDialogTimer = null

// 打开 AI 设置
function handleOpenAISettings() {
  if (aiSettingsRef.value) {
    aiSettingsRef.value.open()
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
  // 初始化更新方式（用于弹框打开时展示）
  const savedUpdateMode = await window.electronStore?.get('app.updateMode')
  if (savedUpdateMode === 'auto' || savedUpdateMode === 'manual') {
    updateMode.value = savedUpdateMode
  }
  selectedLocale.value = getCurrentLocale()
  // 初始化主题
  await themeStore.initTheme()
  // 检查是否需要自动显示赞助弹框
  await checkAutoShowSponsorDialog()
  // 获取当前版本
  await getCurrentVersion()
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
  try {
    const result = await window.electron?.selectBooksDir()
    if (result && result.filePaths && result.filePaths[0]) {
      const validDir = await validateBooksDirOrNotify(result.filePaths[0])
      if (!validDir) return
      bookDir.value = validDir
      await window.electronStore.set('booksDir', validDir)
      await nextTick()
      await bookshelfRef.value?.reloadBookshelf?.()
      showDirDialog.value = false
    }
  } catch (error) {
    console.error('Failed to choose books directory:', error)
    ElMessage.error(t('home.systemSettings.saveDirFailed'))
  }
}

// 确认目录
async function handleConfirmDir() {
  const nextDir = await validateBooksDirOrNotify(bookDir.value)
  if (!nextDir) return

  try {
    bookDir.value = nextDir
    await window.electronStore.set('booksDir', bookDir.value)
    await nextTick()
    await bookshelfRef.value?.reloadBookshelf?.()
    const oldLocale = getCurrentLocale()
    const nextLocale = setLocale(selectedLocale.value)
    await window.electronStore?.set('config.locale', nextLocale)
    if (oldLocale !== nextLocale) {
      const languageLabel =
        nextLocale === 'en-US' ? t('common.english') : t('common.simplifiedChinese')
      ElMessage.success(t('common.switchLanguageSuccess', { language: languageLabel }))
    }
    showDirDialog.value = false
  } catch (error) {
    console.error('Failed to confirm books directory:', error)
    ElMessage.error(t('home.systemSettings.saveDirFailed'))
  }
}

// 系统设置弹框打开时，同步一次更新方式（从 store 读取，保证与主进程一致）
async function onSystemSettingsOpened() {
  const saved = await window.electronStore?.get('app.updateMode')
  if (saved === 'auto' || saved === 'manual') {
    updateMode.value = saved
  }
  selectedLocale.value = getCurrentLocale()
}

// 用户切换更新方式时，通知主进程并持久化，自动更新逻辑会立即暂停或恢复
async function handleUpdateModeChange(mode) {
  try {
    await window.electron?.setUpdateMode?.(mode)
  } catch (e) {
    console.error('设置更新方式失败:', e)
  }
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
  ElMessage.success(t('home.theme.switchSuccess', { themeName }))
}

// 跳转到写作指南
const goToUserGuide = () => {
  router.push('/user-guide')
}

const goToNovelDownload = () => {
  router.push('/novel-download')
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

// 手动检查更新（窗口事件由 App 根 composable 统一订阅，状态在 appUpdater store）
async function handleCheckUpdate() {
  try {
    appUpdaterStore.beginManualCheck()
    const result = await window.electron?.checkForUpdate()
    if (!result?.success) {
      ElMessage.error(result?.message || t('home.update.checkFailed'))
      appUpdaterStore.dismissAfterManualCheckFailure()
    }
  } catch (error) {
    console.error('检查更新失败:', error)
    ElMessage.error(t('home.update.checkFailed'))
    appUpdaterStore.dismissAfterManualCheckFailure()
  }
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
  padding: 15px 0;
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
  flex: 1;
}

.sidebar-footer {
  padding: 0px 12px;
  margin-top: auto;
  height: fit-content;
  line-height: normal;
}

.version-text {
  display: inline-block;
  font-size: 12px;
  line-height: 1.2;
  color: var(--text-gray);
  user-select: none;
}

.menu-item {
  padding: 8px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  /* 未选中：文案与图标同色，避免 text-base 与 icon 的 text-gray 分裂（最后一项复杂图标会显得更黑） */
  color: var(--text-base);
  transition:
    color 0.25s ease,
    background 0.25s ease,
    box-shadow 0.25s ease;
  background: var(--bg-soft);
  box-shadow: var(--neu-shadow-raised, 20px 20px 60px #d9d9d9, -20px -20px 60px #ffffff);
  border-radius: 10px;
  margin: 0px 10px 10px;
  font-size: 14px;
}

.menu-item-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  color: inherit;
}

.menu-item-icon :deep(svg) {
  display: block;
  stroke: currentColor;
}

/* 当前页：凹陷阴影 + 主色（图文一致） */
.menu-item.active,
.menu-item:hover {
  color: var(--primary-color);
  background: var(--bg-soft);
  box-shadow: var(
    --neu-shadow-pressed,
    inset 20px 20px 60px #d9d9d9,
    inset -20px -20px 60px #ffffff
  );
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

.sponsor-qrcodes {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
  margin-top: 16px;
}

.sponsor-qrcode-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  .dialog-image {
    width: 200px;
  }
}

.sponsor-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.dialog-text {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

/* 更新方式两个单选项之间的间距 */
.update-mode-radios :deep(.el-radio) {
  margin-right: 24px;
}

.setting-desc {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
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
:deep(.el-drawer__header) {
  margin-bottom: 0px;
  padding-bottom: 20px;
}
:deep(.el-drawer__body) {
  padding: 0px;
}
</style>
