<template>
  <div v-if="visible" class="search-panel" :style="panelStyle">
    <!-- 搜索区域 -->
    <div class="search-section">
      <div class="search-input-wrapper">
        <el-input
          ref="searchInputRef"
          v-model="searchText"
          placeholder="查找"
          size="small"
          class="search-input"
          @keydown.enter="handleSearchEnter"
          @keydown.esc="closePanel"
          @input="onSearchInput"
        />
      </div>

      <div class="search-options">
        <el-button
          :type="matchCase ? 'primary' : 'default'"
          size="small"
          class="option-btn"
          title="区分大小写"
          @click="toggleMatchCase"
        >
          Aa
        </el-button>
        <el-button
          :type="wholeWord ? 'primary' : 'default'"
          size="small"
          class="option-btn"
          title="全字匹配"
          @click="toggleWholeWord"
        >
          ab
        </el-button>
        <el-button
          :type="useRegex ? 'primary' : 'default'"
          size="small"
          class="option-btn"
          title="正则表达式"
          @click="toggleRegex"
        >
          .*
        </el-button>
        <el-button size="small" class="option-btn" title="手动搜索" @click="performSearch">
          搜索
        </el-button>
      </div>

      <div class="search-results">
        <span v-if="totalMatches > 0" class="results-text">
          {{ currentMatchIndex + 1 }}/{{ totalMatches }}
        </span>
        <span v-else class="results-text no-results">无结果</span>
      </div>

      <div class="search-navigation">
        <el-button
          size="small"
          class="nav-btn"
          :disabled="totalMatches === 0"
          title="上一个"
          @click="findPrevious"
        >
          <el-icon><ArrowUp /></el-icon>
        </el-button>
        <el-button
          size="small"
          class="nav-btn"
          :disabled="totalMatches === 0"
          title="下一个"
          @click="findNext"
        >
          <el-icon><ArrowDown /></el-icon>
        </el-button>
      </div>

      <el-button size="small" class="close-btn" title="关闭" @click="closePanel">
        <el-icon><Close /></el-icon>
      </el-button>
    </div>

    <!-- 替换区域 -->
    <div class="replace-section">
      <div class="replace-input-wrapper">
        <el-input
          v-model="replaceText"
          placeholder="替换"
          size="small"
          class="replace-input"
          @keydown.enter="replaceCurrent"
        />
      </div>

      <div class="replace-options">
        <el-button
          size="small"
          class="option-btn"
          :disabled="totalMatches === 0"
          title="替换当前"
          @click="replaceCurrent"
        >
          替换
        </el-button>
        <el-button
          size="small"
          class="option-btn"
          :disabled="totalMatches === 0"
          title="全部替换"
          @click="replaceAll"
        >
          全部替换
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowUp, ArrowDown, Close } from '@element-plus/icons-vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  editor: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

// 搜索相关
const searchText = ref('')
const replaceText = ref('')
const searchInputRef = ref(null)
let searchTimer = null

// 搜索选项
const matchCase = ref(false)
const wholeWord = ref(false)
const useRegex = ref(false)

// 搜索结果
const totalMatches = ref(0)
const currentMatchIndex = ref(-1)
const matches = ref([])

// 面板位置
const panelStyle = computed(() => ({
  top: '20px',
  right: '20px'
}))

// 监听搜索文本变化
watch(searchText, (newValue) => {
  if (newValue && newValue.trim()) {
    performSearch()
  } else {
    clearSearch()
  }
})

// 监听可见性变化，自动聚焦搜索框并清空内容
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      nextTick(() => {
        // 清空搜索和替换内容
        searchText.value = ''
        replaceText.value = ''

        // 清空搜索结果
        clearSearch()

        // 聚焦搜索框
        searchInputRef.value?.focus()
      })
    }
  }
)

// 执行搜索
function performSearch() {
  if (!props.editor) {
    ElMessage.error('编辑器未初始化')
    return
  }

  if (!searchText.value || !searchText.value.trim()) {
    clearSearch()
    return
  }

  try {
    const foundMatches = findTextMatches()

    matches.value = foundMatches
    totalMatches.value = foundMatches.length
    currentMatchIndex.value = foundMatches.length > 0 ? 0 : -1

    // 高亮第一个匹配项
    if (foundMatches.length > 0) {
      highlightMatch(foundMatches[0])
      highlightAllMatches() // 高亮所有匹配项
      addVisualHighlights() // 添加视觉高亮
      ElMessage.success(`找到 ${totalMatches.value} 个匹配项`)
    } else {
      ElMessage.info('没有找到匹配项')
    }
  } catch {
    ElMessage.error('搜索表达式错误')
    clearSearch()
  }
}

