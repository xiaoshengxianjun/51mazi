<template>
  <div class="map-design">
    <!-- 返回按钮 -->
    <div class="back-button-container">
      <el-button text class="back-button" :icon="ArrowLeftBold" @click="handleBack">
        返回
      </el-button>
    </div>

    <!-- 工具栏 -->
    <MapToolbar
      v-model="tool"
      :resources="resources"
      :shape-tool-type="shapeToolType"
      :shape-tool-roundness="shapeToolRoundness"
      @update:model-value="onToolChange"
      @clear="handleClearCanvas"
      @resource-select="selectResource"
      @resource-mousedown="onResourceMouseDown"
      @shape-type-change="handleShapeTypeChange"
      @roundness-change="shapeToolRoundness = $event"
    />

    <!-- 颜色选择器 -->
    <Transition name="color-picker-fade">
      <div v-if="showColorPicker" class="color-picker-container">
        <el-color-picker
          v-model="currentColor"
          :predefine="colorPresets"
          :show-alpha="false"
          size="default"
          @change="handleColorChange"
        />
      </div>
    </Transition>

    <!-- 滑块控制工具 -->
    <FloatingSidebar
      :visible="tool === 'pencil' || tool === 'eraser' || tool === 'shape'"
      :min-top-distance="100"
      :min-bottom-distance="50"
    >
      <template #default="{ draggingDisabled }">
        <MapSlider
          v-model="size"
          :min="sliderConfig.min"
          :max="sliderConfig.max"
          :step="sliderConfig.step"
          :dragging-disabled="draggingDisabled"
          label="大小"
        />
        <MapSlider
          v-if="tool === 'pencil' || tool === 'shape'"
          v-model="opacity"
          :min="opacityConfig.min"
          :max="opacityConfig.max"
          :step="opacityConfig.step"
          :dragging-disabled="draggingDisabled"
          label="透明度"
          preview-type="opacity"
        />
      </template>
    </FloatingSidebar>

    <!-- 画布容器 -->
    <div
      ref="editorContainerRef"
      class="editor-container"
      @wheel="handleWheel"
      @mousedown="handleContainerMouseDown"
      @mousemove="handleContainerMouseMove"
      @mouseup="handleContainerMouseUp"
      @mouseleave="handleContainerMouseUp"
    >
      <div class="canvas-wrap" :style="canvasWrapStyle">
        <!-- 绘制画布 -->
        <canvas
          ref="canvasRef"
          :width="canvasDisplayWidth"
          :height="canvasDisplayHeight"
          class="draw-canvas"
          :style="{ cursor: canvasCursor }"
          @mousedown="handleCanvasMouseDown"
          @mousemove="handleCanvasMouseMove"
          @mouseup="handleCanvasMouseUp"
          @mouseleave="handleCanvasMouseUp"
          @dblclick="handleTextDoubleClick"
          @touchstart.prevent="handleCanvasMouseDown"
          @touchmove.prevent="handleCanvasMouseMove"
          @touchend.prevent="handleCanvasMouseUp"
        ></canvas>

        <!-- 文字输入框 -->
        <div
          v-if="shouldShowTextInput"
          class="text-input-overlay"
          :style="textInputOverlayStyle"
          @mousedown.stop
          @click.stop
        >
          <textarea
            :ref="(el) => (textTool.textInputRef = el)"
            v-model="textInputValue"
            class="text-input"
            placeholder="输入文字..."
            :style="{
              fontSize: (textTool.editingTextElement?.fontSize || 14) + 'px',
              fontFamily: textTool.editingTextElement?.fontFamily || 'Arial',
              color: textTool.editingTextElement?.color || color,
              textAlign: textTool.editingTextElement?.textAlign || 'left',
              lineHeight: textTool.editingTextElement?.lineHeight || 1.2
            }"
            :class="{ 'text-input-editing': tool === 'text' }"
            @input="textTool.handleTextInput"
            @keydown.ctrl.enter="textTool.confirmTextInput"
            @keydown.meta.enter="textTool.confirmTextInput"
            @keydown.esc="textTool.cancelTextInput"
            @mousedown.stop
            @click.stop
          />
        </div>
      </div>
    </div>

    <!-- 缩放控制器和撤销/回退按钮 -->
    <MapZoomControls
      :scale="canvasState.scale.value"
      :min-scale="canvasState.minScale"
      :max-scale="canvasState.maxScale"
      :can-undo="canUndo"
      :can-redo="canRedo"
      @zoom-in="handleZoomIn"
      @zoom-out="handleZoomOut"
      @reset-zoom="handleResetZoom"
      @undo="handleUndo"
      @redo="handleRedo"
    />
  </div>
