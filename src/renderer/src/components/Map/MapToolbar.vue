<template>
  <div class="map-toolbar">
    <!-- 选择工具组 -->
    <el-tooltip content="移动 (H)" placement="bottom" :show-after="2000">
      <div
        :class="['tool-btn', modelValue === 'move' ? 'active' : '']"
        @click="handleToolSelect('move')"
      >
        <SvgIcon name="hand" :size="iconSize" />
      </div>
    </el-tooltip>
    <el-tooltip content="选框 (V)" placement="bottom" :show-after="2000">
      <div
        :class="['tool-btn', modelValue === 'select' ? 'active' : '']"
        @click="handleToolSelect('select')"
      >
        <SvgIcon name="xuanze" :size="iconSize" />
      </div>
    </el-tooltip>
    <el-divider direction="vertical" />

    <!-- 绘图工具组 -->
    <el-tooltip content="背景 (G)" placement="bottom" :show-after="2000">
      <div
        :class="['tool-btn', modelValue === 'background' ? 'active' : '']"
        @click="handleToolSelect('background')"
      >
        <SvgIcon name="background" :size="iconSize" />
      </div>
    </el-tooltip>
    <el-tooltip content="画笔 (P)" placement="bottom" :show-after="2000">
      <div
        :class="['tool-btn', modelValue === 'pencil' ? 'active' : '']"
        @click="handleToolSelect('pencil')"
      >
        <SvgIcon name="pencil" :size="iconSize" />
      </div>
    </el-tooltip>
    <el-tooltip content="橡皮擦 (E)" placement="bottom" :show-after="2000">
      <div
        :class="['tool-btn', modelValue === 'eraser' ? 'active' : '']"
        @click="handleToolSelect('eraser')"
      >
        <SvgIcon name="eraser" :size="iconSize" />
      </div>
    </el-tooltip>
    <div class="shape-tool-btn-wrapper">
      <el-tooltip content="形状 (S)" placement="bottom" :show-after="2000">
        <div
          :class="['tool-btn', modelValue === 'shape' ? 'active' : '']"
          @click.stop="handleShapeToolClick"
        >
          <SvgIcon :name="currentShapeIcon" :size="iconSize" />
        </div>
      </el-tooltip>
      <!-- 图形工具弹出层 -->
      <ShapeToolPanel
        :model-value="shapeToolType"
        :visible="shapeToolPanelVisible"
        @update:model-value="handleShapeTypeChange"
        @update:visible="shapeToolPanelVisible = $event"
      />
    </div>
    <el-tooltip content="油漆桶 (B)" placement="bottom" :show-after="2000">
      <div
        :class="['tool-btn', modelValue === 'bucket' ? 'active' : '']"
        @click="handleToolSelect('bucket')"
      >
        <SvgIcon name="bucket" :size="iconSize" />
      </div>
    </el-tooltip>
    <el-tooltip content="文字 (T)" placement="bottom" :show-after="2000">
      <div
        :class="['tool-btn', modelValue === 'text' ? 'active' : '']"
        @click="handleToolSelect('text')"
      >
        <SvgIcon name="text" :size="iconSize" />
      </div>
    </el-tooltip>

    <!-- 资源工具 -->
    <div class="resource-tool-btn-wrapper">
      <el-tooltip content="资源 (R)" placement="bottom" :show-after="2000">
        <div
          :class="['tool-btn', resourcePanelVisible ? 'active' : '']"
          @click.stop="handleResourceToolClick"
        >
          <SvgIcon name="resource" :size="iconSize" />
        </div>
      </el-tooltip>
      <!-- 资源工具弹出层 -->
      <ResourceToolPanel
        :visible="resourcePanelVisible"
        @resource-select="handleResourceSelect"
        @resource-mousedown="handleResourceMouseDown"
        @update:visible="resourcePanelVisible = $event"
      />
    </div>

    <el-divider direction="vertical" />

    <!-- 操作工具组 -->
    <el-tooltip content="清空画板" placement="bottom" :show-after="2000">
      <div class="tool-btn" @click="handleClear">
        <SvgIcon name="clear" :size="iconSize" />
      </div>
    </el-tooltip>
    <el-divider direction="vertical" />
    <el-tooltip content="保存" placement="bottom" :show-after="2000">
      <div class="tool-btn" @click="handleSaveMap">
        <SvgIcon name="save" :size="iconSize" />
      </div>
    </el-tooltip>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import ShapeToolPanel from './ShapeToolPanel.vue'
import ResourceToolPanel from './ResourceToolPanel.vue'

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  shapeToolType: {
    type: String,
    default: 'rect'
  },
  shapeToolRoundness: {
    type: String,
    default: 'round'
  }
})

const iconSize = 18

const emit = defineEmits([
  'update:modelValue',
  'clear',
  'resource-select',
  'resource-mousedown',
  'save-map',
  'shape-type-change',
  'roundness-change'
])

const resourcePanelVisible = ref(false)
const shapeToolPanelVisible = ref(false)

// 根据选择的图形类型显示对应的图标
const shapeIconMap = {
  line: 'line',
  circle: 'circle',
  rect: 'rect',
  'rounded-rect': 'rounded-rect',
  star: 'star',
  arrow: 'right-arrow'
}

const currentShapeIcon = computed(() => {
  return shapeIconMap[props.shapeToolType] || 'polygon'
})

// 当工具切换为非shape时，隐藏弹出层
watch(
  () => props.modelValue,
  (newTool) => {
    if (newTool !== 'shape') {
      shapeToolPanelVisible.value = false
    }
    if (newTool !== 'resource') {
      resourcePanelVisible.value = false
    }
  }
)

function handleToolSelect(tool) {
  emit('update:modelValue', tool)
}

function handleShapeToolClick() {
  emit('update:modelValue', 'shape')
  shapeToolPanelVisible.value = !shapeToolPanelVisible.value
}

function handleResourceToolClick() {
  emit('update:modelValue', 'resource')
  resourcePanelVisible.value = !resourcePanelVisible.value
}

function handleShapeTypeChange(type) {
  emit('shape-type-change', type)
  // 选择图形后关闭弹出层
  shapeToolPanelVisible.value = false
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

  .shape-tool-btn-wrapper,
  .resource-tool-btn-wrapper {
    position: relative;
  }
}
</style>
