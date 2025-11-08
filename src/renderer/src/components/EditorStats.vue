<template>
  <div class="editor-stats">
    <div class="editor-stats-left">
      <span class="word-count">章节字数：{{ contentWordCount }}字</span>
      <span class="book-word-count">书籍字数：{{ displayedBookWords }}字</span>
    </div>
    <div class="editor-stats-right">
      <span class="typing-speed">
        码字速度：{{ typingSpeed.perMinute }}字/分钟 ({{ typingSpeed.perHour }}字/小时)
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
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

const wordSnapshots = ref([])
const needBaselineReset = ref(true)
const isFetching = ref(false)

const displayedBookWords = computed(() => editorStore.bookTotalWords ?? 0)

const typingSpeed = computed(() => {
  if (wordSnapshots.value.length === 0) {
    return { perMinute: 0, perHour: 0 }
  }

  const now = Date.now()
  const oneMinuteAgo = now - 60000
  const oneHourAgo = now - 3600000

  const snapshots = wordSnapshots.value
  const latestSnapshot = snapshots[snapshots.length - 1]

  const withinMinute = snapshots.filter((item) => item.timestamp >= oneMinuteAgo)
  const withinHour = snapshots.filter((item) => item.timestamp >= oneHourAgo)

  const perMinute =
    withinMinute.length > 1 ? Math.max(0, latestSnapshot.count - withinMinute[0].count) : 0

  const perHour =
    withinHour.length > 1 ? Math.max(0, latestSnapshot.count - withinHour[0].count) : 0

  return { perMinute, perHour }
})

function sanitizeWordCount(value) {
  if (value === null || value === undefined) return 0
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return 0
  return numberValue < 0 ? 0 : Math.floor(numberValue)
}

function recordSnapshot(wordCount) {
  const sanitized = sanitizeWordCount(wordCount)
  const now = Date.now()
  const snapshots = wordSnapshots.value
  const lastSnapshot = snapshots[snapshots.length - 1]

  if (lastSnapshot && lastSnapshot.count === sanitized) {
    lastSnapshot.timestamp = now
  } else {
    snapshots.push({ timestamp: now, count: sanitized })
  }

  // 只保留最近1小时的数据
  const oneHourAgo = now - 3600000
  wordSnapshots.value = snapshots.filter((item) => item.timestamp >= oneHourAgo)
}

function resetSnapshots(wordCount) {
  const sanitized = sanitizeWordCount(wordCount)
  wordSnapshots.value = [{ timestamp: Date.now(), count: sanitized }]
}

async function loadBookTotalWords(force = false) {
  if (!props.bookName || isFetching.value) return
  isFetching.value = true
  try {
    await editorStore.fetchBookTotalWords(props.bookName, { force })
  } finally {
    isFetching.value = false
  }
}

function prepareChapterBaseline(initialCount) {
  const sanitized = sanitizeWordCount(initialCount)
  editorStore.setChapterWordBaseline(sanitized)
  resetSnapshots(sanitized)
}

watch(
  () => props.bookName,
  async (name, prevName) => {
    if (!name) return
    const force = name !== prevName
    await loadBookTotalWords(force)
  },
  { immediate: true }
)

watch(
  () => editorStore.file,
  (currentFile) => {
    if (currentFile?.type === 'chapter') {
      needBaselineReset.value = true
    } else {
      needBaselineReset.value = false
      wordSnapshots.value = []
    }
  },
  { immediate: true }
)

watch(
  () => props.contentWordCount,
  (newCount, oldCount) => {
    if (props.fileType !== 'chapter') return
    const sanitizedNew = sanitizeWordCount(newCount)
    const sanitizedOld = sanitizeWordCount(oldCount)

    if (needBaselineReset.value || editorStore.isInitializing) {
      prepareChapterBaseline(sanitizedNew)
      if (!editorStore.isInitializing) {
        needBaselineReset.value = false
        if (sanitizedNew !== sanitizedOld) {
          recordSnapshot(sanitizedNew)
        }
      }
      return
    }

    if (sanitizedNew === sanitizedOld) {
      return
    }

    recordSnapshot(sanitizedNew)
  },
  { immediate: true }
)

watch(
  () => editorStore.bookTotalWords,
  (total) => {
    emit('update-book-words', sanitizeWordCount(total))
  },
  { immediate: true }
)

// 提供给父组件调用的刷新方法
defineExpose({
  loadBookTotalWords
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