</template>

<script setup>
import MapToolbar from '@renderer/components/Map/MapToolbar.vue'
import FloatingSidebar from '@renderer/components/FloatingSidebar.vue'
import MapSlider from '@renderer/components/Map/MapSlider.vue'
import MapZoomControls from '@renderer/components/Map/MapZoomControls.vue'
import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeftBold } from '@element-plus/icons-vue'

// 导入 composables
import { useCanvasState } from '@renderer/composables/map/useCanvasState'
import { useCoordinate } from '@renderer/composables/map/useCoordinate'
import { useHistory, HistoryManager } from '@renderer/composables/map/useHistory'
import { useElements } from '@renderer/composables/map/useElements'
import { useRender } from '@renderer/composables/map/useRender'
import { useCanvas } from '@renderer/composables/map/useCanvas'
import { usePencilTool } from '@renderer/composables/map/tools/usePencilTool'
import { useEraserTool } from '@renderer/composables/map/tools/useEraserTool'
import { useShapeTool } from '@renderer/composables/map/tools/useShapeTool'
import { useTextTool } from '@renderer/composables/map/tools/useTextTool'
import { useBucketTool } from '@renderer/composables/map/tools/useBucketTool'
import { useResourceTool } from '@renderer/composables/map/tools/useResourceTool'
import { useSelectTool } from '@renderer/composables/map/tools/useSelectTool'
import { useMoveTool } from '@renderer/composables/map/tools/useMoveTool'
import { useBackgroundTool } from '@renderer/composables/map/tools/useBackgroundTool'

const router = useRouter()
const route = useRoute()
const bookName = route.query.name

// ==================== 基础数据 ====================
const mapName = ref(route.query.id || '')
const editorContainerRef = ref(null)
const canvasRef = ref(null)
const tool = ref('select')
const color = ref('#222222')
const backgroundColor = ref('#ffffff')
const size = ref(5)
const opacity = ref(100)
const canvasCursor = ref('default')
const spaceKeyPressed = ref(false)

// ==================== 使用 Composables ====================
// 画布状态
const canvasState = useCanvasState()

// 元素管理
const elements = useElements()

// 历史记录
const { history } = useHistory(canvasRef)

// 坐标转换
const { getCanvasPos } = useCoordinate(
  canvasRef,
  editorContainerRef,
  canvasState.scale,
  canvasState.scrollX,
  canvasState.scrollY
)

// 渲染函数
const renderFunctions = useRender(canvasRef)

// 选框状态
const selectedElementIds = ref(new Set())

// 先创建 selectTool 的状态 refs（因为 useCanvas 需要它们）
const selectToolIsSelecting = ref(false)
const selectToolSelectionStart = ref(null)
const selectToolSelectionEnd = ref(null)

// 先创建其他工具的状态 refs（因为 useCanvas 需要它们）
const pencilToolDrawingActive = ref(false)
const eraserToolDrawingActive = ref(false)
const shapeToolDrawingActive = ref(false)
const shapeToolType = ref('line') // 默认选择线条
const shapeToolRoundness = ref('round')

// 画布管理（先创建，但不依赖工具的状态，使用临时的 refs）
const { renderCanvas, canvasWrapStyle } = useCanvas(
  canvasRef,
  editorContainerRef,
  canvasState,
  elements,
  {
    currentFreeDrawPath: elements.currentFreeDrawPath,
    currentShape: elements.currentShape,
    drawingActive: computed(() => {
      return (
        pencilToolDrawingActive.value ||
        eraserToolDrawingActive.value ||
        shapeToolDrawingActive.value
      )
    })
  },
  renderFunctions,
  backgroundColor,
  tool,
  selectedElementIds,
  selectToolIsSelecting,
  selectToolSelectionStart,
  selectToolSelectionEnd
)

// 工具 composables
const pencilTool = usePencilTool({
  canvasRef,
  elements,
  history,
  renderCanvas,
  color,
  size,
  opacity
})
// 同步 drawingActive 状态
watch(
  pencilTool.drawingActive,
  (val) => {
    pencilToolDrawingActive.value = val
  },
  { immediate: true }
)

