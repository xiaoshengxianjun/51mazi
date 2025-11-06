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

  // 全局输入历史记录（不随章节切换而重置）
  const globalWordCountHistory = ref([]) // 记录全局字数变化历史（整个编辑器维度）

  // 新增：实时字数变化统计（章节维度）
  const wordCountHistory = ref([]) // 记录字数变化历史
  const sessionStartTime = ref(null) // 本次编辑会话开始时间
  const sessionInitialContent = ref('') // 本次编辑会话初始内容
  const sessionMinWordCount = ref(0) // 本次编辑会话中的最低字数
  const isInitializing = ref(false) // 是否正在初始化（加载已有内容）
  let typingSpeedTimer = null // 码字速度更新定时器

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

  // 更新码字速度（全局维度，统计最近1分钟和最近1小时的新增字数）
  function updateTypingSpeed() {
    const now = Date.now()

    // 如果没有全局输入历史，返回0
    if (globalWordCountHistory.value.length === 0) {
      typingSpeed.value = {
        perMinute: 0,
        perHour: 0
      }
      return
    }

    // 计算最近1分钟（60秒）内的新增字数
    const oneMinuteAgo = now - 60000
    const recentOneMinuteChanges = globalWordCountHistory.value.filter(
      (change) => change.timestamp >= oneMinuteAgo && change.type === 'add'
    )
    const wordsAddedInOneMinute = recentOneMinuteChanges.reduce(
      (total, change) => total + change.delta,
      0
    )

    // 计算最近1小时（3600秒）内的新增字数
    const oneHourAgo = now - 3600000
    const recentOneHourChanges = globalWordCountHistory.value.filter(
      (change) => change.timestamp >= oneHourAgo && change.type === 'add'
    )
    const wordsAddedInOneHour = recentOneHourChanges.reduce(
      (total, change) => total + change.delta,
      0
    )

    // 最近1分钟的新增字数 = 每分钟速度
    // 最近1小时的新增字数 = 每小时速度
    typingSpeed.value = {
      perMinute: wordsAddedInOneMinute > 0 ? wordsAddedInOneMinute : 0,
      perHour: wordsAddedInOneHour > 0 ? wordsAddedInOneHour : 0
    }
  }

  // 防抖更新码字速度
  function debouncedUpdateTypingSpeed() {
    if (typingSpeedTimer) {
      clearTimeout(typingSpeedTimer)
    }
    typingSpeedTimer = setTimeout(() => {
      updateTypingSpeed()
    }, 1000) // 1秒后更新
  }

  // 记录字数变化
  function recordWordChange(oldContent, newContent) {
    const oldLength = getContentWordCount(oldContent)
    const newLength = getContentWordCount(newContent)
    const delta = newLength - oldLength

    // 标记是否实际记录到全局历史
    let hasRecordedToGlobal = false

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
      // 这种情况通常是加载已有章节内容，不应该计入码字速度
      const isLoadingExistingContent =
        isInitializing.value &&
        delta > 0 &&
        ((oldLength === 0 && newLength > 0) || (oldLength > 0 && delta > oldLength * 0.5))
      // 如果增量超过原内容的一半，很可能是加载已有内容，而不是用户输入

      // 记录到全局历史（用于码字速度统计，不随章节切换而重置）
      // 只有在非初始化状态下，且是新增字数时，才记录到全局历史
      // 这样可以避免加载已有内容时被误计入码字速度
      if (delta > 0 && !isLoadingExistingContent) {
        // 如果还在初始化状态，但增量很小（小于等于10字），可能是用户开始输入
        // 此时结束初始化状态，并记录到全局历史
        if (isInitializing.value && delta <= 10) {
          isInitializing.value = false
          // 记录新增字数
          globalWordCountHistory.value.push({
            timestamp: now,
            delta: delta,
            type: 'add'
          })
          hasRecordedToGlobal = true
        } else if (!isInitializing.value) {
          // 非初始化状态，正常记录
          globalWordCountHistory.value.push({
            timestamp: now,
            delta: delta,
            type: 'add'
          })
          hasRecordedToGlobal = true
        }

        // 如果记录到全局历史，清理超过1小时的数据
        if (hasRecordedToGlobal) {
          const oneHourAgo = now - 3600000
          globalWordCountHistory.value = globalWordCountHistory.value.filter(
            (change) => change.timestamp >= oneHourAgo
          )
        }
      }

      // 清理章节历史记录：只保留最近5分钟的数据
      const fiveMinutesAgo = now - 300000
      wordCountHistory.value = wordCountHistory.value.filter(
        (change) => change.timestamp >= fiveMinutesAgo
      )
    }

    // 更新当前字数
    currentWordCount.value = newLength

    // 更新最低字数（如果当前字数更低）
    if (newLength < sessionMinWordCount.value) {
      sessionMinWordCount.value = newLength
    }

    // 只有在实际记录到全局历史时，才更新码字速度
    // 这样可以避免加载已有内容时触发不必要的速度更新
    if (hasRecordedToGlobal) {
      debouncedUpdateTypingSpeed()
    }
  }

  // 重置计时器（章节维度，不影响全局统计）
  function resetTypingTimer() {
    typingStartTime.value = null
    initialWordCount.value = 0
    currentWordCount.value = 0
    // 注意：不重置 globalWordCountHistory 和 typingSpeed，保持全局统计
    if (typingSpeedTimer) {
      clearTimeout(typingSpeedTimer)
      typingSpeedTimer = null
    }
  }

  // 重置编辑会话（章节维度，不影响全局统计）
  function resetEditingSession() {
    sessionStartTime.value = null
    sessionInitialContent.value = ''
    sessionMinWordCount.value = 0
    wordCountHistory.value = [] // 只重置章节维度的历史
    // 注意：不重置 globalWordCountHistory 和 typingSpeed，保持全局统计
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
