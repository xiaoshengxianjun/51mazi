<template>
  <LayoutTool :title="mapName || '地图设计'">
    <template #headrAction>
      <el-button type="primary" @click="handleSave">保存地图</el-button>
    </template>
    <template #default>
      <div class="content">
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

        <!-- 滑块控制工具 -->
        <MapSlider
          v-if="tool === 'pencil' || tool === 'eraser'"
          v-model="size"
          :min="sliderConfig.min"
          :max="sliderConfig.max"
          :step="sliderConfig.step"
          :visible="tool === 'pencil' || tool === 'eraser'"
        />

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
            <!-- 背景图片 -->
            <img
              v-if="mapImage"
              ref="mapImageRef"
              :src="mapImage"
              :style="imageStyle"
              class="map-bg"
              @load="handleImageLoad"
            />
            <!-- 绘制画布 -->
            <canvas
              ref="canvasRef"
              :width="canvasWidth"
              :height="canvasHeight"
              class="draw-canvas"
              :style="{ cursor: canvasCursor }"
              @mousedown="handleCanvasMouseDown"
              @mousemove="handleCanvasMouseMove"
              @mouseup="handleCanvasMouseUp"
              @mouseleave="handleCanvasMouseUp"
              @touchstart.prevent="handleCanvasMouseDown"
              @touchmove.prevent="handleCanvasMouseMove"
              @touchend.prevent="handleCanvasMouseUp"
            ></canvas>

            <!-- 选框预览层 -->
            <canvas
              v-if="tool === 'select'"
              ref="selectionCanvasRef"
              :width="canvasWidth"
              :height="canvasHeight"
              class="selection-canvas"
            ></canvas>

            <!-- 文字输入框 -->
            <div
              v-if="textInputVisible"
              class="text-input-overlay"
              :style="{
                left: textInputPosition.x + 'px',
                top: textInputPosition.y + 'px',
                transform: 'translateY(-50%)'
              }"
              @mousedown.stop
              @click.stop
            >
              <input
                ref="textInputRef"
                v-model="textInputValue"
                type="text"
                class="text-input"
                placeholder="输入文字..."
                @keydown.enter="confirmTextInput"
                @keydown.esc="cancelTextInput"
                @mousedown.stop
                @click.stop
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </LayoutTool>
</template>

<script setup>
import LayoutTool from '@renderer/components/LayoutTool.vue'
import MapToolbar from '@renderer/components/Map/MapToolbar.vue'
import MapSlider from '@renderer/components/Map/MapSlider.vue'
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const route = useRoute()
const bookName = route.query.name
const mapId = route.query.id

// ==================== 基础数据 ====================
const mapName = ref('')
const isEdit = computed(() => !!mapId)
const mapImage = ref(null)
const editorContainerRef = ref(null)
const mapImageRef = ref(null)
const canvasRef = ref(null)
const selectionCanvasRef = ref(null)

// ==================== 画布尺寸和变换 ====================
// 无限画板：使用较大的默认尺寸，支持动态扩展
const canvasWidth = ref(1920)
const canvasHeight = ref(1080)
const scale = ref(1)
const minScale = 0.1
const maxScale = 5

// 画布平移
const panning = ref(false)
const panStart = ref({ x: 0, y: 0 })
const panOffset = ref({ x: 0, y: 0 })
const spaceKeyPressed = ref(false)

// ==================== 工具栏状态 ====================
const tool = ref('select') // select, move, pencil, eraser, line, rect, bucket, text, resource
const color = ref('#222222')
const size = ref(5)

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
      max: 40,
      step: 1
    }
  }
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

// ==================== 绘制状态 ====================
const drawingActive = ref(false)
const lastPoint = ref({ x: 0, y: 0 })
const shapeStart = ref({ x: 0, y: 0 })
const currentShape = ref(null)

// ==================== 选框状态 ====================
const selectionStart = ref(null)
const selectionEnd = ref(null)
const isSelecting = ref(false)