const eraserTool = useEraserTool({
  canvasRef,
  history,
  size
})
// 同步 drawingActive 状态
watch(
  eraserTool.drawingActive,
  (val) => {
    eraserToolDrawingActive.value = val
  },
  { immediate: true }
)

const shapeTool = useShapeTool({
  canvasRef,
  elements,
  history,
  renderCanvas,
  color,
  size,
  opacity
})
// 同步 drawingActive 状态
watch(
  shapeTool.drawingActive,
  (val) => {
    shapeToolDrawingActive.value = val
  },
  { immediate: true }
)
// 同步形状类型和边角设置
watch(
  shapeToolType,
  (val) => {
    shapeTool.setShapeType(val)
  },
  { immediate: true }
)
watch(
  shapeToolRoundness,
  (val) => {
    shapeTool.setRoundness(val)
  },
  { immediate: true }
)

const textTool = useTextTool({
  canvasRef,
  elements,
  history,
  renderCanvas,
  color,
  getCanvasPos
})

const bucketTool = useBucketTool({
  canvasRef,
  elements,
  history,
  renderCanvas,
  color
})

const resourceTool = useResourceTool({
  canvasRef,
  elements,
  history,
  renderCanvas,
  getCanvasPos
})

const selectTool = useSelectTool({
  elements,
  history,
  renderCanvas,
  selectedElementIds,
  canvasState,
  canvasCursor
})
// 同步 selectTool 的状态
watch(
  selectTool.isSelecting,
  (val) => {
    selectToolIsSelecting.value = val
  },
  { immediate: true }
)
watch(
  selectTool.selectionStart,
  (val) => {
    selectToolSelectionStart.value = val
  },
  { immediate: true }
)
watch(
  selectTool.selectionEnd,
  (val) => {
    selectToolSelectionEnd.value = val
  },
  { immediate: true }
)

const moveTool = useMoveTool({
  editorContainerRef,
  canvasState
})

const backgroundTool = useBackgroundTool({
  canvasRef,
  history,
  renderCanvas,
  backgroundColor
})

// ==================== 颜色预设 ====================
const colorPresets = [
  '#000000',
  '#222222',
  '#666666',
  '#999999',
  '#FFFFFF',
  '#FF4D4F',
  '#FF9F1C',
  '#FFD600',
  '#00C853',
  '#1890FF',
  '#B368FF',
  '#FF6F91',
  '#8D99AE',
  '#A3E635',
  '#00C9A7',
  '#13C2C2',
  '#2F54EB'
]

// ==================== 计算属性 ====================
const showColorPicker = computed(() => {
  return ['pencil', 'bucket', 'shape', 'text', 'background'].includes(tool.value)
})

const currentColor = computed({
  get() {
    return tool.value === 'background' ? backgroundColor.value : color.value
  },
  set(value) {
    if (tool.value === 'background') {
      backgroundTool.handleColorChange(value)
    } else {
      color.value = value
    }
  }
})

const sliderConfig = computed(() => {
  if (tool.value === 'eraser') {
    return { min: 10, max: 50, step: 1 }
  } else if (tool.value === 'pencil') {
    return { min: 1, max: 50, step: 1 }
  } else if (tool.value === 'shape') {
    return { min: 1, max: 50, step: 1 }
  }
  return { min: 0, max: 100, step: 1 }
})

const opacityConfig = computed(() => {
  return { min: 0, max: 100, step: 1 }
})

const canUndo = computed(() => {
  return history.value ? history.value.canUndo() : false
})

const canRedo = computed(() => {
  return history.value ? history.value.canRedo() : false
})

// 解包 canvas 尺寸（确保在模板中正确显示）
const canvasDisplayWidth = computed(() => {
  return canvasState.canvasDisplayWidth.value
})

const canvasDisplayHeight = computed(() => {
  return canvasState.canvasDisplayHeight.value
})

// 文字输入框值（确保是字符串）
const textInputValue = computed({
  get: () => {
    const value = textTool.textInputValue.value
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'object') return '' // 防止对象被转换为字符串
    return String(value)
  },
  set: (val) => {
    const stringValue = typeof val === 'string' ? val : ''
    textTool.textInputValue.value = stringValue
    // 触发输入处理
    if (textTool.handleTextInput) {
      textTool.handleTextInput()
    }
  }
})

