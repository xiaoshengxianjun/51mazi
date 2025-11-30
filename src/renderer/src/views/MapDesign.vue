<template>
  <div class="map-design">
    <!-- 工具栏 -->
    <MapToolbar
      v-model="tool"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :resources="resources"
      @update:model-value="onToolChange"
      @undo="handleUndo"
      @redo="handleRedo"
      @clear="handleClearCanvas"
      @resource-select="selectResource"
      @resource-mousedown="onResourceMouseDown"
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
      :visible="tool === 'pencil' || tool === 'eraser' || tool === 'line' || tool === 'rect'"
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
          v-if="tool === 'pencil'"
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
          v-if="textInputVisible"
          class="text-input-overlay"
          :style="textInputOverlayStyle"
          @mousedown.stop
          @click.stop
        >
          <textarea
            ref="textInputRef"
            v-model="textInputValue"
            class="text-input"
            placeholder="输入文字..."
            :style="{
              fontSize: (editingTextElement?.fontSize || 14) + 'px',
              fontFamily: editingTextElement?.fontFamily || 'Arial',
              color: editingTextElement?.color || color,
              textAlign: editingTextElement?.textAlign || 'left',
              lineHeight: editingTextElement?.lineHeight || 1.2
            }"
            :class="{ 'text-input-editing': tool === 'text' }"
            @input="handleTextInput"
            @keydown.ctrl.enter="confirmTextInput"
            @keydown.meta.enter="confirmTextInput"
            @keydown.esc="cancelTextInput"
            @mousedown.stop
            @click.stop
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import MapToolbar from '@renderer/components/Map/MapToolbar.vue'
import FloatingSidebar from '@renderer/components/FloatingSidebar.vue'
import MapSlider from '@renderer/components/Map/MapSlider.vue'
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getStroke } from 'perfect-freehand'
import rough from 'roughjs'

const router = useRouter()
const route = useRoute()
const bookName = route.query.name

// ==================== 基础数据 ====================
const mapName = ref('')
const editorContainerRef = ref(null)
const canvasRef = ref(null)

// ==================== 画布尺寸和变换 ====================
// 无限画布：使用虚拟坐标系统，不设置固定尺寸
// 画布的实际显示尺寸由容器决定，使用虚拟坐标系统
const scale = ref(1)
const minScale = 0.1
const maxScale = 5

// 视口位置（参考 excalidraw 的 scrollX/scrollY）
const scrollX = ref(0)
const scrollY = ref(0)

// 画布平移
const panning = ref(false)
const panStart = ref({ x: 0, y: 0 })
const spaceKeyPressed = ref(false)

// 画布内容边界（用于动态计算画布大小）
const contentBounds = ref({
  minX: 0,
  minY: 0,
  maxX: 1920,
  maxY: 1080
})

// ==================== 工具栏状态 ====================
const tool = ref('select') // select, move, pencil, eraser, line, rect, bucket, text, resource, background
const color = ref('#222222')
const backgroundColor = ref('#ffffff') // 画布背景色
const size = ref(5)
const opacity = ref(100) // 透明度 0-100

// 颜色预设
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

// 是否显示颜色选择器
const showColorPicker = computed(() => {
  return ['pencil', 'bucket', 'line', 'rect', 'background'].includes(tool.value)
})

// 当前颜色选择器绑定的颜色（根据工具类型）
const currentColor = computed({
  get() {
    return tool.value === 'background' ? backgroundColor.value : color.value
  },
  set(value) {
    if (tool.value === 'background') {
      // 更新背景色并重新渲染
      if (canvasRef.value && history.value) {
        history.value.saveState()
        backgroundColor.value = value
        renderCanvas()
        history.value.saveState()
      } else {
        backgroundColor.value = value
        renderCanvas()
      }
    } else {
      color.value = value
    }
  }
})

// ==================== 滑块配置 ====================
const sliderConfig = computed(() => {
  if (tool.value === 'eraser') {
    // 橡皮擦：控制大小
    return {
      min: 1,
      max: 40,
      step: 1
    }
  } else if (tool.value === 'pencil') {
    // 画笔：控制粗细
    return {
      min: 1,
      max: 50,
      step: 1
    }
  } else if (tool.value === 'line' || tool.value === 'rect') {
    // 线条/矩形：控制线条粗细
    return {
      min: 1,
      max: 50,
      step: 1
    }
  }
  return {
    min: 0,
    max: 100,
    step: 1
  }
})

