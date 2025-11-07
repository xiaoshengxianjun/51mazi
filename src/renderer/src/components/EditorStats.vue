<template>
  <div class="editor-stats">
    <div class="editor-stats-left">
      <span class="word-count">章节字数：{{ contentWordCount }}字</span>
      <span class="book-word-count">书籍字数：{{ bookTotalWords }}字</span>
    </div>
    <div class="editor-stats-right">
      <span class="typing-speed">
        码字速度：{{ typingSpeed.perMinute }}字/分钟 ({{ typingSpeed.perHour }}字/小时)
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@renderer/stores/editor'

const props = defineProps({
  bookName: {
    type: String,
    default: ''
  },
  contentWordCount: {
    type: Number,
    default: 0
  },
  fileType: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update-book-words'])

const editorStore = useEditorStore()

// 书籍总字数
const bookTotalWords = ref(0)
// 书籍总字数历史记录（用于计算码字速度）
const bookWordCountHistory = ref([])
// 最大历史记录数量（防止内存无限增长）
// 实际情况：绝大部分作者一小时写作2000字，基本上不会超过5000字/每小时
// 估算：
//   - 正常情况：1小时写2000字，假设平均每10个字触发一次，需要200条记录
//   - 极端情况：1小时写5000字，假设每5个字触发一次，需要1000条记录
//   - 考虑到输入法、防抖等因素，实际触发可能更频繁，设置为2000条足够安全
// 内存占用：每条记录约42字节，2000条约84KB，完全可以接受
const MAX_HISTORY_SIZE = 2000
// 定时器
let typingSpeedTimer = null
let cleanupTimer = null // 定期清理历史记录的定时器

// 加载书籍总字数
async function loadBookTotalWords() {
  if (!props.bookName) return
  try {
    // 通过读取书籍目录获取总字数
    const books = await window.electron.readBooksDir()
    const book = books.find((b) => b.name === props.bookName)
    if (book && book.totalWords !== undefined) {
      bookTotalWords.value = book.totalWords
    } else {
      // 如果找不到，尝试通过 getBookWordCount 获取
      const totalWords = await window.electron.getBookWordCount(props.bookName)
      if (totalWords !== undefined) {
        bookTotalWords.value = totalWords
      }
    }
  } catch (error) {
    console.error('加载书籍总字数失败:', error)
  }
}

// 清理历史记录（只保留最近1小时的数据，并限制最大数量）
function cleanupHistory() {
  const now = Date.now()
  const oneHourAgo = now - 3600000

  // 先按时间过滤（只保留最近1小时的数据，因为码字速度只需要最近1小时的数据）
  let filtered = bookWordCountHistory.value.filter((change) => change.timestamp >= oneHourAgo)

  // 如果仍然超过最大数量，只保留最新的（防止极端情况下内存溢出）
  // 这种情况理论上不应该发生，因为1小时内正常写作（2000-5000字）不会产生超过2000条记录
  // 但作为安全措施，如果超过了，只保留最新的MAX_HISTORY_SIZE条
  if (filtered.length > MAX_HISTORY_SIZE) {
    console.warn(
      `历史记录数量超过限制（${filtered.length} > ${MAX_HISTORY_SIZE}），将只保留最新的 ${MAX_HISTORY_SIZE} 条。这可能是因为触发频率异常高。`
    )
    filtered = filtered.slice(-MAX_HISTORY_SIZE)
  }

  bookWordCountHistory.value = filtered
}

// 更新书籍总字数（基于增量）
function updateBookTotalWords(oldChapterWords, newChapterWords, isInitialLoad = false) {
  const wordChange = newChapterWords - oldChapterWords
  const oldTotalWords = bookTotalWords.value
  bookTotalWords.value = Math.max(0, bookTotalWords.value + wordChange)

  // 如果是章节，且字数有变化，且不是初始加载，记录到历史（用于计算码字速度）
  if (props.fileType === 'chapter' && wordChange !== 0 && !isInitialLoad) {
    const now = Date.now()
    const record = {
      timestamp: now,
      oldTotalWords,
      newTotalWords: bookTotalWords.value,
      delta: wordChange,
      type: wordChange > 0 ? 'add' : 'delete'
    }
    bookWordCountHistory.value.push(record)

    // 调试信息
    console.log('[EditorStats] 添加历史记录:', {
      delta: wordChange,
      historyLength: bookWordCountHistory.value.length,
      isInitialLoad
    })

    // 防抖更新码字速度（延迟清理，确保新记录不会被立即清理）
    debouncedUpdateTypingSpeed()
  } else {
    // 调试信息：为什么没有记录
    if (props.fileType === 'chapter' && wordChange !== 0) {
      console.log('[EditorStats] 未记录历史:', {
        wordChange,
        isInitialLoad,
        fileType: props.fileType
      })
    }
  }

  // 通知父组件书籍总字数已更新
  emit('update-book-words', bookTotalWords.value)
}

// 使用 computed 计算码字速度（更高效，自动响应历史记录变化）
const typingSpeed = computed(() => {
  const now = Date.now()

  // 如果没有历史记录，返回0
  if (bookWordCountHistory.value.length === 0) {
    return {
      perMinute: 0,
      perHour: 0
    }
  }

  // 计算最近1分钟（60秒）内的新增字数
  const oneMinuteAgo = now - 60000
  const wordsAddedInOneMinute = bookWordCountHistory.value
    .filter((change) => change.timestamp >= oneMinuteAgo && change.type === 'add')
    .reduce((total, change) => total + change.delta, 0)

  // 计算最近1小时（3600秒）内的新增字数
  const oneHourAgo = now - 3600000
  const wordsAddedInOneHour = bookWordCountHistory.value
    .filter((change) => change.timestamp >= oneHourAgo && change.type === 'add')
    .reduce((total, change) => total + change.delta, 0)

  // 最近1分钟的新增字数 = 每分钟速度
  // 最近1小时的新增字数 = 每小时速度
  return {
    perMinute: Math.max(0, wordsAddedInOneMinute),
    perHour: Math.max(0, wordsAddedInOneHour)
  }
})

// 防抖更新码字速度（由于使用了 computed，这里只需要触发清理）
function debouncedUpdateTypingSpeed() {
  // 由于 typingSpeed 是 computed，会自动更新，这里只需要清理历史记录
  // 使用防抖避免频繁清理
  if (typingSpeedTimer) {
    clearTimeout(typingSpeedTimer)
  }
  typingSpeedTimer = setTimeout(() => {
    // 延迟清理，确保新添加的记录不会被立即清理
    cleanupHistory()
  }, 2000) // 2秒后清理，给新记录一些缓冲时间
}

// 辅助函数：计算内容字数（排除换行符等格式字符）
function getContentWordCount(text) {
  if (!text) return 0
  return text.replace(/[\n\r\t]/g, '').length
}

// 监听章节字数变化，更新书籍总字数
const stopContentWordCountWatch = watch(
  () => props.contentWordCount,
  (newCount, oldCount) => {
    if (props.fileType === 'chapter' && newCount !== oldCount) {
      const oldChapterWords = oldCount ?? 0
      const newChapterWords = newCount ?? 0
      const wordChange = newChapterWords - oldChapterWords

      // 判断是否是初始加载：
      // 1. 如果 editorStore.isInitializing 为 true，且字数变化很大（可能是加载已有内容）
      // 2. 如果从 undefined/null/0 跳到很大的值（可能是加载已有内容）
      // 3. 如果字数变化超过当前字数的一半，可能是加载已有内容
      const isInitialLoad =
        (editorStore.isInitializing && wordChange > 50) || // 初始化时且变化很大
        (oldChapterWords === 0 && newChapterWords > 100) || // 从0跳到100以上
        (oldCount === undefined && newCount > 0) || // 第一次加载
        (oldCount === null && newCount > 0) || // 第一次加载
        (wordChange > 0 && oldChapterWords > 0 && wordChange > oldChapterWords * 0.5) // 变化超过一半

      updateBookTotalWords(oldChapterWords, newChapterWords, isInitialLoad)
    }
  }
)

// 监听文件类型变化，如果是章节则加载书籍总字数
const stopFileTypeWatch = watch(
  () => props.fileType,
  async (newType) => {
    if (newType === 'chapter') {
      await loadBookTotalWords()
    } else {
      // 切换到非章节时，清理历史记录和重置状态
      bookWordCountHistory.value = []
    }
  },
  { immediate: true }
)

// 暴露方法供父组件调用
defineExpose({
  loadBookTotalWords,
  updateBookTotalWords,
  getContentWordCount
})

onMounted(async () => {
  if (props.fileType === 'chapter') {
    await loadBookTotalWords()
  }

  // 定期清理历史记录（每5分钟清理一次，防止内存泄漏）
  cleanupTimer = setInterval(
    () => {
      cleanupHistory()
    },
    5 * 60 * 1000
  ) // 5分钟
})

onBeforeUnmount(() => {
  // 停止 watch
  stopContentWordCountWatch()
  stopFileTypeWatch()

  // 清理定时器
  if (typingSpeedTimer) {
    clearTimeout(typingSpeedTimer)
    typingSpeedTimer = null
  }
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }

  // 清理历史记录
  bookWordCountHistory.value = []
})
</script>

<style lang="scss" scoped>
.editor-stats {
  height: auto;
  min-height: 28px;
  width: 100%;
  line-height: 28px;
  padding: 0px 15px;
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-mute);
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  color: var(--text-base);

  &-left {
    display: flex;
    align-items: center;
    gap: 10px;
    > span {
      font-weight: bold;
      color: var(--primary-color);
    }
  }
  &-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .typing-speed {
    color: var(--warning-color);
  }
}
</style>
