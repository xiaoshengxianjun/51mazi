# 🎨 小说地图设计：Canvas 油漆桶工具的实现之旅

> 💡 在地图设计工具中，油漆桶工具看似简单，实则暗藏玄机。本文将带你探索 51mazi 项目中油漆桶工具的核心实现思路，从洪水填充算法到坐标转换，从性能优化到数据序列化，揭秘一个看似简单功能背后的技术细节。

## 📋 目录
- [功能简介](#功能简介)
- [核心算法：洪水填充](#核心算法洪水填充)
- [技术挑战](#技术挑战)
- [实现亮点](#实现亮点)
- [性能优化](#性能优化)
- [总结](#总结)

## 🎯 功能简介

油漆桶工具是地图设计工具中的"一键上色"神器，点击即可快速填充封闭区域。在 51mazi 的地图设计工具中，它不仅仅是一个简单的填充功能，而是一个集成了精确算法、坐标转换、性能优化等多项技术的完整解决方案。

### 🎨 功能特性

- ✅ **精确填充**: 基于洪水填充算法，精确识别并填充封闭区域
- ✅ **智能坐标转换**: 完美处理画布缩放和平移，确保填充位置准确
- ✅ **边界优化**: 智能裁剪填充区域，只存储实际填充的部分，大幅减少数据量
- ✅ **数据持久化**: 将填充区域转换为 Base64 图片，支持保存和加载
- ✅ **完整历史记录**: 支持撤销/重做，操作可追溯

### 🖼️ 使用场景

在地图设计中，油漆桶工具常用于：
- 🌊 填充地形区域（海洋、陆地、森林等）
- 🎨 快速为封闭区域上色
- 🗺️ 创建区域标记和区分

![地图设计](https://raw.githubusercontent.com/xiaoshengxianjun/51mazi/main/static/maps.png)

*地图设计工具中的油漆桶工具 - 快速填充封闭区域，创建丰富的地图效果*

## 🔬 核心算法：洪水填充

### 算法原理

洪水填充（Flood Fill）是一种经典的图像处理算法，它的工作原理就像水从一点开始向四周扩散一样：

1. **从起点开始**: 记录点击位置的像素颜色
2. **向四周扩散**: 检查上下左右四个方向的相邻像素
3. **颜色匹配**: 如果相邻像素颜色与起点相同，则填充为目标颜色
4. **继续扩散**: 从新填充的像素继续向四周扩散
5. **直到边界**: 遇到不同颜色或边界时停止

### 算法实现思路

```javascript
// 核心算法流程（简化版）
function floodFill(startX, startY, targetColor, fillColor, imageData) {
  const stack = [[startX, startY]]  // 使用栈而非递归
  const visited = new Set()         // 记录已访问的像素
  
  while (stack.length) {
    const [x, y] = stack.pop()
    
    // 边界检查和颜色匹配
    if (isValid(x, y) && colorMatches(x, y, targetColor)) {
      fillPixel(x, y, fillColor)     // 填充像素
      visited.add(`${x},${y}`)       // 标记已访问
      
      // 将相邻像素加入栈
      stack.push([x+1, y], [x-1, y], [x, y+1], [x, y-1])
    }
  }
}
```

**为什么使用栈而非递归？**

- ✅ **避免调用栈溢出**: 大区域填充时，递归可能导致栈溢出
- ✅ **性能更好**: 栈操作比函数调用更高效
- ✅ **内存可控**: 可以更好地控制内存使用

> 💡 **完整算法实现请查看**: [src/renderer/src/composables/map/tools/useBucketTool.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/tools/useBucketTool.js)

## 🎯 技术挑战

### 挑战 1: 坐标转换的复杂性

在 Canvas 中，我们使用了两种坐标系：
- **场景坐标**: 逻辑坐标系，用于存储元素位置（支持无限画布）
- **画布像素坐标**: 物理坐标系，用于实际绘制（受画布尺寸限制）

由于画布支持缩放和平移，坐标转换变得复杂：

```javascript
// 场景坐标 → 画布像素坐标
pixelX = (sceneX + scrollX) * scale
pixelY = (sceneY + scrollY) * scale

// 画布像素坐标 → 场景坐标
sceneX = pixelX / scale - scrollX
sceneY = pixelY / scale - scrollY
```

**为什么需要坐标转换？**

- 用户点击的是屏幕坐标，需要转换为画布像素坐标才能获取像素数据
- 填充元素需要存储场景坐标，以便在不同缩放级别下正确显示
- `getImageData` 获取的是画布像素数据，必须使用像素坐标

> 💡 **坐标转换详细实现请查看**: [src/renderer/src/composables/map/useCoordinate.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/useCoordinate.js)

### 挑战 2: 颜色匹配的精确性

颜色匹配看似简单，但在实际实现中需要注意：

- **精确匹配**: 使用完全相等比较，避免容差导致的误填充
- **RGBA 四通道**: 需要同时比较 R、G、B、A 四个通道
- **十六进制转换**: 需要将用户选择的颜色（十六进制）转换为 RGBA 格式

### 挑战 3: 大区域填充的性能

填充大区域时，需要考虑性能问题：

- **访问标记**: 使用 `Set` 记录已访问的像素，O(1) 查找效率
- **边界裁剪**: 只存储填充区域，而不是整个画布
- **异步处理**: 图片加载是异步的，需要正确处理加载状态

## ✨ 实现亮点

### 1. 智能边界裁剪

填充完成后，我们不是存储整个画布，而是只存储实际填充的区域：

```javascript
// 计算填充区域的边界
const bounds = calculateBounds(visitedPixels)

// 裁剪 imageData 到填充区域
const fillImageData = cropImageData(imageData, bounds)
```

**优化效果**:
- 📉 存储空间减少 90%+（对于小区域填充）
- ⚡ 序列化速度更快
- 💾 内存占用更低

### 2. Base64 数据序列化

将填充区域转换为 Base64 图片数据，便于保存和加载：

```javascript
// 将 imageData 转换为 base64
const tempCanvas = document.createElement('canvas')
tempCanvas.width = fillWidth
tempCanvas.height = fillHeight
const tempCtx = tempCanvas.getContext('2d')
tempCtx.putImageData(fillImageData, 0, 0)
const imageDataBase64 = tempCanvas.toDataURL('image/png')
```

**优势**:
- ✅ 可以保存到 JSON 文件中
- ✅ 跨平台兼容
- ✅ 可以直接作为图片源使用

### 3. 完整的填充流程

从用户点击到填充完成，整个流程包括：

1. **保存历史状态** - 支持撤销/重做
2. **渲染当前画布** - 获取最新的像素数据
3. **坐标转换** - 场景坐标转画布像素坐标
4. **执行洪水填充** - 填充目标区域
5. **计算边界** - 确定填充区域范围
6. **裁剪数据** - 只保留填充区域
7. **转换为 Base64** - 便于序列化
8. **创建填充元素** - 转换为场景坐标存储
9. **预加载图片** - 确保渲染时图片已准备好
10. **重新渲染** - 显示填充效果

> 💡 **完整实现代码请查看**: [src/renderer/src/composables/map/tools/useBucketTool.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/tools/useBucketTool.js)

## ⚡ 性能优化

### 1. 使用 Set 记录访问

```javascript
const visited = new Set()
const key = `${x},${y}`

if (visited.has(key)) continue  // O(1) 查找
visited.add(key)
```

**为什么使用 Set？**
- ⚡ O(1) 查找和插入
- 💾 比数组更节省内存
- 🔒 自动去重

### 2. 边界裁剪优化

只存储填充区域，大幅减少数据量：

```javascript
// 只存储填充区域，而不是整个画布
const fillImageData = ctx.createImageData(fillWidth, fillHeight)
```

### 3. 图片缓存

在渲染系统中使用缓存，避免重复加载：

```javascript
// src/renderer/src/composables/map/useRender.js
const fillImageCache = new Map()

function renderFill(ctx, element) {
  let img = fillImageCache.get(element.id)
  if (!img) {
    img = new window.Image()
    img.src = element.imageDataBase64
    fillImageCache.set(element.id, img)
  }
  // 使用缓存的图片渲染
}
```

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
创建填充元素（场景坐标）
    ↓
预加载图片
    ↓
添加到元素数组
    ↓
重新渲染画布
```

## 📝 总结

油漆桶工具虽然看似简单，但实现过程中涉及了多个技术领域：

- 🔬 **算法**: 洪水填充算法的实际应用
- 🗺️ **坐标系统**: 复杂坐标转换的处理方法
- 🎨 **像素操作**: Canvas 像素数据的处理技巧
- ⚡ **性能优化**: 大区域操作的优化策略
- 💾 **数据序列化**: Base64 编码的应用

通过模块化的 Composables 架构，我们将油漆桶工具封装为独立的 `useBucketTool`，实现了高内聚、低耦合的代码结构，便于维护和扩展。

### 🚀 下一步探索

如果你想深入了解：
- 📖 **完整代码实现**: 查看 [useBucketTool.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/tools/useBucketTool.js)
- 🎨 **渲染系统**: 查看 [useRender.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/useRender.js)
- 🗺️ **坐标转换**: 查看 [useCoordinate.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/useCoordinate.js)
- 🎯 **地图设计工具**: 查看 [MapDesign.vue](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/views/MapDesign.vue)

---

### 📚 相关链接

- **项目地址**: [GitHub - 51mazi](https://github.com/xiaoshengxianjun/51mazi)，给个 Star 哦~
- **油漆桶工具代码**: [src/renderer/src/composables/map/tools/useBucketTool.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/tools/useBucketTool.js)
- **渲染函数**: [src/renderer/src/composables/map/useRender.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/useRender.js)
- **坐标转换**: [src/renderer/src/composables/map/useCoordinate.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/useCoordinate.js)
- **技术栈**: Vue 3 + Canvas + Composables

### 🏷️ 标签

`#Canvas` `#洪水填充算法` `#油漆桶工具` `#像素处理` `#坐标转换` `#Vue3` `#前端开发` `#算法实现` `#性能优化`

---

> 💡 **如果这篇文章对你有帮助，请给个 ⭐️ 支持一下！**
>
> 💡 **想深入了解实现细节？欢迎查看 GitHub 上对应的代码文件，每个模块都有详细的注释说明！**