// 透明度配置
const opacityConfig = computed(() => {
  return {
    min: 0,
    max: 100,
    step: 1
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

// ==================== 绘制元素数据结构（参考 excalidraw） ====================
// 画笔路径元素
const freeDrawElements = ref([]) // 保存所有已完成的画笔路径
const currentFreeDrawPath = ref(null) // 当前正在绘制的路径

// 线条和多边形元素
const shapeElements = ref([]) // 保存所有已完成的形状
const currentShape = ref(null) // 当前正在绘制的形状

// 文字元素
const textElements = ref([]) // 保存所有文字元素

// 资源元素
const resourceElements = ref([]) // 保存所有资源元素

// 油漆桶填充区域（保存为像素数据，或使用路径）
const fillElements = ref([]) // 保存所有填充区域

// ==================== 绘制状态 ====================
const drawingActive = ref(false)
const lastPoint = ref({ x: 0, y: 0 })
const shapeStart = ref({ x: 0, y: 0 })

// ==================== 选框状态（参考 excalidraw） ====================
// 选中的元素（存储元素 ID）
const selectedElementIds = ref(new Set())

// 拖拽选框状态
const selectionStart = ref(null) // { x, y }
const selectionEnd = ref(null) // { x, y }
const isSelecting = ref(false)

// 变换状态（参考 excalidraw 的 PointerDownState）
const isDragging = ref(false) // 是否正在拖拽（移动）
const isTransforming = ref(false) // 是否正在变换（调整大小或旋转）
const transformHandleType = ref(null) // 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'rotation' | false
const pointerDownState = ref(null) // { originalElements: Map, startCoords: { x, y }, center: { x, y }, ... }

// ==================== 文字工具 ====================
const textInputVisible = ref(false)
const textInputValue = ref('')
const textInputPosition = ref({ x: 0, y: 0 })
const textInputRef = ref(null)

// 计算文字输入框的位置样式（适配无限画布，参考 excalidraw）
// sceneCoordsToViewportCoords: 将场景坐标转换为视口坐标
const textInputOverlayStyle = computed(() => {
  if (!textInputVisible.value || !editingTextElement.value || !editorContainerRef.value) {
    return {}
  }

  const containerRect = editorContainerRef.value.getBoundingClientRect()

  // 参考 excalidraw: (sceneX + scrollX) * zoom.value + offsetLeft
  const viewportX =
    (textInputPosition.value.x + scrollX.value) * scale.value + containerRect.left - 7
  const viewportY =
    (textInputPosition.value.y + scrollY.value) * scale.value + containerRect.top - 7

  return {
    position: 'fixed',
    left: `${viewportX}px`,
    top: `${viewportY}px`,
    fontSize: (editingTextElement.value.fontSize || 14) * scale.value + 'px',
    fontFamily: editingTextElement.value.fontFamily || 'Arial',
    color: editingTextElement.value.color || color.value
  }
})

// ==================== 资源拖拽 ====================
const draggingResource = ref(null)
const dragPreviewEl = ref(null)

// ==================== 历史记录管理 ====================
class HistoryManager {
  constructor(canvas, maxHistory = 50) {
    this.canvas = canvas
    this.maxHistory = maxHistory
    this.history = []
    this.currentIndex = -1
    this.renderCallback = null // 用于重新渲染的回调函数
    this.getStateCallback = null // 用于获取当前状态的回调函数
    this.setStateCallback = null // 用于设置状态的回调函数
  }

  // 保存当前状态
  saveState() {
    if (!this.canvas || !this.getStateCallback) return

    // 获取当前元素状态（而不是 ImageData）
    const state = this.getStateCallback()

    // 移除当前位置之后的历史（如果有回退操作）
    this.history = this.history.slice(0, this.currentIndex + 1)

    // 添加新状态（深拷贝）
    this.history.push(JSON.parse(JSON.stringify(state)))
    this.currentIndex++

    // 限制历史记录数量
    if (this.history.length > this.maxHistory) {
      this.history.shift()
      this.currentIndex--
    }
  }

  // 撤销
  undo() {
    if (this.canUndo() && this.setStateCallback) {
      this.currentIndex--
      // 恢复状态
      const state = this.history[this.currentIndex]
      this.setStateCallback(state)
      // 重新渲染画布
      if (this.renderCallback) {
        this.renderCallback()
      }
      return true
    }
    return false
  }

  // 回退
  redo() {
    if (this.canRedo() && this.setStateCallback) {
      this.currentIndex++
      // 恢复状态
      const state = this.history[this.currentIndex]
      this.setStateCallback(state)
      // 重新渲染画布
      if (this.renderCallback) {
        this.renderCallback()
      }
      return true
    }
    return false
  }

  canUndo() {
    return this.currentIndex > 0
  }

  canRedo() {
    return this.currentIndex < this.history.length - 1
  }

  // 初始化历史记录
  init() {
    if (!this.canvas || !this.getStateCallback) return
    // 获取当前元素状态
    const state = this.getStateCallback()
    this.history = [JSON.parse(JSON.stringify(state))]
    this.currentIndex = 0
  }
}

const history = ref(null)

// ==================== 计算属性 ====================
// 计算画布显示尺寸（基于内容边界和视口）
const canvasDisplayWidth = computed(() => {
  const padding = 200 // 内容周围的 padding
  return Math.max(contentBounds.value.maxX - contentBounds.value.minX + padding * 2, 1920)
})

const canvasDisplayHeight = computed(() => {
  const padding = 200
  return Math.max(contentBounds.value.maxY - contentBounds.value.minY + padding * 2, 1080)
})

const canvasWrapStyle = computed(() => {
  // 参考 excalidraw: 画布位置计算
  // sceneCoordsToViewportCoords: (sceneX + scrollX) * zoom.value + offsetLeft
  // 画布的原点 (0, 0) 在视口中的位置 = scrollX * scale + offsetLeft
  const containerRect = editorContainerRef.value?.getBoundingClientRect()
  if (!containerRect) {
    return {}
  }

  // 计算画布左上角在容器中的位置
  // 画布原点 (0, 0) 在视口中的位置 = scrollX * scale + containerRect.left
  // 相对于容器的位置 = scrollX * scale
  const offsetX = scrollX.value * scale.value
  const offsetY = scrollY.value * scale.value

  return {
    position: 'absolute',
    left: `${offsetX}px`,
    top: `${offsetY}px`,
    width: canvasDisplayWidth.value + 'px',
    height: canvasDisplayHeight.value + 'px',
    background: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transform: `scale(${scale.value})`,
    transformOrigin: 'top left',
    transition: panning.value ? 'none' : 'transform 0.1s ease-out'
  }
})

// 画布光标样式（ref，用于动态更新）
const canvasCursor = ref('default')

// 历史记录状态计算属性（安全访问）
const canUndo = computed(() => {
  return history.value ? history.value.canUndo() : false
})

const canRedo = computed(() => {
  return history.value ? history.value.canRedo() : false
})

// ==================== 工具选择 ====================
function selectTool(t) {
  tool.value = t
  if (t === 'pencil') {
    size.value = 5
  } else if (t === 'eraser') {
    size.value = 10
  }
  // 切换工具时清除选择
  selectedElementIds.value.clear()
}

// ==================== 更新内容边界 ====================
function updateContentBounds() {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  // 检查所有元素
  freeDrawElements.value.forEach((element) => {
    if (element.points && element.points.length > 0) {
      element.points.forEach((point) => {
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
      })
    }
  })

  shapeElements.value.forEach((element) => {
    if (element.start && element.end) {
      minX = Math.min(minX, element.start.x, element.end.x)
      minY = Math.min(minY, element.start.y, element.end.y)
      maxX = Math.max(maxX, element.start.x, element.end.x)
      maxY = Math.max(maxY, element.start.y, element.end.y)
    }
  })

  textElements.value.forEach((element) => {
    minX = Math.min(minX, element.x)
    minY = Math.min(minY, element.y)
    maxX = Math.max(maxX, element.x + (element.width || 0))
    maxY = Math.max(maxY, element.y + (element.height || 0))
  })

  resourceElements.value.forEach((element) => {
    minX = Math.min(minX, element.x - 20)
    minY = Math.min(minY, element.y - 20)
    maxX = Math.max(maxX, element.x + 20)
    maxY = Math.max(maxY, element.y + 20)
  })

  fillElements.value.forEach((element) => {
    minX = Math.min(minX, element.x)
    minY = Math.min(minY, element.y)
    maxX = Math.max(maxX, element.x + (element.width || 0))
    maxY = Math.max(maxY, element.y + (element.height || 0))
  })

  // 如果没有内容，使用默认边界
  if (minX === Infinity) {
    contentBounds.value = {
      minX: -960,
      minY: -540,
      maxX: 960,
      maxY: 540
    }
  } else {
    contentBounds.value = {
      minX: minX - 200,
      minY: minY - 200,
      maxX: maxX + 200,
      maxY: maxY + 200
    }
  }
}

// ==================== 渲染画布（参考 excalidraw 的方式） ====================
function renderCanvas(updateBounds = true) {
  if (!canvasRef.value) return

  // 更新内容边界（可能会改变画布尺寸）
  if (updateBounds) {
    const oldWidth = canvasRef.value.width
    const oldHeight = canvasRef.value.height

    // 保存当前画布内容（如果画布尺寸即将改变）
    let imageData = null
    if (oldWidth > 0 && oldHeight > 0) {
      try {
        const ctx = canvasRef.value.getContext('2d')
        imageData = ctx.getImageData(0, 0, oldWidth, oldHeight)
      } catch {
        // 忽略错误（可能是跨域问题）
      }
    }

    // 更新边界（这可能会改变 canvasDisplayWidth/Height）
    updateContentBounds()

    // 等待 Vue 更新 canvas 尺寸（如果尺寸改变了）
    nextTick(() => {
      if (!canvasRef.value) return
      const ctx = canvasRef.value.getContext('2d')
      const newWidth = canvasRef.value.width
      const newHeight = canvasRef.value.height

      // 如果画布尺寸改变了，先恢复旧内容（只恢复重叠部分）
      if (imageData && (newWidth !== oldWidth || newHeight !== oldHeight)) {
        const restoreWidth = Math.min(oldWidth, newWidth)
        const restoreHeight = Math.min(oldHeight, newHeight)
        if (restoreWidth > 0 && restoreHeight > 0) {
          ctx.putImageData(imageData, 0, 0, 0, 0, restoreWidth, restoreHeight)
        }
      }

      // 重新绘制所有内容
      renderCanvasContent(ctx)
    })

    return
  }

  // 不更新边界时，直接渲染
  const ctx = canvasRef.value.getContext('2d')
  renderCanvasContent(ctx)
}

// 渲染画布内容（不更新边界）
function renderCanvasContent(ctx) {
  if (!canvasRef.value) return

  // 先绘制背景色（参考 excalidraw 的 bootstrapCanvas）
  ctx.fillStyle = backgroundColor.value
  ctx.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height)

  // 绘制所有已完成的画笔路径
  freeDrawElements.value.forEach((element) => {
    renderFreeDrawPath(ctx, element)
  })

  // 绘制所有已完成的形状
  shapeElements.value.forEach((element) => {
    renderShape(ctx, element)
  })

  // 绘制所有文字元素
  textElements.value.forEach((element) => {
    renderText(ctx, element)
  })

  // 绘制所有资源元素
  resourceElements.value.forEach((element) => {
    renderResource(ctx, element)
  })

  // 绘制所有填充区域
  fillElements.value.forEach((element) => {
    renderFill(ctx, element)
  })

  // 绘制当前正在绘制的路径（预览）
  if (currentFreeDrawPath.value && drawingActive.value && tool.value === 'pencil') {
    renderFreeDrawPath(ctx, currentFreeDrawPath.value, true)
  }

  // 绘制当前正在绘制的形状（预览）
  if (
    currentShape.value &&
    drawingActive.value &&
    (tool.value === 'line' || tool.value === 'rect')
  ) {
    renderShape(ctx, currentShape.value, true)
  }

  // 绘制选中框和变换控制点（参考 excalidraw）
  if (tool.value === 'select' && selectedElementIds.value.size > 0) {
    renderSelection(ctx)
  }

  // 绘制拖拽选框（参考 excalidraw）
  if (tool.value === 'select' && isSelecting.value && selectionStart.value && selectionEnd.value) {
    ctx.save()
    ctx.translate(scrollX.value, scrollY.value)

    const x = Math.min(selectionStart.value.x, selectionEnd.value.x)
    const y = Math.min(selectionStart.value.y, selectionEnd.value.y)
    const width = Math.abs(selectionEnd.value.x - selectionStart.value.x)
    const height = Math.abs(selectionEnd.value.y - selectionStart.value.y)

    ctx.strokeStyle = '#1e88e5'
    ctx.lineWidth = 1 / scale.value
    ctx.setLineDash([2 / scale.value])
    ctx.strokeRect(x, y, width, height)

    ctx.fillStyle = 'rgba(30, 136, 229, 0.1)'
    ctx.fillRect(x, y, width, height)

    ctx.setLineDash([])
    ctx.restore()
  }
}

// ==================== 选框渲染（参考 excalidraw） ====================
// 获取元素的绝对坐标（参考 excalidraw 的 getElementAbsoluteCoords）
function getElementAbsoluteCoords(element) {
  const bounds = getElementBounds(element)
  if (!bounds) return null
  const x1 = bounds.x
  const y1 = bounds.y
  const x2 = bounds.x + bounds.width
  const y2 = bounds.y + bounds.height
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2
  return [x1, y1, x2, y2, cx, cy]
}

// 获取多个元素的共同边界（参考 excalidraw 的 getCommonBounds）
function getCommonBounds(elements) {
  if (elements.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  elements.forEach((element) => {
    const coords = getElementAbsoluteCoords(element)
    if (coords) {
      minX = Math.min(minX, coords[0])
      minY = Math.min(minY, coords[1])
      maxX = Math.max(maxX, coords[2])
      maxY = Math.max(maxY, coords[3])
    }
  })
  if (minX === Infinity) return null
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return [minX, minY, maxX, maxY, cx, cy]
}

// 获取选中的元素数组
function getSelectedElements() {
  const allElements = [
    ...freeDrawElements.value,
    ...shapeElements.value,
    ...textElements.value,
    ...resourceElements.value,
    ...fillElements.value
  ]
  return allElements.filter((el) => selectedElementIds.value.has(el.id))
}

// 渲染选中框和变换控制点（参考 excalidraw）
function renderSelection(ctx) {
  const selectedElements = getSelectedElements()
  if (selectedElements.length === 0) return

  ctx.save()
  ctx.translate(scrollX.value, scrollY.value)

  const selectionColor = '#1e88e5' // rgb(0,118,255)

  if (selectedElements.length === 1) {
    // 单个元素：绘制带角度的选中框（参考 excalidraw 的 renderSelectionBorder）
    const element = selectedElements[0]
    const coords = getElementAbsoluteCoords(element)
    if (!coords) return
    const [x1, y1, x2, y2, cx, cy] = coords
    const angle = 0 // 我们的元素暂时不支持角度

    // 绘制选中框（参考 excalidraw 的 renderSelectionBorder）
    const padding = 8 / scale.value // DEFAULT_TRANSFORM_HANDLE_SPACING * 2
    const lineWidth = 8 / scale.value
    const spaceWidth = 4 / scale.value

    ctx.lineWidth = 1 / scale.value
    ctx.strokeStyle = selectionColor
    ctx.setLineDash([lineWidth, spaceWidth])
    ctx.lineDashOffset = 0
    strokeRectWithRotation(
      ctx,
      x1 - padding,
      y1 - padding,
      x2 - x1 + padding * 2,
      y2 - y1 + padding * 2,
      cx,
      cy,
      angle
    )
    ctx.setLineDash([])

    // 绘制变换控制点（参考 excalidraw 的 renderTransformHandles）
    const transformHandles = getTransformHandlesForElement(element)
    renderTransformHandles(ctx, transformHandles, angle)
  } else {
    // 多个元素：绘制共同边界框（参考 excalidraw）
    const bounds = getCommonBounds(selectedElements)
    if (!bounds) return
    const [x1, y1, x2, y2, cx, cy] = bounds
    const padding = 8 / scale.value

    ctx.lineWidth = 1 / scale.value
    ctx.strokeStyle = selectionColor
    ctx.setLineDash([2 / scale.value])
    strokeRectWithRotation(
      ctx,
      x1 - padding,
      y1 - padding,
      x2 - x1 + padding * 2,
      y2 - y1 + padding * 2,
      cx,
      cy,
      0
    )
    ctx.setLineDash([])

    // 绘制变换控制点
    const transformHandles = getTransformHandlesFromCoords([x1, y1, x2, y2, cx, cy], 0)
    renderTransformHandles(ctx, transformHandles, 0)
  }

  ctx.restore()
}

// 绘制旋转矩形（参考 excalidraw 的 strokeRectWithRotation）
function strokeRectWithRotation(ctx, x, y, width, height, cx, cy, angle, fillBeforeStroke = false) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  if (fillBeforeStroke) {
    ctx.fillRect(x - cx, y - cy, width, height)
    ctx.strokeRect(x - cx, y - cy, width, height)
  } else {
    ctx.strokeRect(x - cx, y - cy, width, height)
  }
  ctx.restore()
}

// 获取单个元素的变换控制点（参考 excalidraw 的 getTransformHandles）
function getTransformHandlesForElement(element) {
  const [x1, y1, x2, y2, cx, cy] = getElementAbsoluteCoords(element)
  return getTransformHandlesFromCoords([x1, y1, x2, y2, cx, cy], 0)
}

// 从坐标获取变换控制点（参考 excalidraw 的 getTransformHandlesFromCoords）
function getTransformHandlesFromCoords([x1, y1, x2, y2, cx, cy], angle) {
  const size = 8 // transformHandleSizes['mouse']
  const handleWidth = size / scale.value
  const handleHeight = size / scale.value
  const handleMarginX = size / scale.value
  const handleMarginY = size / scale.value
  const spacing = 4 / scale.value // DEFAULT_TRANSFORM_HANDLE_SPACING
  const margin = 4 / scale.value
  const dashedLineMargin = margin
  const centeringOffset = (size - spacing * 2) / (2 * scale.value)

  const width = x2 - x1
  const height = y2 - y1

  const handles = {}

  // 角点（参考 excalidraw 的计算方式）
  handles.nw = rotateHandle(
    [
      x1 - dashedLineMargin - handleMarginX + centeringOffset,
      y1 - dashedLineMargin - handleMarginY + centeringOffset,
      handleWidth,
      handleHeight
    ],
    cx,
    cy,
    angle
  )
  handles.ne = rotateHandle(
    [
      x2 + dashedLineMargin - centeringOffset,
      y1 - dashedLineMargin - handleMarginY + centeringOffset,
      handleWidth,
      handleHeight
    ],
    cx,
    cy,
    angle
  )
  handles.sw = rotateHandle(
    [
      x1 - dashedLineMargin - handleMarginX + centeringOffset,
      y2 + dashedLineMargin - centeringOffset,
      handleWidth,
      handleHeight
    ],
    cx,
    cy,
    angle
  )
  handles.se = rotateHandle(
    [
      x2 + dashedLineMargin - centeringOffset,
      y2 + dashedLineMargin - centeringOffset,
      handleWidth,
      handleHeight
    ],
    cx,
    cy,
    angle
  )

  // 边中点
  handles.n = rotateHandle(
    [
      x1 + width / 2 - handleWidth / 2,
      y1 - dashedLineMargin - handleMarginY + centeringOffset,
      handleWidth,
      handleHeight
    ],
    cx,
    cy,
    angle
  )
  handles.s = rotateHandle(
    [
      x1 + width / 2 - handleWidth / 2,
      y2 + dashedLineMargin - centeringOffset,
      handleWidth,
      handleHeight
    ],
    cx,
    cy,
    angle
  )
  handles.w = rotateHandle(
    [
      x1 - dashedLineMargin - handleMarginX + centeringOffset,
      y1 + height / 2 - handleHeight / 2,
      handleWidth,
      handleHeight
    ],
    cx,
    cy,
    angle
  )
  handles.e = rotateHandle(
    [
      x2 + dashedLineMargin - centeringOffset,
      y1 + height / 2 - handleHeight / 2,
      handleWidth,
      handleHeight
    ],
    cx,
    cy,
    angle
  )

  // 旋转控制点（参考 excalidraw 的 ROTATION_RESIZE_HANDLE_GAP = 16）
  const rotationGap = 16 / scale.value
  handles.rotation = rotateHandle(
    [
      x1 + width / 2 - handleWidth / 2,
      y1 - dashedLineMargin - handleMarginY - rotationGap,
      handleWidth,
      handleHeight
    ],
    cx,
    cy,
    angle
  )

  return handles
}

// 旋转控制点位置
function rotateHandle([x, y, w, h], cx, cy, angle) {
  const centerX = x + w / 2
  const centerY = y + h / 2
  const dx = centerX - cx
  const dy = centerY - cy
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const newX = cx + dx * cos - dy * sin - w / 2
  const newY = cy + dx * sin + dy * cos - h / 2
  return [newX, newY, w, h]
}

// 渲染变换控制点（参考 excalidraw 的 renderTransformHandles）
function renderTransformHandles(ctx, transformHandles, angle) {
  const selectionColor = '#1e88e5' // rgb(0,118,255)

  Object.keys(transformHandles).forEach((key) => {
    const handle = transformHandles[key]
    if (handle === undefined) return
    const [x, y, w, h] = handle

    ctx.save()
    ctx.lineWidth = 1 / scale.value
    ctx.strokeStyle = selectionColor
    ctx.fillStyle = '#fff'

    if (key === 'rotation') {
      // 旋转控制点：圆形（参考 excalidraw 的 fillCircle）
      ctx.beginPath()
      ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else if (ctx.roundRect) {
      // 调整大小控制点：圆角矩形（参考 excalidraw）
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, 2 / scale.value)
      ctx.fill()
      ctx.stroke()
    } else {
      // 如果不支持 roundRect，使用 strokeRectWithRotation 绘制（参考 excalidraw）
      strokeRectWithRotation(
        ctx,
        x,
        y,
        w,
        h,
        x + w / 2,
        y + h / 2,
        angle,
        true // fill before stroke
      )
    }

    ctx.restore()
  })
}

// ==================== 选框辅助函数（参考 excalidraw） ====================
// 获取指定点的元素
function getElementAtPoint(pos) {
  const allElements = [
    ...freeDrawElements.value,
    ...shapeElements.value,
    ...textElements.value,
    ...resourceElements.value,
    ...fillElements.value
  ]
  // 从后往前检查（后绘制的在上层）
  for (let i = allElements.length - 1; i >= 0; i--) {
    const element = allElements[i]
    if (isPointInElement(pos, element)) {
      return element
    }
  }
  return null
}

// 检查点是否在选中框内（包括 padding，参考 excalidraw）
function isPointInSelectionBox(pos, selectedElements) {
  if (selectedElements.length === 0) return false
  const bounds =
    selectedElements.length === 1
      ? getElementAbsoluteCoords(selectedElements[0])
      : getCommonBounds(selectedElements)
  if (!bounds) return false
  const [x1, y1, x2, y2] = bounds
  const padding = 8 / scale.value // DEFAULT_TRANSFORM_HANDLE_SPACING * 2
  return (
    pos.x >= x1 - padding && pos.x <= x2 + padding && pos.y >= y1 - padding && pos.y <= y2 + padding
  )
}

// 获取指定点的变换控制点类型（参考 excalidraw 的 resizeTest）
function getTransformHandleTypeAtPoint(pos, selectedElements) {
  if (selectedElements.length === 0) return false

  if (selectedElements.length === 1) {
    // 单个元素：检查其变换控制点
    const element = selectedElements[0]
    const transformHandles = getTransformHandlesForElement(element)
    return getTransformHandleTypeFromHandles(pos, transformHandles)
  } else {
    // 多个元素：检查共同边界框的变换控制点
    const bounds = getCommonBounds(selectedElements)
    if (!bounds) return false
    const transformHandles = getTransformHandlesFromCoords(bounds, 0)
    return getTransformHandleTypeFromHandles(pos, transformHandles)
  }
}

// 从变换控制点中获取点击的控制点类型
function getTransformHandleTypeFromHandles(pos, transformHandles) {
  const handleSize = 8 / scale.value
  for (const [key, handle] of Object.entries(transformHandles)) {
    if (!handle) continue
    const [x, y, w, h] = handle
    const centerX = x + w / 2
    const centerY = y + h / 2
    const distance = Math.sqrt(Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2))
    if (distance <= handleSize) {
      return key
    }
  }
  return false
}

// 检查点是否在选中框的边框上（用于显示对应的光标样式）
function isPointOnSelectionBoxBorder(pos, selectedElements) {
  if (selectedElements.length === 0) return null
  const bounds =
    selectedElements.length === 1
      ? getElementAbsoluteCoords(selectedElements[0])
      : getCommonBounds(selectedElements)
  if (!bounds) return null
  const [x1, y1, x2, y2] = bounds
  const padding = 8 / scale.value // DEFAULT_TRANSFORM_HANDLE_SPACING * 2
  const borderThreshold = 4 / scale.value // 边框检测阈值

  const left = x1 - padding
  const right = x2 + padding
  const top = y1 - padding
  const bottom = y2 + padding

  // 检查是否在左右边框上（排除控制点区域）
  const isOnLeftBorder =
    Math.abs(pos.x - left) <= borderThreshold && pos.y >= top && pos.y <= bottom
  const isOnRightBorder =
    Math.abs(pos.x - right) <= borderThreshold && pos.y >= top && pos.y <= bottom

  // 检查是否在上下边框上（排除控制点区域）
  const isOnTopBorder = Math.abs(pos.y - top) <= borderThreshold && pos.x >= left && pos.x <= right
  const isOnBottomBorder =
    Math.abs(pos.y - bottom) <= borderThreshold && pos.x >= left && pos.x <= right

  // 排除控制点区域（控制点大小约为 8px）
  const handleSize = 8 / scale.value
  const handleMargin = handleSize / 2

  if (isOnLeftBorder || isOnRightBorder) {
    // 检查是否在控制点区域（角点和边中点）
    const isNearCorner =
      Math.abs(pos.y - top) <= handleMargin ||
      Math.abs(pos.y - bottom) <= handleMargin ||
      Math.abs(pos.y - (top + bottom) / 2) <= handleMargin
    if (!isNearCorner) {
      return 'ew-resize'
    }
  }

  if (isOnTopBorder || isOnBottomBorder) {
    // 检查是否在控制点区域（角点和边中点）
    const isNearCorner =
      Math.abs(pos.x - left) <= handleMargin ||
      Math.abs(pos.x - right) <= handleMargin ||
      Math.abs(pos.x - (left + right) / 2) <= handleMargin
    if (!isNearCorner) {
      return 'ns-resize'
    }
  }

  return null
}

// 更新光标样式（参考 excalidraw 的 getCursorForResizingElement）
function updateCursorStyle(pos) {
  // 如果正在平移，显示 grabbing
  if (panning.value) {
    canvasCursor.value = 'grabbing'
    return
  }

  // 根据工具类型设置默认光标
  if (tool.value === 'select') {
    const selectedElements = getSelectedElements()
    if (selectedElements.length === 0) {
      canvasCursor.value = 'default'
      return
    }

    // 检查是否悬停在变换控制点上
    const handleType = getTransformHandleTypeAtPoint(pos, selectedElements)
    if (handleType) {
      if (handleType === 'rotation') {
        canvasCursor.value = 'grab'
      } else if (handleType === 'n' || handleType === 's') {
        canvasCursor.value = 'ns-resize'
      } else if (handleType === 'e' || handleType === 'w') {
        canvasCursor.value = 'ew-resize'
      } else if (handleType === 'nw' || handleType === 'se') {
        canvasCursor.value = 'nwse-resize'
      } else if (handleType === 'ne' || handleType === 'sw') {
        canvasCursor.value = 'nesw-resize'
      } else {
        canvasCursor.value = 'default'
      }
      return
    }

    // 检查是否悬停在选中框的边框上
    const borderCursor = isPointOnSelectionBoxBorder(pos, selectedElements)
    if (borderCursor) {
      canvasCursor.value = borderCursor
      return
    }

    // 检查是否悬停在选中框内部（可移动区域）
    if (isPointInSelectionBox(pos, selectedElements)) {
      canvasCursor.value = 'move'
      return
    }

    canvasCursor.value = 'default'
  } else {
    // 其他工具的光标
    switch (tool.value) {
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
}

// 初始化指针按下状态（参考 excalidraw 的 PointerDownState）
function initializePointerDownState(selectedElements, pos) {
  const originalElements = new Map()
  selectedElements.forEach((element) => {
    originalElements.set(element.id, JSON.parse(JSON.stringify(element)))
  })

  // 计算中心点（基于原始元素）
  let centerX, centerY
  if (selectedElements.length === 1) {
    // originalElement 应该总是存在，因为它是从 selectedElements 中复制的
    const originalElement = originalElements.get(selectedElements[0].id)
    const coords = getElementAbsoluteCoords(originalElement || selectedElements[0])
    centerX = coords[4]
    centerY = coords[5]
  } else {
    const originalElementsArray = Array.from(originalElements.values())
    const bounds = getCommonBounds(originalElementsArray) || getCommonBounds(selectedElements)
    centerX = bounds[4]
    centerY = bounds[5]
  }

  pointerDownState.value = {
    originalElements,
    lastCoords: { ...pos },
    startCoords: { ...pos }, // 添加起始坐标，用于计算总偏移量
    center: { x: centerX, y: centerY },
    startAngle:
      transformHandleType.value === 'rotation'
        ? (5 * Math.PI) / 2 + Math.atan2(pos.y - centerY, pos.x - centerX)
        : null,
    // 保存调整大小开始时的鼠标位置，用于计算初始尺寸
    resizeStartPos:
      transformHandleType.value && transformHandleType.value !== 'rotation' ? { ...pos } : null
  }
}

// ==================== 渲染画笔路径（使用 perfect-freehand） ====================
function renderFreeDrawPath(ctx, element, isPreview = false) {
  if (!element.points || element.points.length === 0) return

  const options = {
    size: element.strokeWidth, // 直接使用 strokeWidth，不乘以倍数
    thinning: 0.6,
    smoothing: 0.5,
    streamline: 0.5,
    easing: (t) => Math.sin((t * Math.PI) / 2),
    simulatePressure: true
  }

  // 将点数组转换为 perfect-freehand 需要的格式
  const inputPoints = element.points.map((p) => [p.x, p.y])
  const stroke = getStroke(inputPoints, options)

  // 绘制路径
  ctx.save()
  ctx.globalAlpha = isPreview ? 0.7 : (element.opacity || 100) / 100
  ctx.fillStyle = element.color

  if (stroke.length > 0) {
    ctx.beginPath()
    ctx.moveTo(stroke[0][0], stroke[0][1])
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i][0], stroke[i][1])
    }
    ctx.closePath()
    ctx.fill()
  }

  ctx.restore()
}