// 文字输入框是否应该显示
const shouldShowTextInput = computed(() => {
  return (
    tool.value === 'text' && textTool.textInputVisible.value && !!textTool.editingTextElement.value
  )
})

// 文字输入框位置样式
const textInputOverlayStyle = computed(() => {
  if (
    !textTool.textInputVisible.value ||
    !textTool.editingTextElement.value ||
    !editorContainerRef.value
  ) {
    return {}
  }

  const containerRect = editorContainerRef.value.getBoundingClientRect()

  const viewportX =
    (textTool.textInputPosition.value.x + canvasState.scrollX.value) * canvasState.scale.value +
    containerRect.left -
    7
  const viewportY =
    (textTool.textInputPosition.value.y + canvasState.scrollY.value) * canvasState.scale.value +
    containerRect.top -
    7

  return {
    position: 'fixed',
    left: `${viewportX}px`,
    top: `${viewportY}px`,
    fontSize: (textTool.editingTextElement.value.fontSize || 14) * canvasState.scale.value + 'px',
    fontFamily: textTool.editingTextElement.value.fontFamily || 'Arial',
    color: textTool.editingTextElement.value.color || color.value
  }
})

// ==================== 资源列表 ====================
const resources = [
  { name: '点', url: '/src/assets/images/point.png' },
  { name: '五角星', url: '/src/assets/images/star.png' },
  { name: '山', url: '/src/assets/images/mountain.png' },
  { name: '森林', url: '/src/assets/images/forest.png' },
  { name: '宫殿', url: '/src/assets/images/palace.png' },
  { name: '城市', url: '/src/assets/images/city.png' },
  { name: '村庄', url: '/src/assets/images/village.png' },
  { name: '湖泊', url: '/src/assets/images/lake.png' },
  { name: '战役', url: '/src/assets/images/battle.png' }
]

// ==================== 事件处理 ====================
function handleCanvasMouseDown(e) {
  const pos = getCanvasPos(e)

  console.log('[handleCanvasMouseDown] tool:', tool.value, 'pos:', pos)

  if (tool.value === 'move' || spaceKeyPressed.value) {
    moveTool.onMouseDown(e)
    return
  }

  if (tool.value === 'pencil') {
    pencilTool.onMouseDown(pos)
  } else if (tool.value === 'eraser') {
    eraserTool.onMouseDown(pos)
  } else if (tool.value === 'shape') {
    console.log(
      '[handleCanvasMouseDown] calling shapeTool.onMouseDown, shapeType:',
      shapeTool.shapeType.value
    )
    shapeTool.onMouseDown(pos)
  } else if (tool.value === 'bucket') {
    bucketTool.onMouseDown(pos)
  } else if (tool.value === 'text') {
    // 直接调用 textTool.onMouseDown，它内部会处理 confirmTextInput
    textTool.onMouseDown(e)
  } else if (tool.value === 'select') {
    selectTool.onMouseDown(e, pos)
  } else {
    console.log('[handleCanvasMouseDown] tool not handled:', tool.value)
    if (textTool.textInputVisible.value) {
      textTool.confirmTextInput()
    }
  }
}

function handleCanvasMouseMove(e) {
  if (moveTool.panning.value) {
    moveTool.onMouseMove(e)
    return
  }

  const pos = getCanvasPos(e)

  if (tool.value === 'pencil' && pencilTool.drawingActive.value) {
    pencilTool.onMouseMove(pos)
  } else if (tool.value === 'eraser' && eraserTool.drawingActive.value) {
    eraserTool.onMouseMove(pos)
  } else if (tool.value === 'shape' && shapeTool.drawingActive.value) {
    console.log('[handleCanvasMouseMove] calling shapeTool.onMouseMove')
    shapeTool.onMouseMove(pos)
  } else if (tool.value === 'select') {
    selectTool.onMouseMove(pos)
    if (
      !selectTool.isDragging.value &&
      !selectTool.isTransforming.value &&
      !selectTool.isSelecting.value
    ) {
      selectTool.updateCursorStyle(pos)
    }
  }
}

