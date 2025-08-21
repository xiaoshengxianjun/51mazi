import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 编辑器相关全局状态管理
export const useEditorStore = defineStore('editor', () => {
  const content = ref('')
  const file = ref(null)
  const chapterTitle = ref('')

  // 码字统计相关
  const typingStartTime = ref(null)
  const initialWordCount = ref(0)
  const currentWordCount = ref(0)
  const typingSpeed = ref({
    perMinute: 0,
    perHour: 0
  })

  // 新增：实时字数变化统计
  const wordCountHistory = ref([]) // 记录字数变化历史
  const sessionStartTime = ref(null) // 本次编辑会话开始时间
  const sessionInitialContent = ref('') // 本次编辑会话初始内容

  // 计算当前字数
  const chapterWords = computed(() => {
    return content.value.length
  })

  // 计算本次会话的字数变化
  const sessionWordChange = computed(() => {
    if (!sessionInitialContent.value) return 0
    return chapterWords.value - sessionInitialContent.value.length
  })

  // 计算净增字数（新增 - 删除）
  const netWordChange = computed(() => {
    return wordCountHistory.value.reduce((total, change) => total + change.delta, 0)
  })

  // 开始编辑会话
  function startEditingSession(initialContent) {
    sessionStartTime.value = Date.now()
    sessionInitialContent.value = initialContent || ''
    initialWordCount.value = initialContent ? initialContent.length : 0
    currentWordCount.value = initialWordCount.value
    wordCountHistory.value = []
    
    // 开始计时
    startTypingTimer()
  }

  // 开始计时
  function startTypingTimer() {
    if (!typingStartTime.value) {
      typingStartTime.value = Date.now()
    }
  }

  // 更新码字速度
  function updateTypingSpeed() {
    if (!typingStartTime.value) return

    const now = Date.now()
    const timeElapsed = (now - typingStartTime.value) / 1000 // 转换为秒
    const wordsTyped = Math.abs(sessionWordChange.value)

    if (timeElapsed > 0) {
      typingSpeed.value = {
        perMinute: Math.round((wordsTyped / timeElapsed) * 60),
        perHour: Math.round((wordsTyped / timeElapsed) * 3600)
      }
    }
  }

  // 记录字数变化
  function recordWordChange(oldContent, newContent) {
    const oldLength = oldContent ? oldContent.length : 0
    const newLength = newContent ? newContent.length : 0
    const delta = newLength - oldLength

    if (delta !== 0) {
      wordCountHistory.value.push({
        timestamp: Date.now(),
        oldLength,
        newLength,
        delta,
        type: delta > 0 ? 'add' : 'delete'
      })
    }

    // 更新当前字数
    currentWordCount.value = newLength
    
    // 更新码字速度
    updateTypingSpeed()
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

  // 重置编辑会话
  function resetEditingSession() {
    sessionStartTime.value = null
    sessionInitialContent.value = ''
    wordCountHistory.value = []
    resetTypingTimer()
  }

  // 获取本次编辑会话统计
  function getSessionStats() {
    const addWords = wordCountHistory.value
      .filter(change => change.type === 'add')
      .reduce((total, change) => total + change.delta, 0)
    
    const deleteWords = Math.abs(wordCountHistory.value
      .filter(change => change.type === 'delete')
      .reduce((total, change) => total + change.delta, 0))
    
    const netWords = addWords - deleteWords

    return {
      addWords,
      deleteWords,
      netWords,
      totalChanges: wordCountHistory.value.length,
      sessionDuration: sessionStartTime.value ? Date.now() - sessionStartTime.value : 0
    }
  }

  function setContent(newContent) {
    const oldContent = content.value
    content.value = newContent
    
    // 记录字数变化
    recordWordChange(oldContent, newContent)
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
    chapterWords,
    typingSpeed,
    sessionWordChange,
    netWordChange,
    setContent,
    setFile,
    setChapterTitle,
    startEditingSession,
    resetTypingTimer,
    resetEditingSession,
    getSessionStats
  }
})