// ==================== 渲染形状（使用 roughjs） ====================
function renderShape(ctx, element, isPreview = false) {
  if (!canvasRef.value) return

  const rc = rough.canvas(canvasRef.value)
  const options = {
    stroke: element.color,
    strokeWidth: element.strokeWidth,
    roughness: 1,
    seed: 1
  }

  ctx.save()
  ctx.globalAlpha = isPreview ? 0.7 : 1

  if (element.type === 'line') {
    rc.line(element.start.x, element.start.y, element.end.x, element.end.y, options)
  } else if (element.type === 'rect') {
    const width = element.end.x - element.start.x
    const height = element.end.y - element.start.y
    rc.rectangle(element.start.x, element.start.y, width, height, options)
  }

  ctx.restore()
}

// ==================== 渲染文字 ====================
function renderText(ctx, element) {
  if (!element.text) return

  ctx.save()
  const fontSize = element.fontSize || 14
  const fontFamily = element.fontFamily || 'Arial'
  const lineHeight = element.lineHeight || 1.2
  const textAlign = element.textAlign || 'left'

  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.fillStyle = element.color || '#000000'
  ctx.textBaseline = 'top'
  ctx.textAlign = textAlign

  // 处理多行文字
  const lines = element.text.replace(/\r\n?/g, '\n').split('\n')
  const lineHeightPx = fontSize * lineHeight

  // 计算水平偏移
  let horizontalOffset = 0
  if (textAlign === 'center') {
    horizontalOffset = (element.width || 0) / 2
  } else if (textAlign === 'right') {
    horizontalOffset = element.width || 0
  }

  // 绘制每一行
  lines.forEach((line, index) => {
    ctx.fillText(line, element.x + horizontalOffset, element.y + index * lineHeightPx)
  })

  ctx.restore()
}

