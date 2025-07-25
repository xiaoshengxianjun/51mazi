<template>
  <LayoutTool :title="mapName || '地图设计'">
    <template #headrAction>
      <el-button type="primary" @click="handleSave">保存地图</el-button>
    </template>
    <template #default>
      <div class="content">
        <div class="toolbar">
          <el-tooltip content="铅笔" placement="bottom">
            <div
              :class="['tool-btn', tool === 'pencil' ? 'active' : '']"
              @click="selectTool('pencil')"
            >
              <img src="@renderer/assets/pencil.svg" alt="铅笔" />
            </div>
          </el-tooltip>
          <el-tooltip content="橡皮擦" placement="bottom">
            <div
              :class="['tool-btn', tool === 'eraser' ? 'active' : '']"
              @click="selectTool('eraser')"
            >
              <img src="@renderer/assets/eraser.svg" alt="橡皮擦" />
            </div>
          </el-tooltip>
          <el-tooltip content="油漆桶" placement="bottom">
            <div
              :class="['tool-btn', tool === 'bucket' ? 'active' : '']"
              @click="selectTool('bucket')"
            >
              <img src="@renderer/assets/bucket.svg" alt="油漆桶" />
            </div>
          </el-tooltip>
          <el-tooltip content="文字" placement="bottom">
            <div :class="['tool-btn', tool === 'text' ? 'active' : '']" @click="selectTool('text')">
              A
            </div>
          </el-tooltip>
          <el-popover
            v-model:visible="resourcePopoverVisible"
            placement="bottom"
            :width="420"
            trigger="click"
          >
            <template #reference>
              <div
                :class="['tool-btn', resourcePopoverVisible ? 'active' : '']"
                @click="selectTool('resource')"
              >
                <el-icon><PictureRounded /></el-icon>
              </div>
            </template>
            <div class="resource-popover">
              <div class="resource-grid">
                <div
                  v-for="(resource, index) in resources"
                  :key="index"
                  class="resource-item"
                  @click="selectResource(resource)"
                  @mousedown="onResourceMouseDown(resource, $event)"
                >
                  <img :src="resource.url" :alt="resource.name" />
                  <span class="resource-name">{{ resource.name }}</span>
                </div>
              </div>
            </div>
          </el-popover>
          <el-tooltip content="撤销" placement="bottom">
            <div :class="['tool-btn', 'undo-btn']" @click="undo">
              <img src="@renderer/assets/undo.svg" alt="撤销" />
            </div>
          </el-tooltip>
          <el-divider direction="vertical" />
          <el-tooltip content="颜色">
            <div>
              <el-color-picker v-model="color" />
            </div>
          </el-tooltip>
          <el-divider direction="vertical" />
          <el-tooltip content="重置缩放">
            <div class="tool-btn" @click="resetZoom">
              <el-icon><ZoomIn /></el-icon>
            </div>
          </el-tooltip>
          <div class="zoom-level">{{ Math.round(scale * 100) }}%</div>
          <el-divider direction="vertical" />
          <el-tooltip v-if="tool === 'pencil' || tool === 'eraser'" content="粗细">
            <div class="slider-wrap">
              <el-slider v-model="size" :min="1" :max="40" style="width: 150px" />
            </div>
          </el-tooltip>
        </div>

        <div ref="editorContainerRef" class="editor-container" @wheel="handleWheel">
          <div class="canvas-wrap" :style="canvasWrapStyle">
            <img
              v-if="mapImage"
              ref="mapImageRef"
              :src="mapImage"
              :style="imageStyle"
              class="map-bg"
              @load="handleImageLoad"
            />
            <canvas
              ref="canvasRef"
              :width="canvasWidth"
              :height="canvasHeight"
              class="draw-canvas"
              :style="{ cursor: canvasCursor }"
              @mousedown="startDraw"
              @mousemove="drawing"
              @mouseup="endDraw"
              @mouseleave="endDraw"
              @touchstart.prevent="startDraw"
              @touchmove.prevent="drawing"
              @touchend.prevent="endDraw"
              @click="handleCanvasClick"
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
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { PictureRounded, ZoomIn } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const bookName = route.query.name
const mapId = route.query.id

const mapName = ref('')
const isEdit = computed(() => !!mapId)
const mapImage = ref(null)
const editorContainerRef = ref(null)
const mapImageRef = ref(null)
const canvasRef = ref(null)
const canvasWidth = ref(800)
const canvasHeight = ref(600)
const scale = ref(1) // 缩放比例
const minScale = 0.5 // 最小缩放
const maxScale = 3 // 最大缩放

