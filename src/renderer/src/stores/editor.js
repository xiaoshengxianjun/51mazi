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
  const sessionMinWordCount = ref(0) // 本次编辑会话中的最低字数

  // 计算当前字数
  const chapterWords = computed(() => {
    return content.value.length
  })

  // 新增：计算实际内容字数（排除换行符等格式字符）
  const contentWordCount = computed(() => {
    if (!content.value) return 0
    // 移除换行符、制表符等格式字符，只计算实际内容
    return content.value.replace(/[\n\r\t]/g, '').length
  })

  // 计算本次会话的字数变化
  const sessionWordChange = computed(() => {
    if (!sessionInitialContent.value) return 0
    return contentWordCount.value - getContentWordCount(sessionInitialContent.value)
  })

  // 计算净增字数（以最低字数为基准）
  const netWordChange = computed(() => {
    // 如果还没有开始编辑会话，返回0
    if (!sessionStartTime.value) return 0

    // 如果最低字数等于初始字数，说明没有减少过，净增就是当前字数减去初始字数
    if (sessionMinWordCount.value === getContentWordCount(sessionInitialContent.value)) {
      return contentWordCount.value - getContentWordCount(sessionInitialContent.value)
    }

    // 否则以最低字数为基准计算净增
    return contentWordCount.value - sessionMinWordCount.value
  })

  // 辅助函数：计算内容字数
  function getContentWordCount(text) {
    if (!text) return 0
    return text.replace(/[\n\r\t]/g, '').length
  }

  // 开始编辑会话
  function startEditingSession(initialContent) {
    sessionStartTime.value = Date.now()
    sessionInitialContent.value = initialContent || ''
    const initialLength = getContentWordCount(initialContent)
    initialWordCount.value = initialLength
    currentWordCount.value = initialLength
    sessionMinWordCount.value = initialLength // 初始字数作为最低字数
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
    const oldLength = getContentWordCount(oldContent)
    const newLength = getContentWordCount(newContent)
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

    // 更新最低字数（如果当前字数更低）
    if (newLength < sessionMinWordCount.value) {
      sessionMinWordCount.value = newLength
    }

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
    sessionMinWordCount.value = 0
    wordCountHistory.value = []
    resetTypingTimer()
  }

  // 获取本次编辑会话统计
  function getSessionStats() {
    const addWords = wordCountHistory.value
      .filter((change) => change.type === 'add')
      .reduce((total, change) => total + change.delta, 0)

    const deleteWords = Math.abs(
      wordCountHistory.value
        .filter((change) => change.type === 'delete')
        .reduce((total, change) => total + change.delta, 0)
    )

    // 净增字数 = 当前字数 - 最低字数
    const netWords = netWordChange.value

    return {
      addWords,
      deleteWords,
      netWords,
      totalChanges: wordCountHistory.value.length,
      sessionDuration: sessionStartTime.value ? Date.now() - sessionStartTime.value : 0,
      minWordCount: sessionMinWordCount.value, // 最低字数
      currentWordCount: contentWordCount.value, // 当前内容字数
      initialWordCount: getContentWordCount(sessionInitialContent.value), // 初始内容字数
      rawCharacterCount: chapterWords.value // 原始字符数量（包含格式字符）
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

  // 编辑器设置相关
  const editorSettings = ref({
    fontFamily: 'inherit',
    fontSize: '16px',
    lineHeight: '1.6',
    globalBoldMode: false,
    globalItalicMode: false
  })

  // 加载编辑器设置
  async function loadEditorSettings() {
    try {
      const settings = await window.electronStore.get('editorSettings')
      if (settings) {
        editorSettings.value = { ...editorSettings.value, ...settings }
      }
    } catch (error) {
      console.error('加载编辑器设置失败:', error)
    }
  }

  // 保存编辑器设置
  async function saveEditorSettings(settings) {
    try {
      editorSettings.value = { ...editorSettings.value, ...settings }
      // 转换为纯对象，避免响应式代理导致的序列化问题
      const plainSettings = {
        fontFamily: editorSettings.value.fontFamily,
        fontSize: editorSettings.value.fontSize,
        lineHeight: editorSettings.value.lineHeight,
        globalBoldMode: editorSettings.value.globalBoldMode,
        globalItalicMode: editorSettings.value.globalItalicMode
      }
      await window.electronStore.set('editorSettings', plainSettings)
    } catch (error) {
      console.error('保存编辑器设置失败:', error)
    }
  }

  return {
    content,
    file,
    chapterTitle,
    chapterWords,
    contentWordCount, // 内容字数（排除格式字符）
    typingSpeed,
    sessionWordChange,
    netWordChange,
    editorSettings,
    setContent,
    setFile,
    setChapterTitle,
    startEditingSession,
    resetTypingTimer,
    resetEditingSession,
    getSessionStats,
    loadEditorSettings,
    saveEditorSettings
  }
})
