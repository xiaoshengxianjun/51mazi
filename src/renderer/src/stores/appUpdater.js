import { defineStore } from 'pinia'
import { ref } from 'vue'
import { i18n } from '@renderer/i18n'

function tt(key) {
  return i18n.global.t(key)
}

/**
 * 自动更新 UI 状态（全局单例）。
 * 事件监听在 App 根组件注册一次，避免 Home 反复挂载导致重复监听；
 * 弹窗挂在 App 下，离开首页仍可收到 update-available 等事件。
 */
export const useAppUpdaterStore = defineStore('appUpdater', () => {
  const showUpdateDialog = ref(false)
  const updateInfo = ref(null)
  const isDownloading = ref(false)
  const isDownloaded = ref(false)
  const isInstalling = ref(false)
  const downloadProgress = ref(0)
  const updateDialogTitle = ref('')

  function resetDownloadUi() {
    isDownloading.value = false
    isDownloaded.value = false
    downloadProgress.value = 0
  }

  /** 预加载转发：checking-for-update */
  function onChecking() {
    updateDialogTitle.value = tt('home.update.checking')
    showUpdateDialog.value = true
  }

  /** 发现新版本 */
  function onUpdateAvailable(info) {
    updateInfo.value = info
    updateDialogTitle.value = tt('home.update.foundNewVersion')
    resetDownloadUi()
    isInstalling.value = false
    showUpdateDialog.value = true
  }

  /** 用户从菜单点击「检查更新」：先打开弹窗等待事件 */
  function beginManualCheck() {
    updateDialogTitle.value = tt('home.update.checking')
    showUpdateDialog.value = true
  }

  function closeDialogIfOpen() {
    if (showUpdateDialog.value) {
      showUpdateDialog.value = false
    }
  }

  /** 手动检查 IPC 失败时关闭弹窗（消息由调用方 Toast） */
  function dismissAfterManualCheckFailure() {
    showUpdateDialog.value = false
  }

  function onDownloadProgress(percent) {
    isDownloading.value = true
    downloadProgress.value = percent || 0
  }

  function onDownloaded() {
    isDownloading.value = false
    isDownloaded.value = true
    downloadProgress.value = 100
  }

  function setInstalling(loading) {
    isInstalling.value = loading
  }

  /** 用户点击「下载更新」：进入下载中状态 */
  function startDownloadAttempt() {
    isDownloading.value = true
    downloadProgress.value = 0
  }

  function markDownloadFailedUi() {
    isDownloading.value = false
  }

  function closeDialog() {
    showUpdateDialog.value = false
  }

  return {
    showUpdateDialog,
    updateInfo,
    isDownloading,
    isDownloaded,
    isInstalling,
    downloadProgress,
    updateDialogTitle,
    onChecking,
    onUpdateAvailable,
    beginManualCheck,
    closeDialogIfOpen,
    dismissAfterManualCheckFailure,
    onDownloadProgress,
    onDownloaded,
    setInstalling,
    startDownloadAttempt,
    markDownloadFailedUi,
    closeDialog
  }
})