function handleCanvasMouseUp() {
  if (moveTool.panning.value) {
    moveTool.onMouseUp()
    return
  }

  if (tool.value === 'pencil') {
    pencilTool.onMouseUp()
  } else if (tool.value === 'eraser') {
    eraserTool.onMouseUp()
  } else if (tool.value === 'shape') {
    shapeTool.onMouseUp()
  } else if (tool.value === 'select') {
    selectTool.onMouseUp()
    canvasCursor.value = 'default'
  }
}

function handleContainerMouseDown(e) {
  if (tool.value === 'move' || e.button === 1 || (e.button === 0 && spaceKeyPressed.value)) {
    moveTool.onMouseDown(e)
    if (tool.value !== 'move') {
      canvasCursor.value = 'grabbing'
    }
    e.preventDefault()
  }
}

function handleContainerMouseMove(e) {
  if (moveTool.panning.value) {
    moveTool.onMouseMove(e)
  }
}

function handleContainerMouseUp() {
  if (moveTool.panning.value) {
    moveTool.onMouseUp()
    if (tool.value !== 'move' && !spaceKeyPressed.value) {
      canvasCursor.value = 'default'
    }
  }
}

function handleWheel(e) {
  e.preventDefault()

  // Shift + 滚轮：平移
  if (e.shiftKey || tool.value === 'move') {
    const deltaX = e.deltaX || 0
    const deltaY = e.deltaY || 0
    canvasState.scrollX.value += (deltaX * 0.5) / canvasState.scale.value
    canvasState.scrollY.value += (deltaY * 0.5) / canvasState.scale.value
    return
  }

  // Ctrl/Cmd + 滚轮：缩放（以鼠标位置为中心）
  if (e.ctrlKey || e.metaKey) {
    if (!editorContainerRef.value) return
    const containerRect = editorContainerRef.value.getBoundingClientRect()
    const mouseX = e.clientX - containerRect.left
    const mouseY = e.clientY - containerRect.top

    const sceneX = mouseX / canvasState.scale.value - canvasState.scrollX.value
    const sceneY = mouseY / canvasState.scale.value - canvasState.scrollY.value

    const delta = e.deltaY
    const zoomFactor = 0.1
    let newScale = canvasState.scale.value
    if (delta < 0) {
      newScale = Math.min(canvasState.scale.value + zoomFactor, canvasState.maxScale)
    } else {
      newScale = Math.max(canvasState.scale.value - zoomFactor, canvasState.minScale)
    }

    canvasState.scrollX.value = mouseX / newScale - sceneX
    canvasState.scrollY.value = mouseY / newScale - sceneY
    canvasState.scale.value = newScale

    // 触发画布重新渲染
    renderCanvas(false)
  }
}

// 缩放功能（参考 excalidraw）
function handleZoomIn() {
  if (!editorContainerRef.value) return
  const containerRect = editorContainerRef.value.getBoundingClientRect()
  const centerX = containerRect.width / 2
  const centerY = containerRect.height / 2

  const sceneX = centerX / canvasState.scale.value - canvasState.scrollX.value
  const sceneY = centerY / canvasState.scale.value - canvasState.scrollY.value

  const zoomFactor = 0.1
  const newScale = Math.min(canvasState.scale.value + zoomFactor, canvasState.maxScale)

  canvasState.scrollX.value = centerX / newScale - sceneX
  canvasState.scrollY.value = centerY / newScale - sceneY
  canvasState.scale.value = newScale

  // 触发画布重新渲染
  renderCanvas(false)
}

function handleZoomOut() {
  if (!editorContainerRef.value) return
  const containerRect = editorContainerRef.value.getBoundingClientRect()
  const centerX = containerRect.width / 2
  const centerY = containerRect.height / 2

  const sceneX = centerX / canvasState.scale.value - canvasState.scrollX.value
  const sceneY = centerY / canvasState.scale.value - canvasState.scrollY.value

  const zoomFactor = 0.1
  const newScale = Math.max(canvasState.scale.value - zoomFactor, canvasState.minScale)

  canvasState.scrollX.value = centerX / newScale - sceneX
  canvasState.scrollY.value = centerY / newScale - sceneY
  canvasState.scale.value = newScale

  // 触发画布重新渲染
  renderCanvas(false)
}