// ==================== 渲染资源 ====================
function renderResource(ctx, element) {
  const img = new window.Image()
  img.src = element.url
  img.onload = () => {
    ctx.drawImage(img, element.x - 20, element.y - 20, 40, 40)
  }
}

// ==================== 渲染填充区域 ====================
function renderFill(ctx, element) {
  // 填充区域保存为 base64 图片，直接绘制
  if (element.imageDataBase64) {
    const img = new window.Image()
    img.src = element.imageDataBase64
    // 注意：如果图片还未加载，这里可能不会立即显示
    // 但通常 base64 图片会立即加载
    ctx.drawImage(img, element.x, element.y, element.width, element.height)
  }
}

// ==================== 颜色变化处理 ====================
function handleColorChange(newColor) {
  // 如果当前工具是背景工具，更新画布背景色
  if (tool.value === 'background') {
    if (canvasRef.value && history.value) {
      history.value.saveState()
      backgroundColor.value = newColor
      renderCanvas()
      history.value.saveState()
    } else if (canvasRef.value) {
      backgroundColor.value = newColor
      renderCanvas()
    }
  }
  // 其他工具的颜色变化已经在 currentColor 的 setter 中处理
}

// 监听工具变化，处理工具切换逻辑
function onToolChange(newTool) {
  if (newTool === 'pencil') {
    size.value = 5
  } else if (newTool === 'eraser') {
    size.value = 10
  } else if (newTool === 'line' || newTool === 'rect') {
    size.value = 3 // 线条和矩形的默认粗细
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

// ==================== 坐标转换（参考 excalidraw） ====================
// viewportCoordsToSceneCoords: 将视口坐标转换为场景坐标
function getCanvasPos(e) {
  if (!canvasRef.value || !editorContainerRef.value) return { x: 0, y: 0 }

  const containerRect = editorContainerRef.value.getBoundingClientRect()

  let clientX, clientY
  if (e.touches) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else {
    clientX = e.clientX
    clientY = e.clientY
  }

  // 参考 excalidraw: (clientX - offsetLeft) / zoom.value - scrollX
  // offsetLeft/offsetTop 是容器相对于视口的偏移
  // scrollX/scrollY 是视口中心在场景坐标系中的位置
  const x = (clientX - containerRect.left) / scale.value - scrollX.value
  const y = (clientY - containerRect.top) / scale.value - scrollY.value

  return { x, y }
}

// ==================== 画布事件处理 ====================
function handleCanvasMouseDown(e) {
  if (tool.value === 'move' || spaceKeyPressed.value) {
    // 移动工具：开始平移
    panning.value = true
    panStart.value = {
      x: e.clientX,
      y: e.clientY
    }
    return
  }

  const pos = getCanvasPos(e)

  if (tool.value === 'select') {
    // 选框工具（参考 excalidraw）
    const selectedElements = getSelectedElements()

    // 检查是否点击了变换控制点
    if (selectedElements.length > 0) {
      const handleType = getTransformHandleTypeAtPoint(pos, selectedElements)
      if (handleType) {
        // 开始变换（调整大小或旋转）
        isTransforming.value = true
        transformHandleType.value = handleType
        initializePointerDownState(selectedElements, pos)
        return
      }

      // 检查是否点击了选中框内部（用于移动）
      if (isPointInSelectionBox(pos, selectedElements)) {
        // 开始移动
        isDragging.value = true
        initializePointerDownState(selectedElements, pos)
        return
      }
    }

    // 检查是否点击了元素
    const clickedElement = getElementAtPoint(pos)
    if (clickedElement) {
      // 检查该元素是否已经被选中
      const wasSelected = selectedElementIds.value.has(clickedElement.id)

      // 如果元素已经被选中，且点击位置在选中框内，则开始移动
      if (wasSelected) {
        const selectedElements = getSelectedElements()
        if (selectedElements.length > 0 && isPointInSelectionBox(pos, selectedElements)) {
          isDragging.value = true
          initializePointerDownState(selectedElements, pos)
          return
        }
      }

      // 点击了元素，选中它
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        // 多选：切换选中状态
        if (selectedElementIds.value.has(clickedElement.id)) {
          selectedElementIds.value.delete(clickedElement.id)
        } else {
          selectedElementIds.value.add(clickedElement.id)
        }
      } else {
        // 单选：只选中当前元素
        selectedElementIds.value.clear()
        selectedElementIds.value.add(clickedElement.id)
      }
      renderCanvas()
      return
    }

    // 没有点击元素，开始拖拽选框
    isSelecting.value = true
    selectionStart.value = { ...pos }
    selectionEnd.value = { ...pos }
    selectedElementIds.value.clear()
  } else if (tool.value === 'pencil' || tool.value === 'eraser') {
    // 画笔/橡皮擦
    startDrawing(pos)
  } else if (tool.value === 'line' || tool.value === 'rect') {
    // 线条/矩形
    startShape(pos)
  } else if (tool.value === 'bucket') {
    // 油漆桶
    fillBucket(pos)
  } else if (tool.value === 'text') {
    // 文字：如果已经有文字输入框在显示，先确认当前输入
    if (textInputVisible.value) {
      confirmTextInput()
    }
    // 然后创建新的文字输入框
    showTextInput(e)
  } else {
    // 如果点击了其他地方，且文字输入框正在显示，确认当前输入
    if (textInputVisible.value) {
      confirmTextInput()
    }
  }
}

function handleCanvasMouseMove(e) {
  if (panning.value) {
    if (!editorContainerRef.value) return
    const containerRect = editorContainerRef.value.getBoundingClientRect()
    // 计算鼠标在场景坐标系中的位置
    const sceneX = (e.clientX - containerRect.left) / scale.value - scrollX.value
    const sceneY = (e.clientY - containerRect.top) / scale.value - scrollY.value
    // 计算开始平移时的场景坐标
    const startSceneX = (panStart.value.x - containerRect.left) / scale.value - scrollX.value
    const startSceneY = (panStart.value.y - containerRect.top) / scale.value - scrollY.value
    // 计算 scrollX 和 scrollY 的变化
    scrollX.value = scrollX.value - (sceneX - startSceneX)
    scrollY.value = scrollY.value - (sceneY - startSceneY)
    // 更新 panStart
    panStart.value = { x: e.clientX, y: e.clientY }
    return
  }

  const pos = getCanvasPos(e)

  if (isDragging.value && tool.value === 'select') {
    // 移动选中的元素（参考 excalidraw 的 dragSelectedElements）
    if (!pointerDownState.value) return

    // 计算从起始位置到当前位置的总偏移量（基于原始元素位置）
    const totalDeltaX = pos.x - pointerDownState.value.startCoords.x
    const totalDeltaY = pos.y - pointerDownState.value.startCoords.y

    const selectedElements = getSelectedElements()
    selectedElements.forEach((element) => {
      const originalElement = pointerDownState.value.originalElements.get(element.id)
      if (!originalElement) return

      if (element.type === 'freedraw') {
        // 移动画笔路径的所有点（基于原始位置和总偏移量）
        element.points = originalElement.points.map((point) => ({
          x: point.x + totalDeltaX,
          y: point.y + totalDeltaY
        }))
      } else if (element.type === 'line' || element.type === 'rect') {
        // 移动线条/矩形的起点和终点（基于原始位置和总偏移量）
        element.start = {
          x: originalElement.start.x + totalDeltaX,
          y: originalElement.start.y + totalDeltaY
        }
        element.end = {
          x: originalElement.end.x + totalDeltaX,
          y: originalElement.end.y + totalDeltaY
        }
      } else if (
        element.type === 'text' ||
        element.type === 'resource' ||
        element.type === 'fill'
      ) {
        // 移动文字/资源/填充的坐标（基于原始位置和总偏移量）
        element.x = originalElement.x + totalDeltaX
        element.y = originalElement.y + totalDeltaY
      }
    })

    renderCanvas()
    return
  } else if (isTransforming.value && tool.value === 'select') {
    // 变换选中的元素（调整大小或旋转，参考 excalidraw 的 transformElements）
    if (!pointerDownState.value) return

    const selectedElements = getSelectedElements()
    if (selectedElements.length === 0) return

    if (transformHandleType.value === 'rotation') {
      // 旋转（参考 excalidraw 的 rotateMultipleElements）
      const centerX = pointerDownState.value.center.x
      const centerY = pointerDownState.value.center.y
      const startAngle = pointerDownState.value.startAngle

      const currentAngle = (5 * Math.PI) / 2 + Math.atan2(pos.y - centerY, pos.x - centerX)
      const angle = currentAngle - startAngle

      selectedElements.forEach((element) => {
        const originalElement = pointerDownState.value.originalElements.get(element.id)
        if (!originalElement) return

        const bounds = getElementBounds(originalElement)
        if (!bounds) return

        const elementCenterX = bounds.x + bounds.width / 2
        const elementCenterY = bounds.y + bounds.height / 2

        // 计算旋转后的中心点
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const dx = elementCenterX - centerX
        const dy = elementCenterY - centerY
        const newCenterX = centerX + dx * cos - dy * sin
        const newCenterY = centerY + dx * sin + dy * cos

        // 计算偏移量
        const offsetX = newCenterX - elementCenterX
        const offsetY = newCenterY - elementCenterY

        if (element.type === 'freedraw') {
          element.points = originalElement.points.map((point) => {
            const px = point.x - elementCenterX
            const py = point.y - elementCenterY
            return {
              x: elementCenterX + px * cos - py * sin + offsetX,
              y: elementCenterY + px * sin + py * cos + offsetY
            }
          })
        } else if (element.type === 'line' || element.type === 'rect') {
          const startPx = originalElement.start.x - elementCenterX
          const startPy = originalElement.start.y - elementCenterY
          const endPx = originalElement.end.x - elementCenterX
          const endPy = originalElement.end.y - elementCenterY

          element.start = {
            x: elementCenterX + startPx * cos - startPy * sin + offsetX,
            y: elementCenterY + startPx * sin + startPy * cos + offsetY
          }
          element.end = {
            x: elementCenterX + endPx * cos - endPy * sin + offsetX,
            y: elementCenterY + endPx * sin + endPy * cos + offsetY
          }
        } else if (
          element.type === 'text' ||
          element.type === 'resource' ||
          element.type === 'fill'
        ) {
          const px = originalElement.x - elementCenterX
          const py = originalElement.y - elementCenterY
          element.x = elementCenterX + px * cos - py * sin + offsetX
          element.y = elementCenterY + px * sin + py * cos + offsetY
        }
      })
    } else if (transformHandleType.value) {
      // 调整大小（参考 excalidraw 的 resizeMultipleElements）
      const handle = transformHandleType.value

      // 获取原始边界框（始终使用原始元素，不要使用当前元素）
      const originalElements = Array.from(pointerDownState.value.originalElements.values())
      let originalBounds
      if (originalElements.length === 1) {
        originalBounds = getElementBounds(originalElements[0])
        if (originalBounds) {
          originalBounds = [
            originalBounds.x,
            originalBounds.y,
            originalBounds.x + originalBounds.width,
            originalBounds.y + originalBounds.height,
            originalBounds.x + originalBounds.width / 2,
            originalBounds.y + originalBounds.height / 2
          ]
        }
      } else {
        originalBounds = getCommonBounds(originalElements)
      }
      if (!originalBounds) return

      const [ox1, oy1, ox2, oy2] = originalBounds
      const originalWidth = ox2 - ox1
      const originalHeight = oy2 - oy1

      // 获取调整大小开始时的鼠标位置（如果不存在，使用当前鼠标位置初始化）
      if (!pointerDownState.value.resizeStartPos) {
        pointerDownState.value.resizeStartPos = { ...pos }
      }
      const resizeStartPos = pointerDownState.value.resizeStartPos
      // 计算鼠标从开始位置到当前位置的偏移
      const deltaX = pos.x - resizeStartPos.x
      const deltaY = pos.y - resizeStartPos.y

      // 计算新的尺寸（参考 excalidraw 的 getNextMultipleWidthAndHeightFromPointer）
      // 基于原始尺寸和鼠标偏移量计算，而不是直接使用鼠标绝对位置
      let newWidth = originalWidth
      let newHeight = originalHeight

      // 确定锚点和计算新尺寸（参考 excalidraw 的 getResizeAnchor）
      let anchorX = ox1
      let anchorY = oy1

      if (handle.includes('e') && handle.includes('s')) {
        // se: 锚点在 top-left
        anchorX = ox1
        anchorY = oy1
        newWidth = originalWidth + deltaX
        newHeight = originalHeight + deltaY
      } else if (handle.includes('e') && handle.includes('n')) {
        // ne: 锚点在 bottom-left
        anchorX = ox1
        anchorY = oy2
        newWidth = originalWidth + deltaX
        newHeight = originalHeight - deltaY
      } else if (handle.includes('w') && handle.includes('s')) {
        // sw: 锚点在 top-right
        anchorX = ox2
        anchorY = oy1
        newWidth = originalWidth - deltaX
        newHeight = originalHeight + deltaY
      } else if (handle.includes('w') && handle.includes('n')) {
        // nw: 锚点在 bottom-right
        anchorX = ox2
        anchorY = oy2
        newWidth = originalWidth - deltaX
        newHeight = originalHeight - deltaY
      } else if (handle === 'e') {
        // e: 锚点在 west-side (left)，保持左边界和垂直中心不变
        anchorX = ox1
        anchorY = oy1 + originalHeight / 2
        newWidth = originalWidth + deltaX
        newHeight = originalHeight
      } else if (handle === 'w') {
        // w: 锚点在 east-side (right)，保持右边界和垂直中心不变
        anchorX = ox2
        anchorY = oy1 + originalHeight / 2
        newWidth = originalWidth - deltaX
        newHeight = originalHeight
      } else if (handle === 's') {
        // s: 锚点在 north-side (top)，保持上边界和水平中心不变
        anchorX = ox1 + originalWidth / 2
        anchorY = oy1
        newWidth = originalWidth
        newHeight = originalHeight + deltaY
      } else if (handle === 'n') {
        // n: 锚点在 south-side (bottom)，保持下边界和水平中心不变
        anchorX = ox1 + originalWidth / 2
        anchorY = oy2
        newWidth = originalWidth
        newHeight = originalHeight - deltaY
      }

      // 限制最小尺寸
      if (newWidth < 10) {
        newWidth = 10
      }
      if (newHeight < 10) {
        newHeight = 10
      }

      // 计算缩放比例
      const scaleX = newWidth / originalWidth
      const scaleY = newHeight / originalHeight

      // 更新所有选中元素（基于锚点进行缩放，参考 excalidraw 的 resizeMultipleElements）
      selectedElements.forEach((element) => {
        const originalElement = pointerDownState.value.originalElements.get(element.id)
        if (!originalElement) return

        const originalBounds = getElementBounds(originalElement)
        if (!originalBounds) return

        // 计算元素相对于原始边界框的偏移
        const offsetX = originalBounds.x - ox1
        const offsetY = originalBounds.y - oy1

        // 计算新边界框的位置（基于锚点和新尺寸）
        let newBoundsX, newBoundsY
        if (handle.includes('e') && handle.includes('s')) {
          // se: 锚点在 top-left，新边界框从锚点开始
          newBoundsX = anchorX
          newBoundsY = anchorY
        } else if (handle.includes('e') && handle.includes('n')) {
          // ne: 锚点在 bottom-left，新边界框从锚点开始（但 y 需要减去高度）
          newBoundsX = anchorX
          newBoundsY = anchorY - newHeight
        } else if (handle.includes('w') && handle.includes('s')) {
          // sw: 锚点在 top-right，新边界框从锚点开始（但 x 需要减去宽度）
          newBoundsX = anchorX - newWidth
          newBoundsY = anchorY
        } else if (handle.includes('w') && handle.includes('n')) {
          // nw: 锚点在 bottom-right，新边界框从锚点开始（但 x 和 y 都需要减去）
          newBoundsX = anchorX - newWidth
          newBoundsY = anchorY - newHeight
        } else if (handle === 'e') {
          // e: 锚点在 left，新边界框从锚点开始
          newBoundsX = anchorX
          newBoundsY = anchorY - newHeight / 2
        } else if (handle === 'w') {
          // w: 锚点在 right，新边界框从锚点开始（但 x 需要减去宽度）
          newBoundsX = anchorX - newWidth
          newBoundsY = anchorY - newHeight / 2
        } else if (handle === 's') {
          // s: 锚点在 top，新边界框从锚点开始（但 y 需要减去高度的一半，因为锚点是中心）
          newBoundsX = anchorX - newWidth / 2
          newBoundsY = anchorY
        } else if (handle === 'n') {
          // n: 锚点在 bottom，新边界框从锚点开始（但 y 需要减去高度，x 需要减去宽度的一半）
          newBoundsX = anchorX - newWidth / 2
          newBoundsY = anchorY - newHeight
        } else {
          // 默认情况
          newBoundsX = anchorX
          newBoundsY = anchorY
        }

        // 基于新边界框和缩放比例计算元素的新位置和尺寸
        const newElementX = newBoundsX + offsetX * scaleX
        const newElementY = newBoundsY + offsetY * scaleY
        const newElementWidth = originalBounds.width * scaleX
        const newElementHeight = originalBounds.height * scaleY

        if (element.type === 'freedraw') {
          const elementCenterX = newElementX + newElementWidth / 2
          const elementCenterY = newElementY + newElementHeight / 2
          const originalCenterX = originalBounds.x + originalBounds.width / 2
          const originalCenterY = originalBounds.y + originalBounds.height / 2

          element.points = originalElement.points.map((point) => ({
            x: elementCenterX + (point.x - originalCenterX) * scaleX,
            y: elementCenterY + (point.y - originalCenterY) * scaleY
          }))
        } else if (element.type === 'line' || element.type === 'rect') {
          const elementCenterX = newElementX + newElementWidth / 2
          const elementCenterY = newElementY + newElementHeight / 2
          const originalCenterX = originalBounds.x + originalBounds.width / 2
          const originalCenterY = originalBounds.y + originalBounds.height / 2

          element.start = {
            x: elementCenterX + (originalElement.start.x - originalCenterX) * scaleX,
            y: elementCenterY + (originalElement.start.y - originalCenterY) * scaleY
          }
          element.end = {
            x: elementCenterX + (originalElement.end.x - originalCenterX) * scaleX,
            y: elementCenterY + (originalElement.end.y - originalCenterY) * scaleY
          }
        } else if (
          element.type === 'text' ||
          element.type === 'resource' ||
          element.type === 'fill'
        ) {
          element.x = newElementX
          element.y = newElementY
          if (element.width) {
            element.width = newElementWidth
          }
          if (element.height) {
            element.height = newElementHeight
          }
        }
      })
    }

    renderCanvas()
    return
  } else if (isSelecting.value && tool.value === 'select') {
    // 更新选框
    selectionEnd.value = { ...pos }
    renderCanvas() // 重新渲染以显示选框
  } else if (drawingActive.value && (tool.value === 'pencil' || tool.value === 'eraser')) {
    continueDrawing(pos)
  } else if (drawingActive.value && (tool.value === 'line' || tool.value === 'rect')) {
    drawShapePreview(pos)
  }

  // 更新光标样式（当不在拖拽或变换时）
  if (tool.value === 'select' && !isDragging.value && !isTransforming.value && !isSelecting.value) {
    updateCursorStyle(pos)
  }
}

function handleCanvasMouseUp() {
  if (panning.value) {
    panning.value = false
    return
  }

  if (isDragging.value && tool.value === 'select') {
    // 移动完成
    isDragging.value = false
    pointerDownState.value = null
    canvasCursor.value = 'default'
    if (history.value) {
      history.value.saveState()
    }
  } else if (isTransforming.value && tool.value === 'select') {
    // 变换完成（调整大小或旋转）
    isTransforming.value = false
    transformHandleType.value = null
    pointerDownState.value = null
    canvasCursor.value = 'default'
    if (history.value) {
      history.value.saveState()
    }
  } else if (isSelecting.value && tool.value === 'select') {
    // 选框完成，选中框内的所有元素（参考 excalidraw）
    isSelecting.value = false
    const box = {
      x: Math.min(selectionStart.value.x, selectionEnd.value.x),
      y: Math.min(selectionStart.value.y, selectionEnd.value.y),
      width: Math.abs(selectionEnd.value.x - selectionStart.value.x),
      height: Math.abs(selectionEnd.value.y - selectionStart.value.y)
    }

    if (box.width > 5 && box.height > 5) {
      // 选框足够大，选中框内的元素
      const selectedIds = getElementsInSelectionBox(box)
      // 支持多选：如果按住 shift/ctrl/cmd，则添加到选中，否则替换
      // 注意：这里无法访问 e，所以暂时不支持多选，直接替换选中
      selectedElementIds.value = selectedIds
      renderCanvas()
    }

    // 清除选框
    selectionStart.value = null
    selectionEnd.value = null
  } else if (drawingActive.value) {
    if (tool.value === 'pencil' && currentFreeDrawPath.value) {
      // 完成画笔路径
      if (currentFreeDrawPath.value.points.length > 1) {
        freeDrawElements.value.push({ ...currentFreeDrawPath.value })
        // 绘制完成时更新边界并重新渲染
        renderCanvas(true)
        if (history.value) {
          history.value.saveState()
        }
      }
      currentFreeDrawPath.value = null
    } else if (tool.value === 'line' || tool.value === 'rect') {
      finishShape()
    } else if (tool.value === 'eraser') {
      // 橡皮擦完成
      if (history.value) {
        history.value.saveState()
      }
    }
    drawingActive.value = false
  }
}

// ==================== 容器事件处理（用于平移） ====================
function handleContainerMouseDown(e) {
  if (tool.value === 'move' || e.button === 1 || (e.button === 0 && spaceKeyPressed.value)) {
    panning.value = true
    panStart.value = {
      x: e.clientX,
      y: e.clientY
    }
    e.preventDefault()
    if (tool.value !== 'move') {
      canvasCursor.value = 'grabbing'
    }
  }
}

function handleContainerMouseMove(e) {
  if (panning.value && editorContainerRef.value) {
    const containerRect = editorContainerRef.value.getBoundingClientRect()
    // 计算鼠标在场景坐标系中的位置
    const sceneX = (e.clientX - containerRect.left) / scale.value - scrollX.value
    const sceneY = (e.clientY - containerRect.top) / scale.value - scrollY.value
    // 计算开始平移时的场景坐标
    const startSceneX = (panStart.value.x - containerRect.left) / scale.value - scrollX.value
    const startSceneY = (panStart.value.y - containerRect.top) / scale.value - scrollY.value
    // 计算 scrollX 和 scrollY 的变化
    scrollX.value = scrollX.value - (sceneX - startSceneX)
    scrollY.value = scrollY.value - (sceneY - startSceneY)
    // 更新 panStart
    panStart.value = { x: e.clientX, y: e.clientY }
  }
}

function handleContainerMouseUp() {
  if (panning.value) {
    panning.value = false
    if (tool.value !== 'move' && !spaceKeyPressed.value) {
      // 重置光标为默认值
      canvasCursor.value = 'default'
    }
  }
}

// ==================== 绘制功能 ====================
function startDrawing(pos) {
  if (!canvasRef.value || !history.value) return
  drawingActive.value = true
  lastPoint.value = { ...pos }

  if (tool.value === 'pencil') {
    // 开始新的画笔路径（参考 excalidraw）
    currentFreeDrawPath.value = {
      type: 'freedraw',
      points: [{ x: pos.x, y: pos.y }],
      color: color.value,
      strokeWidth: size.value,
      opacity: opacity.value,
      id: Date.now().toString()
    }
    history.value.saveState()
  } else if (tool.value === 'eraser') {
    // 橡皮擦仍然使用直接绘制的方式
    history.value.saveState()
  }
}

function continueDrawing(pos) {
  if (!canvasRef.value) return

  if (tool.value === 'pencil' && currentFreeDrawPath.value) {
    // 添加点到当前路径
    currentFreeDrawPath.value.points.push({ x: pos.x, y: pos.y })
    // 重新渲染画布（但不更新边界，避免画布尺寸频繁变化导致内容丢失）
    renderCanvas(false)
  } else if (tool.value === 'eraser') {
    // 橡皮擦使用直接绘制的方式
    const ctx = canvasRef.value.getContext('2d')
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = size.value

    ctx.beginPath()
    ctx.moveTo(lastPoint.value.x, lastPoint.value.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()

    lastPoint.value = { ...pos }
  }
}

function startShape(pos) {
  if (!canvasRef.value || !history.value) return
  drawingActive.value = true
  shapeStart.value = { ...pos }
  currentShape.value = {
    type: tool.value,
    start: { ...pos },
    end: { ...pos },
    color: color.value,
    strokeWidth: size.value,
    id: Date.now().toString()
  }
  history.value.saveState()
}

function drawShapePreview(pos) {
  if (!canvasRef.value || !currentShape.value) return
  // 更新形状的结束点
  currentShape.value.end = { ...pos }
  // 重新渲染画布（但不更新边界，避免画布尺寸频繁变化）
  renderCanvas(false)
}

function finishShape() {
  if (!canvasRef.value || !currentShape.value) return

  // 保存完成的形状
  shapeElements.value.push({ ...currentShape.value })
  // 重新渲染画布
  renderCanvas()
  if (history.value) {
    history.value.saveState()
  }
  currentShape.value = null
}

// ==================== 元素边界计算 ====================
// 获取元素的边界框（参考 excalidraw）
function getElementBounds(element) {
  if (element.type === 'freedraw') {
    // 画笔路径：计算所有点的边界
    if (!element.points || element.points.length === 0) return null
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    element.points.forEach((point) => {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    })
    // 考虑 strokeWidth
    const padding = (element.strokeWidth || 5) / 2
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    }
  } else if (element.type === 'line') {
    // 线条：计算起点和终点的边界
    const minX = Math.min(element.start.x, element.end.x)
    const minY = Math.min(element.start.y, element.end.y)
    const maxX = Math.max(element.start.x, element.end.x)
    const maxY = Math.max(element.start.y, element.end.y)
    const padding = (element.strokeWidth || 2) / 2
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    }
  } else if (element.type === 'rect') {
    // 矩形：直接使用坐标
    const minX = Math.min(element.start.x, element.end.x)
    const minY = Math.min(element.start.y, element.end.y)
    const maxX = Math.max(element.start.x, element.end.x)
    const maxY = Math.max(element.start.y, element.end.y)
    const padding = (element.strokeWidth || 2) / 2
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    }
  } else if (element.type === 'text') {
    // 文字：使用 x, y, width, height
    return {
      x: element.x,
      y: element.y,
      width: element.width || 0,
      height: element.height || 0
    }
  } else if (element.type === 'resource') {
    // 资源：使用 x, y, width, height
    return {
      x: element.x - 20,
      y: element.y - 20,
      width: element.width || 40,
      height: element.height || 40
    }
  } else if (element.type === 'fill') {
    // 填充区域
    return {
      x: element.x,
      y: element.y,
      width: element.width || 0,
      height: element.height || 0
    }
  }
  return null
}

