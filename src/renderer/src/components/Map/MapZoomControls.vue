<template>
  <div class="map-zoom-controls">
    <!-- 缩放控制器 -->
    <div class="zoom-control">
      <el-button
        :class="['zoom-btn', { disabled: isMinZoom }]"
        text
        :disabled="isMinZoom"
        @click="handleZoomOut"
      >
        <el-icon><Minus /></el-icon>
      </el-button>
      <div class="zoom-value" @click="handleResetZoom">{{ zoomPercentage }}%</div>
      <el-button
        :class="['zoom-btn', { disabled: isMaxZoom }]"
        text
        :disabled="isMaxZoom"
        @click="handleZoomIn"
      >
        <el-icon><Plus /></el-icon>
      </el-button>
    </div>

    <!-- 撤销和回退按钮 -->
    <div class="action-buttons">
      <el-tooltip content="撤销 (Ctrl+Z)" placement="top">
        <div :class="['action-btn', { disabled: !canUndo }]" @click="handleUndo">
          <SvgIcon name="undo" :size="14" />
        </div>
      </el-tooltip>
      <el-tooltip content="回退 (Ctrl+Shift+Z)" placement="top">
        <div :class="['action-btn', { disabled: !canRedo }]" @click="handleRedo">
          <SvgIcon name="redo" :size="14" />
        </div>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Minus, Plus } from '@element-plus/icons-vue'

const props = defineProps({
  scale: {
    type: Number,
    required: true
  },
  minScale: {
    type: Number,
    default: 0.1
  },
  maxScale: {
    type: Number,
    default: 5
  },
  canUndo: {
    type: Boolean,
    default: false
  },
  canRedo: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['zoom-in', 'zoom-out', 'reset-zoom', 'undo', 'redo'])

// 计算缩放百分比
const zoomPercentage = computed(() => {
  return Math.round(props.scale * 100)
})

// 是否达到最小/最大缩放
const isMinZoom = computed(() => {
  return props.scale <= props.minScale
})

const isMaxZoom = computed(() => {
  return props.scale >= props.maxScale
})

// 处理放大
function handleZoomIn() {
  if (!isMaxZoom.value) {
    emit('zoom-in')
  }
}

// 处理缩小
function handleZoomOut() {
  if (!isMinZoom.value) {
    emit('zoom-out')
  }
}

// 处理重置缩放（点击百分比）
function handleResetZoom() {
  emit('reset-zoom')
}

// 处理撤销
function handleUndo() {
  if (props.canUndo) {
    emit('undo')
  }
}

// 处理回退
function handleRedo() {
  if (props.canRedo) {
    emit('redo')
  }
}
</script>

<style lang="scss" scoped>
.map-zoom-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 1000;
}

// 公共容器样式
.zoom-control,
.action-buttons {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  overflow: hidden;
}

// 公共按钮样式
.zoom-btn,
.action-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(.disabled) {
    background-color: rgba(64, 158, 255, 0.1);
  }

  &.disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.zoom-value {
  width: 60px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: #000;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;

  &:hover {
    background-color: rgba(64, 158, 255, 0.1);
  }
}

.action-btn.disabled {
  opacity: 0.5;
}
</style>
