<template>
  <div
    class="map-slider-item"
    :class="{ 'dragging-disabled': draggingDisabled }"
    @mousedown.stop="handleContainerMouseDown"
    @touchstart.stop="handleContainerMouseDown"
  >
    <!-- 轨道 -->
    <div
      ref="trackRef"
      class="slider-track"
      @mousedown="handleTrackMouseDown"
      @touchstart.prevent="handleTrackMouseDown"
    >
      <!-- 滑块 -->
      <div
        ref="thumbRef"
        class="slider-thumb"
        :class="{ dragging: dragging }"
        :style="thumbStyle"
        @mousedown.stop="handleThumbMouseDown"
        @touchstart.prevent.stop="handleThumbMouseDown"
      ></div>
    </div>
    <!-- 预览区 -->
    <div v-if="showPreview" class="slider-preview">
      <div class="preview-info">
        <span class="preview-info-label">{{ label || '大小' }}</span>
        <span class="preview-info-value">{{ displayValue }}</span>
      </div>
      <div class="preview-main">
        <div class="preview-main-circle" :style="circleStyle"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'

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
  label: {
    type: String,
    default: ''
  },
  draggingDisabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const dragging = ref(false)
const trackRef = ref(null)
const thumbRef = ref(null)

// 拖拽时的直接位置（用于覆盖 computed 样式）
const dragOffset = ref(null)

// 预览区显示状态
const showPreview = ref(false)

// ========== 常量定义 ==========
const THUMB_HEIGHT = 16
const BORDER_OFFSET = 2
const THUMB_THROTTLE_MS = 8 // 约 120fps

// ========== 工具函数 ==========
// 获取客户端Y坐标（处理 touch 和 mouse 事件）
function getClientY(e) {
  return e.touches ? e.touches[0].clientY : e.clientY
}

// 获取轨道尺寸信息
function getTrackInfo(trackElement) {
  const trackRect = trackElement.getBoundingClientRect()
  const trackHeight = trackRect.height - BORDER_OFFSET
  return {
    trackHeight,
    trackTop: trackRect.top,
    trackBottom: trackRect.bottom
  }
}

// 从偏移量计算值
function offsetToValue(offset, trackHeight) {
  const thumbHeight = THUMB_HEIGHT
  const maxOffset = trackHeight - thumbHeight
  const percentage = maxOffset > 0 ? offset / maxOffset : 0
  const range = props.max - props.min
  let value = props.min + percentage * range

  // 对齐到步长
  value = Math.round(value / props.step) * props.step
  value = Math.max(props.min, Math.min(props.max, value))

  return value
}