const resourcePopoverVisible = ref(false)
// 图片资源列表
const resources = [
  {
    name: '点',
    url: '/src/assets/images/point.png'
  },
  {
    name: '五角星',
    url: '/src/assets/images/star.png'
  },
  {
    name: '山',
    url: '/src/assets/images/mountain.png'
  },
  {
    name: '森林',
    url: '/src/assets/images/forest.png'
  },
  {
    name: '宫殿',
    url: '/src/assets/images/palace.png'
  },
  {
    name: '城市',
    url: '/src/assets/images/city.png'
  },
  {
    name: '村庄',
    url: '/src/assets/images/village.png'
  },
  {
    name: '湖泊',
    url: '/src/assets/images/lake.png'
  },
  {
    name: '战役',
    url: '/src/assets/images/battle.png'
  }
]

// 工具栏状态
const tool = ref('pencil') // pencil, eraser, bucket, text
const color = ref('#222')
const size = ref(1)
const drawingActive = ref(false)
const lastPoint = ref({ x: 0, y: 0 })
const undoStack = ref([])

// 拖拽资源图片相关
const draggingResource = ref(null)
const dragPreviewEl = ref(null)

// 文字工具相关
const textInputVisible = ref(false)
const textInputValue = ref('')
const textInputPosition = ref({ x: 0, y: 0 })
const textInputRef = ref(null)

// 画布样式适应容器
const canvasWrapStyle = computed(() => ({
  position: 'relative',
  width: canvasWidth.value + 'px',
  height: canvasHeight.value + 'px',
  margin: '0 auto',
  background: '#fff',
  boxShadow: '0 2px 8px #0001',
  transform: `scale(${scale.value})`,
  transformOrigin: 'center center',
  transition: 'transform 0.1s ease-out'
}))

// 计算图片样式，使其适应canvas
const imageStyle = computed(() => ({
  position: 'absolute',
  left: 0,
  top: 0,
  width: canvasWidth.value + 'px',
  height: canvasHeight.value + 'px',
  zIndex: 0
}))

// 计算画布鼠标样式
const canvasCursor = computed(() => {
  switch (tool.value) {
    case 'pencil':
      return 'url(/src/assets/pencil.svg) 8 44, crosshair'
    case 'eraser':
      return 'url(/src/assets/eraser.svg) 16 44, crosshair'
    case 'bucket':
      return 'url(/src/assets/bucket.svg) 40 20, crosshair'
    case 'text':
      return 'text'
    case 'resource':
      return 'crosshair'
    default:
      return 'default'
  }
})

// 加载地图图片
const loadMapImage = async () => {
  try {
    mapImage.value = await window.electron.readMapImage({ bookName, mapName: mapId })
    mapName.value = mapId
  } catch (error) {
    console.error('加载地图失败:', error)
    ElMessage.error('加载地图失败')
  }
}

// 图片加载完成后，设置canvas尺寸
const handleImageLoad = () => {
  const img = mapImageRef.value
  if (img) {
    canvasWidth.value = img.naturalWidth
    canvasHeight.value = img.naturalHeight
    nextTick(() => {
      resetCanvas()
    })
  }
}

// 工具栏操作
function selectTool(t) {
  tool.value = t
  if (t === 'pencil') {
    size.value = 1
  } else if (t === 'eraser') {
    size.value = 10
  }
}

// 撤销
function undo() {
  if (undoStack.value.length > 0) {
    const ctx = canvasRef.value.getContext('2d')
    const img = undoStack.value.pop()
    ctx.putImageData(img, 0, 0)
  }
}

// 初始化canvas，绘制底图
function resetCanvas() {
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  // 清空
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  // 绘制底图
  if (mapImage.value) {
    const img = new window.Image()
    img.src = mapImage.value
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
  }
}

// 画图相关
function getCanvasPos(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  let x, y
  if (e.touches) {
    x = (e.touches[0].clientX - rect.left) / scale.value
    y = (e.touches[0].clientY - rect.top) / scale.value
  } else {
    x = (e.clientX - rect.left) / scale.value
    y = (e.clientY - rect.top) / scale.value
  }
  return { x, y }
}

function startDraw(e) {
  // 检查当前选中的工具
  if (tool.value === 'pencil' || tool.value === 'eraser') {
    // 铅笔工具：绘制线条
    drawingActive.value = true
    const { x, y } = getCanvasPos(e)
    lastPoint.value = { x, y }
    // 保存撤销栈
    const ctx = canvasRef.value.getContext('2d')
    undoStack.value.push(ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height))
  } else if (tool.value === 'bucket') {
    // 油漆桶工具：填充
    fillBucket(e)
  } else if (tool.value === 'text') {
    // 文字工具：显示文字输入框
    showTextInput(e)
    // 阻止事件冒泡，防止触发 handleCanvasClick
    e.stopPropagation()
  }
  // 其他工具（如 resource）不执行绘制操作
}

