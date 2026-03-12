# 🗺️ 在写作软件中画地图，Canvas 绘图在地图设计中应用

> 💡 本文详细介绍如何在小说写作软件中集成 Canvas 绘图功能，实现自定义地图设计工具，包括多种绘图工具、资源管理、缩放控制等核心功能。

## 📋 目录
- [项目背景](#项目背景)
- [Canvas 技术架构](#canvas-技术架构)
- [核心功能实现](#核心功能实现)
- [绘图工具开发](#绘图工具开发)
- [性能优化策略](#性能优化策略)
- [用户体验优化](#用户体验优化)
- [总结与展望](#总结与展望)

## 🎯 项目背景

在小说创作过程中，作者经常需要绘制故事中的地图来帮助读者理解故事背景和地理关系。传统的写作软件往往缺乏这样的可视化工具，因此我们在 51mazi 中集成了基于 Canvas 的地图设计功能。

### 🗺️ 地图设计工具

![地图设计](https://raw.githubusercontent.com/xiaoshengxianjun/51mazi/main/static/maps.png)

*强大的地图设计工具 - 支持自定义绘制和资源管理*

### ✨ 功能特性
- 🎨 **多种绘图工具**: 铅笔、橡皮擦、油漆桶、文字工具
- 🖼️ **资源管理**: 预设图片资源拖拽添加
- 🔍 **缩放控制**: 支持画布缩放和视图调整
- ↩️ **撤销功能**: 操作历史管理
- 💾 **自动保存**: 实时保存绘图内容

## 🏗️ Canvas 技术架构

### 技术栈选择
```javascript
// 核心依赖
{
  "vue": "^3.5.13",
  "element-plus": "^2.10.1"
}

// Canvas 相关
const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')
```

### 核心架构设计
```javascript
// src/renderer/src/views/MapDesign.vue
<template>
  <div class="map-design">
    <div class="toolbar">
      <!-- 绘图工具 -->
      <div class="tool-btn" :class="{ active: tool === 'pencil' }" @click="selectTool('pencil')">
        <img src="@renderer/assets/pencil.svg" alt="铅笔" />
      </div>
      <div class="tool-btn" :class="{ active: tool === 'eraser' }" @click="selectTool('eraser')">
        <img src="@renderer/assets/eraser.svg" alt="橡皮擦" />
      </div>
      <div class="tool-btn" :class="{ active: tool === 'bucket' }" @click="selectTool('bucket')">
        <img src="@renderer/assets/bucket.svg" alt="油漆桶" />
      </div>
      
      <!-- 颜色选择器 -->
      <el-color-picker v-model="color" />
      
      <!-- 缩放控制 -->
      <div class="zoom-controls">
        <el-button @click="zoomIn">+</el-button>
        <span>{{ Math.round(scale * 100) }}%</span>
        <el-button @click="zoomOut">-</el-button>
      </div>
    </div>
    
    <div class="canvas-container" @wheel="handleWheel">
      <canvas
        ref="canvasRef"
        :width="canvasWidth"
        :height="canvasHeight"
        @mousedown="startDraw"
        @mousemove="drawing"
        @mouseup="endDraw"
        @mouseleave="endDraw"
      ></canvas>
    </div>
  </div>
</template>
```

## 🔧 核心功能实现

### 1. Canvas 初始化与配置

```javascript
// Canvas 初始化
const canvasRef = ref(null)
const canvasWidth = ref(800)
const canvasHeight = ref(600)
const scale = ref(1)
const minScale = 0.5
const maxScale = 3

// 绘图状态
const isDrawing = ref(false)
const lastX = ref(0)
const lastY = ref(0)
const tool = ref('pencil')
const color = ref('#000000')
const size = ref(5)

onMounted(() => {
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  
  // 设置画布样式
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = color.value
  ctx.lineWidth = size.value
  
  // 初始化画布背景
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)
})
```

### 2. 绘图工具实现

```javascript
// 绘图工具类核心实现
class DrawingTools {
  constructor(canvas, ctx) {
    this.canvas = canvas
    this.ctx = ctx
    this.isDrawing = false
  }

  // 铅笔工具
  pencil(x, y) {
    if (!this.isDrawing) return
    this.ctx.beginPath()
    this.ctx.moveTo(this.lastX, this.lastY)
    this.ctx.lineTo(x, y)
    this.ctx.stroke()
    this.lastX = x
    this.lastY = y
  }

  // 橡皮擦工具
  eraser(x, y) {
    this.ctx.save()
    this.ctx.globalCompositeOperation = 'destination-out'
    this.ctx.beginPath()
    this.ctx.arc(x, y, this.ctx.lineWidth / 2, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.restore()
  }
}

// 绘图事件处理
function startDraw(event) {
  isDrawing.value = true
  const rect = canvasRef.value.getBoundingClientRect()
  const x = (event.clientX - rect.left) / scale.value
  const y = (event.clientY - rect.top) / scale.value
  
  lastX.value = x
  lastY.value = y
}
```

> 💡 **完整代码请查看**: [src/renderer/src/views/MapDesign.vue](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/views/MapDesign.vue)

### 3. 缩放控制实现

```javascript
// 缩放功能核心实现
function handleWheel(event) {
  event.preventDefault()
  
  const delta = event.deltaY > 0 ? 0.9 : 1.1
  const newScale = scale.value * delta
  
  if (newScale >= minScale && newScale <= maxScale) {
    scale.value = newScale
    updateCanvasTransform()
  }
}

function updateCanvasTransform() {
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  
  ctx.save()
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(scale.value, scale.value)
  redrawCanvas()
  ctx.restore()
}
```

> 💡 **完整缩放控制代码请查看**: [src/renderer/src/views/MapDesign.vue](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/views/MapDesign.vue)

### 4. 资源管理系统

```javascript
// 资源管理核心实现
const resources = [
  { name: '点', url: '/src/assets/images/point.png' },
  { name: '五角星', url: '/src/assets/images/star.png' },
  { name: '山', url: '/src/assets/images/mountain.png' },
  { name: '森林', url: '/src/assets/images/forest.png' },
  { name: '宫殿', url: '/src/assets/images/palace.png' },
  { name: '城市', url: '/src/assets/images/city.png' }
]

// 资源拖拽功能
function onResourceMouseDown(resource, event) {
  const img = new Image()
  img.src = resource.url
  img.onload = () => {
    const ctx = canvasRef.value.getContext('2d')
    const rect = canvasRef.value.getBoundingClientRect()
    const x = (event.clientX - rect.left) / scale.value
    const y = (event.clientY - rect.top) / scale.value
    ctx.drawImage(img, x - img.width / 2, y - img.height / 2)
  }
}
```

> 💡 **完整资源管理代码请查看**: [src/renderer/src/views/MapDesign.vue](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/views/MapDesign.vue)

## 🎨 绘图工具开发

### 1. 铅笔工具优化

```javascript
// 铅笔工具平滑绘制
class PencilTool {
  constructor(ctx) {
    this.ctx = ctx
    this.points = []
  }

  move(x, y) {
    this.points.push({ x, y })
    
    // 平滑曲线绘制
    if (this.points.length > 2) {
      const lastPoint = this.points[this.points.length - 1]
      const prevPoint = this.points[this.points.length - 2]
      const prevPrevPoint = this.points[this.points.length - 3]
      
      const cp1x = prevPoint.x + (lastPoint.x - prevPrevPoint.x) / 6
      const cp1y = prevPoint.y + (lastPoint.y - prevPrevPoint.y) / 6
      const cp2x = lastPoint.x - (lastPoint.x - prevPoint.x) / 6
      const cp2y = lastPoint.y - (lastPoint.y - prevPoint.y) / 6
      
      this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, lastPoint.x, lastPoint.y)
    }
    
    this.ctx.stroke()
  }
}
```

> 💡 **完整铅笔工具代码请查看**: [src/renderer/src/views/MapDesign.vue](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/views/MapDesign.vue)

### 2. 油漆桶算法实现

```javascript
// 油漆桶填充算法核心
function floodFill(startX, startY, targetColor, fillColor, pixels, width, height) {
  const stack = [{ x: startX, y: startY }]
  
  while (stack.length > 0) {
    const { x, y } = stack.pop()
    const index = (y * width + x) * 4
    
    if (x < 0 || x >= width || y < 0 || y >= height) continue
    
    const currentColor = {
      r: pixels[index],
      g: pixels[index + 1],
      b: pixels[index + 2],
      a: pixels[index + 3]
    }
    
    if (!colorMatch(currentColor, targetColor)) continue
    
    // 填充像素
    pixels[index] = fillColor.r
    pixels[index + 1] = fillColor.g
    pixels[index + 2] = fillColor.b
    pixels[index + 3] = fillColor.a
    
    // 添加相邻像素到栈
    stack.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 })
  }
}
```

> 💡 **完整油漆桶算法代码请查看**: [src/renderer/src/views/MapDesign.vue](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/views/MapDesign.vue)

### 3. 文字工具实现

```javascript
// 文字工具核心实现
class TextTool {
  constructor(canvas, ctx) {
    this.canvas = canvas
    this.ctx = ctx
  }

  addText(x, y) {
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'text-input'
    input.style.position = 'absolute'
    input.style.left = x + 'px'
    input.style.top = y + 'px'
    
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.confirmText(input.value, x, y)
        input.remove()
      }
    })
    
    document.body.appendChild(input)
    input.focus()
  }

  confirmText(text, x, y) {
    if (text.trim()) {
      this.ctx.font = `${size.value * 2}px Arial`
      this.ctx.fillStyle = color.value
      this.ctx.fillText(text, x, y)
    }
  }
}
```

> 💡 **完整文字工具代码请查看**: [src/renderer/src/views/MapDesign.vue](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/views/MapDesign.vue)

## ⚡ 性能优化策略

### 1. 画布缓存机制

```javascript
// 画布缓存核心实现
class CanvasCache {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.cacheCanvas = document.createElement('canvas')
    this.cacheCtx = this.cacheCanvas.getContext('2d')
    this.isDirty = true
  }

  updateCache() {
    if (!this.isDirty) return
    this.cacheCanvas.width = this.canvas.width
    this.cacheCanvas.height = this.canvas.height
    this.cacheCtx.drawImage(this.canvas, 0, 0)
    this.isDirty = false
  }

  restoreFromCache() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.drawImage(this.cacheCanvas, 0, 0)
  }
}
```

> 💡 **完整缓存机制代码请查看**: [src/renderer/src/views/MapDesign.vue](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/views/MapDesign.vue)

### 2. 事件节流优化

```javascript
// 事件节流核心实现
function throttle(func, delay) {
  let timeoutId
  let lastExecTime = 0
  
  return function (...args) {
    const currentTime = Date.now()
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args)
      lastExecTime = currentTime
    } else {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        func.apply(this, args)
        lastExecTime = Date.now()
      }, delay - (currentTime - lastExecTime))
    }
  }
}

// 应用节流到绘图事件
const throttledDrawing = throttle(drawing, 16) // 60fps
```

> 💡 **完整节流优化代码请查看**: [src/renderer/src/views/MapDesign.vue](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/views/MapDesign.vue)

### 3. 内存管理

```javascript
// 内存管理核心实现
class MemoryManager {
  constructor() {
    this.imageCache = new Map()
    this.maxCacheSize = 50
  }

  cacheImage(url) {
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url)
    }
    
    const img = new Image()
    img.src = url
    
    if (this.imageCache.size >= this.maxCacheSize) {
      const firstKey = this.imageCache.keys().next().value
      this.imageCache.delete(firstKey)
    }
    
    this.imageCache.set(url, img)
    return img
  }
}
```

> 💡 **完整内存管理代码请查看**: [src/renderer/src/views/MapDesign.vue](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/views/MapDesign.vue)

## 🎨 用户体验优化

### 1. 工具栏设计

```vue
<template>
  <div class="toolbar">
    <div class="tool-group">
      <el-tooltip content="铅笔" placement="bottom">
        <div :class="['tool-btn', tool === 'pencil' ? 'active' : '']" @click="selectTool('pencil')">
          <img src="@renderer/assets/pencil.svg" alt="铅笔" />
        </div>
      </el-tooltip>
      <el-tooltip content="橡皮擦" placement="bottom">
        <div :class="['tool-btn', tool === 'eraser' ? 'active' : '']" @click="selectTool('eraser')">
          <img src="@renderer/assets/eraser.svg" alt="橡皮擦" />
        </div>
      </el-tooltip>
    </div>
    
    <el-divider direction="vertical" />
    
    <div class="tool-group">
      <el-color-picker v-model="color" />
      <el-slider v-model="size" :min="1" :max="40" style="width: 150px" />
    </div>
  </div>
</template>
```

> 💡 **完整工具栏代码请查看**: [src/renderer/src/views/MapDesign.vue](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/views/MapDesign.vue)

### 2. 快捷键支持

```javascript
// 快捷键配置
const keyboardShortcuts = {
  'KeyP': () => selectTool('pencil'),
  'KeyE': () => selectTool('eraser'),
  'Control+z': () => undo(),
  'Equal': () => zoomIn(),
  'Minus': () => zoomOut()
}

// 注册快捷键
onMounted(() => {
  document.addEventListener('keydown', (event) => {
    const key = getKeyCombination(event)
    const handler = keyboardShortcuts[key]
    if (handler) {
      event.preventDefault()
      handler()
    }
  })
})
```

> 💡 **完整快捷键代码请查看**: [src/renderer/src/views/MapDesign.vue](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/views/MapDesign.vue)

### 3. 触摸设备支持

```javascript
// 触摸事件支持
function handleTouchStart(event) {
  event.preventDefault()
  const touch = event.touches[0]
  startDraw({ clientX: touch.clientX, clientY: touch.clientY })
}

function handleTouchMove(event) {
  event.preventDefault()
  const touch = event.touches[0]
  drawing({ clientX: touch.clientX, clientY: touch.clientY })
}

// 注册触摸事件
onMounted(() => {
  const canvas = canvasRef.value
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
  canvas.addEventListener('touchend', endDraw, { passive: false })
})
```

> 💡 **完整触摸支持代码请查看**: [src/renderer/src/views/MapDesign.vue](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/views/MapDesign.vue)

## 📊 功能特性总结

### ✅ 已实现功能
- ✅ **基础绘图**: 铅笔、橡皮擦、油漆桶工具
- ✅ **文字工具**: 支持添加文字标注
- ✅ **资源管理**: 预设图片资源拖拽
- ✅ **缩放控制**: 鼠标滚轮和按钮缩放
- ✅ **撤销功能**: 操作历史管理
- ✅ **触摸支持**: 移动设备手势操作
- ✅ **快捷键**: 常用操作快捷键
- ✅ **自动保存**: 实时保存绘图内容

### 🚀 技术亮点
1. **高性能**: Canvas 硬件加速渲染
2. **可扩展**: 模块化的工具系统
3. **用户友好**: 直观的工具栏和操作反馈
4. **跨平台**: 支持桌面和移动设备

## 📝 总结与展望

Canvas 绘图功能在 51mazi 项目中的成功应用，展示了如何利用现代 Web 技术构建专业的地图设计工具。通过合理的架构设计、性能优化和用户体验优化，我们实现了一个功能完整、性能优秀的绘图系统。

### 🎯 技术价值
- **架构设计**: 模块化的工具系统
- **性能优化**: 缓存机制、事件节流等优化策略
- **用户体验**: 直观的操作界面和快捷键支持
- **可维护性**: 清晰的代码结构和错误处理

### 🔮 未来规划
- **更多工具**: 支持更多绘图工具和效果
- **图层系统**: 支持多层绘图和图层管理
- **导入导出**: 支持多种图片格式导入导出
- **协作功能**: 支持多人协作绘图

---

### 📚 相关链接
- **项目地址**: [GitHub - 51mazi](https://github.com/xiaoshengxianjun/51mazi)，给个 Star 哦~
- **Canvas API**: [MDN Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- **技术栈**: Canvas + Vue 3 + Element Plus

### 🏷️ 标签
`#Canvas` `#绘图工具` `#地图设计` `#Vue3` `#前端开发` `#性能优化` `#用户体验`

---

> 💡 **如果这篇文章对你有帮助，请给个 ⭐️ 支持一下！** 