// 更新值并触发事件
function updateValue(value) {
  emit('update:modelValue', value)
  emit('change', value)
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

// 计算滑块样式
const thumbStyle = computed(() => {
  // 如果正在拖拽，使用直接设置的偏移量
  if (dragging.value && dragOffset.value !== null) {
    return {
      transform: `translateX(-50%) translateY(${-dragOffset.value}px)`,
      bottom: '0px'
    }
  }

  if (!trackRef.value) {
    return { transform: 'translateX(-50%) translateY(0)' }
  }
  const range = props.max - props.min
  if (range === 0) return { transform: 'translateX(-50%) translateY(0)' }

  const percentage = ((props.modelValue - props.min) / range) * 100
  const clampedPercentage = Math.max(0, Math.min(100, percentage))

  const trackHeight = trackRef.value.offsetHeight - BORDER_OFFSET
  const maxOffset = trackHeight - THUMB_HEIGHT
  const offset = (clampedPercentage / 100) * maxOffset

  return {
    transform: `translateX(-50%) translateY(${-offset}px)`,
    bottom: '0px'
  }
})

// 显示值
const displayValue = computed(() => {
  return Math.round(props.modelValue)
})

// 预览区圆形样式
const circleStyle = computed(() => {
  const size = props.modelValue
  return {
    width: `${size}px`,
    height: `${size}px`
  }
})

// 处理 map-slider-item 的 mousedown 事件
function handleContainerMouseDown(e) {
  // 如果正在拖拽组件，阻止容器的事件处理
  if (props.draggingDisabled) {
    e.preventDefault()
    e.stopPropagation()
    return
  }
  // 否则正常处理（阻止事件冒泡到 wrapper）
  e.stopPropagation()
}

// ========== 滑块在轨道内拖拽 ==========
function handleThumbMouseDown(e) {
  e.preventDefault()
  e.stopPropagation()

  // 如果预览区已显示，再次点击时隐藏
  if (showPreview.value) {
    showPreview.value = false
    return
  }

  dragging.value = true
  dragOffset.value = null
  showPreview.value = true // 显示预览区

  if (!trackRef.value || !thumbRef.value) {
    dragging.value = false
    showPreview.value = false
    return
  }

  const initialThumbRect = thumbRef.value.getBoundingClientRect()
  const initialMouseY = getClientY(e)
  // 计算鼠标相对于滑块中心的偏移
  const initialThumbCenterY = initialThumbRect.top + initialThumbRect.height / 2
  const offsetFromThumbCenter = initialMouseY - initialThumbCenterY

  let rafId = null
  let lastUpdateTime = 0
  let lastDragOffset = null // 保存最后一次的拖拽偏移量
  let hasMoved = false // 标记是否发生了移动（用于区分点击和拖拽）

  const handleMove = (moveEvent) => {
    moveEvent.preventDefault()
    moveEvent.stopPropagation()

    // 标记为已移动（拖拽操作）
    hasMoved = true
    // 确保预览区显示（移动时始终显示）
    showPreview.value = true

    if (!trackRef.value || !thumbRef.value) {
      return
    }

    const now = Date.now()
    if (now - lastUpdateTime < THUMB_THROTTLE_MS && rafId !== null) {
      return // 节流，避免过度更新
    }
    lastUpdateTime = now

    if (rafId) {
      cancelAnimationFrame(rafId)
    }

    rafId = requestAnimationFrame(() => {
      // 每次移动时重新获取轨道位置（因为组件可能移动了）
      const { trackHeight, trackTop, trackBottom } = getTrackInfo(trackRef.value)

      const currentY = getClientY(moveEvent)
      // 计算新的滑块中心位置（基于鼠标位置和初始偏移）
      let newThumbCenterY = currentY - offsetFromThumbCenter

      // 限制在轨道范围内（考虑滑块高度的一半）
      const minCenterY = trackTop + THUMB_HEIGHT / 2
      const maxCenterY = trackBottom - THUMB_HEIGHT / 2
      newThumbCenterY = Math.max(minCenterY, Math.min(maxCenterY, newThumbCenterY))

      // 计算偏移量（从轨道底部开始，向上为正）
      // 滑块底部距离轨道底部的距离
      const thumbBottomY = newThumbCenterY + THUMB_HEIGHT / 2
      const offsetFromBottom = trackBottom - thumbBottomY
      const maxOffset = trackHeight - THUMB_HEIGHT
      const clampedOffset = Math.max(0, Math.min(maxOffset, offsetFromBottom))

      // 更新拖拽偏移量（这会触发 computed 更新）
      dragOffset.value = clampedOffset
      lastDragOffset = clampedOffset // 保存最后一次的偏移量

      // 计算对应的值并更新
      const newValue = offsetToValue(clampedOffset, trackHeight)
      updateValue(newValue)

      rafId = null
    })
  }

  const handleEnd = () => {
    // 先取消所有待处理的动画帧
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }

    // 移除事件监听器（先移除，避免在计算过程中触发）
    removeDragListeners(handleMove, handleEnd)

    // 确保最终值已经计算并更新
    // 使用 lastDragOffset 或 dragOffset.value，确保使用最新的位置
    const finalOffset = lastDragOffset !== null ? lastDragOffset : dragOffset.value

    if (finalOffset !== null && trackRef.value) {
      const trackHeight = trackRef.value.offsetHeight - BORDER_OFFSET
      // 计算最终值并更新
      const finalValue = offsetToValue(finalOffset, trackHeight)
      updateValue(finalValue)

      // 等待 Vue 更新完成后再清除拖拽状态，避免闪跳
      nextTick(() => {
        dragging.value = false
        dragOffset.value = null
        lastDragOffset = null
        // 如果发生了移动（拖拽），松开鼠标后隐藏预览区
        // 如果没有移动（点击），保持预览区显示
        if (hasMoved) {
          showPreview.value = false
        }
        hasMoved = false
      })
    } else {
      // 如果没有有效的偏移量，直接清除状态
      dragging.value = false
      dragOffset.value = null
      lastDragOffset = null
      // 如果发生了移动（拖拽），隐藏预览区
      // 如果没有移动（点击），保持预览区显示
      if (hasMoved) {
        showPreview.value = false
      }
      hasMoved = false
    }
  }

  // 注意：不使用 mouseleave，因为鼠标离开组件时用户可能还在拖拽（鼠标按钮还在按下状态）
  // 拖拽应该只在 mouseup 或 touchend 时结束
  addDragListeners(handleMove, handleEnd)
}

