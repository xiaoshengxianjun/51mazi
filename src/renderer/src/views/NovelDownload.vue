<template>
  <div class="novel-download-page" :class="{ 'has-download-card': selectedBook }">
    <!-- 顶部：悬浮栏，返回 + 标题 -->
    <header class="page-header">
      <el-button class="back-button" type="primary" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        {{ t('novelDownload.backHome') }}
      </el-button>
      <div class="header-content">
        <div class="header-text">
          <h1 class="page-title">{{ t('novelDownload.title') }}</h1>
          <p class="subtitle">{{ t('novelDownload.subtitle') }}</p>
        </div>
      </div>
    </header>

    <!-- 免责声明 -->
    <section class="disclaimer-card">
      <div class="disclaimer-title">{{ t('novelDownload.disclaimerTitle') }}</div>
      <ul class="disclaimer-list">
        <li>
          {{ t('novelDownload.disclaimer1') }}
        </li>
        <li>
          {{ t('novelDownload.disclaimer2') }}
        </li>
        <li>
          {{ t('novelDownload.disclaimer3') }}
        </li>
      </ul>
    </section>

    <!-- 搜索卡片 -->
    <section class="search-card">
      <div class="search-inner">
        <el-select
          v-model="currentSourceId"
          :placeholder="t('novelDownload.sourcePlaceholder')"
          class="source-select"
          size="large"
        >
          <el-option v-for="s in sources" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-input
          v-model="keyword"
          :placeholder="t('novelDownload.keywordPlaceholder')"
          clearable
          size="large"
          class="keyword-input"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button
          type="primary"
          size="large"
          class="search-btn"
          :loading="searching"
          @click="handleSearch"
        >
          <el-icon v-if="!searching"><Search /></el-icon>
          <span>{{ t('novelDownload.search') }}</span>
        </el-button>
      </div>
    </section>

    <!-- 搜索结果 -->
    <section v-if="searchResult.length > 0" class="result-card">
      <div class="result-header">
        <span class="result-title">{{ t('novelDownload.results') }}</span>
        <el-tag type="info" size="small" round>{{
          t('novelDownload.resultsCount', { count: searchResult.length })
        }}</el-tag>
      </div>
      <div class="result-table-wrap">
        <el-table :data="searchResult" stripe class="result-table">
          <el-table-column
            prop="title"
            :label="t('novelDownload.bookTitle')"
            min-width="200"
            show-overflow-tooltip
          />
          <el-table-column
            prop="author"
            :label="t('novelDownload.author')"
            width="120"
            show-overflow-tooltip
          />
          <el-table-column
            :label="t('novelDownload.actions')"
            width="100"
            align="right"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button type="primary" size="small" round @click="handleSelectBook(row)">
                {{ t('novelDownload.download') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <!-- 选中书籍后的下载操作区：悬浮在页面底部，滚动时列表不被遮挡 -->
    <section v-if="selectedBook" class="download-card download-card--fixed">
      <div class="download-card-inner">
        <div class="download-header">
          <h3 class="download-title">《{{ selectedBook.title }}》</h3>
          <p class="download-meta">{{ selectedBook.author }} · 共 {{ chapterList.length }} 章</p>
        </div>
        <div class="download-actions">
          <el-button
            type="primary"
            size="large"
            :loading="downloading"
            :disabled="chapterList.length === 0"
            @click="handleDownloadToBookshelf"
          >
            <el-icon v-if="!downloading"><FolderOpened /></el-icon>
            <span>{{
              downloading
                ? t('novelDownload.downloadingProgress', {
                    current: downloadProgress.current,
                    total: downloadProgress.total
                  })
                : t('novelDownload.downloadAndAdd')
            }}</span>
          </el-button>
          <el-button
            size="large"
            :loading="downloading"
            :disabled="chapterList.length === 0"
            @click="handleExportTxt"
          >
            <el-icon v-if="!downloading"><Document /></el-icon>
            <span>{{ t('novelDownload.exportTxt') }}</span>
          </el-button>
          <el-button size="large" @click="clearSelection">{{ t('common.cancel') }}</el-button>
        </div>
        <div v-if="downloading" class="progress-wrap">
          <el-progress
            :percentage="progressPercent"
            :stroke-width="8"
            :status="progressPercent === 100 ? 'success' : undefined"
          />
        </div>
      </div>
    </section>

    <!-- 空状态与错误 -->
    <section
      v-if="!searching && keyword && searchResult.length === 0 && !selectedBook"
      class="empty-card"
    >
      <el-empty :description="t('novelDownload.empty')">
        <template #image>
          <div class="empty-icon-wrap">
            <el-icon><Reading /></el-icon>
          </div>
        </template>
      </el-empty>
    </section>
    <section v-if="errorMsg" class="error-card">
      <el-alert type="error" :title="errorMsg" show-icon closable @close="errorMsg = ''" />
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Search, FolderOpened, Document, Reading } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  getNovelSources,
  searchNovel,
  getNovelChapterList,
  downloadNovelChapters
} from '@renderer/service/novel'
import { createBook, readBooksDir } from '@renderer/service/books'
import { BOOK_TYPES } from '@renderer/constants/config'