// 查找文本匹配项
function findTextMatches() {
  if (!props.editor) return []

  // 获取编辑器文档
  const { state } = props.editor
  const { doc } = state

  let searchRegex
  try {
    if (useRegex.value) {
      // 正则表达式模式
      let flags = 'g'
      if (!matchCase.value) flags += 'i'
      searchRegex = new RegExp(searchText.value, flags)
    } else {
      // 普通文本模式
      let flags = 'g'
      if (!matchCase.value) flags += 'i'
      let pattern = escapeRegExp(searchText.value)
      if (wholeWord.value) {
        pattern = `\\b${pattern}\\b`
      }
      searchRegex = new RegExp(pattern, flags)
    }
  } catch {
    throw new Error('无效的搜索表达式')
  }

  // 在文档中搜索
  const foundMatches = []

  // 遍历文档中的所有文本节点
  doc.descendants((node, pos) => {
    if (node.isText) {
      const text = node.text
      let match

      // 重置正则表达式的lastIndex
      searchRegex.lastIndex = 0

      while ((match = searchRegex.exec(text)) !== null) {
        const matchInfo = {
          from: pos + match.index,
          to: pos + match.index + match[0].length,
          text: match[0],
          length: match[0].length
        }

        foundMatches.push(matchInfo)
      }
    }
  })

  return foundMatches
}

// 处理搜索框输入
function onSearchInput() {
  if (searchText.value && searchText.value.trim()) {
    // 延迟搜索，避免频繁触发
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      performSearch()
    }, 300)
  } else {
    clearSearch()
  }
}

// 处理搜索框回车键
function handleSearchEnter() {
  if (searchText.value && searchText.value.trim()) {
    if (totalMatches.value > 0) {
      // 如果有搜索结果，查找下一个
      findNext()
    } else {
      // 如果没有搜索结果，重新执行搜索
      performSearch()
    }
  }
}

// 高亮匹配项
function highlightMatch(match) {
  if (!props.editor || !match) return

  // 确保编辑器获得焦点
  props.editor.commands.focus()

  // 设置选择范围到当前匹配项
  props.editor.commands.setTextSelection({
    from: match.from,
    to: match.to
  })

  // 滚动到匹配位置
  props.editor.commands.scrollIntoView()
}

// 添加所有匹配项的高亮标记
function highlightAllMatches() {
  if (!props.editor || matches.value.length === 0) return

  // 这个函数现在主要用于占位，实际高亮由addVisualHighlights处理
}

// 为所有匹配项添加视觉高亮
function addVisualHighlights() {
  if (!props.editor || matches.value.length === 0) return

  // 清除之前的高亮
  clearVisualHighlights()

  // 为每个匹配项添加高亮标记
  matches.value.forEach((match, index) => {
    const isCurrent = index === currentMatchIndex.value

    // 使用Tiptap的setMark命令添加高亮
    props.editor.commands.setTextSelection({
      from: match.from,
      to: match.to
    })

    // 添加高亮标记，使用highlight扩展
    props.editor.commands.setHighlight({
      color: isCurrent ? '#409eff' : '#ffeb3b'
    })
  })

  // 恢复当前匹配项的选择
  if (currentMatchIndex.value >= 0 && currentMatchIndex.value < matches.value.length) {
    highlightMatch(matches.value[currentMatchIndex.value])
  }
}

// 清除视觉高亮
function clearVisualHighlights() {
  if (!props.editor) return

  // 选择整个文档
  props.editor.commands.selectAll()

  // 移除所有高亮标记
  props.editor.commands.unsetHighlight()

  // 清除选择
  props.editor.commands.setTextSelection(0)
}

// 查找下一个
function findNext() {
  if (totalMatches.value === 0) return

  currentMatchIndex.value = (currentMatchIndex.value + 1) % totalMatches.value
  highlightMatch(matches.value[currentMatchIndex.value])

  // 重新应用所有高亮以更新当前项样式
  addVisualHighlights()
}

// 查找上一个
function findPrevious() {
  if (totalMatches.value === 0) return

  currentMatchIndex.value =
    currentMatchIndex.value === 0 ? totalMatches.value - 1 : currentMatchIndex.value - 1
  highlightMatch(matches.value[currentMatchIndex.value])

  // 重新应用所有高亮以更新当前项样式
  addVisualHighlights()
}

// 替换当前
function replaceCurrent() {
  if (totalMatches.value === 0 || currentMatchIndex.value === -1) return

  const currentMatch = matches.value[currentMatchIndex.value]
  if (!currentMatch) return

  // 确保编辑器获得焦点
  props.editor.commands.focus()

  // 使用正确的文档位置设置选择范围
  props.editor.commands.setTextSelection({
    from: currentMatch.from,
    to: currentMatch.to
  })

  // 替换内容
  props.editor.commands.insertContent(replaceText.value || '')

  // 重新搜索（因为内容已改变）
  nextTick(() => {
    performSearch()
    // 如果还有匹配项，保持在当前索引或移动到下一个
    if (matches.value.length > 0) {
      const newIndex = Math.min(currentMatchIndex.value, matches.value.length - 1)
      currentMatchIndex.value = newIndex
      if (matches.value[newIndex]) {
        highlightMatch(matches.value[newIndex])
        // 重新应用所有高亮
        addVisualHighlights()
      }
    }
  })

  ElMessage.success('替换成功')
}