function handleResetZoom() {
  if (!editorContainerRef.value) return
  const containerRect = editorContainerRef.value.getBoundingClientRect()
  const centerX = containerRect.width / 2
  const centerY = containerRect.height / 2

  const sceneX = centerX / canvasState.scale.value - canvasState.scrollX.value
  const sceneY = centerY / canvasState.scale.value - canvasState.scrollY.value

  const newScale = 1

  canvasState.scrollX.value = centerX / newScale - sceneX
  canvasState.scrollY.value = centerY / newScale - sceneY
  canvasState.scale.value = newScale

  // 触发画布重新渲染
  renderCanvas(false)
}

function handleColorChange(newColor) {
  if (tool.value === 'background') {
    backgroundTool.handleColorChange(newColor)
  }
}

function handleShapeTypeChange(newType) {
  shapeToolType.value = newType
  // 立即同步到shapeTool
  shapeTool.setShapeType(newType)
}

function onToolChange(newTool) {
  // 如果切换到非文字工具，隐藏文字输入框
  if (tool.value === 'text' && newTool !== 'text') {
    if (textTool.textInputVisible.value) {
      // 先确认输入（保存内容），然后隐藏
      textTool.confirmTextInput()
    }
  }

  // 如果切换到文字工具，确保输入框是隐藏的（只有点击画布后才显示）
  if (newTool === 'text') {
    if (textTool.textInputVisible.value) {
      // 如果输入框已经显示，先确认输入
      textTool.confirmTextInput()
    }
    // 确保输入框是隐藏的，清除所有相关状态
    textTool.textInputVisible.value = false
    textTool.editingTextElement.value = null
    textTool.textInputPosition.value = { x: 0, y: 0 }
    textTool.textInputValue.value = ''
  }

  tool.value = newTool
  if (newTool === 'pencil') {
    size.value = 5
  } else if (newTool === 'eraser') {
    size.value = 30
  } else if (newTool === 'shape') {
    size.value = 3
    // 确保shapeTool的shapeType与shapeToolType同步
    if (shapeToolType.value) {
      shapeTool.setShapeType(shapeToolType.value)
    } else {
      // 如果没有设置，使用默认值
      shapeToolType.value = 'line'
      shapeTool.setShapeType('line')
    }
  }
  selectedElementIds.value.clear()

  // 更新光标样式
  switch (newTool) {
    case 'select':
      canvasCursor.value = 'default'
      break
    case 'move':
      canvasCursor.value = spaceKeyPressed.value ? 'grabbing' : 'grab'
      break
    case 'pencil':
    case 'eraser':
    case 'line':
    case 'rect':
      canvasCursor.value = 'crosshair'
      break
    case 'text':
      canvasCursor.value = 'text'
      break
    case 'bucket':
    case 'resource':
      canvasCursor.value = 'crosshair'
      break
    default:
      canvasCursor.value = 'default'
  }
}

function handleUndo() {
  if (history.value && history.value.undo()) {
    ElMessage.success('已撤销')
  }
}

function handleRedo() {
  if (history.value && history.value.redo()) {
    ElMessage.success('已回退')
  }
}

function handleClearCanvas() {
  ElMessageBox.confirm('确定要清空画板吗？此操作不可撤销。', '确认清空', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      if (!canvasRef.value || !history.value) return
      history.value.saveState()
      elements.clearAll()
      renderCanvas()
      history.value.saveState()
      ElMessage.success('画板已清空')
    })
    .catch(() => {
      // 用户取消
    })
}

function selectResource(resource) {
  resourceTool.selectResource(resource)
}

function onResourceMouseDown(resource, event) {
  resourceTool.onResourceMouseDown(resource, event)
}

function handleTextDoubleClick(e) {
  if (tool.value === 'text') {
    textTool.onDoubleClick(e)
  }
}

function handleBack() {
  router.back()
}

// ==================== 保存地图 ====================
// eslint-disable-next-line no-unused-vars
async function handleSave() {
  if (!mapName.value) {
    ElMessage.warning('请输入地图名称')
    return
  }
  if (!canvasRef.value) return

  try {
    renderCanvas()
    const imageData = canvasRef.value.toDataURL('image/png')
    await window.electron.updateMap({
      bookName,
      mapName: mapName.value,
      imageData
    })
    ElMessage.success('保存成功')
    router.back()
  } catch (error) {
    console.error('保存地图失败:', error)
    ElMessage.error('保存地图失败')
  }
}