function drawing(e) {
  if (!drawingActive.value) return

  // 只有铅笔和橡皮擦工具才能继续绘制
  if (tool.value !== 'pencil' && tool.value !== 'eraser') return

  const ctx = canvasRef.value.getContext('2d')
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = size.value
  if (tool.value === 'pencil') {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = color.value
  } else if (tool.value === 'eraser') {
    // 使用白色来擦除，擦过的地方变成白色
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = '#ffffff'
  }
  ctx.beginPath()
  ctx.moveTo(lastPoint.value.x, lastPoint.value.y)
  const { x, y } = getCanvasPos(e)
  ctx.lineTo(x, y)
  ctx.stroke()
  lastPoint.value = { x, y }
}

function endDraw() {
  drawingActive.value = false
}

// 油漆桶填充（Flood Fill，闭合区域填充）
function fillBucket(e) {
  const ctx = canvasRef.value.getContext('2d')
  // 保存撤销栈
  undoStack.value.push(ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height))
  const { x, y } = getCanvasPos(e)
  const imageData = ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height)
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height

  // 获取起始像素的rgba
  const startIdx = (Math.floor(y) * width + Math.floor(x)) * 4
  const startColor = [data[startIdx], data[startIdx + 1], data[startIdx + 2], data[startIdx + 3]]

  // 目标颜色
  const fillColor = hexToRgba(color.value)

  // 如果起始像素颜色和目标颜色一样，直接返回
  if (colorsMatch(startColor, fillColor)) return

  // Flood Fill
  const stack = [[Math.floor(x), Math.floor(y)]]
  while (stack.length) {
    const [cx, cy] = stack.pop()
    if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue
    const idx = (cy * width + cx) * 4
    const currColor = [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]]
    if (!colorsMatch(currColor, startColor)) continue
    // 填充颜色
    data[idx] = fillColor[0]
    data[idx + 1] = fillColor[1]
    data[idx + 2] = fillColor[2]
    data[idx + 3] = fillColor[3]
    // 四邻域递归
    stack.push([cx + 1, cy])
    stack.push([cx - 1, cy])
    stack.push([cx, cy + 1])
    stack.push([cx, cy - 1])
  }
  ctx.putImageData(imageData, 0, 0)
}

// 判断颜色是否相等
function colorsMatch(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]
}
// 16进制转rgba数组
function hexToRgba(hex) {
  let c = hex.replace('#', '')
  if (c.length === 3)
    c = c
      .split('')
      .map((s) => s + s)
      .join('')
  const num = parseInt(c, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 255]
}

// 键盘事件处理函数
function handleKeyDown(e) {
  // 检查是否按下 Ctrl+Z (Windows) 或 Cmd+Z (Mac)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault() // 阻止默认行为
    undo()
  }
}

