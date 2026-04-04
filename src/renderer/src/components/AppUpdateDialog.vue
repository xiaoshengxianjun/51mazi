<script setup>
import { useI18n } from 'vue-i18n'
import { ElDialog, ElMessage, ElProgress, ElAlert, ElButton } from 'element-plus'
import { getCurrentLocale } from '@renderer/i18n'
import { useAppUpdaterStore } from '@renderer/stores/appUpdater'

const { t } = useI18n()
const updater = useAppUpdaterStore()

/** 转义后再插入 v-html，防止 releaseNotes 中的 HTML 导致 XSS 或异常展示 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatReleaseNotes(notes) {
  if (!notes) return ''
  if (typeof notes === 'string') {
    return escapeHtml(notes).replace(/\n/g, '<br>')
  }
  if (Array.isArray(notes)) {
    return notes.map((note) => `<li>${escapeHtml(String(note))}</li>`).join('')
  }
  return escapeHtml(String(notes))
}

function formatDate(dateString) {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString(getCurrentLocale(), {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}

async function handleDownloadUpdate() {
  try {
    updater.startDownloadAttempt()
    const result = await window.electron?.downloadUpdate()
    if (!result?.success) {
      ElMessage.error(result?.message || t('home.update.downloadFailed'))
      updater.markDownloadFailedUi()
    }
  } catch (error) {
    console.error('下载更新失败:', error)
    ElMessage.error(t('home.update.downloadFailed'))
    updater.markDownloadFailedUi()
  }
}

async function handleInstallUpdate() {
  try {
    updater.setInstalling(true)
    const result = await window.electron?.quitAndInstall()
    if (!result?.success) {
      ElMessage.error(result?.message || t('home.update.installFailed'))
      updater.setInstalling(false)
    }
  } catch (error) {
    console.error('安装更新失败:', error)
    ElMessage.error(t('home.update.installFailed'))
    updater.setInstalling(false)
  }
}

function handleRemindLater() {
  updater.closeDialog()
}
</script>

<template>
  <el-dialog
    v-model="updater.showUpdateDialog"
    :title="updater.updateDialogTitle"
    width="500px"
    align-center
  >
    <div class="update-dialog-content">
      <div v-if="updater.updateInfo">
        <p class="update-text">
          <strong>{{ t('home.update.newVersion', { version: updater.updateInfo.version }) }}</strong>
        </p>
        <p v-if="updater.updateInfo.releaseDate" class="update-text">
          {{
            t('home.update.releaseDate', { date: formatDate(updater.updateInfo.releaseDate) })
          }}
        </p>
        <div v-if="updater.updateInfo.releaseNotes" class="update-notes">
          <p>
            <strong>{{ t('home.update.releaseNotes') }}</strong>
          </p>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div
            class="release-notes"
            v-html="formatReleaseNotes(updater.updateInfo.releaseNotes)"
          />
        </div>
      </div>
      <div v-if="updater.isDownloading" class="download-progress">
        <el-progress
          :percentage="updater.downloadProgress"
          :status="updater.downloadProgress === 100 ? 'success' : ''"
        />
        <p class="progress-text">
          {{
            t('home.update.downloadingPercent', { percent: Math.round(updater.downloadProgress) })
          }}
        </p>
      </div>
      <div v-if="updater.isDownloaded" class="download-complete">
        <el-alert type="success" :closable="false">
          <template #title>
            <span>{{ t('home.update.downloadCompleteHint') }}</span>
          </template>
        </el-alert>
      </div>
    </div>
    <template #footer>
      <el-button v-if="!updater.isDownloading && !updater.isDownloaded" @click="handleRemindLater">
        {{ t('home.update.remindLater') }}
      </el-button>
      <el-button
        v-if="!updater.isDownloading && !updater.isDownloaded"
        type="primary"
        @click="handleDownloadUpdate"
      >
        {{ t('home.update.downloadUpdate') }}
      </el-button>
      <el-button
        v-if="updater.isDownloaded"
        type="primary"
        :loading="updater.isInstalling"
        @click="handleInstallUpdate"
      >
        {{ t('home.update.installNow') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
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
</style>
