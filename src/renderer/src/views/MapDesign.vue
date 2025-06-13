<template>
  <div class="map-design">
    <div class="header">
      <el-button class="back-btn" :icon="ArrowLeftBold" text @click="handleBack">
        <span>返回</span>
      </el-button>
      <h2>{{ mapName }}</h2>
      <el-button type="primary" @click="handleSave">保存地图</el-button>
    </div>

    <div class="content">
      <div class="toolbar">
        <el-tooltip content="铅笔" placement="bottom">
          <el-button
            :type="tool === 'pencil' ? 'primary' : 'default'"
            @click="selectTool('pencil')"
          >
            <i class="iconfont icon-pencil" />
          </el-button>
        </el-tooltip>
        <el-tooltip content="橡皮擦" placement="bottom">
          <el-button
            :type="tool === 'eraser' ? 'primary' : 'default'"
            @click="selectTool('eraser')"
          >
            <i class="iconfont icon-eraser" />
          </el-button>
        </el-tooltip>
        <el-tooltip content="油漆桶" placement="bottom">
          <el-button
            :type="tool === 'bucket' ? 'primary' : 'default'"
            @click="selectTool('bucket')"
          >
            <i class="iconfont icon-bucket" />
          </el-button>
        </el-tooltip>
        <el-tooltip content="撤销" placement="bottom">
          <el-button :disabled="undoStack.length === 0" @click="undo">
            <i class="iconfont icon-undo" />
          </el-button>
        </el-tooltip>
        <el-divider direction="vertical" />
        <el-tooltip content="颜色">
          <div>
            <el-color-picker v-model="color" />
          </div>
        </el-tooltip>
        <el-tooltip content="粗细">
          <div>
            <el-slider v-model="size" :min="1" :max="40" style="width: 100px" />
          </div>
        </el-tooltip>
      </div>

      <div ref="editorContainerRef" class="editor-container">
        <div class="canvas-wrap" :style="canvasWrapStyle">
          <img
            v-if="mapImage"
            ref="mapImageRef"
            :src="mapImage"
            :style="imageStyle"
            @load="handleImageLoad"
            class="map-bg"
          />
          <canvas
            ref="canvasRef"
            :width="canvasWidth"
            :height="canvasHeight"
            class="draw-canvas"
            @mousedown="startDraw"
            @mousemove="drawing"
            @mouseup="endDraw"
            @mouseleave="endDraw"
            @touchstart.prevent="startDraw"
            @touchmove.prevent="drawing"
            @touchend.prevent="endDraw"
          ></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeftBold } from '@element-plus/icons-vue'
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

// 工具栏状态
const tool = ref('pencil') // pencil, eraser, bucket
const color = ref('#222')
const size = ref(4)
const drawingActive = ref(false)
const lastPoint = ref({ x: 0, y: 0 })
const undoStack = ref([])

// 画布样式适应容器
const canvasWrapStyle = computed(() => ({
  position: 'relative',
  width: canvasWidth.value + 'px',
  height: canvasHeight.value + 'px',
  margin: '0 auto',
  background: '#fff',
  boxShadow: '0 2px 8px #0001'
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
    x = e.touches[0].clientX - rect.left
    y = e.touches[0].clientY - rect.top
  } else {
    x = e.clientX - rect.left
    y = e.clientY - rect.top
  }
  return { x, y }
}

function startDraw(e) {
  if (tool.value === 'bucket') {
    fillBucket()
    return
  }
  drawingActive.value = true
  const { x, y } = getCanvasPos(e)
  lastPoint.value = { x, y }
  // 保存撤销栈
  const ctx = canvasRef.value.getContext('2d')
  undoStack.value.push(ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height))
}

function drawing(e) {
  if (!drawingActive.value) return
  const ctx = canvasRef.value.getContext('2d')
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = size.value
  if (tool.value === 'pencil') {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = color.value
  } else if (tool.value === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
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

// 油漆桶填充（简单实现，整图填充）
function fillBucket() {
  const ctx = canvasRef.value.getContext('2d')
  // 保存撤销栈
  undoStack.value.push(ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height))
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = color.value
  ctx.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height)
}

onMounted(() => {
  if (isEdit.value) {
    loadMapImage()
  }
})

const handleBack = () => {
  router.back()
}

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
</script>

<style lang="scss" scoped>
// @import '@/assets/iconfont/iconfont.css';
.map-design {
  height: 100%;
  padding: 8px 16px 16px;
  background-color: var(--bg-primary);
  height: 100vh;
  display: flex;
  flex-direction: column;

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;

    .back-btn {
      margin-right: 16px;
    }

    h2 {
      margin: 0;
      font-size: 20px;
      color: var(--text-primary);
    }
  }

  .content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .toolbar {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      align-items: center;
    }

    .editor-container {
      flex: 1;
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
    }
  }
}
</style>