// ==================== 文字工具 ====================
const textInputVisible = ref(false)
const textInputValue = ref('')
const textInputPosition = ref({ x: 0, y: 0 })
const textInputRef = ref(null)

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
  }

  // 保存当前状态
  saveState() {
    if (!this.canvas) return
    const ctx = this.canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)

    // 移除当前位置之后的历史（如果有回退操作）
    this.history = this.history.slice(0, this.currentIndex + 1)

    // 添加新状态
    this.history.push(imageData)
    this.currentIndex++

    // 限制历史记录数量
    if (this.history.length > this.maxHistory) {
      this.history.shift()
      this.currentIndex--
    }
  }

  // 撤销
  undo() {
    if (this.canUndo()) {
      const ctx = this.canvas.getContext('2d')
      this.currentIndex--
      ctx.putImageData(this.history[this.currentIndex], 0, 0)
      return true
    }
    return false
  }

  // 回退
  redo() {
    if (this.canRedo()) {
      const ctx = this.canvas.getContext('2d')
      this.currentIndex++
      ctx.putImageData(this.history[this.currentIndex], 0, 0)
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
    if (!this.canvas) return
    const ctx = this.canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    this.history = [imageData]
    this.currentIndex = 0
  }
}

const history = ref(null)

// ==================== 计算属性 ====================
const canvasWrapStyle = computed(() => ({
  position: 'relative',
  width: canvasWidth.value + 'px',
  height: canvasHeight.value + 'px',
  margin: '0 auto',
  background: '#fff',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  transform: `translate(${panOffset.value.x}px, ${panOffset.value.y}px) scale(${scale.value})`,
  transformOrigin: 'center center',
  transition: panning.value ? 'none' : 'transform 0.1s ease-out'
}))

const imageStyle = computed(() => ({
  position: 'absolute',
  left: 0,
  top: 0,
  width: canvasWidth.value + 'px',
  height: canvasHeight.value + 'px',
  zIndex: 0
}))

const canvasCursor = computed(() => {
  if (panning.value) return 'grabbing'
  switch (tool.value) {
    case 'select':
      return 'default'
    case 'move':
      return spaceKeyPressed.value ? 'grabbing' : 'grab'
    case 'pencil':
    case 'eraser':
    case 'line':
    case 'rect':
      return 'crosshair'
    case 'text':
      return 'text'
    case 'bucket':
    case 'resource':
      return 'crosshair'
    default:
      return 'default'
  }
})

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
  clearSelection()
}

// 监听工具变化，处理工具切换逻辑
function onToolChange(newTool) {
  if (newTool === 'pencil') {
    size.value = 5
  } else if (newTool === 'eraser') {
    size.value = 10
  }
  clearSelection()
}

// ==================== 坐标转换 ====================
function getCanvasPos(e) {
  if (!canvasRef.value) return { x: 0, y: 0 }
  const rect = canvasRef.value.getBoundingClientRect()
  let x, y
  if (e.touches) {
    x = (e.touches[0].clientX - rect.left - panOffset.value.x) / scale.value
    y = (e.touches[0].clientY - rect.top - panOffset.value.y) / scale.value
  } else {
    x = (e.clientX - rect.left - panOffset.value.x) / scale.value
    y = (e.clientY - rect.top - panOffset.value.y) / scale.value
  }
  return { x, y }
}

// ==================== 画布事件处理 ====================
function handleCanvasMouseDown(e) {
  if (tool.value === 'move' || spaceKeyPressed.value) {
    // 移动工具：开始平移
    panning.value = true
    panStart.value = { x: e.clientX - panOffset.value.x, y: e.clientY - panOffset.value.y }
    return
  }

  const pos = getCanvasPos(e)

  if (tool.value === 'select') {
    // 选框工具
    isSelecting.value = true
    selectionStart.value = { ...pos }
    selectionEnd.value = { ...pos }
    drawSelection()
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
    // 文字
    showTextInput(e)
  }
}

