<template>
  <div class="editor-container">
    <el-tooltip :content="t('recycleBin.title')" placement="top" :show-after="400">
      <button type="button" class="recycle-bin-entry" @click="openRecycleBin">
        <el-icon :size="20"><Delete /></el-icon>
      </button>
    </el-tooltip>

    <RecycleBinDialog
      ref="recycleBinRef"
      :book-name="bookName"
      @restored="handleTrashRestored"
    />

    <el-splitter>
      <el-splitter-panel :size="240" :min="200" :max="400">
        <!-- 左侧面板：笔记章节 -->
        <NoteChapter ref="noteChapterRef" :book-name="bookName" />
      </el-splitter-panel>
      <el-splitter-panel>
        <!-- 中间编辑区 -->
        <EditorPanel
          :book-name="bookName"
          @refresh-notes="refreshNotes"
          @refresh-chapters="refreshChapters"
        />
      </el-splitter-panel>
      <!-- 嵌入式大纲：min 限制过窄；size 需 ≥ min，否则 splitter 行为异常 -->
      <el-splitter-panel v-if="isOutlineCompactMode" :size="380" :min="350" :max="520">
        <OutlineManagerPanel :book-name="bookName" compact />
      </el-splitter-panel>
      <!-- 小屏：写作助手仅图标；正常：带文字 118px -->
      <el-splitter-panel :size="isOutlineCompactMode ? 52 : 150" :resizable="false">
        <!-- 右侧工具栏 -->
        <EditorToolbar
          :compact="isOutlineCompactMode"
          :outline-embed-active="isOutlineCompactMode"
        />
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>

<script setup>
import { ref, nextTick, onActivated, onDeactivated } from 'vue'
import { useRoute } from 'vue-router'
import { Delete } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'Editor' })
import NoteChapter from '@renderer/components/Editor/NoteChapter.vue'
import EditorPanel from '@renderer/components/Editor/EditorPanel.vue'
import EditorToolbar from '@renderer/components/Editor/EditorToolbar.vue'
import OutlineManagerPanel from '@renderer/components/Editor/OutlineManagerPanel.vue'
import RecycleBinDialog from '@renderer/components/Editor/RecycleBinDialog.vue'
import {
  getOutlineDisplayMode,
  isOutlineCompactMode as checkOutlineCompactMode
} from '@renderer/composables/useOutlineDisplayMode'

const route = useRoute()
const { t } = useI18n()

// 解析新窗口参数
let bookName = null
if (window.process && window.process.argv) {
  // Electron 传递的 additionalArguments
  for (const arg of window.process.argv) {
    if (arg.startsWith('bookName=')) bookName = decodeURIComponent(arg.replace('bookName=', ''))
  }
}
if (!bookName) {
  // 回退到 hash/query
  bookName = route.query.name
}

const noteChapterRef = ref(null)
const recycleBinRef = ref(null)
const isOutlineCompactMode = ref(false)

function openRecycleBin() {
  recycleBinRef.value?.open()
}

function handleTrashRestored(result) {
  if (!result?.type) return
  if (result.type === 'chapter' || result.type === 'volume') {
    refreshChapters()
  }
  if (result.type === 'note' || result.type === 'notebook') {
    refreshNotes()
  }
}

async function loadOutlineDisplayMode() {
  const mode = await getOutlineDisplayMode(bookName)
  isOutlineCompactMode.value = checkOutlineCompactMode(mode)
}

function refreshNotes() {
  noteChapterRef.value && noteChapterRef.value.reloadNotes && noteChapterRef.value.reloadNotes()
}

function refreshChapters() {
  noteChapterRef.value &&
    noteChapterRef.value.reloadChapters &&
    noteChapterRef.value.reloadChapters()
}

// keep-alive 下用 activated/deactivated 绑定窗口事件，避免停用页仍监听刷新
onActivated(() => {
  if (bookName) {
    document.title = `${bookName} - 51码字`
  }
  window.addEventListener('refresh-chapters-requested', refreshChapters)
  void loadOutlineDisplayMode()
  void nextTick(() => {
    refreshNotes()
  })
})

onDeactivated(() => {
  window.removeEventListener('refresh-chapters-requested', refreshChapters)
})

// function handleSelectFile(file) {
//   // 预留：可做高亮、聚焦等
// }
</script>

<style lang="scss" scoped>
.editor-container {
  height: 100vh;
  background-color: var(--bg-primary);
  position: relative;
  overflow: hidden;
}

.recycle-bin-entry {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--bg-soft);
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    color 0.2s,
    background-color 0.2s,
    border-color 0.2s;

  &:hover {
    color: var(--el-color-primary);
    background-color: var(--bg-mute);
    border-color: var(--el-color-primary-light-5);
  }
}
</style>
