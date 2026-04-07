import { onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { i18n } from '@renderer/i18n'
import { useAppUpdaterStore } from '@renderer/stores/appUpdater'

const t = (key, values) => i18n.global.t(key, values)

/**
 * 在 App 根组件调用一次：将预加载转发的 window 自定义事件写入 appUpdater store，并弹出必要 Toast。
 * App.vue 不卸载，故监听只注册一次，无重复订阅问题。
 */
export function useAppUpdaterWindowEvents() {
  const store = useAppUpdaterStore()

  function onUpdateChecking() {
    store.onChecking()
  }

  function onUpdateAvailable(ev) {
    store.onUpdateAvailable(ev.detail)
  }

  function onUpdateNotAvailable() {
    ElMessage.success(t('home.update.upToDate'))
    store.closeDialogIfOpen()
  }

  function onUpdateError(ev) {
    const phase = ev.detail?.phase === 'download' ? 'download' : 'check'
    const fallback =
      phase === 'download' ? t('home.update.downloadFailed') : t('home.update.checkFailed')
    ElMessage.error(ev.detail?.message || fallback)
    store.closeDialogIfOpen()
  }

  function onUpdateDownloadProgress(ev) {
    store.onDownloadProgress(ev.detail?.percent)
  }

  function onUpdateDownloaded() {
    store.onDownloaded()
    ElMessage.success(t('home.update.downloadCompleted'))
  }

  onMounted(() => {
    window.addEventListener('update-checking', onUpdateChecking)
    window.addEventListener('update-available', onUpdateAvailable)
    window.addEventListener('update-not-available', onUpdateNotAvailable)
    window.addEventListener('update-error', onUpdateError)
    window.addEventListener('update-download-progress', onUpdateDownloadProgress)
    window.addEventListener('update-downloaded', onUpdateDownloaded)
  })

  onUnmounted(() => {
    window.removeEventListener('update-checking', onUpdateChecking)
    window.removeEventListener('update-available', onUpdateAvailable)
    window.removeEventListener('update-not-available', onUpdateNotAvailable)
    window.removeEventListener('update-error', onUpdateError)
    window.removeEventListener('update-download-progress', onUpdateDownloadProgress)
    window.removeEventListener('update-downloaded', onUpdateDownloaded)
  })
}