function handleCanvasMouseMove(e) {
  if (panning.value) {
    panOffset.value.x = e.clientX - panStart.value.x
    panOffset.value.y = e.clientY - panStart.value.y
    return
  }

  const pos = getCanvasPos(e)

  if (isSelecting.value && tool.value === 'select') {
    selectionEnd.value = { ...pos }
    drawSelection()
  } else if (drawingActive.value && (tool.value === 'pencil' || tool.value === 'eraser')) {
    continueDrawing(pos)
  } else if (drawingActive.value && (tool.value === 'line' || tool.value === 'rect')) {
    drawShapePreview(pos)
  }
}

function handleCanvasMouseUp() {
  if (panning.value) {
    panning.value = false
    return
  }

  if (isSelecting.value && tool.value === 'select') {
    isSelecting.value = false
    // 选框完成，可以在这里添加选择区域的处理逻辑
  } else if (drawingActive.value) {
    if (tool.value === 'line' || tool.value === 'rect') {
      finishShape()
    }
    drawingActive.value = false
  }
}

// ==================== 容器事件处理（用于平移） ====================
function handleContainerMouseDown(e) {
  if (tool.value === 'move' || e.button === 1 || (e.button === 0 && spaceKeyPressed.value)) {
    panning.value = true
    panStart.value = { x: e.clientX - panOffset.value.x, y: e.clientY - panOffset.value.y }
    e.preventDefault()
    if (tool.value !== 'move') {
      document.body.style.cursor = 'grabbing'
    }
  }
}

function handleContainerMouseMove(e) {
  if (panning.value) {
    panOffset.value.x = e.clientX - panStart.value.x
    panOffset.value.y = e.clientY - panStart.value.y
  }
}

function handleContainerMouseUp() {
  if (panning.value) {
    panning.value = false
    if (tool.value !== 'move' && !spaceKeyPressed.value) {
      document.body.style.cursor = ''
    }
  }
}

// ==================== 绘制功能 ====================
function startDrawing(pos) {
  if (!canvasRef.value || !history.value) return
  drawingActive.value = true
  lastPoint.value = { ...pos }
  history.value.saveState()
}

function continueDrawing(pos) {
  if (!canvasRef.value) return
  const ctx = canvasRef.value.getContext('2d')
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = size.value

  if (tool.value === 'pencil') {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = color.value
  } else if (tool.value === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
  }

  ctx.beginPath()
  ctx.moveTo(lastPoint.value.x, lastPoint.value.y)
  ctx.lineTo(pos.x, pos.y)
  ctx.stroke()
  lastPoint.value = { ...pos }
}

function startShape(pos) {
  if (!canvasRef.value || !history.value) return
  drawingActive.value = true
  shapeStart.value = { ...pos }
  currentShape.value = { type: tool.value, start: { ...pos }, end: { ...pos } }
  history.value.saveState()
}

function drawShapePreview(pos) {
  if (!canvasRef.value || !currentShape.value) return
  const ctx = canvasRef.value.getContext('2d')

  // 恢复画布状态
  if (history.value && history.value.history.length > 0) {
    const lastState = history.value.history[history.value.currentIndex]
    ctx.putImageData(lastState, 0, 0)
  }

  // 绘制预览
  currentShape.value.end = { ...pos }
  drawShape(ctx, currentShape.value, true)
}

function finishShape() {
  if (!canvasRef.value || !currentShape.value) return
  const ctx = canvasRef.value.getContext('2d')

  // 恢复画布状态
  if (history.value && history.value.history.length > 0) {
    const lastState = history.value.history[history.value.currentIndex]
    ctx.putImageData(lastState, 0, 0)
  }

  // 绘制最终形状
  drawShape(ctx, currentShape.value, false)
  history.value.saveState()
  currentShape.value = null
}

function drawShape(ctx, shape, isPreview = false) {
  ctx.strokeStyle = color.value
  ctx.lineWidth = size.value
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (isPreview) {
    ctx.setLineDash([5, 5])
  }

  if (shape.type === 'line') {
    ctx.beginPath()
    ctx.moveTo(shape.start.x, shape.start.y)
    ctx.lineTo(shape.end.x, shape.end.y)
    ctx.stroke()
  } else if (shape.type === 'rect') {
    const width = shape.end.x - shape.start.x
    const height = shape.end.y - shape.start.y
    ctx.strokeRect(shape.start.x, shape.start.y, width, height)
  }

  if (isPreview) {
    ctx.setLineDash([])
  }
}

