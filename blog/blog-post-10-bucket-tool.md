# 🎨 深入解析：Canvas 油漆桶工具的实现原理与技术细节

> 💡 本文详细介绍 51mazi 项目中油漆桶工具（Bucket Tool）的完整实现，包括洪水填充算法、坐标转换、像素数据处理、边界计算等核心技术。通过深入分析代码实现，帮助开发者理解如何在 Canvas 中实现高效的区域填充功能。

## 📋 目录
- [功能概述](#功能概述)
- [洪水填充算法原理](#洪水填充算法原理)
- [坐标转换的复杂性](#坐标转换的复杂性)
- [核心实现解析](#核心实现解析)
- [性能优化策略](#性能优化策略)
- [技术难点与解决方案](#技术难点与解决方案)
- [总结与思考](#总结与思考)

## 🎯 功能概述

油漆桶工具是地图设计工具中的重要功能之一，允许用户快速填充封闭区域。在 51mazi 中，油漆桶工具实现了以下特性：

- ✅ **精确填充**: 基于洪水填充算法，精确填充封闭区域
- ✅ **颜色匹配**: 精确的颜色匹配机制，避免误填充
- ✅ **坐标转换**: 正确处理场景坐标到画布像素坐标的转换
- ✅ **边界裁剪**: 智能裁剪填充区域，优化存储和渲染
- ✅ **数据序列化**: 将填充区域转换为 Base64 图片数据
- ✅ **历史记录**: 完整的撤销/重做支持

### 🎨 油漆桶工具演示

![地图设计](https://raw.githubusercontent.com/xiaoshengxianjun/51mazi/main/static/maps.png)

*地图设计工具中的油漆桶工具 - 快速填充封闭区域，创建丰富的地图效果*

### 🖼️ 使用场景

油漆桶工具在地图设计中常用于：
- 填充地形区域（如海洋、陆地、森林等）
- 快速上色封闭区域
- 创建区域标记和区分

## 🔬 洪水填充算法原理

### 算法概述

洪水填充（Flood Fill）是一种经典的图像处理算法，用于填充封闭区域。算法从起始点开始，向四个方向（上、下、左、右）扩散，填充所有与起始点颜色相同的相邻像素。

### 算法步骤

1. **获取起始点颜色**: 记录点击位置的像素颜色
2. **初始化栈**: 将起始点加入待处理栈
3. **遍历填充**: 从栈中取出像素，检查颜色是否匹配
4. **填充像素**: 如果颜色匹配，填充为目标颜色
5. **扩展搜索**: 将相邻的四个像素加入栈
6. **重复步骤**: 直到栈为空，填充完成

### 算法实现

```javascript
function floodFill(startX, startY, targetColor, fillColor, imageData) {
  const { data, width, height } = imageData
  const stack = [[startX, startY]]
  const visited = new Set()

  while (stack.length) {
    const [cx, cy] = stack.pop()
    const key = `${cx},${cy}`
    
    // 边界检查和访问标记
    if (visited.has(key) || cx < 0 || cy < 0 || cx >= width || cy >= height) {
      continue
    }
    visited.add(key)

    // 获取当前像素颜色
    const idx = (cy * width + cx) * 4
    const currColor = [
      data[idx],     // R
      data[idx + 1], // G
      data[idx + 2], // B
      data[idx + 3]  // A
    ]

    // 颜色匹配检查
    if (!colorsMatch(currColor, targetColor)) continue

    // 填充像素
    data[idx] = fillColor[0]
    data[idx + 1] = fillColor[1]
    data[idx + 2] = fillColor[2]
    data[idx + 3] = fillColor[3]

    // 添加相邻像素到栈
    stack.push([cx + 1, cy])  // 右
    stack.push([cx - 1, cy])  // 左
    stack.push([cx, cy + 1])   // 下
    stack.push([cx, cy - 1])   // 上
  }
}
```

### 算法特点

- **栈实现**: 使用栈（Stack）而非递归，避免调用栈溢出
- **访问标记**: 使用 `Set` 记录已访问的像素，避免重复处理
- **四方向搜索**: 只检查上下左右四个方向，性能高效
- **精确匹配**: 颜色完全匹配才填充，避免误填充

> 💡 **完整算法实现请查看**: [src/renderer/src/composables/map/tools/useBucketTool.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/tools/useBucketTool.js)

## 🗺️ 坐标转换的复杂性

### 问题背景

在 Canvas 中，我们使用了两种坐标系：
- **场景坐标**: 逻辑坐标系，用于存储元素位置
- **画布像素坐标**: 物理坐标系，用于实际绘制

由于画布支持缩放和平移，坐标转换变得复杂。

### 坐标转换公式

```javascript
// 场景坐标转画布像素坐标
pixelX = (sceneX + scrollX) * scale
pixelY = (sceneY + scrollY) * scale

// 画布像素坐标转场景坐标
sceneX = pixelX / scale - scrollX
sceneY = pixelY / scale - scrollY
```

### 实现细节

```javascript
// 将场景坐标转换为画布像素坐标
const pixelX = Math.floor((pos.x + canvasState.scrollX.value) * canvasState.scale.value)
const pixelY = Math.floor((pos.y + canvasState.scrollY.value) * canvasState.scale.value)

// 检查坐标是否在画布范围内
if (pixelX < 0 || pixelX >= width || pixelY < 0 || pixelY >= height) return
```

### 为什么需要坐标转换？

1. **用户交互**: 用户点击的是屏幕坐标，需要转换为画布像素坐标
2. **像素数据**: `getImageData` 获取的是画布像素数据，需要像素坐标
3. **元素存储**: 填充元素需要存储场景坐标，以便在不同缩放级别下正确显示

> 💡 **坐标转换详细实现请查看**: [src/renderer/src/composables/map/useCoordinate.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/useCoordinate.js)

## 🔧 核心实现解析

### 1. 工具初始化

```javascript
export function useBucketTool({ canvasRef, elements, history, renderCanvas, color, canvasState }) {
  function onMouseDown(pos) {
    if (!canvasRef.value || !history.value) return
    fillBucket(pos)
  }
  
  return {
    onMouseDown,
    fillBucket
  }
}
```

### 2. 填充流程

完整的填充流程包括以下步骤：

```javascript
function fillBucket(pos) {
  // 1. 保存历史状态
  history.value.saveState()
  
  // 2. 渲染当前画布，获取最新状态
  renderCanvas(false)
  
  // 3. 获取画布像素数据
  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight)
  
  // 4. 坐标转换
  const pixelX = Math.floor((pos.x + canvasState.scrollX.value) * canvasState.scale.value)
  const pixelY = Math.floor((pos.y + canvasState.scrollY.value) * canvasState.scale.value)
  
  // 5. 获取起始颜色和填充颜色
  const startColor = getPixelColor(imageData, pixelX, pixelY)
  const fillColor = hexToRgba(color.value)
  
  // 6. 执行洪水填充
  floodFill(imageData, pixelX, pixelY, startColor, fillColor)
  
  // 7. 计算填充区域边界
  const bounds = calculateBounds(visited)
  
  // 8. 裁剪填充区域
  const fillImageData = cropImageData(imageData, bounds)
  
  // 9. 转换为 Base64
  const imageDataBase64 = imageDataToBase64(fillImageData)
  
  // 10. 创建填充元素
  const fillElement = createFillElement(bounds, imageDataBase64)
  
  // 11. 添加到元素数组并渲染
  elements.fillElements.value.push(fillElement)
  renderCanvas(true)
}
```

### 3. 颜色处理

#### 颜色匹配

```javascript
function colorsMatch(a, b) {
  // 精确匹配 RGBA 四个通道
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]
}
```

#### 十六进制转 RGBA

```javascript
function hexToRgba(hex) {
  let c = hex.replace('#', '')
  
  // 处理 3 位十六进制颜色（如 #fff）
  if (c.length === 3) {
    c = c.split('').map((s) => s + s).join('')
  }
  
  const num = parseInt(c, 16)
  return [
    (num >> 16) & 255,  // R
    (num >> 8) & 255,   // G
    num & 255,           // B
    255                  // A (不透明)
  ]
}
```

### 4. 边界计算与裁剪

#### 计算填充区域边界

```javascript
// 计算填充区域的边界
let minX = Infinity
let maxX = -Infinity
let minY = Infinity
let maxY = -Infinity

visitedArray.forEach((key) => {
  const [x, y] = key.split(',').map(Number)
  minX = Math.min(minX, x)
  maxX = Math.max(maxX, x)
  minY = Math.min(minY, y)
  maxY = Math.max(maxY, y)
})
```

#### 裁剪填充区域

```javascript
// 裁剪 imageData 到填充区域
const fillWidth = maxX - minX + 1
const fillHeight = maxY - minY + 1
const fillImageData = ctx.createImageData(fillWidth, fillHeight)

// 复制填充区域的像素数据
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
```

**为什么需要裁剪？**

- **存储优化**: 只存储填充区域，而不是整个画布
- **渲染性能**: 减少需要绘制的像素数量
- **内存效率**: 降低内存占用

### 5. Base64 序列化

```javascript
// 将 imageData 转换为 base64 字符串以便序列化
const tempCanvas = document.createElement('canvas')
tempCanvas.width = fillWidth
tempCanvas.height = fillHeight
const tempCtx = tempCanvas.getContext('2d')
tempCtx.putImageData(fillImageData, 0, 0)
const imageDataBase64 = tempCanvas.toDataURL('image/png')
```

**为什么使用 Base64？**

- **数据持久化**: 可以保存到 JSON 文件中
- **跨平台兼容**: Base64 是标准格式，易于传输和存储
- **渲染支持**: 可以直接作为图片源使用

### 6. 填充元素创建

```javascript
// 将画布像素坐标转换为场景坐标
const sceneX = minX / canvasState.scale.value - canvasState.scrollX.value
const sceneY = minY / canvasState.scale.value - canvasState.scrollY.value
const sceneWidth = fillWidth / canvasState.scale.value
const sceneHeight = fillHeight / canvasState.scale.value

// 创建填充元素（使用场景坐标）
const fillElement = {
  type: 'fill',
  x: sceneX,
  y: sceneY,
  width: sceneWidth,
  height: sceneHeight,
  imageDataBase64: imageDataBase64,
  id: Date.now().toString()
}
```

### 7. 图片预加载

```javascript
// 预加载图片，确保在渲染时图片已经准备好
const img = new window.Image()
let imageReady = false

const handleImageReady = () => {
  if (imageReady) return
  imageReady = true
  
  // 图片加载完成后，添加到元素数组并渲染
  elements.fillElements.value.push(fillElement)
  renderCanvas(true)
}

img.onload = handleImageReady
img.onerror = () => {
  if (imageReady) return
  imageReady = true
  // 即使加载失败，也添加元素（renderFill 会处理未加载的情况）
  elements.fillElements.value.push(fillElement)
  renderCanvas(true)
}

img.src = imageDataBase64

// 如果图片已经加载完成（base64 数据通常是同步的），立即执行回调
if (img.complete && img.naturalWidth > 0) {
  handleImageReady()
}
```

> 💡 **完整实现代码请查看**: [src/renderer/src/composables/map/tools/useBucketTool.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/tools/useBucketTool.js)

## ⚡ 性能优化策略

### 1. 使用栈而非递归

```javascript
// ✅ 使用栈（避免调用栈溢出）
const stack = [[pixelX, pixelY]]
while (stack.length) {
  const [cx, cy] = stack.pop()
  // ... 处理逻辑
}

// ❌ 递归实现（可能导致调用栈溢出）
function floodFillRecursive(x, y) {
  // ... 递归调用
  floodFillRecursive(x + 1, y)
  floodFillRecursive(x - 1, y)
  // ...
}
```

### 2. 访问标记优化

```javascript
// 使用 Set 记录已访问的像素
const visited = new Set()
const key = `${cx},${cy}`

if (visited.has(key)) continue
visited.add(key)
```

**为什么使用 Set？**

- **O(1) 查找**: Set 的查找和插入都是 O(1) 时间复杂度
- **内存效率**: 比数组更节省内存
- **去重保证**: 自动去重，避免重复处理

### 3. 边界裁剪优化

```javascript
// 只存储填充区域，而不是整个画布
const fillImageData = ctx.createImageData(fillWidth, fillHeight)
```

**优化效果**:
- 减少存储空间（可能减少 90%+ 的数据）
- 加快序列化速度
- 降低内存占用

### 4. 图片缓存

在渲染系统中，使用缓存避免重复加载：

```javascript
// src/renderer/src/composables/map/useRender.js
const fillImageCache = new Map()

function renderFill(ctx, element) {
  // 使用缓存避免重复加载
  let img = fillImageCache.get(element.id)
  if (!img) {
    img = new window.Image()
    img.src = element.imageDataBase64
    fillImageCache.set(element.id, img)
  }
  // ...
}
```

### 5. 避免不必要的边界更新

```javascript
// 填充前渲染（不更新边界，避免不必要的延迟）
renderCanvas(false)

// 填充后渲染（更新边界）
renderCanvas(true)
```

## 🎯 技术难点与解决方案

### 难点 1: 坐标转换的准确性

**问题**: 画布支持缩放和平移，需要准确转换坐标。

**解决方案**:
- 仔细分析 Canvas 的变换顺序（先 scale 后 translate）
- 使用精确的转换公式
- 使用 `Math.floor` 确保像素坐标是整数

```javascript
const pixelX = Math.floor((pos.x + canvasState.scrollX.value) * canvasState.scale.value)
```

### 难点 2: 颜色匹配的精确性

**问题**: 浮点数精度问题可能导致颜色匹配失败。

**解决方案**:
- 使用精确匹配（完全相等）
- 不进行容差匹配，避免误填充

```javascript
function colorsMatch(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]
}
```

### 难点 3: 大区域填充的性能

**问题**: 填充大区域时，栈可能很大，性能下降。

**解决方案**:
- 使用栈而非递归（避免调用栈溢出）
- 使用 Set 记录已访问像素（O(1) 查找）
- 边界裁剪减少数据量

### 难点 4: 图片加载的异步性

**问题**: Base64 图片加载是异步的，可能导致渲染问题。

**解决方案**:
- 预加载图片
- 使用 `img.complete` 检查同步加载
- 处理加载失败的情况

```javascript
if (img.complete && img.naturalWidth > 0) {
  handleImageReady()
}
```

### 难点 5: 填充区域与形状元素的关联

**问题**: 填充区域需要与形状元素关联，以便在调整形状时一起调整填充。

**解决方案**:
- 在选框工具中查找关联的填充元素
- 使用中心点判断填充元素是否在形状内
- 一起调整大小和位置

> 💡 **关联逻辑请查看**: [src/renderer/src/composables/map/tools/useSelectTool.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/tools/useSelectTool.js)

## 📊 实现流程图

```
用户点击画布
    ↓
坐标转换（场景坐标 → 像素坐标）
    ↓
获取画布像素数据
    ↓
获取起始点颜色
    ↓
执行洪水填充算法
    ├─ 栈初始化
    ├─ 遍历填充
    ├─ 颜色匹配
    └─ 填充像素
    ↓
计算填充区域边界
    ↓
裁剪填充区域
    ↓
转换为 Base64
    ↓
创建填充元素
    ↓
预加载图片
    ↓
添加到元素数组
    ↓
重新渲染画布
```

## 📝 总结与思考

### 技术亮点

1. **算法选择**: 使用栈实现的洪水填充算法，性能优秀且稳定
2. **坐标处理**: 精确的坐标转换，支持缩放和平移
3. **数据优化**: 边界裁剪和 Base64 序列化，优化存储和传输
4. **性能优化**: 多种优化策略，保证大区域填充的性能
5. **错误处理**: 完善的错误处理机制，保证稳定性

### 可改进方向

1. **容差匹配**: 可以添加颜色容差，支持近似颜色填充
2. **填充模式**: 支持图案填充、渐变填充等
3. **性能优化**: 对于超大区域，可以考虑分块处理
4. **预览功能**: 在填充前显示预览效果

### 学习价值

通过实现油漆桶工具，我们可以学习到：

- ✅ **算法实现**: 洪水填充算法的实际应用
- ✅ **坐标系统**: 复杂坐标转换的处理方法
- ✅ **像素操作**: Canvas 像素数据的处理技巧
- ✅ **性能优化**: 大区域操作的优化策略
- ✅ **数据序列化**: Base64 编码的应用

---

### 📚 相关链接

- **项目地址**: [GitHub - 51mazi](https://github.com/xiaoshengxianjun/51mazi)，给个 Star 哦~
- **油漆桶工具代码**: [src/renderer/src/composables/map/tools/useBucketTool.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/tools/useBucketTool.js)
- **渲染函数**: [src/renderer/src/composables/map/useRender.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/useRender.js)
- **坐标转换**: [src/renderer/src/composables/map/useCoordinate.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/useCoordinate.js)
- **技术栈**: Vue 3 + Canvas + Composables

### 🏷️ 标签

`#Canvas` `#洪水填充算法` `#油漆桶工具` `#像素处理` `#坐标转换` `#Vue3` `#前端开发` `#算法实现`

---

> 💡 **如果这篇文章对你有帮助，请给个 ⭐️ 支持一下！**
>
> 💡 **想深入了解其他工具的实现？欢迎查看 GitHub 上对应的代码文件，每个模块都有详细的注释说明！**