// 点击轨道直接跳转
function handleTrackMouseDown(e) {
  if (e.target === thumbRef.value || thumbRef.value?.contains(e.target)) {
    return
  }

  e.preventDefault()
  e.stopPropagation()

  if (!trackRef.value) {
    return
  }

  // 点击轨道时，显示预览区并保持显示
  showPreview.value = true

  const { trackHeight, trackTop, trackBottom } = getTrackInfo(trackRef.value)

  const clientY = getClientY(e)
  // 计算点击位置对应的滑块中心位置
  let targetThumbCenterY = clientY

  // 限制滑块中心在轨道范围内（考虑滑块高度的一半）
  const minCenterY = trackTop + THUMB_HEIGHT / 2
  const maxCenterY = trackBottom - THUMB_HEIGHT / 2
  targetThumbCenterY = Math.max(minCenterY, Math.min(maxCenterY, targetThumbCenterY))

  // 计算偏移量（从轨道底部开始，向上为正）
  // 滑块底部距离轨道底部的距离
  const thumbBottomY = targetThumbCenterY + THUMB_HEIGHT / 2
  const offsetFromBottom = trackBottom - thumbBottomY
  const maxOffset = trackHeight - THUMB_HEIGHT
  const clampedOffset = Math.max(0, Math.min(maxOffset, offsetFromBottom))

  // 计算对应的值并更新
  const newValue = offsetToValue(clampedOffset, trackHeight)
  updateValue(newValue)

  // 点击轨道时，预览区保持显示，不自动隐藏
}
</script>

<style lang="scss" scoped>
.map-slider-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: default;

  // 拖拽组件时，禁用容器的交互，确保拖拽不受影响
  &.dragging-disabled {
    pointer-events: none;
  }
}

.slider-track {
  position: relative;
  width: 30px;
  height: 162px;
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden; // 确保滑块不超出轨道
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.2),
    0 1px 2px rgba(0, 0, 0, 0.1);

  .slider-thumb {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 26px;
    height: 16px;
    background: #ffffff;
    border-radius: 8px;
    cursor: grab;
    z-index: 10;
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.3),
      0 0 0 1px rgba(0, 0, 0, 0.1);
    // 拖拽时禁用过渡，确保立即响应
    transition: none;

    &.dragging {
      cursor: grabbing;
      // 拖拽时确保样式优先级
      will-change: transform;
    }
  }
}

.slider-preview {
  position: absolute;
  right: -130px;
  top: 0;
  width: 120px;
  height: 120px;
  background: rgba(0, 0, 0, 0.9);
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 1002;
  display: flex;
  flex-direction: column;
  gap: 5px;

  .preview-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: #ffffff;
    &-value {
      font-weight: bolder;
      font-size: 14px;
    }
  }

  .preview-main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .preview-main-circle {
    width: 0;
    height: 0;
    background: #ffffff;
    border-radius: 50%;
    transition:
      width 0.1s ease,
      height 0.1s ease;
    flex-shrink: 0;
  }
}
</style>