// 检查点是否在元素内（参考 excalidraw）
function isPointInElement(point, element) {
  const bounds = getElementBounds(element)
  if (!bounds) return false

  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  )
}

// 获取选框内的所有元素
function getElementsInSelectionBox(box) {
  const selectedIds = new Set()

  // 检查所有元素
  freeDrawElements.value.forEach((element) => {
    const bounds = getElementBounds(element)
    if (bounds && isElementInBox(bounds, box)) {
      selectedIds.add(element.id)
    }
  })

  shapeElements.value.forEach((element) => {
    const bounds = getElementBounds(element)
    if (bounds && isElementInBox(bounds, box)) {
      selectedIds.add(element.id)
    }
  })

  textElements.value.forEach((element) => {
    const bounds = getElementBounds(element)
    if (bounds && isElementInBox(bounds, box)) {
      selectedIds.add(element.id)
    }
  })

  resourceElements.value.forEach((element) => {
    const bounds = getElementBounds(element)
    if (bounds && isElementInBox(bounds, box)) {
      selectedIds.add(element.id)
    }
  })

  fillElements.value.forEach((element) => {
    const bounds = getElementBounds(element)
    if (bounds && isElementInBox(bounds, box)) {
      selectedIds.add(element.id)
    }
  })

  return selectedIds
}

