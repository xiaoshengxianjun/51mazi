<template>
  <div class="editor-container">
    <!-- 左侧面板 -->
    <div class="left-panel" :style="{ width: leftPanelWidth + 'px' }">
      <NoteChapter ref="noteChapterRef" :book-name="bookName" />
    </div>

    <!-- 拖拽条 -->
    <div class="resize-handle" @mousedown="startResize" @dblclick="resetPanelWidth"></div>

    <!-- 右侧编辑区 -->
    <div class="right-panel">
      <EditorPanel
        :book-name="bookName"
        @refresh-notes="refreshNotes"
        @refresh-chapters="refreshChapters"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import NoteChapter from '@renderer/components/NoteChapter.vue'
import EditorPanel from '@renderer/components/EditorPanel.vue'

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

// 面板宽度控制
const leftPanelWidth = ref(280)
const MIN_WIDTH = 200
const MAX_WIDTH = 400
const DEFAULT_WIDTH = 300

// 拖拽状态
const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)

const noteChapterRef = ref(null)

// 开始拖拽
function startResize(e) {
  isResizing.value = true
  startX.value = e.clientX
  startWidth.value = leftPanelWidth.value

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResize)
}

// 处理拖拽移动
function handleMouseMove(e) {
  if (!isResizing.value) return

  const deltaX = e.clientX - startX.value
  const newWidth = Math.min(Math.max(startWidth.value + deltaX, MIN_WIDTH), MAX_WIDTH)
  leftPanelWidth.value = newWidth
}

// 停止拖拽
function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
}

// 重置面板宽度
function resetPanelWidth() {
  leftPanelWidth.value = DEFAULT_WIDTH
}

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

// 组件卸载时清理事件监听
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<style lang="scss" scoped>
.editor-container {
  display: flex;
  height: 100vh;
  background-color: var(--bg-primary);
  position: relative;
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

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  min-width: 0; // 防止内容溢出
}
</style>
