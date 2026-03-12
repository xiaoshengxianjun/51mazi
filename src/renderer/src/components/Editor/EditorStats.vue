<template>
  <div class="editor-stats">
    <div class="editor-stats-left">
      <span class="book-word-count">书籍字数：{{ displayedBookWords }}字</span>
      <span class="word-count">章节字数：{{ contentWordCount }}字</span>
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
    return
  }

  const updatedSnapshots = [...snapshots, { timestamp: now, count: sanitized }]
  const oneHourAgo = now - 3600000
  wordSnapshots.value = updatedSnapshots.filter((item) => item.timestamp >= oneHourAgo)
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

watch(
  () => props.bookName,
  async (name, prevName) => {
    if (!name) return
    wordSnapshots.value = []
    const force = name !== prevName
    await loadBookTotalWords(force)
  },
  { immediate: true }
)

watch(
  () => editorStore.bookTotalWords,
  (total) => {
    if (!editorStore.bookWordsLoaded) {
      emit('update-book-words', sanitizeWordCount(total))
      return
    }
    recordSnapshot(total)
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
