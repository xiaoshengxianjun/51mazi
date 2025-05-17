import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 编辑器相关全局状态管理
export const useEditorStore = defineStore('editor', () => {
  const content = ref('')
  const file = ref(null)
  const chapterTitle = ref('')

  // 新增：码字统计相关
  const typingStartTime = ref(null)
  const initialWordCount = ref(0)
  const currentWordCount = ref(0)
  const typingSpeed = ref({
    perMinute: 0,
    perHour: 0
  })

  // 计算当前字数
  const wordCount = computed(() => {
    return content.value.length
  })

  // 开始计时
  function startTypingTimer() {
    if (!typingStartTime.value) {
      typingStartTime.value = Date.now()
      initialWordCount.value = wordCount.value
    }
  }

  // 更新码字速度
  function updateTypingSpeed() {
    if (!typingStartTime.value) return

    const now = Date.now()
    const timeElapsed = (now - typingStartTime.value) / 1000 // 转换为秒
    const wordsTyped = wordCount.value - initialWordCount.value

    if (timeElapsed > 0) {
      typingSpeed.value = {
        perMinute: Math.round((wordsTyped / timeElapsed) * 60),
        perHour: Math.round((wordsTyped / timeElapsed) * 3600)
      }
    }
  }

  // 重置计时器
  function resetTypingTimer() {
    typingStartTime.value = null
    initialWordCount.value = 0
    currentWordCount.value = 0
    typingSpeed.value = {
      perMinute: 0,
      perHour: 0
    }
  }

  function setContent(newContent) {
    content.value = newContent
    startTypingTimer()
    updateTypingSpeed()
  }

  function setFile(newFile) {
    file.value = newFile
  }

  function setChapterTitle(title) {
    chapterTitle.value = title
  }

  return {
    content,
    file,
    chapterTitle,
    wordCount,
    typingSpeed,
    setContent,
    setFile,
    setChapterTitle,
    resetTypingTimer
  }
})
