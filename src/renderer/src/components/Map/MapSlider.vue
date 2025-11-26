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
    <!-- 容器 -->
    <div
      class="slider-container"
      :class="{ 'dragging-disabled': draggingComponent }"
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
      <div v-if="showValue" class="slider-value">{{ displayValue }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'

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
  showValue: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const dragging = ref(false)
const draggingComponent = ref(false)
const trackRef = ref(null)
const thumbRef = ref(null)
const sliderWrapperRef = ref(null)

// 组件位置
const positionY = ref(0)

// 拖拽时的直接位置（用于覆盖 computed 样式）
const dragOffset = ref(null)

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

  const trackHeight = trackRef.value.offsetHeight
  const thumbHeight = 16
  const maxOffset = trackHeight - thumbHeight
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

// 处理 slider-container 的 mousedown 事件
function handleContainerMouseDown(e) {
  // 如果正在拖拽组件，阻止容器的事件处理
  if (draggingComponent.value) {
    e.preventDefault()
    e.stopPropagation()
    return
  }
  // 否则正常处理（阻止事件冒泡到 wrapper）
  e.stopPropagation()
}

// ========== 第一步：拖拽整个组件 ==========
function handleWrapperMouseDown(e) {
  // 如果点击的是 slider-container 或其子元素，不处理
  const sliderContainer = e.target.closest('.slider-container')
  if (sliderContainer) {
    return
  }

  e.preventDefault()
  e.stopPropagation()

  draggingComponent.value = true
  const startY = e.touches ? e.touches[0].clientY : e.clientY
  const startPositionY = positionY.value

  let rafId = null
  let lastUpdateTime = 0
  const throttleMs = 16 // 约 60fps
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
    if (now - lastUpdateTime < throttleMs && rafId !== null) {
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

      const currentY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY
      const deltaY = currentY - startY
      let newY = startPositionY + deltaY

      // 计算上下限
      const componentHeight = sliderWrapperRef.value.offsetHeight
      const minY = 0 // 上限：不能超出屏幕顶部
      const maxY = window.innerHeight - componentHeight // 下限：不能超出屏幕底部

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
    document.removeEventListener('mousemove', handleMove, { capture: true })
    document.removeEventListener('mouseup', handleEnd, { capture: true })
    document.removeEventListener('touchmove', handleMove, { capture: true })
    document.removeEventListener('touchend', handleEnd, { capture: true })
  }

  // 注意：不使用 mouseleave，因为鼠标离开组件时用户可能还在拖拽（鼠标按钮还在按下状态）
  // 拖拽应该只在 mouseup 或 touchend 时结束
  document.addEventListener('mousemove', handleMove, { passive: false, capture: true })
  document.addEventListener('mouseup', handleEnd, { capture: true })
  document.addEventListener('touchmove', handleMove, { passive: false, capture: true })
  document.addEventListener('touchend', handleEnd, { capture: true })
}

// ========== 第二步：滑块在轨道内拖拽 ==========
function handleThumbMouseDown(e) {
  e.preventDefault()
  e.stopPropagation()
  dragging.value = true
  dragOffset.value = null

  if (!trackRef.value || !thumbRef.value) {
    dragging.value = false
    return
  }

  const thumbHeight = 16
  const initialThumbRect = thumbRef.value.getBoundingClientRect()
  const initialMouseY = e.touches ? e.touches[0].clientY : e.clientY
  // 计算鼠标相对于滑块中心的偏移
  const initialThumbCenterY = initialThumbRect.top + initialThumbRect.height / 2
  const offsetFromThumbCenter = initialMouseY - initialThumbCenterY

  let rafId = null
  let lastUpdateTime = 0
  const throttleMs = 8 // 约 120fps，更流畅
  let lastDragOffset = null // 保存最后一次的拖拽偏移量

  const handleMove = (moveEvent) => {
    moveEvent.preventDefault()
    moveEvent.stopPropagation()

    if (!trackRef.value || !thumbRef.value) {
      return
    }

    const now = Date.now()
    if (now - lastUpdateTime < throttleMs && rafId !== null) {
      return // 节流，避免过度更新
    }
    lastUpdateTime = now

    if (rafId) {
      cancelAnimationFrame(rafId)
    }

    rafId = requestAnimationFrame(() => {
      // 每次移动时重新获取轨道位置（因为组件可能移动了）
      const trackRect = trackRef.value.getBoundingClientRect()
      const trackHeight = trackRect.height
      const trackTop = trackRect.top
      const trackBottom = trackRect.bottom

      const currentY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY
      // 计算新的滑块中心位置（基于鼠标位置和初始偏移）
      let newThumbCenterY = currentY - offsetFromThumbCenter

      // 限制在轨道范围内（考虑滑块高度的一半）
      const minCenterY = trackTop + thumbHeight / 2
      const maxCenterY = trackBottom - thumbHeight / 2
      newThumbCenterY = Math.max(minCenterY, Math.min(maxCenterY, newThumbCenterY))

      // 计算偏移量（从轨道底部开始，向上为正）
      // 滑块底部距离轨道底部的距离
      const thumbBottomY = newThumbCenterY + thumbHeight / 2
      const offsetFromBottom = trackBottom - thumbBottomY
      const clampedOffset = Math.max(0, Math.min(trackHeight - thumbHeight, offsetFromBottom))

      // 更新拖拽偏移量（这会触发 computed 更新）
      dragOffset.value = clampedOffset
      lastDragOffset = clampedOffset // 保存最后一次的偏移量

      // 计算对应的值（底部是最小值，顶部是最大值）
      const maxOffset = trackHeight - thumbHeight
      // clampedOffset = 0 时（底部）对应 min，clampedOffset = maxOffset 时（顶部）对应 max
      const percentage = maxOffset > 0 ? clampedOffset / maxOffset : 0
      const range = props.max - props.min
      let newValue = props.min + percentage * range

      // 对齐到步长
      newValue = Math.round(newValue / props.step) * props.step
      newValue = Math.max(props.min, Math.min(props.max, newValue))

      // 更新值
      emit('update:modelValue', newValue)
      emit('change', newValue)

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
    document.removeEventListener('mousemove', handleMove, { capture: true })
    document.removeEventListener('mouseup', handleEnd, { capture: true })
    document.removeEventListener('touchmove', handleMove, { capture: true })
    document.removeEventListener('touchend', handleEnd, { capture: true })

    // 确保最终值已经计算并更新
    // 使用 lastDragOffset 或 dragOffset.value，确保使用最新的位置
    const finalOffset = lastDragOffset !== null ? lastDragOffset : dragOffset.value

    if (finalOffset !== null && trackRef.value) {
      const trackHeight = trackRef.value.offsetHeight
      const thumbHeight = 16
      const maxOffset = trackHeight - thumbHeight
      const clampedOffset = finalOffset

      // 计算最终值（底部是最小值，顶部是最大值）
      // clampedOffset = 0 时（底部）对应 min，clampedOffset = maxOffset 时（顶部）对应 max
      const percentage = maxOffset > 0 ? clampedOffset / maxOffset : 0
      const range = props.max - props.min
      let finalValue = props.min + percentage * range

      // 对齐到步长
      finalValue = Math.round(finalValue / props.step) * props.step
      finalValue = Math.max(props.min, Math.min(props.max, finalValue))

      // 同步更新最终值（确保值正确）
      emit('update:modelValue', finalValue)
      emit('change', finalValue)

      // 等待 Vue 更新完成后再清除拖拽状态，避免闪跳
      nextTick(() => {
        dragging.value = false
        dragOffset.value = null
        lastDragOffset = null
      })
    } else {
      // 如果没有有效的偏移量，直接清除状态
      dragging.value = false
      dragOffset.value = null
      lastDragOffset = null
    }
  }

  // 注意：不使用 mouseleave，因为鼠标离开组件时用户可能还在拖拽（鼠标按钮还在按下状态）
  // 拖拽应该只在 mouseup 或 touchend 时结束
  document.addEventListener('mousemove', handleMove, { passive: false, capture: true })
  document.addEventListener('mouseup', handleEnd, { capture: true })
  document.addEventListener('touchmove', handleMove, { passive: false, capture: true })
  document.addEventListener('touchend', handleEnd, { capture: true })
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

  const trackRect = trackRef.value.getBoundingClientRect()
  const trackHeight = trackRect.height
  const trackTop = trackRect.top
  const thumbHeight = 16

  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  const relativeY = clientY - trackTop

  const minOffset = 0
  const maxOffset = trackHeight - thumbHeight
  const clampedOffset = Math.max(minOffset, Math.min(maxOffset, relativeY))

  // 计算对应的值（底部是最小值，顶部是最大值）
  // clampedOffset = 0 时（底部）对应 min，clampedOffset = maxOffset 时（顶部）对应 max
  const percentage = maxOffset > 0 ? clampedOffset / maxOffset : 0
  const range = props.max - props.min
  let newValue = props.min + percentage * range

  newValue = Math.round(newValue / props.step) * props.step
  newValue = Math.max(props.min, Math.min(props.max, newValue))

  emit('update:modelValue', newValue)
  emit('change', newValue)
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
  // 拖拽组件时禁用过渡，确保立即响应
  &.dragging-component {
    transition: none;
    will-change: top;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  .slider-container {
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
    height: 180px;
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
      width: 28px;
      height: 16px;
      background: #ffffff;
      border-radius: 10px;
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

  .slider-value {
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    min-width: 24px;
    padding: 2px 0;
  }
}
</style>