// 检查元素的边界框是否完全在选框内
function isElementInBox(elementBounds, box) {
  return (
    elementBounds.x >= box.x &&
    elementBounds.y >= box.y &&
    elementBounds.x + elementBounds.width <= box.x + box.width &&
    elementBounds.y + elementBounds.height <= box.y + box.height
  )
}

// ==================== 油漆桶填充 ====================
function fillBucket(pos) {
  if (!canvasRef.value || !history.value) return
  const ctx = canvasRef.value.getContext('2d')
  history.value.saveState()

  // 先渲染当前画布，获取最新状态
  renderCanvas()

  const imageData = ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height)
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height

  const x = Math.floor(pos.x)
  const y = Math.floor(pos.y)
  if (x < 0 || x >= width || y < 0 || y >= height) return

  const startIdx = (y * width + x) * 4
  const startColor = [data[startIdx], data[startIdx + 1], data[startIdx + 2], data[startIdx + 3]]
  const fillColor = hexToRgba(color.value)

  if (colorsMatch(startColor, fillColor)) return

  const stack = [[x, y]]
  const visited = new Set()

  while (stack.length) {
    const [cx, cy] = stack.pop()
    const key = `${cx},${cy}`
    if (visited.has(key) || cx < 0 || cy < 0 || cx >= width || cy >= height) continue
    visited.add(key)

    const idx = (cy * width + cx) * 4
    const currColor = [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]]
    if (!colorsMatch(currColor, startColor)) continue

    data[idx] = fillColor[0]
    data[idx + 1] = fillColor[1]
    data[idx + 2] = fillColor[2]
    data[idx + 3] = fillColor[3]

    stack.push([cx + 1, cy])
    stack.push([cx - 1, cy])
    stack.push([cx, cy + 1])
    stack.push([cx, cy - 1])
  }

  // 计算填充区域的边界
  const visitedArray = Array.from(visited)
  if (visitedArray.length === 0) return

  const minX = Math.min(...visitedArray.map((key) => parseInt(key.split(',')[0])))
  const maxX = Math.max(...visitedArray.map((key) => parseInt(key.split(',')[0])))
  const minY = Math.min(...visitedArray.map((key) => parseInt(key.split(',')[1])))
  const maxY = Math.max(...visitedArray.map((key) => parseInt(key.split(',')[1])))

  // 裁剪 imageData 到填充区域
  const fillWidth = maxX - minX + 1
  const fillHeight = maxY - minY + 1
  const fillImageData = ctx.createImageData(fillWidth, fillHeight)

  for (let fy = 0; fy < fillHeight; fy++) {
    for (let fx = 0; fx < fillWidth; fx++) {
      const srcX = minX + fx
      const srcY = minY + fy
      const srcIdx = (srcY * width + srcX) * 4
      const dstIdx = (fy * fillWidth + fx) * 4

      fillImageData.data[dstIdx] = data[srcIdx]
      fillImageData.data[dstIdx + 1] = data[srcIdx + 1]
      fillImageData.data[dstIdx + 2] = data[srcIdx + 2]
      fillImageData.data[dstIdx + 3] = data[srcIdx + 3]
    }
  }

  // 将 imageData 转换为 base64 字符串以便序列化
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = fillWidth
  tempCanvas.height = fillHeight
  const tempCtx = tempCanvas.getContext('2d')
  tempCtx.putImageData(fillImageData, 0, 0)
  const imageDataBase64 = tempCanvas.toDataURL('image/png')

  // 保存填充元素
  fillElements.value.push({
    type: 'fill',
    x: minX,
    y: minY,
    width: fillWidth,
    height: fillHeight,
    imageDataBase64: imageDataBase64,
    id: Date.now().toString()
  })

  // 重新渲染画布
  renderCanvas()
  history.value.saveState()
}