// 全部替换
async function replaceAll() {
  if (totalMatches.value === 0) return

  const replacementCount = totalMatches.value

  // 从后往前替换，避免位置偏移问题
  const sortedMatches = [...matches.value].sort((a, b) => b.from - a.from)

  props.editor.commands.focus()

  // 逐个替换
  for (let i = 0; i < sortedMatches.length; i++) {
    const match = sortedMatches[i]

    // 设置选择范围
    props.editor.commands.setTextSelection({
      from: match.from,
      to: match.to
    })

    // 替换内容
    props.editor.commands.insertContent(replaceText.value || '')

    // 等待一下，确保替换完成
    await new Promise((resolve) => setTimeout(resolve, 10))
  }

  // 清空搜索结果
  clearSearch()

  // 重新搜索以显示新的高亮
  if (searchText.value && searchText.value.trim()) {
    nextTick(() => {
      performSearch()
    })
  }

  ElMessage.success(`已替换 ${replacementCount} 处`)
}

// 清空搜索
function clearSearch() {
  // 清除视觉高亮
  clearVisualHighlights()

  // 清空搜索结果
  matches.value = []
  totalMatches.value = 0
  currentMatchIndex.value = -1
}

// 关闭面板
function closePanel() {
  clearSearch()
  emit('close')
}

// 切换选项
function toggleMatchCase() {
  matchCase.value = !matchCase.value
  if (searchText.value) performSearch()
}

function toggleWholeWord() {
  wholeWord.value = !wholeWord.value
  if (searchText.value) performSearch()
}

function toggleRegex() {
  useRegex.value = !useRegex.value
  if (searchText.value) performSearch()
}

// 转义正则表达式特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 键盘快捷键
function handleKeydown(event) {
  if (!props.visible) return

  // Cmd/Ctrl + F: 聚焦搜索框
  if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
    event.preventDefault()
    searchInputRef.value?.focus()
  }

  // Cmd/Ctrl + G: 查找下一个
  if ((event.metaKey || event.ctrlKey) && event.key === 'g') {
    event.preventDefault()
    findNext()
  }

  // Cmd/Ctrl + Shift + G: 查找上一个
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'G') {
    event.preventDefault()
    findPrevious()
  }

  // Cmd/Ctrl + H: 聚焦替换框
  if ((event.metaKey || event.ctrlKey) && event.key === 'h') {
    event.preventDefault()
    // 可以在这里添加聚焦替换框的逻辑，比如添加一个ref引用
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
})
</script>

<style lang="scss" scoped>
.search-panel {
  position: fixed;
  z-index: 1000;
  background: var(--bg-soft);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  min-width: 450px;
  max-width: 600px;
  backdrop-filter: blur(10px);
}

.search-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-soft);
}

.replace-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--bg-mute);
}

.search-input-wrapper,
.replace-input-wrapper {
  flex: 1;
  min-width: 120px;
}

.search-input,
.replace-input {
  :deep(.el-input__wrapper) {
    background: var(--bg-primary);
    border-color: var(--border-color);
    border-radius: 4px;
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--primary-color);
    }

    &.is-focus {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
    }
  }

  :deep(.el-input__inner) {
    color: var(--text-base);

    &::placeholder {
      color: var(--text-muted);
    }
  }
}

.search-options,
.replace-options {
  display: flex;
  gap: 4px;
}

.option-btn {
  padding: 4px 8px;
  font-size: 12px;
  min-width: auto;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:not(.is-primary) {
    background: var(--bg-primary);
    border-color: var(--border-color);
    color: var(--text-base);

    &:hover {
      background: var(--bg-mute);
      border-color: var(--primary-color);
    }
  }

  &.is-primary {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
  }
}

.search-results {
  min-width: 60px;
  text-align: center;
  padding: 0 8px;
}

.results-text {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;

  &.no-results {
    color: var(--text-muted);
  }
}

.search-navigation {
  display: flex;
  gap: 4px;
}

.nav-btn {
  padding: 4px 8px;
  min-width: auto;
  background: var(--bg-primary);
  border-color: var(--border-color);
  color: var(--text-base);
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--bg-mute);
    border-color: var(--primary-color);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.close-btn {
  padding: 4px 8px;
  min-width: auto;
  background: var(--bg-primary);
  border-color: var(--border-color);
  color: var(--text-base);
  border-radius: 4px;
  transition: all 0.2s ease;
}
</style>
