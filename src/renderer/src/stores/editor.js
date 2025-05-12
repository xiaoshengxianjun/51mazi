import { defineStore } from 'pinia'

// 编辑器相关全局状态管理
export const useEditorStore = defineStore('editor', {
  state: () => ({
    currentFile: null, // 当前选中文件 { name, type, path, notebook/volume }
    content: '', // 编辑器内容（HTML）
    chapterTitle: '' // 章节标题
  }),
  actions: {
    setFile(file) {
      this.currentFile = file
    },
    setContent(content) {
      this.content = content
    },
    setChapterTitle(title) {
      this.chapterTitle = title
    }
  }
})
