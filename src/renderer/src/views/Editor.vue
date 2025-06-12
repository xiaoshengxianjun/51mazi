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
      <el-splitter-panel :size="150" :resizable="false">
        <!-- 右侧工具栏 -->
        <EditorToolbar />
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import NoteChapter from '@renderer/components/NoteChapter.vue'
import EditorPanel from '@renderer/components/EditorPanel.vue'
import EditorToolbar from '@renderer/components/EditorToolbar.vue'

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

function refreshNotes() {
  noteChapterRef.value && noteChapterRef.value.reloadNotes && noteChapterRef.value.reloadNotes()
}

function refreshChapters() {
  noteChapterRef.value &&
    noteChapterRef.value.reloadChapters &&
    noteChapterRef.value.reloadChapters()
}

// function handleSelectFile(file) {
//   // 预留：可做高亮、聚焦等
// }
</script>

<style lang="scss" scoped>
.editor-container {
  display: flex;
  height: 100vh;
  background-color: var(--bg-primary);
  position: relative;
  overflow: hidden;
}

.resize-handle {
  width: 4px;
  background-color: transparent;
  cursor: col-resize;
  position: absolute;
  left: v-bind('leftPanelWidth + "px"');
  top: 0;
  bottom: 0;
  z-index: 10;
  transition: background-color 0.2s;

  &:hover,
  &:active {
    background-color: #409eff;
  }
}

.left-panel {
  background-color: var(--bg-soft);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  //   transition: width 0.1s ease;
}

.center-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  min-width: 0; // 防止内容溢出
}

.right-panel {
  width: 160px;
  background: var(--bg-soft);
  border-left: 1px solid var(--border-color);
}
</style>
