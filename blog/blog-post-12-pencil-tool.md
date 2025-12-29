# ✏️ 从点到线，从线到画：Canvas 画笔工具的实现艺术

> 💡 画笔工具是地图设计中最基础也最重要的工具之一。本文将带你探索 51mazi 项目中画笔工具的实现思路，从点坐标收集到平滑曲线生成，从 perfect-freehand 算法到实时渲染优化，揭秘如何打造一个流畅自然的画笔体验。

## 📋 目录
- [功能简介](#功能简介)
- [核心算法：perfect-freehand](#核心算法perfect-freehand)
- [技术挑战](#技术挑战)
- [实现亮点](#实现亮点)
- [性能优化](#性能优化)
- [总结](#总结)

## 🎯 功能简介

画笔工具是地图设计工具中的"手绘神器"，让用户可以像在纸上画画一样自由绘制。在 51mazi 的地图设计工具中，画笔工具不仅仅是一个简单的线条绘制功能，而是一个集成了平滑算法、实时渲染、参数控制等多项技术的完整解决方案。

### ✏️ 功能特性

- ✅ **平滑绘制**: 基于 perfect-freehand 算法，生成自然流畅的画笔效果
- ✅ **实时预览**: 绘制过程中实时显示画笔轨迹，体验流畅
- ✅ **参数控制**: 支持颜色、大小、透明度等参数自定义
- ✅ **压力模拟**: 模拟真实画笔的压力变化，让线条更自然
- ✅ **完整历史记录**: 支持撤销/重做，操作可追溯

### 🖼️ 使用场景

在地图设计中，画笔工具常用于：
- 🗺️ 绘制地形轮廓（山脉、河流、海岸线等）
- ✍️ 手绘标记和注释
- 🎨 自由创作和草图绘制

![地图设计](https://raw.githubusercontent.com/xiaoshengxianjun/51mazi/main/static/maps.png)

*地图设计工具中的画笔工具 - 流畅自然的绘制体验*

## 🔬 核心算法：perfect-freehand

### 算法原理

perfect-freehand 是一个专门用于生成平滑手绘线条的算法库，它的核心思想是：

1. **收集点坐标**: 记录鼠标移动过程中的所有点
2. **平滑处理**: 对点序列进行平滑处理，消除抖动
3. **压力模拟**: 根据速度变化模拟压力，让线条有粗细变化
4. **生成路径**: 将处理后的点转换为平滑的路径
5. **填充绘制**: 使用填充而非描边，生成更自然的画笔效果

### 为什么选择 perfect-freehand？

- 🎨 **自然效果**: 生成的线条更接近真实手绘效果
- ⚡ **性能优秀**: 算法高效，适合实时绘制
- 🔧 **易于集成**: API 简洁，易于使用和定制
- 📦 **轻量级**: 库体积小，不影响应用性能

### 算法使用

```javascript
import { getStroke } from 'perfect-freehand'

// 配置参数
const options = {
  size: strokeWidth,        // 画笔大小
  thinning: 0.6,            // 压力变化强度
  smoothing: 0.5,           // 平滑度
  streamline: 0.5,          // 流线化程度
  easing: (t) => Math.sin((t * Math.PI) / 2),  // 缓动函数
  simulatePressure: true    // 模拟压力
}

// 将点数组转换为路径
const inputPoints = points.map(p => [p.x, p.y])
const stroke = getStroke(inputPoints, options)

// 绘制路径
ctx.beginPath()
ctx.moveTo(stroke[0][0], stroke[0][1])
for (let i = 1; i < stroke.length; i++) {
  ctx.lineTo(stroke[i][0], stroke[i][1])
}
ctx.closePath()
ctx.fill()
```

**参数说明**:
- `size`: 画笔的基础大小
- `thinning`: 控制线条粗细变化，值越大变化越明显
- `smoothing`: 控制平滑程度，值越大线条越平滑
- `streamline`: 控制流线化程度，让线条更流畅
- `simulatePressure`: 是否模拟压力，根据速度变化调整粗细

> 💡 **完整算法实现请查看**: [src/renderer/src/composables/map/useRender.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/useRender.js)

## 🎯 技术挑战

### 挑战 1: 点坐标的收集与存储

在绘制过程中，需要实时收集鼠标移动的点坐标：

```javascript
function onMouseDown(pos) {
  // 开始新的画笔路径
  elements.currentFreeDrawPath.value = {
    type: 'freedraw',
    points: [{ x: pos.x, y: pos.y }],  // 初始化第一个点
    color: color.value,
    strokeWidth: size.value,
    opacity: opacity.value,
    id: Date.now().toString()
  }
}

function onMouseMove(pos) {
  // 添加点到当前路径
  elements.currentFreeDrawPath.value.points.push({ x: pos.x, y: pos.y })
  // 实时渲染
  renderCanvas(false)
}
```

**关键点**:
- ✅ 使用数组存储点序列，保持顺序
- ✅ 实时添加点，确保轨迹完整
- ✅ 每次移动都触发渲染，保证流畅性

### 挑战 2: 实时渲染的性能

绘制过程中需要频繁渲染，性能优化至关重要：

```javascript
function onMouseMove(pos) {
  if (elements.currentFreeDrawPath.value) {
    elements.currentFreeDrawPath.value.points.push({ x: pos.x, y: pos.y })
    // 不更新边界，避免频繁计算导致性能问题
    renderCanvas(false)
  }
}

function onMouseUp() {
  // 绘制完成时才更新边界
  renderCanvas(true)
}
```

**优化策略**:
- ⚡ 绘制过程中不更新边界（`renderCanvas(false)`）
- ⚡ 只在绘制完成时更新边界（`renderCanvas(true)`）
- ⚡ 减少不必要的计算，提升渲染性能

### 挑战 3: 路径的平滑处理

原始的点序列可能存在抖动，需要通过算法平滑处理：

```javascript
const options = {
  smoothing: 0.5,      // 平滑度：值越大越平滑
  streamline: 0.5,     // 流线化：让线条更流畅
  thinning: 0.6        // 压力变化：模拟真实画笔
}
```

**效果对比**:
- ❌ **未处理**: 线条锯齿明显，不够平滑
- ✅ **处理后**: 线条流畅自然，接近手绘效果

### 挑战 4: 透明度的处理

支持透明度控制，让画笔效果更丰富：

```javascript
ctx.save()
ctx.globalAlpha = (element.opacity || 100) / 100
ctx.fillStyle = element.color
// 绘制路径
ctx.fill()
ctx.restore()
```

## ✨ 实现亮点

### 1. 模块化的 Composables 架构

画笔工具采用 Composables 架构，实现了高内聚、低耦合：

```javascript
export function usePencilTool({
  canvasRef,
  elements,
  history,
  renderCanvas,
  color,
  size,
  opacity
}) {
  const drawingActive = ref(false)
  
  function onMouseDown(pos) { /* ... */ }
  function onMouseMove(pos) { /* ... */ }
  function onMouseUp() { /* ... */ }
  
  return {
    drawingActive,
    onMouseDown,
    onMouseMove,
    onMouseUp
  }
}
```

**优势**:
- ✅ 代码组织清晰，易于维护
- ✅ 功能独立，便于测试
- ✅ 可复用性强，易于扩展

### 2. 状态管理

使用响应式状态管理绘制状态：

```javascript
const drawingActive = ref(false)  // 是否正在绘制
const lastPoint = ref({ x: 0, y: 0 })  // 上一个点

// 在绘制过程中更新状态
function onMouseDown(pos) {
  drawingActive.value = true
  lastPoint.value = { ...pos }
}
```

### 3. 历史记录集成

完整的撤销/重做支持：

```javascript
function onMouseDown(pos) {
  history.value.saveState()  // 开始绘制前保存状态
}

function onMouseUp() {
  if (elements.currentFreeDrawPath.value.points.length > 1) {
    elements.freeDrawElements.value.push({ ...elements.currentFreeDrawPath.value })
    history.value.saveState()  // 绘制完成后保存状态
  }
}
```

### 4. 路径数据结构

清晰的数据结构设计：

```javascript
{
  type: 'freedraw',
  points: [
    { x: 100, y: 200 },
    { x: 105, y: 205 },
    // ... 更多点
  ],
  color: '#222222',
  strokeWidth: 5,
  opacity: 100,
  id: '1234567890'
}
```

**设计考虑**:
- ✅ 使用点数组存储路径，便于序列化
- ✅ 包含所有必要属性，支持完整恢复
- ✅ 唯一 ID 便于元素管理

> 💡 **完整实现代码请查看**: [src/renderer/src/composables/map/tools/usePencilTool.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/tools/usePencilTool.js)

## ⚡ 性能优化

### 1. 延迟边界更新

绘制过程中不更新边界，减少计算开销：

```javascript
// 绘制过程中：不更新边界
renderCanvas(false)

// 绘制完成：更新边界
renderCanvas(true)
```

**优化效果**:
- ⚡ 减少边界计算次数
- ⚡ 提升绘制流畅度
- ⚡ 降低 CPU 占用

### 2. 点数组优化

合理控制点数组大小，避免内存占用过大：

```javascript
// 只在绘制完成时添加到元素数组
if (elements.currentFreeDrawPath.value.points.length > 1) {
  elements.freeDrawElements.value.push({ ...elements.currentFreeDrawPath.value })
}
```

### 3. 渲染优化

使用 Canvas 的高效绘制 API：

```javascript
// 使用 fill 而非 stroke，效果更自然
ctx.fillStyle = element.color
ctx.fill()
```

### 4. 状态清理

及时清理临时状态，避免内存泄漏：

```javascript
function onMouseUp() {
  // 完成绘制后清理临时路径
  elements.currentFreeDrawPath.value = null
  drawingActive.value = false
}
```

## 📊 实现流程图

```
用户按下鼠标
    ↓
创建新的画笔路径
    ├─ 初始化点数组
    ├─ 设置颜色、大小、透明度
    └─ 保存历史状态
    ↓
鼠标移动
    ├─ 添加点到路径
    └─ 实时渲染（不更新边界）
    ↓
继续移动...
    ↓
用户释放鼠标
    ├─ 检查路径有效性（至少2个点）
    ├─ 添加到元素数组
    ├─ 更新边界
    └─ 保存历史状态
    ↓
完成绘制
```

## 📝 总结

画笔工具虽然看似简单，但实现过程中涉及了多个技术领域：

- 🎨 **算法应用**: perfect-freehand 算法的集成和使用
- 📊 **状态管理**: 响应式状态的管理和同步
- ⚡ **性能优化**: 实时渲染的性能优化策略
- 🔄 **历史记录**: 完整的撤销/重做支持
- 🏗️ **架构设计**: 模块化的 Composables 架构

通过模块化的 Composables 架构，我们将画笔工具封装为独立的 `usePencilTool`，实现了高内聚、低耦合的代码结构，便于维护和扩展。

### 🚀 下一步探索

如果你想深入了解：
- 📖 **完整代码实现**: 查看 [usePencilTool.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/tools/usePencilTool.js)
- 🎨 **渲染系统**: 查看 [useRender.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/useRender.js)
- 🗺️ **地图设计工具**: 查看 [MapDesign.vue](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/views/MapDesign.vue)
- 📚 **perfect-freehand**: 查看 [perfect-freehand 文档](https://github.com/steveruizok/perfect-freehand)

---

### 📚 相关链接

- **项目地址**: [GitHub - 51mazi](https://github.com/xiaoshengxianjun/51mazi)，给个 Star 哦~
- **画笔工具代码**: [src/renderer/src/composables/map/tools/usePencilTool.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/tools/usePencilTool.js)
- **渲染函数**: [src/renderer/src/composables/map/useRender.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/useRender.js)
- **perfect-freehand 库**: [perfect-freehand](https://github.com/steveruizok/perfect-freehand)
- **技术栈**: Vue 3 + Canvas + perfect-freehand + Composables

### 🏷️ 标签

`#Canvas` `#perfect-freehand` `#画笔工具` `#平滑绘制` `#实时渲染` `#Vue3` `#前端开发` `#性能优化` `#Composables`

---

> 💡 **如果这篇文章对你有帮助，请给个 ⭐️ 支持一下！**
>
> 💡 **想深入了解实现细节？欢迎查看 GitHub 上对应的代码文件，每个模块都有详细的注释说明！**

