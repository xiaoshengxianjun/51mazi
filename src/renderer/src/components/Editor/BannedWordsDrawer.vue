<template>
  <el-drawer
    v-model="visible"
    :title="drawerTitle"
    direction="rtl"
    size="640px"
    class="banned-words-drawer"
    header-class="drawer-header"
    :close-on-click-modal="true"
  >
    <p class="banned-words-desc">{{ t('bannedWords.description') }}</p>

    <div class="banned-words-toolbar">
      <div class="add-word-section">
        <el-input
          v-model="newWord"
          :placeholder="t('bannedWords.inputPlaceholder')"
          clearable
          :disabled="busy || !bookName"
          @keyup.enter.prevent="handleAddWord"
        />
        <el-button
          type="primary"
          :disabled="busy || !bookName || !query"
          @click="handleAddWord"
        >
          {{ t('bannedWords.add') }}
        </el-button>
      </div>

      <div class="banned-words-actions">
        <el-button
          :disabled="busy || !bookName"
          @click="handleUseSystemDict"
        >
          {{ t('bannedWords.useSystemDict') }}
        </el-button>
        <el-button
          :disabled="busy || !bookName"
          @click="handleImportDict"
        >
          {{ t('bannedWords.importDict') }}
        </el-button>
        <el-button
          class="banned-words-clear-btn"
          :disabled="busy || !bookName || bannedWords.length === 0"
          @click="handleClear"
        >
          {{ t('bannedWords.clear') }}
        </el-button>
      </div>
    </div>

    <div v-if="bannedWords.length === 0" class="banned-words-empty">
      <p class="banned-words-empty-title">{{ t('bannedWords.empty') }}</p>
      <p class="banned-words-empty-hint">{{ t('bannedWords.emptyHint') }}</p>
      <el-button type="primary" plain :disabled="busy || !bookName" @click="handleUseSystemDict">
        {{ t('bannedWords.useSystemDict') }}
      </el-button>
    </div>
    <div v-else-if="filteredWords.length === 0" class="banned-words-empty">
      {{ t('bannedWords.filterEmpty', { query }) }}
    </div>
    <div v-else class="words-list">
      <el-tag
        v-for="word in filteredWords"
        :key="word"
        class="word-tag"
        closable
        :disable-transitions="true"
        @close="handleDeleteWord(word)"
      >
        {{ word }}
      </el-tag>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { parseBannedWordsText } from '@renderer/utils/parse-banned-words-text'
import { SYSTEM_BANNED_WORDS } from '@renderer/utils/system-banned-words'

const props = defineProps({
  bookName: {
    type: String,
    default: ''
  }
})

const visible = ref(false)
const newWord = ref('')
const bannedWords = ref([])
const busy = ref(false)
const { t } = useI18n()

const query = computed(() => newWord.value.trim())
const drawerTitle = computed(() => `${t('bannedWords.title')}（${bannedWords.value.length}）`)
const filteredWords = computed(() => {
  const q = query.value.toLowerCase()
  if (!q) return bannedWords.value
  return bannedWords.value.filter((w) => w.toLowerCase().includes(q))
})

// 打开抽屉
const open = () => {
  visible.value = true
  newWord.value = ''
  loadBannedWords()
}

// 加载禁词列表
const loadBannedWords = async () => {
  if (!props.bookName) return
  try {
    const result = await window.electron.getBannedWords(props.bookName)
    if (result.success) {
      bannedWords.value = result.data || []
    }
  } catch (error) {
    console.error('加载禁词失败:', error)
  }
}

const reportAppend = (data) => {
  const added = data?.added ?? 0
  const skipped = data?.skipped ?? 0
  if (added === 0 && skipped === 0) {
    ElMessage.warning(t('bannedWords.noValidWords'))
    return
  }
  ElMessage.success(t('bannedWords.appendSuccess', { added, skipped }))
}

// 新增禁词
const handleAddWord = async () => {
  const word = query.value
  if (!word || busy.value || !props.bookName) return

  if (bannedWords.value.includes(word)) {
    ElMessage.warning(t('bannedWords.duplicate'))
    return
  }

  busy.value = true
  try {
    const result = await window.electron.addBannedWord(props.bookName, word)
    if (result.success) {
      bannedWords.value.unshift(word)
      newWord.value = ''
      ElMessage.success(t('bannedWords.addSuccess'))
    } else {
      ElMessage.error(result.message || t('bannedWords.addFailed'))
    }
  } catch (error) {
    console.error('添加禁词失败:', error)
    ElMessage.error(t('bannedWords.addFailed'))
  } finally {
    busy.value = false
  }
}