// ==================== 选框功能 ====================
function drawSelection() {
  if (!selectionCanvasRef.value || !selectionStart.value || !selectionEnd.value) return
  const ctx = selectionCanvasRef.value.getContext('2d')
  ctx.clearRect(0, 0, selectionCanvasRef.value.width, selectionCanvasRef.value.height)

  const x = Math.min(selectionStart.value.x, selectionEnd.value.x)
  const y = Math.min(selectionStart.value.y, selectionEnd.value.y)
  const width = Math.abs(selectionEnd.value.x - selectionStart.value.x)
  const height = Math.abs(selectionEnd.value.y - selectionStart.value.y)

  ctx.strokeStyle = '#409EFF'
  ctx.lineWidth = 2
  ctx.setLineDash([5, 5])
  ctx.strokeRect(x, y, width, height)
  ctx.setLineDash([])

  ctx.fillStyle = 'rgba(64, 158, 255, 0.1)'
  ctx.fillRect(x, y, width, height)
}

function clearSelection() {
  if (selectionCanvasRef.value) {
    const ctx = selectionCanvasRef.value.getContext('2d')
    ctx.clearRect(0, 0, selectionCanvasRef.value.width, selectionCanvasRef.value.height)
  }
  selectionStart.value = null
  selectionEnd.value = null
  isSelecting.value = false
}

// ==================== 油漆桶填充 ====================
function fillBucket(pos) {
  if (!canvasRef.value || !history.value) return
  const ctx = canvasRef.value.getContext('2d')
  history.value.saveState()

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

  ctx.putImageData(imageData, 0, 0)
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
function showTextInput(e) {
  if (!canvasRef.value) return
  const canvasRect = canvasRef.value.getBoundingClientRect()
  const mouseX = e.clientX - canvasRect.left
  const mouseY = e.clientY - canvasRect.top
  const containerX = (mouseX - panOffset.value.x) / scale.value
  const containerY = (mouseY - panOffset.value.y) / scale.value

  textInputPosition.value = { x: containerX, y: containerY }
  textInputValue.value = ''
  textInputVisible.value = true

  nextTick(() => {
    if (textInputRef.value) {
      textInputRef.value.focus()
      textInputRef.value.select()
    }
  })
}

function confirmTextInput() {
  if (textInputValue.value.trim() && canvasRef.value && history.value) {
    const canvasX = textInputPosition.value.x
    const canvasY = textInputPosition.value.y
    drawTextOnCanvas(textInputValue.value, canvasX, canvasY)
  }
  textInputVisible.value = false
  textInputValue.value = ''
}

function cancelTextInput() {
  textInputVisible.value = false
  textInputValue.value = ''
}

function drawTextOnCanvas(text, x, y) {
  if (!canvasRef.value || !history.value) return
  const ctx = canvasRef.value.getContext('2d')
  history.value.saveState()

  ctx.font = '16px Arial'
  ctx.fillStyle = color.value
  ctx.textBaseline = 'top'
  ctx.fillText(text, x, y)

  history.value.saveState()
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
    const x =
      (((e.clientX - canvasRect.left - panOffset.value.x) / scale.value) * canvasRef.value.width) /
      canvasRect.width
    const y =
      (((e.clientY - canvasRect.top - panOffset.value.y) / scale.value) * canvasRef.value.height) /
      canvasRect.height
    drawResourceOnCanvas(draggingResource.value, x, y)
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
  const ctx = canvasRef.value.getContext('2d')
  history.value.saveState()

  const img = new window.Image()
  img.src = resource.url
  img.onload = () => {
    ctx.drawImage(img, x - 20, y - 20, 40, 40)
    history.value.saveState()
  }
}

// ==================== 缩放功能 ====================
function handleWheel(e) {
  e.preventDefault()

  // Shift + 滚轮：平移
  if (e.shiftKey || tool.value === 'move') {
    const deltaX = e.deltaX || 0
    const deltaY = e.deltaY || 0
    panOffset.value.x += deltaX * 0.5
    panOffset.value.y += deltaY * 0.5
    return
  }

  // Ctrl/Cmd + 滚轮：缩放
  if (e.ctrlKey || e.metaKey) {
    const delta = e.deltaY
    const zoomFactor = 0.1
    let newScale = scale.value
    if (delta < 0) {
      newScale = Math.min(scale.value + zoomFactor, maxScale)
    } else {
      newScale = Math.max(scale.value - zoomFactor, minScale)
    }
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
      const ctx = canvasRef.value.getContext('2d')
      history.value.saveState()
      ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)

      // 如果有底图，重新绘制
      if (mapImage.value) {
        const img = new window.Image()
        img.src = mapImage.value
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvasRef.value.width, canvasRef.value.height)
          history.value.saveState()
        }
      } else {
        // 新建地图：填充白色背景
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height)
        history.value.saveState()
      }

      ElMessage.success('画板已清空')
    })
    .catch(() => {
      // 用户取消
    })
}

