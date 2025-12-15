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
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import NoteChapter from '@renderer/components/Editor/NoteChapter.vue'
import EditorPanel from '@renderer/components/Editor/EditorPanel.vue'
import EditorToolbar from '@renderer/components/Editor/EditorToolbar.vue'

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

// 动态更新窗口标题
onMounted(() => {
  if (bookName) {
    document.title = `${bookName} - 51码字`
  }
})

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
  height: 100vh;
  background-color: var(--bg-primary);
  position: relative;
  overflow: hidden;
}
</style>