// 删除禁词
const handleDeleteWord = async (word) => {
  if (busy.value) return
  try {
    const result = await window.electron.removeBannedWord(props.bookName, word)
    if (result.success) {
      const index = bannedWords.value.indexOf(word)
      if (index > -1) {
        bannedWords.value.splice(index, 1)
      }
    } else {
      ElMessage.error(result.message || t('bannedWords.deleteFailed'))
    }
  } catch (error) {
    console.error('删除禁词失败:', error)
    ElMessage.error(t('bannedWords.deleteFailed'))
  }
}

/** 使用内置系统词库：直接追加并去重 */
const handleUseSystemDict = async () => {
  if (!props.bookName || busy.value) return
  busy.value = true
  try {
    const result = await window.electron.appendBannedWords(props.bookName, SYSTEM_BANNED_WORDS)
    if (result.success) {
      reportAppend(result.data)
      await loadBannedWords()
    } else {
      ElMessage.error(result.message || t('bannedWords.systemDictFailed'))
    }
  } catch (error) {
    console.error('使用系统词库失败:', error)
    ElMessage.error(t('bannedWords.systemDictFailed'))
  } finally {
    busy.value = false
  }
}

/** 导入 txt 词库：按多种分隔符解析后追加去重 */
const handleImportDict = async () => {
  if (!props.bookName || busy.value) return
  busy.value = true
  try {
    const selected = await window.electron.selectTextFile()
    if (!selected?.filePath) return
    const readResult = await window.electron.readTextFile(selected.filePath)
    if (!readResult.success) {
      ElMessage.error(readResult.message || t('bannedWords.importFailed'))
      return
    }
    const imported = parseBannedWordsText(readResult.data || '')
    if (imported.length === 0) {
      ElMessage.warning(t('bannedWords.noValidWords'))
      return
    }
    const result = await window.electron.appendBannedWords(props.bookName, imported)
    if (result.success) {
      reportAppend(result.data)
      await loadBannedWords()
    } else {
      ElMessage.error(result.message || t('bannedWords.importFailed'))
    }
  } catch (error) {
    console.error('导入词库失败:', error)
    ElMessage.error(t('bannedWords.importFailed'))
  } finally {
    busy.value = false
  }
}

/** 清空全部禁词 */
const handleClear = async () => {
  if (!props.bookName || busy.value || bannedWords.value.length === 0) return
  try {
    await ElMessageBox.confirm(
      t('bannedWords.clearConfirm', { count: bannedWords.value.length }),
      t('bannedWords.clear'),
      {
        confirmButtonText: t('bannedWords.clear'),
        cancelButtonText: t('bannedWords.cancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }

  busy.value = true
  try {
    const result = await window.electron.clearBannedWords(props.bookName)
    if (result.success) {
      bannedWords.value = []
      ElMessage.success(t('bannedWords.clearSuccess'))
    } else {
      ElMessage.error(result.message || t('bannedWords.clearFailed'))
    }
  } catch (error) {
    console.error('清空禁词失败:', error)
    ElMessage.error(t('bannedWords.clearFailed'))
  } finally {
    busy.value = false
  }
}

// 监听bookName变化，重新加载
watch(
  () => props.bookName,
  () => {
    if (visible.value) {
      loadBannedWords()
    }
  }
)

// 暴露方法给父组件
defineExpose({
  open
})
</script>

<style lang="scss" scoped>
.banned-words-desc {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.banned-words-toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.add-word-section {
  display: flex;
  gap: 8px;

  .el-input {
    flex: 1;
    min-width: 0;
  }
}

.banned-words-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  :deep(.el-button) {
    width: 100%;
    margin: 0;
  }
}

.banned-words-clear-btn {
  color: var(--el-color-danger);
  border-color: color-mix(in srgb, var(--el-color-danger) 40%, var(--el-border-color));

  &:hover,
  &:focus {
    color: var(--el-color-danger);
    border-color: var(--el-color-danger);
    background: color-mix(in srgb, var(--el-color-danger) 10%, transparent);
  }
}

.words-list {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 8px;
  flex: 1;
  min-height: 0;
  max-height: calc(100vh - 280px);
  overflow-y: auto;
  padding-bottom: 8px;

  .word-tag {
    font-size: 13px;
  }
}

.banned-words-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 220px;
  padding: 32px 16px;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.banned-words-empty-title {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.banned-words-empty-hint {
  margin: 0 0 8px;
  max-width: 320px;
  font-size: 13px;
  line-height: 1.5;
}
</style>

<style lang="scss">
.banned-words-drawer {
  .el-drawer__body {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}

.drawer-header {
  margin-bottom: 0px;
  padding: 15px 20px;
}
</style>
