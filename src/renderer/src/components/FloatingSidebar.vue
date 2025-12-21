<template>
  <Transition name="sidebar-slide">
    <div
      v-if="visible"
      ref="sidebarWrapperRef"
      class="floating-sidebar"
      :class="{ 'dragging-component': draggingComponent }"
      :style="{ top: positionY + 'px' }"
      @mousedown="handleWrapperMouseDown"
      @touchstart.prevent="handleWrapperMouseDown"
    >
      <slot :dragging-disabled="draggingComponent"></slot>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: true
  },
  minTopDistance: {
    type: Number,
    default: 0
  },
  minBottomDistance: {
    type: Number,
    default: 0
  },
  // 可拖拽区域的选择器，用于排除某些元素不触发拖拽
  draggableSelector: {
    type: String,
    default: '.map-slider'
  }
})

const draggingComponent = ref(false)
const sidebarWrapperRef = ref(null)

// 组件位置
const positionY = ref(0)
// 标记是否已经初始化过位置（用于区分首次显示和后续显示）
const isPositionInitialized = ref(false)

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

// ========== 拖拽整个组件 ==========
function handleWrapperMouseDown(e) {
  // 如果点击的是可拖拽区域内的元素，不处理（让子组件处理）
  const draggableElement = e.target.closest(props.draggableSelector)
  if (draggableElement) {
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

    if (!sidebarWrapperRef.value) {
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
      if (!isDragging || !draggingComponent.value || !sidebarWrapperRef.value) {
        return
      }

      const currentY = getClientY(moveEvent)
      const deltaY = currentY - startY
      let newY = startPositionY + deltaY

      // 计算上下限（考虑最小距离限制）
      const componentHeight = sidebarWrapperRef.value.offsetHeight
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

// 初始化位置（仅在首次显示时调用）
function initializePosition() {
  if (isPositionInitialized.value) {
    return // 已经初始化过，不再重置位置
  }
  nextTick(() => {
    if (sidebarWrapperRef.value) {
      const rect = sidebarWrapperRef.value.getBoundingClientRect()
      positionY.value = window.innerHeight / 2 - rect.height / 2
      isPositionInitialized.value = true
    }
  })
}

// 监听 visible 变化，仅在首次显示时初始化位置
watch(
  () => props.visible,
  (newVal) => {
    if (newVal && !isPositionInitialized.value) {
      initializePosition()
    }
  },
  { immediate: true }
)

// 组件挂载时也尝试初始化位置
onMounted(() => {
  if (props.visible) {
    initializePosition()
  }
})
</script>

<style lang="scss" scoped>
// 侧边栏过渡动画
.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.sidebar-slide-enter-from {
  opacity: 0;
  transform: translateX(-100%);
}

.sidebar-slide-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.sidebar-slide-leave-from {
  opacity: 1;
  transform: translateX(0);
}

.sidebar-slide-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}

.floating-sidebar {
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