onMounted(() => {
  if (isEdit.value) {
    loadMapImage()
  }
  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeyDown)
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

const handleSave = async () => {
  if (!mapName.value) {
    ElMessage.warning('请输入地图名称')
    return
  }
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

function selectResource(resource) {
  // 兼容点击直接拖拽
  startResourceDrag(resource, null)
}

function startResourceDrag(resource, event) {
  draggingResource.value = resource
  // 创建预览元素
  if (!dragPreviewEl.value) {
    dragPreviewEl.value = document.createElement('img')
    dragPreviewEl.value.src = resource.url
    dragPreviewEl.value.style.position = 'fixed'
    dragPreviewEl.value.style.pointerEvents = 'none'
    dragPreviewEl.value.style.zIndex = 9999
    dragPreviewEl.value.style.width = '40px'
    dragPreviewEl.value.style.height = '40px'
    document.body.appendChild(dragPreviewEl.value)
  }
  // 监听全局鼠标移动和松开
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
  if (!draggingResource.value) return
  // 判断是否在canvas区域
  const canvasRect = canvasRef.value.getBoundingClientRect()
  if (
    e.clientX >= canvasRect.left &&
    e.clientX <= canvasRect.right &&
    e.clientY >= canvasRect.top &&
    e.clientY <= canvasRect.bottom
  ) {
    // 转换为canvas坐标
    const x = ((e.clientX - canvasRect.left) / canvasRect.width) * canvasRef.value.width
    const y = ((e.clientY - canvasRect.top) / canvasRect.height) * canvasRef.value.height
    drawResourceOnCanvas(draggingResource.value, x, y)
  }
  // 清理
  if (dragPreviewEl.value) {
    document.body.removeChild(dragPreviewEl.value)
    dragPreviewEl.value = null
  }
  draggingResource.value = null
  window.removeEventListener('mousemove', onResourceDragMove)
  window.removeEventListener('mouseup', onResourceDragEnd)
}

function drawResourceOnCanvas(resource, x, y) {
  const ctx = canvasRef.value.getContext('2d')
  // 保存撤销栈
  undoStack.value.push(ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height))

  const img = new window.Image()
  img.src = resource.url
  img.onload = () => {
    // 居中绘制，默认40x40
    ctx.drawImage(img, x - 20, y - 20, 40, 40)
  }
}

// 资源图片mousedown时启动拖拽
function onResourceMouseDown(resource, event) {
  event.preventDefault()
  startResourceDrag(resource, event)
}

// 处理画布缩放
function handleWheel(e) {
  e.preventDefault()
  const delta = e.deltaY
  const zoomFactor = 0.1 // 每次缩放的步长

  // 计算新的缩放比例
  let newScale = scale.value
  if (delta < 0) {
    // 放大
    newScale = Math.min(scale.value + zoomFactor, maxScale)
  } else {
    // 缩小
    newScale = Math.max(scale.value - zoomFactor, minScale)
  }

  scale.value = newScale
}

// 重置缩放
function resetZoom() {
  scale.value = 1
}

// 显示文字输入框
function showTextInput(e) {
  // 获取画布的实际位置和尺寸
  const canvasRect = canvasRef.value.getBoundingClientRect()

  // 计算鼠标相对于画布的位置
  const mouseX = e.clientX - canvasRect.left
  const mouseY = e.clientY - canvasRect.top

  // 将画布坐标转换为容器坐标（考虑缩放）
  const containerX = mouseX / scale.value
  const containerY = mouseY / scale.value

  textInputPosition.value = {
    x: containerX,
    y: containerY
  }
  textInputValue.value = ''
  textInputVisible.value = true

  // 确保输入框聚焦
  nextTick(() => {
    if (textInputRef.value) {
      textInputRef.value.focus()
      // 选中所有文本，方便用户直接输入
      textInputRef.value.select()
    }
  })
}

// 确认文字输入
function confirmTextInput() {
  if (textInputValue.value.trim()) {
    // 输入框位置已经是画布坐标，直接使用
    const canvasX = textInputPosition.value.x
    const canvasY = textInputPosition.value.y

    drawTextOnCanvas(textInputValue.value, canvasX, canvasY)
  }
  textInputVisible.value = false
  textInputValue.value = ''
}

// 取消文字输入
function cancelTextInput() {
  textInputVisible.value = false
  textInputValue.value = ''
}

// 点击其他地方时隐藏输入框
function hideTextInput() {
  if (textInputVisible.value) {
    textInputVisible.value = false
    textInputValue.value = ''
  }
}

// 在画布上绘制文字
function drawTextOnCanvas(text, x, y) {
  const ctx = canvasRef.value.getContext('2d')
  // 保存撤销栈
  undoStack.value.push(ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height))

  // 设置文字样式 - 固定12px字号
  ctx.font = '12px Arial'
  ctx.fillStyle = color.value
  ctx.textBaseline = 'top'

  // 绘制文字
  ctx.fillText(text, x, y)
}

function handleCanvasClick() {
  // 如果当前工具是文字工具，不要隐藏输入框
  if (tool.value === 'text') {
    return
  }
  hideTextInput()
}
</script>

<style lang="scss" scoped>
.content {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  flex-direction: column;

  .toolbar {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
    align-items: center;
    justify-content: center;
    position: relative;
    width: max-content;
    .tool-btn {
      width: 32px;
      height: 32px;
      cursor: pointer;
      border-radius: 4px;
      padding: 6px;
      color: #000;
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid transparent;
      img {
        width: 100%;
        height: 100%;
        display: block;
      }
      &.active,
      &:hover {
        border: 1px solid var(--el-color-primary);
      }
    }
    .slider-wrap {
      position: absolute;
      right: -170px;
      top: 0;
      z-index: 1;
    }
    .zoom-level {
      font-size: 14px;
      color: var(--text-primary);
      min-width: 60px;
      text-align: center;
    }
  }

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
      box-shadow: 0 2px 8px #0001;
      will-change: transform; // 优化缩放性能
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
      cursor: crosshair;
    }

    // 文字输入框样式
    .text-input-overlay {
      position: absolute;
      z-index: 2;
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
        color: var(--text-primary);
        font-family: Arial, sans-serif;

        &:focus {
          border: 1px dashed #ff4444;
          box-shadow: 0 0 0 1px rgba(255, 68, 68, 0.2);
        }
      }
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
      img {
        width: 100%;
        height: 100%;
        display: block;
        cursor: pointer;
      }
    }
  }
}
</style>