const router = useRouter()
const { t } = useI18n()

const sources = ref([])
const currentSourceId = ref('')
const keyword = ref('')
const searching = ref(false)
const searchResult = ref([])
const selectedBook = ref(null)
const chapterList = ref([])
const downloading = ref(false)
const downloadProgress = ref({ current: 0, total: 0 })
const errorMsg = ref('')

const progressPercent = computed(() => {
  const { current, total } = downloadProgress.value
  if (total <= 0) return 0
  return Math.round((current / total) * 100)
})

function goBack() {
  router.push('/')
}

async function loadSources() {
  try {
    sources.value = await getNovelSources()
    if (sources.value.length > 0 && !currentSourceId.value) {
      currentSourceId.value = sources.value[0].id
    }
  } catch (e) {
    console.error(e)
    errorMsg.value = t('novelDownload.fetchSourcesFailed')
  }
}

async function handleSearch() {
  const k = keyword.value?.trim()
  if (!k) {
    ElMessage.warning(t('novelDownload.pleaseInputKeyword'))
    return
  }
  searching.value = true
  errorMsg.value = ''
  searchResult.value = []
  selectedBook.value = null
  chapterList.value = []
  try {
    const res = await searchNovel(k, currentSourceId.value)
    if (res.success && res.list?.length) {
      searchResult.value = res.list
      errorMsg.value = ''
    } else {
      errorMsg.value = res.message || t('novelDownload.noResults')
      searchResult.value = []
    }
  } catch (e) {
    console.error(e)
    errorMsg.value = e.message || t('novelDownload.searchFailed')
  } finally {
    searching.value = false
  }
}

async function handleSelectBook(book) {
  selectedBook.value = book
  chapterList.value = []
  errorMsg.value = ''
  downloading.value = false
  downloadProgress.value = { current: 0, total: 0 }
  try {
    const res = await getNovelChapterList(book.url, book.sourceId)
    if (res.success && res.chapters?.length) {
      chapterList.value = res.chapters
    } else {
      ElMessage.warning(res.message || t('novelDownload.fetchChaptersFailed'))
    }
  } catch (e) {
    console.error(e)
    errorMsg.value = e.message || t('novelDownload.fetchChaptersFailed')
  }
}

function clearSelection() {
  selectedBook.value = null
  chapterList.value = []
  downloading.value = false
  downloadProgress.value = { current: 0, total: 0 }
}

// 监听主进程下发的下载进度
function onDownloadProgress(e) {
  if (e.detail) {
    downloadProgress.value = { current: e.detail.current, total: e.detail.total }
  }
}