function colorsMatch(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]
}

function hexToRgba(hex) {
  let c = hex.replace('#', '')
  if (c.length === 3) {
    c = c
      .split('')
      .map((s) => s + s)
      .join('')
  }
  const num = parseInt(c, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 255]
}

// ==================== 文字工具 ====================
const editingTextElement = ref(null) // 当前正在编辑的文字元素

function showTextInput(e, element = null) {
  if (!canvasRef.value) return
  // 使用 getCanvasPos 获取画布坐标
  const pos = getCanvasPos(e)

  if (element) {
    // 编辑现有文字元素
    editingTextElement.value = { ...element }
    textInputValue.value = element.text
    textInputPosition.value = { x: element.x, y: element.y }
  } else {
    // 创建新文字元素
    editingTextElement.value = {
      fontSize: 14,
      fontFamily: 'Arial',
      textAlign: 'left',
      lineHeight: 1.2,
      color: color.value
    }
    textInputValue.value = ''
    textInputPosition.value = { x: pos.x, y: pos.y }
  }

  textInputVisible.value = true

  nextTick(() => {
    if (textInputRef.value) {
      textInputRef.value.focus()
      if (!element) {
        textInputRef.value.select()
      } else {
        // 编辑时，将光标移到末尾
        const length = textInputRef.value.value.length
        textInputRef.value.setSelectionRange(length, length)
      }
      // 自动调整 textarea 大小
      adjustTextareaSize()
    }
  })
}

function handleTextInput() {
  // 实时更新预览
  if (editingTextElement.value && textInputRef.value) {
    adjustTextareaSize()
    // 如果正在编辑现有元素，实时更新
    if (editingTextElement.value.id) {
      const element = textElements.value.find((el) => el.id === editingTextElement.value.id)
      if (element) {
        element.text = textInputValue.value
        renderCanvas()
      }
    }
  }
}

function adjustTextareaSize() {
  if (!textInputRef.value) return
  // 重置高度以获取正确的 scrollHeight
  textInputRef.value.style.height = 'auto'

  const lineHeight = editingTextElement.value?.lineHeight || 1.2
  const fontSize = editingTextElement.value?.fontSize || 14
  const padding = 8 // 上下 padding 各 4px，总共 8px
  const oneLineHeight = fontSize * lineHeight + padding // 一行文本高度 + padding

  // 获取内容高度（不包含 padding）
  const contentHeight = textInputRef.value.scrollHeight

  // 判断内容是否只有一行或为空
  // scrollHeight 减去 padding 应该等于或小于一行高度
  const actualContentHeight = contentHeight - padding
  const isSingleLine = actualContentHeight <= fontSize * lineHeight

  if (isSingleLine) {
    // 如果内容为空或只有一行，只显示一行文本高度 + padding
    textInputRef.value.style.height = oneLineHeight + 'px'
  } else {
    // 如果超过一行，按最大内容高度显示（scrollHeight 已经包含了 padding）
    textInputRef.value.style.height = contentHeight + 'px'
  }
}

