<template>
  <div class="editor-container">
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
      <el-splitter-panel :size="isOutlineCompactMode ? 52 : 118" :resizable="false">
        <!-- 右侧工具栏 -->
        <EditorToolbar :compact="isOutlineCompactMode" :outline-embed-active="isOutlineCompactMode" />
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>

<script setup>
import { ref, nextTick, onActivated, onDeactivated } from 'vue'
import { useRoute } from 'vue-router'

defineOptions({ name: 'Editor' })
import NoteChapter from '@renderer/components/Editor/NoteChapter.vue'
import EditorPanel from '@renderer/components/Editor/EditorPanel.vue'
import EditorToolbar from '@renderer/components/Editor/EditorToolbar.vue'
import OutlineManagerPanel from '@renderer/components/Editor/OutlineManagerPanel.vue'
import {
  getOutlineDisplayMode,
  isOutlineCompactMode as checkOutlineCompactMode
} from '@renderer/composables/useOutlineDisplayMode'

const route = useRoute()

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
const isOutlineCompactMode = ref(false)

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
</style>
