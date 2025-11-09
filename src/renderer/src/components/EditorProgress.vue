<template>
  <div class="editor-progress">
    <div class="progress-wrapper">
      <el-progress
        class="progress-bar"
        :percentage="progressPercentage"
        :show-text="false"
        :stroke-width="8"
        :color="getProgressColor"
      />
      <div class="target-selector">
        <el-dropdown trigger="click" size="small" @command="handleTargetSelect">
          <span class="dropdown-trigger" :class="{ 'is-disabled': isUpdating }">
            目标{{ currentTargetWords }}字
            <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu class="target-dropdown">
              <el-dropdown-item
                v-for="option in targetWordOptions"
                :key="option"
                :command="option"
                :disabled="isUpdating"
              >
                <span>{{ option }} 字</span>
                <el-icon v-if="option === currentTargetWords" class="check-icon">
                  <Check />
                </el-icon>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown, Check } from '@element-plus/icons-vue'
import { useEditorStore } from '@renderer/stores/editor'

const props = defineProps({
  currentWords: {
    type: Number,
    default: 0
  },
  targetWords: {
    type: Number,
    default: 2000
  },
  bookName: {
    type: String,
    default: ''
  }
})

const targetWordOptions = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000]

const editorStore = useEditorStore()
const isUpdating = ref(false)
const previousTargetWords = ref(null)

// 计算进度百分比
const progressPercentage = computed(() => {
  if (props.targetWords <= 0) return 0
  const percentage = (props.currentWords / props.targetWords) * 100
  return Math.min(percentage, 100) // 最多显示100%
})

const currentTargetWords = computed(() => {
  const numeric = Number(props.targetWords)
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : 2000
})

// 根据进度计算颜色（红橙绿渐变）
// Element Plus 的 color 属性支持函数形式，接收 percentage 和 status 参数
function getProgressColor(percentage) {
  if (percentage >= 100) {
    // 达到目标，绿色
    return '#67c23a'
  } else if (percentage >= 50) {
    // 50%-100%：橙色到绿色渐变
    const ratio = (percentage - 50) / 50 // 0-1之间
    const r = Math.round(255 - ratio * 88) // 255 -> 167
    const g = Math.round(140 + ratio * 95) // 140 -> 235
    const b = Math.round(0 + ratio * 58) // 0 -> 58
    return `rgb(${r}, ${g}, ${b})`
  } else {
    // 0-50%：红色到橙色渐变
    const ratio = percentage / 50 // 0-1之间
    const r = 255 // 红色保持255
    const g = Math.round(0 + ratio * 140) // 0 -> 140
    const b = 0 // 保持0
    return `rgb(${r}, ${g}, ${b})`
  }
}

const resolvedBookName = computed(() => props.bookName || editorStore.currentBookName || '')

async function handleTargetSelect(option) {
  const numeric = Number(option)
  if (!Number.isFinite(numeric) || numeric <= 0) return
  if (numeric === currentTargetWords.value || isUpdating.value) return

  isUpdating.value = true
  previousTargetWords.value = currentTargetWords.value

  try {
    editorStore.setChapterTargetWords(numeric)
    const bookName = resolvedBookName.value
    if (bookName) {
      const result = await window.electron.setChapterTargetWords(bookName, numeric)
      if (!result?.success) {
        throw new Error(result?.message || '设置失败')
      }
    }
  } catch (error) {
    const fallback = previousTargetWords.value ?? 2000
    editorStore.setChapterTargetWords(fallback)
    ElMessage.error(error.message || '目标字数更新失败')
  } finally {
    isUpdating.value = false
  }
}
</script>

<style lang="scss" scoped>
.editor-progress {
  width: 100%;
  padding: 4px 15px;
  background-color: var(--bg-soft);
  border-top: 1px solid var(--border-color);

  .progress-wrapper {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .progress-bar {
    flex: 1;
  }

  .target-selector {
    display: flex;
    align-items: center;

    .dropdown-trigger {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 2px 4px;
      border-radius: 12px;
      font-size: 12px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.2s ease;
      color: var(--text-base);

      &:hover {
        background-color: var(--bg-primary);
        border-color: var(--border-color);
      }

      &.is-disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
    }

    .dropdown-icon {
      font-size: 12px;
    }
  }
}

.target-dropdown {
  min-width: 120px;

  .el-dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .check-icon {
    font-size: 14px;
    color: var(--el-color-primary);
  }
}
</style>