function confirmTextInput() {
  // 如果有内容，才保存
  if (textInputValue.value.trim() && canvasRef.value && history.value) {
    if (editingTextElement.value?.id) {
      // 更新现有文字元素
      const element = textElements.value.find((el) => el.id === editingTextElement.value.id)
      if (element) {
        history.value.saveState()
        element.text = textInputValue.value
        element.fontSize = editingTextElement.value.fontSize
        element.fontFamily = editingTextElement.value.fontFamily
        element.textAlign = editingTextElement.value.textAlign
        element.lineHeight = editingTextElement.value.lineHeight
        element.color = editingTextElement.value.color
        // 重新计算尺寸
        const ctx = canvasRef.value.getContext('2d')
        ctx.font = `${element.fontSize}px ${element.fontFamily}`
        ctx.textAlign = element.textAlign
        const lines = element.text.split('\n')
        let maxWidth = 0
        lines.forEach((line) => {
          const metrics = ctx.measureText(line)
          maxWidth = Math.max(maxWidth, metrics.width)
        })
        element.width = maxWidth
        element.height = lines.length * element.fontSize * element.lineHeight
        renderCanvas()
        history.value.saveState()
      }
    } else {
      // 创建新文字元素
      const canvasX = textInputPosition.value.x
      const canvasY = textInputPosition.value.y
      drawTextOnCanvas(textInputValue.value, canvasX, canvasY)
    }
  }
  // 无论是否有内容，都关闭输入框
  textInputVisible.value = false
  textInputValue.value = ''
  editingTextElement.value = null
}

function cancelTextInput() {
  // 如果正在编辑现有元素，恢复原文本
  if (editingTextElement.value?.id) {
    const element = textElements.value.find((el) => el.id === editingTextElement.value.id)
    if (element) {
      renderCanvas()
    }
  }
  textInputVisible.value = false
  textInputValue.value = ''
  editingTextElement.value = null
}

function drawTextOnCanvas(text, x, y) {
  if (!canvasRef.value || !history.value) return
  history.value.saveState()

  // 计算文字尺寸
  const fontSize = editingTextElement.value?.fontSize || 14
  const fontFamily = editingTextElement.value?.fontFamily || 'Arial'
  const lineHeight = editingTextElement.value?.lineHeight || 1.2
  const textAlign = editingTextElement.value?.textAlign || 'left'
  const lines = text.split('\n')
  const ctx = canvasRef.value.getContext('2d')
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.textAlign = textAlign

  // 计算文字宽度和高度
  let maxWidth = 0
  lines.forEach((line) => {
    const metrics = ctx.measureText(line)
    maxWidth = Math.max(maxWidth, metrics.width)
  })
  const textHeight = lines.length * fontSize * lineHeight

  // 保存文字元素
  textElements.value.push({
    type: 'text',
    text: text,
    x: x,
    y: y,
    width: maxWidth,
    height: textHeight,
    fontSize: fontSize,
    fontFamily: fontFamily,
    textAlign: textAlign,
    lineHeight: lineHeight,
    color: editingTextElement.value?.color || color.value,
    id: Date.now().toString()
  })

  // 重新渲染画布
  renderCanvas()
  history.value.saveState()
}

// 双击文字元素进行编辑
function handleTextDoubleClick(e) {
  if (tool.value !== 'text') return
  // 使用 getCanvasPos 获取画布坐标
  const pos = getCanvasPos(e)

  // 查找点击的文字元素
  const clickedElement = textElements.value.find((element) => {
    const right = element.x + (element.width || 0)
    const bottom = element.y + (element.height || 0)
    return pos.x >= element.x && pos.x <= right && pos.y >= element.y && pos.y <= bottom
  })

  if (clickedElement) {
    showTextInput(e, clickedElement)
  }
}

// ==================== 资源工具 ====================
function selectResource(resource) {
  startResourceDrag(resource, null)
}

function startResourceDrag(resource, event) {
  draggingResource.value = resource
  if (!dragPreviewEl.value) {
    dragPreviewEl.value = document.createElement('img')
    dragPreviewEl.value.src = resource.url
    dragPreviewEl.value.style.position = 'fixed'
    dragPreviewEl.value.style.pointerEvents = 'none'
    dragPreviewEl.value.style.zIndex = '9999'
    dragPreviewEl.value.style.width = '40px'
    dragPreviewEl.value.style.height = '40px'
    document.body.appendChild(dragPreviewEl.value)
  }
  window.addEventListener('mousemove', onResourceDragMove)
  window.addEventListener('mouseup', onResourceDragEnd)
  if (event) {
    onResourceDragMove(event)
  }
}

function onResourceDragMove(e) {
  if (!dragPreviewEl.value) return
  dragPreviewEl.value.style.left = e.clientX - 20 + 'px'
  dragPreviewEl.value.style.top = e.clientY - 20 + 'px'
}

function onResourceDragEnd(e) {
  if (!draggingResource.value || !canvasRef.value) return
  const canvasRect = canvasRef.value.getBoundingClientRect()
  if (
    e.clientX >= canvasRect.left &&
    e.clientX <= canvasRect.right &&
    e.clientY >= canvasRect.top &&
    e.clientY <= canvasRect.bottom
  ) {
    // 使用 getCanvasPos 获取画布坐标
    const pos = getCanvasPos(e)
    drawResourceOnCanvas(draggingResource.value, pos.x, pos.y)
  }
  if (dragPreviewEl.value) {
    document.body.removeChild(dragPreviewEl.value)
    dragPreviewEl.value = null
  }
  draggingResource.value = null
  window.removeEventListener('mousemove', onResourceDragMove)
  window.removeEventListener('mouseup', onResourceDragEnd)
}

function onResourceMouseDown(resource, event) {
  event.preventDefault()
  startResourceDrag(resource, event)
}

function drawResourceOnCanvas(resource, x, y) {
  if (!canvasRef.value || !history.value) return
  history.value.saveState()

  // 保存资源元素
  resourceElements.value.push({
    type: 'resource',
    url: resource.url,
    name: resource.name,
    x: x,
    y: y,
    width: 40,
    height: 40,
    id: Date.now().toString()
  })

  // 重新渲染画布
  renderCanvas()
  history.value.saveState()
}

// ==================== 缩放功能 ====================
function handleWheel(e) {
  e.preventDefault()

  // Shift + 滚轮：平移
  if (e.shiftKey || tool.value === 'move') {
    const deltaX = e.deltaX || 0
    const deltaY = e.deltaY || 0
    scrollX.value += (deltaX * 0.5) / scale.value
    scrollY.value += (deltaY * 0.5) / scale.value
    return
  }

  // Ctrl/Cmd + 滚轮：缩放（以鼠标位置为中心，参考 excalidraw）
  if (e.ctrlKey || e.metaKey) {
    if (!editorContainerRef.value) return
    const containerRect = editorContainerRef.value.getBoundingClientRect()
    const mouseX = e.clientX - containerRect.left
    const mouseY = e.clientY - containerRect.top

    // 计算鼠标在场景坐标系中的位置（使用 viewportCoordsToSceneCoords）
    const sceneX = mouseX / scale.value - scrollX.value
    const sceneY = mouseY / scale.value - scrollY.value

    const delta = e.deltaY
    const zoomFactor = 0.1
    let newScale = scale.value
    if (delta < 0) {
      newScale = Math.min(scale.value + zoomFactor, maxScale)
    } else {
      newScale = Math.max(scale.value - zoomFactor, minScale)
    }

    // 调整 scrollX 和 scrollY 以保持鼠标位置不变
    // 新的 scrollX 应该满足: mouseX = (sceneX + newScrollX) * newScale
    // 所以: newScrollX = mouseX / newScale - sceneX
    scrollX.value = mouseX / newScale - sceneX
    scrollY.value = mouseY / newScale - sceneY

    scale.value = newScale
  }
}

// ==================== 历史记录操作 ====================
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

      // 清空所有绘制元素
      freeDrawElements.value = []
      shapeElements.value = []
      textElements.value = []
      resourceElements.value = []
      fillElements.value = []
      currentFreeDrawPath.value = null
      currentShape.value = null

      // 重新渲染画布（只绘制背景色）
      renderCanvas()
      history.value.saveState()

      ElMessage.success('画板已清空')
    })
    .catch(() => {
      // 用户取消
    })
}

// ==================== 初始化画布 ====================
function resetCanvas() {
  if (!canvasRef.value) return

  // 清空所有绘制元素
  freeDrawElements.value = []
  shapeElements.value = []
  textElements.value = []
  resourceElements.value = []
  fillElements.value = []
  currentFreeDrawPath.value = null
  currentShape.value = null

  // 渲染画布（只绘制背景色）
  renderCanvas()
  if (history.value) {
    history.value.init()
  }
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
    // 先渲染画布，确保画布是最新状态
    renderCanvas()
    // 获取canvas内容
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
  // 防止在输入框中触发
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    return
  }

  // 工具快捷键
  if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
    switch (e.key.toLowerCase()) {
      case 'v':
        selectTool('select')
        break
      case 'h':
        selectTool('move')
        break
      case 'p':
        selectTool('pencil')
        break
      case 'e':
        selectTool('eraser')
        break
      case 'l':
        selectTool('line')
        break
      case 'r':
        selectTool('rect')
        break
      case 'b':
        selectTool('bucket')
        break
      case 't':
        selectTool('text')
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
  // 初始化历史记录管理器
  nextTick(() => {
    if (canvasRef.value) {
      history.value = new HistoryManager(canvasRef.value)
      // 设置回调函数
      history.value.renderCallback = renderCanvas
      history.value.getStateCallback = () => ({
        freeDrawElements: freeDrawElements.value,
        shapeElements: shapeElements.value,
        textElements: textElements.value,
        resourceElements: resourceElements.value,
        fillElements: fillElements.value,
        backgroundColor: backgroundColor.value
      })
      history.value.setStateCallback = (state) => {
        freeDrawElements.value = state.freeDrawElements || []
        shapeElements.value = state.shapeElements || []
        textElements.value = state.textElements || []
        resourceElements.value = state.resourceElements || []
        fillElements.value = state.fillElements || []
        backgroundColor.value = state.backgroundColor || '#ffffff'
      }
      resetCanvas()
    }
  })

  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)

  // 清理资源拖拽
  if (dragPreviewEl.value) {
    try {
      document.body.removeChild(dragPreviewEl.value)
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
  overflow: hidden; // 隐藏滚动条，使用 transform 来移动画布（参考 excalidraw）

  .editor-container {
    flex: 1;
    width: 100%;
    position: relative;
    overflow: hidden; // 隐藏滚动条
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
  top: 60px;
  right: 20px;
  z-index: 1000;
  padding: 8px 12px;
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