// ==================== 初始化画布 ====================
function resetCanvas() {
  if (!canvasRef.value) return
  const ctx = canvasRef.value.getContext('2d')
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)

  if (mapImage.value) {
    const img = new window.Image()
    img.src = mapImage.value
    img.onload = () => {
      // 无限画板：如果图片尺寸大于当前画布，扩展画布
      if (img.naturalWidth > canvasWidth.value) {
        canvasWidth.value = img.naturalWidth
      }
      if (img.naturalHeight > canvasHeight.value) {
        canvasHeight.value = img.naturalHeight
      }
      nextTick(() => {
        ctx.drawImage(img, 0, 0, canvasRef.value.width, canvasRef.value.height)
        if (history.value) {
          history.value.init()
        }
      })
    }
  } else {
    // 新建地图：填充白色背景
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height)
    if (history.value) {
      history.value.init()
    }
  }
}

// ==================== 加载地图 ====================
async function loadMapImage() {
  try {
    mapImage.value = await window.electron.readMapImage({ bookName, mapName: mapId })
    mapName.value = mapId
  } catch (error) {
    console.error('加载地图失败:', error)
    ElMessage.error('加载地图失败')
  }
}

function handleImageLoad() {
  const img = mapImageRef.value
  if (img) {
    if (img.naturalWidth > canvasWidth.value) {
      canvasWidth.value = img.naturalWidth
    }
    if (img.naturalHeight > canvasHeight.value) {
      canvasHeight.value = img.naturalHeight
    }
    nextTick(() => {
      resetCanvas()
    })
  }
}

// ==================== 保存地图 ====================
async function handleSave() {
  if (!mapName.value) {
    ElMessage.warning('请输入地图名称')
    return
  }
  if (!canvasRef.value) return

  try {
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
    document.body.style.cursor = 'grab'
  }
}

function handleKeyUp(e) {
  if (e.key === ' ') {
    spaceKeyPressed.value = false
    if (tool.value !== 'move') {
      document.body.style.cursor = ''
    }
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  // 初始化历史记录管理器
  nextTick(() => {
    if (canvasRef.value) {
      history.value = new HistoryManager(canvasRef.value)

      if (isEdit.value) {
        loadMapImage()
      } else {
        resetCanvas()
      }
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
.content {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  flex-direction: column;

  .editor-container {
    flex: 1;
    width: 100%;
    background-color: #f3f3f3;
    border-radius: 8px;
    overflow: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;

    .canvas-wrap {
      position: relative;
      background: #fff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      will-change: transform;
    }

    .map-bg {
      position: absolute;
      left: 0;
      top: 0;
      z-index: 0;
      pointer-events: none;
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
        border: 1px dashed #ff4444;
        border-radius: 2px;
        padding: 2px 4px;
        font-size: 12px;
        outline: none;
        min-width: 100px;
        box-shadow: none;
        color: var(--text-base);
        font-family: Arial, sans-serif;

        &:focus {
          border: 1px dashed #ff4444;
          box-shadow: 0 0 0 1px rgba(255, 68, 68, 0.2);
        }
      }
    }
  }
}
</style>
