<template>
  <div class="editor-progress">
    <el-progress
      :percentage="progressPercentage"
      :show-text="false"
      :stroke-width="8"
      :color="getProgressColor"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentWords: {
    type: Number,
    default: 0
  },
  targetWords: {
    type: Number,
    default: 2000
  }
})

// 计算进度百分比
const progressPercentage = computed(() => {
  if (props.targetWords <= 0) return 0
  const percentage = (props.currentWords / props.targetWords) * 100
  return Math.min(percentage, 100) // 最多显示100%
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
</script>

<style lang="scss" scoped>
.editor-progress {
  width: 100%;
  padding: 8px 15px;
  background-color: var(--bg-soft);
  border-top: 1px solid var(--border-color);
}
</style>