async function handleDownloadToBookshelf() {
  const book = selectedBook.value
  if (!book || chapterList.value.length === 0) return

  const booksDir = await window.electronStore.get('booksDir')
  if (!booksDir) {
    ElMessage.warning(t('novelDownload.pleaseSetBooksDirFirst'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('novelDownload.confirmDownloadToBookshelf', {
        title: book.title,
        count: chapterList.value.length
      }),
      t('novelDownload.confirmDownloadTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'info'
      }
    )
  } catch {
    return
  }

  downloading.value = true
  downloadProgress.value = { current: 0, total: chapterList.value.length }
  errorMsg.value = ''

  try {
    const res = await downloadNovelChapters(chapterList.value, book.sourceId)
    if (!res.success || !res.chapters?.length) {
      ElMessage.error(res.message || t('novelDownload.downloadFailed'))
      return
    }

    const safeName = book.title.replace(/[\\/:*?"<>|]/g, '_')
    const bookId = Date.now().toString() + Math.floor(Math.random() * 10000).toString()
    const type = 'xuanhua'
    const typeName = BOOK_TYPES.find((item) => item.value === type)?.label || '玄幻'

    await createBook({
      id: bookId,
      name: safeName,
      type,
      typeName,
      targetCount: 0,
      intro: t('novelDownload.bookIntroFromNetwork'),
      password: null,
      coverColor: '#22345c',
      coverUrl: null,
      coverImagePath: null
    })

    const chapters = res.chapters
    const firstContent = `${chapters[0].title}\n\n${chapters[0].content}`
    await window.electron.saveChapter({
      bookName: safeName,
      volumeName: '正文',
      chapterName: '第1章',
      newName: null,
      content: firstContent
    })

    for (let i = 1; i < chapters.length; i++) {
      const { chapterName } = await window.electron.createChapter(safeName, '正文')
      const content = `${chapters[i].title}\n\n${chapters[i].content}`
      await window.electron.saveChapter({
        bookName: safeName,
        volumeName: '正文',
        chapterName,
        newName: null,
        content
      })
    }

    await readBooksDir()
    ElMessage.success(
      t('novelDownload.addedToBookshelfSuccess', { title: book.title, count: chapters.length })
    )
    clearSelection()
  } catch (e) {
    console.error(e)
    ElMessage.error(e.message || t('novelDownload.downloadOrAddFailed'))
  } finally {
    downloading.value = false
  }
}

async function handleExportTxt() {
  const book = selectedBook.value
  if (!book || chapterList.value.length === 0) return

  try {
    await ElMessageBox.confirm(
      t('novelDownload.confirmExportTxt', { title: book.title, count: chapterList.value.length }),
      t('novelDownload.confirmExportTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'info'
      }
    )
  } catch {
    return
  }

  downloading.value = true
  downloadProgress.value = { current: 0, total: chapterList.value.length }

  try {
    const res = await downloadNovelChapters(chapterList.value, book.sourceId)
    if (!res.success || !res.chapters?.length) {
      ElMessage.error(res.message || t('novelDownload.downloadFailed'))
      return
    }

    const lines = []
    for (const ch of res.chapters) {
      lines.push(`${ch.title}\n\n${ch.content}\n\n`)
    }
    const content = lines.join('')

    const saveResult = await window.electron.showSaveDialog({
      title: t('novelDownload.saveDialogTitle'),
      defaultPath: `${book.title}.txt`,
      filters: [{ name: t('novelDownload.textFile'), extensions: ['txt'] }]
    })
    if (!saveResult?.filePath) {
      downloading.value = false
      return
    }

    await window.electron.writeExportFile({
      filePath: saveResult.filePath,
      content
    })
    ElMessage.success(t('novelDownload.exportSuccess'))
    clearSelection()
  } catch (e) {
    console.error(e)
    ElMessage.error(e.message || t('novelDownload.exportFailed'))
  } finally {
    downloading.value = false
  }
}

onMounted(() => {
  loadSources()
  window.addEventListener('novel-download-progress', onDownloadProgress)
})

onUnmounted(() => {
  window.removeEventListener('novel-download-progress', onDownloadProgress)
})
</script>

<style lang="scss" scoped>
/* 统一圆角：仅卡片容器，按钮与输入框使用组件默认 */
$radius-card: 12px;

.novel-download-page {
  min-height: 100vh;
  padding: 0 20px 20px 20px;
  box-sizing: border-box;
  background: var(--bg-primary);

  /* 当底部悬浮下载卡出现时，为列表预留空间，避免最后几行被遮挡 */
  &.has-download-card {
    padding-bottom: 220px;
  }
}

/* 顶部：悬浮在页面顶部，返回 + 标题 */
.page-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 20px;
  margin: 0 -20px 20px -20px;
  padding: 10px 20px;
  background: var(--bg-soft);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.page-header .back-button {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  transition: all 0.25s ease;
}

.page-header .back-button:hover {
  transform: translateY(-1px);
}

.header-content {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.header-text {
  min-width: 0;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: var(--text-base);
  letter-spacing: 0.02em;
}

.subtitle {
  font-size: 0.85rem;
  color: var(--text-gray);
  margin: 0;
  line-height: 1.45;
}

/* 免责声明 */
.disclaimer-card {
  margin-bottom: 20px;
  padding: 14px 18px;
  background: var(--bg-mute);
  border: 1px solid var(--border-color);
  border-radius: $radius-card;
}

.disclaimer-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-base);
  margin: 0 0 8px 0;
}

.disclaimer-list {
  margin: 0;
  padding-left: 1.2em;
  font-size: 0.8rem;
  color: var(--text-gray);
  line-height: 1.6;
}

.disclaimer-list li {
  margin-bottom: 4px;
}

.disclaimer-list li:last-child {
  margin-bottom: 0;
}

/* 搜索卡片 */
.search-card {
  margin-bottom: 20px;
  padding: 20px;
  background: var(--bg-soft);
  border: 1px solid var(--border-color);
  border-radius: $radius-card;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.search-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.source-select {
  width: 160px;
  flex-shrink: 0;
}

.keyword-input {
  flex: 1;
  min-width: 220px;
  max-width: 400px;
}

.search-btn {
  padding-left: 20px;
  padding-right: 20px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* 搜索结果卡片 */
.result-card {
  margin-bottom: 20px;
  padding: 20px 20px;
  background: var(--bg-soft);
  border: 1px solid var(--border-color);
  border-radius: $radius-card;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.result-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.result-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-base);
}

.result-table-wrap {
  border-radius: $radius-card;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.result-table {
  --el-table-border-color: var(--border-color);
  --el-table-header-bg-color: var(--bg-mute);
}

/* 下载操作卡片：默认样式 + 悬浮在页面底部时的样式 */
.download-card {
  padding: 20px;
  background: linear-gradient(145deg, var(--bg-soft) 0%, var(--bg-mute) 100%);
  border: 1px solid var(--border-color);
  border-radius: $radius-card;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);

  /* 悬浮在页面底部，滚动时始终可见，方便查看下载进度 */
  &--fixed {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 90;
    margin: 0;
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-bottom: none;
    box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.08);
  }
}

.download-card-inner {
  max-width: 1200px;
  margin: 0 auto;
  box-sizing: border-box;
}

.download-header {
  margin-bottom: 18px;
}

.download-title {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0 0 6px 0;
  color: var(--text-base);
}

.download-meta {
  font-size: 0.9rem;
  color: var(--text-gray);
  margin: 0;
}

.download-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.download-actions .el-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.progress-wrap {
  margin-top: 18px;
  max-width: 420px;
}

/* 空状态 */
.empty-card {
  margin-top: 20px;
  padding: 48px 20px;
  background: var(--bg-soft);
  border: 1px dashed var(--border-color);
  border-radius: $radius-card;
  text-align: center;
}

.empty-icon-wrap {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-mute);
  color: var(--text-gray);
  border-radius: 50%;
  font-size: 36px;
}

/* 错误提示 */
.error-card {
  margin-top: 16px;
  border-radius: $radius-card;
  overflow: hidden;
}
</style>
