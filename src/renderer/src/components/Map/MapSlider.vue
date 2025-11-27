<template>
  <div
    v-if="visible"
    ref="sliderWrapperRef"
    class="map-slider"
    :class="{ 'dragging-component': draggingComponent }"
    :style="{ top: positionY + 'px' }"
    @mousedown="handleWrapperMouseDown"
    @touchstart.prevent="handleWrapperMouseDown"
  >
    <MapSliderItem
      :model-value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :label="label"
      :dragging-disabled="draggingComponent"
      @update:model-value="handleValueUpdate"
      @change="handleValueChange"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import MapSliderItem from './MapSliderItem.vue'

const props = defineProps({
  modelValue: {
    type: Number,
    required: true
  },
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    default: 100
  },
  step: {
    type: Number,
    default: 1
  },
  visible: {
    type: Boolean,
    default: true
  },
  label: {
    type: String,
    default: ''
  },
  minTopDistance: {
    type: Number,
    default: 0
  },
  minBottomDistance: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const draggingComponent = ref(false)
const sliderWrapperRef = ref(null)

// 组件位置
const positionY = ref(0)

// ========== 常量定义 ==========
const COMPONENT_THROTTLE_MS = 16 // 约 60fps

// ========== 工具函数 ==========
// 获取客户端Y坐标（处理 touch 和 mouse 事件）
function getClientY(e) {
  return e.touches ? e.touches[0].clientY : e.clientY
}

// 添加拖拽事件监听器
function addDragListeners(handleMove, handleEnd) {
  document.addEventListener('mousemove', handleMove, { passive: false, capture: true })
  document.addEventListener('mouseup', handleEnd, { capture: true })
  document.addEventListener('touchmove', handleMove, { passive: false, capture: true })
  document.addEventListener('touchend', handleEnd, { capture: true })
}

// 移除拖拽事件监听器
function removeDragListeners(handleMove, handleEnd) {
  document.removeEventListener('mousemove', handleMove, { capture: true })
  document.removeEventListener('mouseup', handleEnd, { capture: true })
  document.removeEventListener('touchmove', handleMove, { capture: true })
  document.removeEventListener('touchend', handleEnd, { capture: true })
}

// 处理值更新
function handleValueUpdate(value) {
  emit('update:modelValue', value)
}

// 处理值变化
function handleValueChange(value) {
  emit('change', value)
}

// ========== 拖拽整个组件 ==========
function handleWrapperMouseDown(e) {
  // 如果点击的是 slider-container 或其子元素，不处理
  const sliderContainer = e.target.closest('.slider-container')
  if (sliderContainer) {
    return
  }

  e.preventDefault()
  e.stopPropagation()

  draggingComponent.value = true
  const startY = getClientY(e)
  const startPositionY = positionY.value

  let rafId = null
  let lastUpdateTime = 0
  let isDragging = true // 标志位，确保拖拽状态持续

  const handleMove = (moveEvent) => {
    // 如果不在拖拽状态，直接返回
    if (!isDragging || !draggingComponent.value) {
      return
    }

    moveEvent.preventDefault()
    moveEvent.stopPropagation() // 阻止事件冒泡，避免触发其他元素的事件

    if (!sliderWrapperRef.value) {
      return
    }

    const now = Date.now()
    if (now - lastUpdateTime < COMPONENT_THROTTLE_MS && rafId !== null) {
      return // 节流，避免过度更新
    }
    lastUpdateTime = now

    if (rafId) {
      cancelAnimationFrame(rafId)
    }

    rafId = requestAnimationFrame(() => {
      // 再次检查拖拽状态，确保在 RAF 回调执行时仍然在拖拽
      if (!isDragging || !draggingComponent.value || !sliderWrapperRef.value) {
        return
      }

      const currentY = getClientY(moveEvent)
      const deltaY = currentY - startY
      let newY = startPositionY + deltaY

      // 计算上下限（考虑最小距离限制）
      const componentHeight = sliderWrapperRef.value.offsetHeight
      const minY = props.minTopDistance // 距离顶部的最小距离
      const maxY = window.innerHeight - componentHeight - props.minBottomDistance // 距离底部的最小距离

      newY = Math.max(minY, Math.min(maxY, newY))
      positionY.value = newY
      rafId = null
    })
  }

  const handleEnd = () => {
    // 确保在所有情况下都能正确结束拖拽
    isDragging = false
    draggingComponent.value = false

    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }

    // 移除所有事件监听器
    removeDragListeners(handleMove, handleEnd)
  }

  // 注意：不使用 mouseleave，因为鼠标离开组件时用户可能还在拖拽（鼠标按钮还在按下状态）
  // 拖拽应该只在 mouseup 或 touchend 时结束
  addDragListeners(handleMove, handleEnd)
}

// 初始化位置
onMounted(() => {
  if (sliderWrapperRef.value) {
    const rect = sliderWrapperRef.value.getBoundingClientRect()
    positionY.value = window.innerHeight / 2 - rect.height / 2
  }
})
</script>

<style lang="scss" scoped>
.map-slider {
  position: fixed;
  left: 0;
  z-index: 1001;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  border-radius: 0 12px 12px 0;
  padding: 12px 8px;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.3);
  cursor: move;
  display: flex;
  flex-direction: column;
  gap: 20px;
  // 拖拽组件时禁用过渡，确保立即响应
  &.dragging-component {
    transition: none;
    will-change: top;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }
}
</style>
