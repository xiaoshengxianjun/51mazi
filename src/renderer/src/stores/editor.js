import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 编辑器相关全局状态管理
export const useEditorStore = defineStore('editor', () => {
  const content = ref('')
  const file = ref(null)
  const chapterTitle = ref('')
  const currentBookName = ref('')

  // 码字统计相关
  const typingStartTime = ref(null)
  const initialWordCount = ref(0)
  const currentWordCount = ref(0)

  // 新增：实时字数变化统计（章节维度）
  const wordCountHistory = ref([]) // 记录字数变化历史
  const sessionStartTime = ref(null) // 本次编辑会话开始时间
  const sessionInitialContent = ref('') // 本次编辑会话初始内容
  const sessionMinWordCount = ref(0) // 本次编辑会话中的最低字数
  const isInitializing = ref(false) // 是否正在初始化（加载已有内容）

  // 书籍总字数相关
  const bookTotalWords = ref(0)
  const bookWordsLoaded = ref(false)
  const chapterWordBaseline = ref(0) // 当前章节初始字数（用于增量计算）
  const lastSyncedChapterWords = ref(0) // 上一次同步到书籍总字数的章节字数
  const pendingBookWordDelta = ref(0)

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

  // 开始编辑会话（章节维度，不影响全局统计）
  function startEditingSession(initialContent) {
    sessionStartTime.value = Date.now()
    sessionInitialContent.value = initialContent || ''
    const initialLength = getContentWordCount(initialContent)
    initialWordCount.value = initialLength
    currentWordCount.value = initialLength
    sessionMinWordCount.value = initialLength // 初始字数作为最低字数
    // 初始化章节字数基线
    chapterWordBaseline.value = initialLength
    lastSyncedChapterWords.value = initialLength
    wordCountHistory.value = [] // 章节维度的历史记录，切换章节时重置
    isInitializing.value = true // 标记为初始化状态

    // 开始计时
    startTypingTimer()
  }

  // 开始计时
  function startTypingTimer() {
    if (!typingStartTime.value) {
      typingStartTime.value = Date.now()
    }
  }

  // 记录字数变化
  function recordWordChange(oldContent, newContent, options = {}) {
    const { isInitialLoad = false } = options
    const oldLength = getContentWordCount(oldContent)
    const newLength = getContentWordCount(newContent)
    const delta = newLength - oldLength

    const previousChapterWords = lastSyncedChapterWords.value
    // 无论是否计入书籍字数，都需要更新当前章节字数
    lastSyncedChapterWords.value = newLength

    if (isInitialLoad) {
      currentWordCount.value = newLength
      if (isInitializing.value) {
        sessionMinWordCount.value = newLength
      }
      if (file.value?.type === 'chapter') {
        chapterWordBaseline.value = newLength
      }
      return
    }

    if (delta !== 0) {
      const now = Date.now()
      const changeRecord = {
        timestamp: now,
        oldLength,
        newLength,
        delta,
        type: delta > 0 ? 'add' : 'delete'
      }

      // 记录到章节维度的历史（用于章节统计）
      wordCountHistory.value.push(changeRecord)

      // 判断是否是加载已有内容（从空内容或较小内容加载到较大内容，且处于初始化状态）
      const isLoadingExistingContent =
        isInitializing.value &&
        delta > 0 &&
        ((oldLength === 0 && newLength > 0) || (oldLength > 0 && delta > oldLength * 0.5))

      // 在初始化状态下的第一次字数变化，如果是删除操作，同样视为用户行为
      if (isInitializing.value && delta < 0) {
        isInitializing.value = false
      }

      // 判断是否是加载已有内容（从空内容或较小内容加载到较大内容，且处于初始化状态）
      // 如果是在初始化状态下，且用户开始输入（delta > 0），则结束初始化状态
      // 但如果是加载已有内容（从空到有内容），不结束初始化状态
      // 只要不是加载已有内容，且是新增字数，就结束初始化状态（无论增量大小）
      if (isInitializing.value && delta > 0 && !isLoadingExistingContent) {
        isInitializing.value = false
      }

      // 清理章节历史记录：只保留最近5分钟的数据
      const fiveMinutesAgo = now - 300000
      wordCountHistory.value = wordCountHistory.value.filter(
        (change) => change.timestamp >= fiveMinutesAgo
      )
    }

    // 更新书籍总字数：仅在章节类型、已加载书籍统计且不是章节初始加载场景时同步
    if (
      file.value?.type === 'chapter' &&
      !isInitializing.value &&
      previousChapterWords !== newLength
    ) {
      const bookDelta = newLength - previousChapterWords
      if (bookDelta !== 0) {
        if (bookWordsLoaded.value) {
          const sanitizedTotal = Number.isFinite(bookTotalWords.value) ? bookTotalWords.value : 0
          const nextTotal = sanitizedTotal + bookDelta
          bookTotalWords.value = nextTotal > 0 ? nextTotal : 0
        } else {
          pendingBookWordDelta.value += bookDelta
        }
      }
    }

    // 更新当前字数
    currentWordCount.value = newLength

    // 更新最低字数（如果当前字数更低）
    if (newLength < sessionMinWordCount.value) {
      sessionMinWordCount.value = newLength
    }
  }

  // 重置计时器（章节维度）
  function resetTypingTimer() {
    typingStartTime.value = null
    initialWordCount.value = 0
    currentWordCount.value = 0
  }

  // 重置编辑会话（章节维度）
  function resetEditingSession() {
    sessionStartTime.value = null
    sessionInitialContent.value = ''
    sessionMinWordCount.value = 0
    wordCountHistory.value = [] // 重置章节维度的历史
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

  function setContent(newContent, options = {}) {
    const oldContent = content.value
    content.value = newContent

    // 记录字数变化
    recordWordChange(oldContent, newContent, options)
  }

  function setFile(newFile) {
    file.value = newFile
    if (newFile?.type === 'chapter') {
      isInitializing.value = true
    } else if (!newFile) {
      isInitializing.value = false
    }
    if (!newFile || newFile.type !== 'chapter') {
      chapterWordBaseline.value = 0
      lastSyncedChapterWords.value = 0
    }
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

  function setBookTotalWords(total) {
    const numeric = Number(total)
    const sanitized = Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0
    const adjusted = sanitized + pendingBookWordDelta.value
    bookTotalWords.value = adjusted > 0 ? adjusted : 0
    pendingBookWordDelta.value = 0
    bookWordsLoaded.value = true
  }

  function resetBookWordStats() {
    bookTotalWords.value = 0
    chapterWordBaseline.value = 0
    lastSyncedChapterWords.value = 0
    bookWordsLoaded.value = false
    currentBookName.value = ''
    pendingBookWordDelta.value = 0
  }

  function setChapterWordBaseline(words) {
    const sanitized = Math.max(0, Number.isFinite(Number(words)) ? Number(words) : 0)
    chapterWordBaseline.value = sanitized
    lastSyncedChapterWords.value = sanitized
  }

  function syncBookTotalWords(currentWords) {
    const sanitized = Math.max(0, Number.isFinite(Number(currentWords)) ? Number(currentWords) : 0)
    const delta = sanitized - lastSyncedChapterWords.value
    if (delta === 0) return
    if (!bookWordsLoaded.value) {
      pendingBookWordDelta.value += delta
      lastSyncedChapterWords.value = sanitized
      return
    }
    const nextTotal = (Number.isFinite(bookTotalWords.value) ? bookTotalWords.value : 0) + delta
    bookTotalWords.value = nextTotal > 0 ? nextTotal : 0
    lastSyncedChapterWords.value = sanitized
  }

  async function fetchBookTotalWords(bookName, { force = false } = {}) {
    const normalizedName = bookName ? String(bookName) : ''
    if (!normalizedName) return bookTotalWords.value

    if (!force && bookWordsLoaded.value && currentBookName.value === normalizedName) {
      return bookTotalWords.value
    }

    try {
      let totalWords
      if (window?.electron?.getBookWordCount) {
        totalWords = await window.electron.getBookWordCount(normalizedName)
      }

      if (totalWords === undefined && window?.electron?.readBooksDir) {
        const books = await window.electron.readBooksDir()
        if (Array.isArray(books)) {
          const target = books.find((item) => item.name === normalizedName)
          if (target && target.totalWords !== undefined) {
            totalWords = target.totalWords
          }
        }
      }

      setBookTotalWords(totalWords ?? 0)
      currentBookName.value = normalizedName
    } catch (error) {
      console.error('获取书籍总字数失败:', error)
      resetBookWordStats()
      throw error
    }

    return bookTotalWords.value
  }

  return {
    content,
    file,
    chapterTitle,
    chapterWords,
    contentWordCount, // 内容字数（排除格式字符）
    sessionWordChange,
    netWordChange,
    editorSettings,
    isInitializing, // 暴露 isInitializing，供外部判断
    bookTotalWords,
    bookWordsLoaded,
    setContent,
    setFile,
    setChapterTitle,
    startEditingSession,
    resetTypingTimer,
    resetEditingSession,
    getSessionStats,
    loadEditorSettings,
    saveEditorSettings,
    setBookTotalWords,
    resetBookWordStats,
    setChapterWordBaseline,
    syncBookTotalWords,
    fetchBookTotalWords
  }
})