// ==================== 键盘事件 ====================
function handleKeyDown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    return
  }

  // 工具快捷键
  if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
    switch (e.key.toLowerCase()) {
      case 'v':
        onToolChange('select')
        break
      case 'h':
        onToolChange('move')
        break
      case 'p':
        onToolChange('pencil')
        break
      case 'e':
        onToolChange('eraser')
        break
      case 'l':
        onToolChange('line')
        break
      case 'r':
        onToolChange('rect')
        break
      case 'b':
        onToolChange('bucket')
        break
      case 't':
        onToolChange('text')
        break
    }
  }

  // 撤销/回退
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault()
    handleUndo()
  }
  if (
    ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
    ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')
  ) {
    e.preventDefault()
    handleRedo()
  }

  // 空格键：临时切换到移动模式
  if (e.key === ' ' && tool.value !== 'move') {
    e.preventDefault()
    spaceKeyPressed.value = true
    canvasCursor.value = 'grab'
  }
}

function handleKeyUp(e) {
  if (e.key === ' ') {
    spaceKeyPressed.value = false
    if (tool.value !== 'move') {
      canvasCursor.value = 'default'
    }
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  // 设置页面title
  if (mapName.value) {
    document.title = mapName.value
  }

  nextTick(() => {
    if (canvasRef.value) {
      history.value = new HistoryManager(canvasRef.value)
      history.value.renderCallback = renderCanvas
      history.value.getStateCallback = () => ({
        freeDrawElements: elements.freeDrawElements.value,
        shapeElements: elements.shapeElements.value,
        textElements: elements.textElements.value,
        resourceElements: elements.resourceElements.value,
        fillElements: elements.fillElements.value,
        backgroundColor: backgroundColor.value
      })
      history.value.setStateCallback = (state) => {
        elements.freeDrawElements.value = state.freeDrawElements || []
        elements.shapeElements.value = state.shapeElements || []
        elements.textElements.value = state.textElements || []
        elements.resourceElements.value = state.resourceElements || []
        elements.fillElements.value = state.fillElements || []
        backgroundColor.value = state.backgroundColor || '#ffffff'
      }
      history.value.init()
      renderCanvas()
    }
  })

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)

  // 清理资源拖拽
  if (resourceTool.dragPreviewEl.value) {
    try {
      document.body.removeChild(resourceTool.dragPreviewEl.value)
    } catch {
      // 忽略错误
    }
  }
})
</script>

<style lang="scss" scoped>
.map-design {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f3f3f3;
  position: relative;
  overflow: hidden;

  .back-button-container {
    position: fixed;
    top: 8px;
    left: 20px;
    z-index: 1000;
    display: flex;
    align-items: center;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    .back-button {
      height: 42px;
    }
    .map-name {
      font-size: 14px;
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .editor-container {
    flex: 1;
    width: 100%;
    position: relative;
    overflow: hidden;
    background-color: #f3f3f3;
  }

  .canvas-wrap {
    position: absolute;
    background: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    will-change: transform;
  }

  .draw-canvas {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 1;
    background: transparent;
  }

  .selection-canvas {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 2;
    pointer-events: none;
  }

  .text-input-overlay {
    position: absolute;
    z-index: 3;
    pointer-events: auto;

    .text-input {
      background: transparent;
      border: 1px dashed transparent;
      border-radius: 2px;
      padding: 4px 6px;
      outline: none;
      min-width: 100px;
      min-height: 0;
      max-width: 500px;
      max-height: 300px;
      resize: none;
      overflow: hidden;
      box-shadow: none;
      font-family: Arial, sans-serif;
      white-space: pre-wrap;
      word-wrap: break-word;
      line-height: inherit;

      &.text-input-editing {
        border: 1px dashed #409eff;
      }

      &:focus {
        border: 1px dashed #409eff;
        box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.2);
      }
    }
  }
}

// 颜色选择器样式
.color-picker-container {
  position: fixed;
  top: 8px;
  right: 20px;
  z-index: 1000;
  padding: 5px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

// 颜色选择器过渡动画
.color-picker-fade-enter-active,
.color-picker-fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.color-picker-fade-enter-from {
  opacity: 0;
  transform: translateX(10px) scale(0.95);
}

.color-picker-fade-enter-to {
  opacity: 1;
  transform: translateX(0) scale(1);
}

.color-picker-fade-leave-from {
  opacity: 1;
  transform: translateX(0) scale(1);
}

.color-picker-fade-leave-to {
  opacity: 0;
  transform: translateX(10px) scale(0.95);
}
</style>
