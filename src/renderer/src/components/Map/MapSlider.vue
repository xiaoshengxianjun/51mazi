<template>
  <div class="map-slider" :class="{ visible: visible }">
    <div class="slider-container">
      <div
        ref="trackRef"
        class="slider-track"
        @mousedown="handleTrackMouseDown"
        @touchstart.prevent="handleTrackMouseDown"
      >
        <div class="slider-fill" :style="{ height: fillHeight + '%' }"></div>
        <div
          class="slider-thumb"
          :class="{ dragging: dragging }"
          :style="{ bottom: thumbPosition + '%' }"
          @mousedown.stop="handleThumbMouseDown"
          @touchstart.prevent.stop="handleThumbMouseDown"
        ></div>
      </div>
      <div v-if="showValue" class="slider-value">{{ displayValue }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

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
const trackRef = ref(null)

// 计算滑块位置（0-100%）
const thumbPosition = computed(() => {
  const range = props.max - props.min
  if (range === 0) return 0
  return ((props.modelValue - props.min) / range) * 100
})

// 计算填充高度
const fillHeight = computed(() => {
  return 100 - thumbPosition.value
})

// 显示值
const displayValue = computed(() => {
  return Math.round(props.modelValue)
})

// 将鼠标位置转换为值
function getValueFromPosition(clientY) {
  if (!trackRef.value) return props.modelValue
  const rect = trackRef.value.getBoundingClientRect()
  const trackHeight = rect.height
  const y = clientY - rect.top
  const percentage = Math.max(0, Math.min(1, 1 - y / trackHeight)) // 反转：顶部是最大值
  const range = props.max - props.min
  let value = props.min + percentage * range
  // 对齐到步长
  value = Math.round(value / props.step) * props.step
  return Math.max(props.min, Math.min(props.max, value))
}

// 处理轨道鼠标按下
function handleTrackMouseDown(e) {
  e.preventDefault()
  e.stopPropagation()
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  const newValue = getValueFromPosition(clientY)
  emit('update:modelValue', newValue)
  emit('change', newValue)
  dragging.value = true
  startDrag(e)
}

// 处理滑块鼠标按下
function handleThumbMouseDown(e) {
  e.preventDefault()
  e.stopPropagation()
  dragging.value = true
  startDrag(e)
}

// 开始拖拽
function startDrag() {
  const handleMove = (moveEvent) => {
    moveEvent.preventDefault()
    const clientY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY
    const newValue = getValueFromPosition(clientY)
    emit('update:modelValue', newValue)
    emit('change', newValue)
  }

  const handleEnd = () => {
    dragging.value = false
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleEnd)
    document.removeEventListener('mouseleave', handleEnd)
    document.removeEventListener('touchmove', handleMove)
    document.removeEventListener('touchend', handleEnd)
  }

  document.addEventListener('mousemove', handleMove)
  document.addEventListener('mouseup', handleEnd)
  document.addEventListener('mouseleave', handleEnd)
  document.addEventListener('touchmove', handleMove, { passive: false })
  document.addEventListener('touchend', handleEnd)
}
</script>

<style lang="scss" scoped>
.map-slider {
  position: fixed;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1001;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;

  &.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .slider-container {
    border-radius: 8px;
    padding: 5px;
    // box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }

  .slider-track {
    position: relative;
    width: 30px;
    height: 200px;
    background: #e0e0e0;
    border-radius: 4px;
    cursor: pointer;
    overflow: visible;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);

    .slider-fill {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      background: #666666;
      border-radius: 4px;
      transition: height 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    .slider-thumb {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 38px;
      height: 18px;
      background: #000000;
      border: 2px solid #ffffff;
      border-radius: 4px;
      cursor: grab;
      box-shadow:
        0 2px 6px rgba(0, 0, 0, 0.3),
        0 0 0 1px rgba(0, 0, 0, 0.1);
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 10;

      &:hover {
        transform: translateX(-50%) scale(1.08);
        box-shadow:
          0 3px 8px rgba(0, 0, 0, 0.4),
          0 0 0 1px rgba(0, 0, 0, 0.15);
      }

      &.dragging {
        cursor: grabbing;
        transform: translateX(-50%) scale(1.1);
        box-shadow:
          0 4px 10px rgba(0, 0, 0, 0.5),
          0 0 0 1px rgba(0, 0, 0, 0.2);
      }
    }
  }

  .slider-value {
    text-align: center;
    font-size: 12px;
    font-weight: bolder;
    color: #333333;
  }
}
</style>
