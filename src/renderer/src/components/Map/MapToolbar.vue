<template>
  <div class="map-toolbar">
    <!-- 选择工具组 -->
    <el-tooltip content="移动 (H)" placement="bottom">
      <div
        :class="['tool-btn', modelValue === 'move' ? 'active' : '']"
        @click="handleToolSelect('move')"
      >
        <SvgIcon name="hand" :size="iconSize" />
      </div>
    </el-tooltip>
    <el-tooltip content="选框 (V)" placement="bottom">
      <div
        :class="['tool-btn', modelValue === 'select' ? 'active' : '']"
        @click="handleToolSelect('select')"
      >
        <SvgIcon name="xuanze" :size="iconSize" />
      </div>
    </el-tooltip>
    <el-divider direction="vertical" />

    <!-- 绘图工具组 -->
    <el-tooltip content="背景 (B)" placement="bottom">
      <div
        :class="['tool-btn', modelValue === 'background' ? 'active' : '']"
        @click="handleToolSelect('background')"
      >
        <SvgIcon name="background" :size="iconSize" />
      </div>
    </el-tooltip>
    <el-tooltip content="画笔 (P)" placement="bottom">
      <div
        :class="['tool-btn', modelValue === 'pencil' ? 'active' : '']"
        @click="handleToolSelect('pencil')"
      >
        <SvgIcon name="pencil" :size="iconSize" />
      </div>
    </el-tooltip>
    <el-tooltip content="橡皮擦 (E)" placement="bottom">
      <div
        :class="['tool-btn', modelValue === 'eraser' ? 'active' : '']"
        @click="handleToolSelect('eraser')"
      >
        <SvgIcon name="eraser" :size="iconSize" />
      </div>
    </el-tooltip>
    <el-tooltip content="线条 (L)" placement="bottom">
      <div
        :class="['tool-btn', modelValue === 'line' ? 'active' : '']"
        @click="handleToolSelect('line')"
      >
        <SvgIcon name="line" :size="iconSize" />
      </div>
    </el-tooltip>
    <el-tooltip content="多边形 (G)" placement="bottom">
      <div
        :class="['tool-btn', modelValue === 'rect' ? 'active' : '']"
        @click="handleToolSelect('rect')"
      >
        <SvgIcon name="polygon" :size="iconSize" />
      </div>
    </el-tooltip>
    <el-tooltip content="油漆桶 (B)" placement="bottom">
      <div
        :class="['tool-btn', modelValue === 'bucket' ? 'active' : '']"
        @click="handleToolSelect('bucket')"
      >
        <SvgIcon name="bucket" :size="iconSize" />
      </div>
    </el-tooltip>
    <el-tooltip content="文字 (T)" placement="bottom">
      <div
        :class="['tool-btn', modelValue === 'text' ? 'active' : '']"
        @click="handleToolSelect('text')"
      >
        <SvgIcon name="text" :size="iconSize" />
      </div>
    </el-tooltip>

    <!-- 资源工具 -->
    <el-popover
      v-model:visible="resourcePopoverVisible"
      placement="bottom"
      :width="420"
      trigger="click"
    >
      <template #reference>
        <div
          :class="['tool-btn', resourcePopoverVisible ? 'active' : '']"
          @click="handleToolSelect('resource')"
        >
          <SvgIcon name="resource" :size="iconSize" />
        </div>
      </template>
      <div class="resource-popover">
        <div class="resource-grid">
          <div
            v-for="(resource, index) in resources"
            :key="index"
            class="resource-item"
            @click="handleResourceSelect(resource)"
            @mousedown="handleResourceMouseDown(resource, $event)"
          >
            <img :src="resource.url" :alt="resource.name" />
            <span class="resource-name">{{ resource.name }}</span>
          </div>
        </div>
      </div>
    </el-popover>

    <el-divider direction="vertical" />

    <!-- 操作工具组 -->
    <el-tooltip content="撤销 (Ctrl+Z)" placement="bottom">
      <div :class="['tool-btn', canUndo ? '' : 'disabled']" @click="handleUndo">
        <SvgIcon name="undo" :size="iconSize" />
      </div>
    </el-tooltip>
    <el-tooltip content="回退 (Ctrl+Shift+Z)" placement="bottom">
      <div :class="['tool-btn', canRedo ? '' : 'disabled']" @click="handleRedo">
        <SvgIcon name="redo" :size="iconSize" />
      </div>
    </el-tooltip>
    <el-tooltip content="清空画板" placement="bottom">
      <div class="tool-btn" @click="handleClear">
        <SvgIcon name="clear" :size="iconSize" />
      </div>
    </el-tooltip>
    <el-divider direction="vertical" />
    <el-tooltip content="保存" placement="bottom">
      <div class="tool-btn" @click="handleSaveMap">
        <SvgIcon name="save" :size="iconSize" />
      </div>
    </el-tooltip>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  modelValue: {
    type: String,
    required: true
  },
  canUndo: {
    type: Boolean,
    default: false
  },
  canRedo: {
    type: Boolean,
    default: false
  },
  resources: {
    type: Array,
    default: () => []
  }
})

const iconSize = 18

const emit = defineEmits([
  'update:modelValue',
  'undo',
  'redo',
  'clear',
  'resource-select',
  'resource-mousedown',
  'save-map'
])

const resourcePopoverVisible = ref(false)

function handleToolSelect(tool) {
  emit('update:modelValue', tool)
}

function handleUndo() {
  emit('undo')
}

function handleRedo() {
  emit('redo')
}

function handleClear() {
  emit('clear')
}

function handleResourceSelect(resource) {
  emit('resource-select', resource)
}

function handleResourceMouseDown(resource, event) {
  emit('resource-mousedown', resource, event)
}

function handleSaveMap() {
  emit('save-map')
}
</script>

<style lang="scss" scoped>
.map-toolbar {
  display: flex;
  gap: 5px;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: max-content;
  padding: 5px 10px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  flex-wrap: wrap;

  .tool-btn {
    width: 32px;
    height: 32px;
    cursor: pointer;
    border-radius: 6px;
    padding: 6px;
    color: #000;
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    transition: all 0.3s;

    img {
      width: 100%;
      height: 100%;
      display: block;
    }

    &.active,
    &:hover:not(.disabled) {
      border: 1px solid var(--el-color-primary);
      background-color: rgba(64, 158, 255, 0.1);
    }

    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.resource-popover {
  height: max-content;
  .resource-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 20px;
    .resource-item {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-size: 14px;
      cursor: pointer;
      img {
        width: 100%;
        height: 100%;
        display: block;
      }
    }
  }
}
</style>
