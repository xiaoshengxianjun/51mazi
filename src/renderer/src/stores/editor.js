import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 编辑器相关全局状态管理
export const useEditorStore = defineStore('editor', () => {
  const content = ref('')
  const file = ref(null)
  const chapterTitle = ref('')
  const currentBookName = ref('')

  // 初始化标记
  const isInitializing = ref(false) // 是否正在初始化（加载已有内容）

  // 书籍总字数相关
  const bookTotalWords = ref(0)
  const bookWordsLoaded = ref(false)
  const chapterWordBaseline = ref(0) // 当前章节初始字数（用于增量计算）
  const lastSyncedChapterWords = ref(0) // 上一次同步到书籍总字数的章节字数
  const pendingBookWordDelta = ref(0)
  const chapterTargetWords = ref(2000)
  let externalSaveHandler = null

  // 新增：计算实际内容字数（排除换行符等格式字符）
  const contentWordCount = computed(() => {
    if (!content.value) return 0
    // 移除换行符、制表符等格式字符，只计算实际内容
    return content.value.replace(/[\n\r\t]/g, '').length
  })

  // 辅助函数：计算内容字数
  function getContentWordCount(text) {
    if (!text) return 0
    return text.replace(/[\n\r\t]/g, '').length
  }

  // 开始编辑会话（章节维度，不影响全局统计）
  function startEditingSession(initialContent) {
    const initialLength = getContentWordCount(initialContent)
    // 初始化章节字数基线
    chapterWordBaseline.value = initialLength
    lastSyncedChapterWords.value = initialLength
    isInitializing.value = true // 标记为初始化状态
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
      if (isInitializing.value) {
        isInitializing.value = false
      }
      return
    }

    if (delta !== 0) {
      // 判断是否是加载已有内容（从空内容或较小内容加载到较大内容，且处于初始化状态）
      const isLoadingExistingContent =
        isInitializing.value &&
        delta > 0 &&
        ((oldLength === 0 && newLength > 0) || (oldLength > 0 && delta > oldLength * 0.5))

      if (isInitializing.value && delta < 0) {
        isInitializing.value = false
      }

      if (isInitializing.value && delta > 0 && !isLoadingExistingContent) {
        isInitializing.value = false
      }
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
  }

  // 重置编辑会话（章节维度）
  function resetEditingSession() {
    isInitializing.value = false
    chapterWordBaseline.value = 0
    lastSyncedChapterWords.value = 0
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

  // function normalizeTitleSpacing(title) {
  //   if (!title) return ''
  //   const match = title.match(/^(第[^\\s]+[章回集节部卷]?)(.*)$/)
  //   if (!match) return title
  //   const prefix = match[1].trim()
  //   const rest = match[2] ? match[2].trimStart() : ''
  //   return rest ? `${prefix} ${rest}` : `${prefix} `
  // }

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

  function setChapterTargetWords(value) {
    const numeric = Number(value)
    chapterTargetWords.value = Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : 2000
  }

  function registerExternalSaveHandler(handler) {
    externalSaveHandler = typeof handler === 'function' ? handler : null
  }

  async function saveCurrentFileThroughHandler(showMessage = false) {
    if (typeof externalSaveHandler === 'function') {
      return externalSaveHandler(showMessage)
    }
    return false
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
    contentWordCount, // 内容字数（排除格式字符）
    editorSettings,
    isInitializing, // 暴露 isInitializing，供外部判断
    currentBookName,
    bookTotalWords,
    bookWordsLoaded,
    setContent,
    setFile,
    setChapterTitle,
    startEditingSession,
    resetEditingSession,
    loadEditorSettings,
    saveEditorSettings,
    setBookTotalWords,
    resetBookWordStats,
    fetchBookTotalWords,
    chapterTargetWords,
    setChapterTargetWords,
    registerExternalSaveHandler,
    saveCurrentFileThroughHandler
  }
})
