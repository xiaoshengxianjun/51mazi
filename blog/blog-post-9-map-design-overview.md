# 🗺️ 从零到一：打造专业级小说地图设计工具的技术实践

> 💡 本文详细介绍 51mazi 项目中地图设计页的整体架构与核心功能实现，这是一个基于 Vue 3 + Canvas 的专业级地图编辑器，集成了多种绘图工具、资源管理、缩放控制等完整功能。通过模块化的 Composables 架构设计，实现了高可维护性和可扩展性的代码结构。

## 📋 目录
- [项目背景](#项目背景)
- [技术架构概览](#技术架构概览)
- [核心功能模块](#核心功能模块)
- [模块化设计](#模块化设计)
- [技术亮点](#技术亮点)
- [总结与展望](#总结与展望)

## 🎯 项目背景

在小说创作过程中，作者经常需要绘制故事中的地图来帮助读者理解故事背景和地理关系。传统的写作软件往往缺乏这样的可视化工具，因此我们在 51mazi 中集成了基于 Canvas 的专业级地图设计功能。

### 🗺️ 地图设计工具

![地图设计](https://raw.githubusercontent.com/xiaoshengxianjun/51mazi/main/static/maps.png)

*强大的地图设计工具 - 专业级 Canvas 绘图与资源管理*

### ✨ 功能特性概览

地图设计页提供了完整的绘图工具集，包括：

- 🎨 **10+ 种绘图工具**: 移动、选框、画笔、橡皮擦、形状、油漆桶、文字、资源、背景等
- 🔍 **画布控制**: 缩放、平移、重置视图，支持鼠标滚轮和快捷键操作
- 🎯 **精确操作**: 选框工具支持选择、移动、调整大小、旋转等操作
- 💾 **数据管理**: 完整的撤销/重做系统，自动保存和加载地图数据
- 🎨 **参数控制**: 颜色选择器、大小滑块、透明度滑块，精确控制绘制效果
- 🖼️ **资源管理**: 预设图标资源库，支持拖拽添加和调整
- ⌨️ **快捷键支持**: 完整的键盘快捷键系统，提升操作效率

## 🏗️ 技术架构概览

### 技术栈

```javascript
// 核心技术栈
{
  "vue": "^3.5.13",           // Vue 3 Composition API
  "element-plus": "^2.10.1",  // UI 组件库
  "canvas": "原生 Canvas API"  // 绘图引擎
}
```

### 整体架构设计

地图设计页采用 **模块化的 Composables 架构**，将不同功能拆分为独立的 composable 函数，实现了清晰的代码组织和高度可维护性。

```
MapDesign.vue (主组件)
├── 基础 Composables
│   ├── useCanvasState.js      # 画布状态管理（缩放、平移、边界）
│   ├── useCoordinate.js       # 坐标转换工具
│   ├── useHistory.js          # 历史记录管理（撤销/重做）
│   ├── useElements.js         # 元素数据管理
│   ├── useRender.js           # 渲染函数集合
│   └── useCanvas.js            # 画布渲染和管理
│
└── 工具 Composables
    ├── usePencilTool.js        # 画笔工具
    ├── useEraserTool.js        # 橡皮擦工具
    ├── useShapeTool.js         # 形状工具（线条、矩形、圆形等）
    ├── useTextTool.js          # 文字工具
    ├── useBucketTool.js        # 油漆桶工具
    ├── useResourceTool.js      # 资源工具
    ├── useSelectTool.js        # 选框工具（选择、移动、调整、旋转）
    ├── useMoveTool.js          # 移动工具（平移画布）
    └── useBackgroundTool.js    # 背景工具
```

### 核心组件结构

```vue
<!-- src/renderer/src/views/MapDesign.vue -->
<template>
  <div class="map-design">
    <!-- 工具栏 -->
    <MapToolbar
      v-model="tool"
      :shape-tool-type="shapeToolType"
      @update:model-value="onToolChange"
      @clear="handleClearCanvas"
      @resource-select="selectResource"
      @save-map="handleSaveMap"
    />

    <!-- 颜色选择器 -->
    <Transition name="color-picker-fade">
      <div v-if="showColorPicker" class="color-picker-container">
        <el-color-picker v-model="currentColor" />
      </div>
    </Transition>

    <!-- 滑块控制工具 -->
    <FloatingSidebar :visible="tool === 'pencil' || tool === 'eraser' || tool === 'shape'">
      <MapSlider v-model="size" label="大小" />
      <MapSlider v-model="opacity" label="透明度" />
    </FloatingSidebar>

    <!-- 画布容器 -->
    <div class="editor-container" @wheel="handleWheel">
      <canvas
        ref="canvasRef"
        :width="canvasDisplayWidth"
        :height="canvasDisplayHeight"
        @mousedown="handleCanvasMouseDown"
        @mousemove="handleCanvasMouseMove"
        @mouseup="handleCanvasMouseUp"
      />
    </div>

    <!-- 缩放控制器和撤销/回退按钮 -->
    <MapZoomControls
      :scale="canvasState.scale.value"
      @zoom-in="handleZoomIn"
      @zoom-out="handleZoomOut"
      @reset-zoom="handleResetZoom"
      @undo="handleUndo"
      @redo="handleRedo"
    />
  </div>
</template>
```

> 💡 **完整代码请查看**: [src/renderer/src/views/MapDesign.vue](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/views/MapDesign.vue)

## 🔧 核心功能模块

### 1. 画布状态管理 (useCanvasState)

管理画布的缩放、平移、边界等核心状态：

```javascript
// 核心状态管理
const canvasState = useCanvasState()

// 主要状态
- scale: 画布缩放比例
- scrollX/scrollY: 画布平移偏移
- contentBounds: 内容边界（用于自动调整画布大小）
- canvasDisplayWidth/Height: 画布显示尺寸
```

> 💡 **详细实现请查看**: [src/renderer/src/composables/map/useCanvasState.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/useCanvasState.js)

### 2. 元素管理系统 (useElements)

统一管理所有绘制元素，包括画笔路径、形状、文字、资源、填充区域等：

```javascript
// 元素类型
const elements = useElements()

// 元素分类
- freeDrawElements: 画笔绘制的路径
- shapeElements: 形状元素（线条、矩形、圆形等）
- textElements: 文字元素
- resourceElements: 资源元素（图标、图片）
- fillElements: 填充区域

// 核心方法
- serialize(): 序列化所有元素为 JSON
- deserialize(): 从 JSON 恢复元素
- clearAll(): 清空所有元素
```

> 💡 **详细实现请查看**: [src/renderer/src/composables/map/useElements.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/useElements.js)

### 3. 历史记录系统 (useHistory)

实现完整的撤销/重做功能：

```javascript
// 历史记录管理
const { history } = useHistory(canvasRef)

// 核心功能
- saveState(): 保存当前状态
- undo(): 撤销操作
- redo(): 重做操作
- canUndo(): 是否可以撤销
- canRedo(): 是否可以重做
```

> 💡 **详细实现请查看**: [src/renderer/src/composables/map/useHistory.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/useHistory.js)

### 4. 渲染系统 (useRender)

统一的渲染函数集合，负责绘制各种元素：

```javascript
// 渲染函数
const renderFunctions = useRender(canvasRef)

// 渲染方法
- renderFreeDrawPath(): 渲染画笔路径
- renderShape(): 渲染形状（使用 Rough.js）
- renderText(): 渲染文字
- renderResource(): 渲染资源（图标/图片）
- renderFill(): 渲染填充区域
- renderSelection(): 渲染选框
```

> 💡 **详细实现请查看**: [src/renderer/src/composables/map/useRender.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/useRender.js)

### 5. 工具系统

每个绘图工具都是独立的 composable，实现了统一的接口：

#### 画笔工具 (usePencilTool)

```javascript
const pencilTool = usePencilTool({
  canvasRef,
  elements,
  history,
  renderCanvas,
  color,
  size,
  opacity
})

// 核心方法
- onMouseDown(): 开始绘制
- onMouseMove(): 绘制过程
- onMouseUp(): 结束绘制
```

> 💡 **详细实现请查看**: [src/renderer/src/composables/map/tools/usePencilTool.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/tools/usePencilTool.js)

#### 选框工具 (useSelectTool)

最复杂的工具之一，支持选择、移动、调整大小、旋转等操作：

```javascript
const selectTool = useSelectTool({
  elements,
  history,
  renderCanvas,
  selectedElementIds,
  canvasState,
  canvasCursor
})

// 核心功能
- 单选和多选
- 拖拽移动元素
- 调整元素大小（8个控制点）
- 旋转元素
- 删除选中元素
- 智能光标样式
```

> 💡 **详细实现请查看**: [src/renderer/src/composables/map/tools/useSelectTool.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/tools/useSelectTool.js)

#### 形状工具 (useShapeTool)

支持多种形状绘制：线条、矩形、圆形、圆角矩形、五角星、箭头等：

```javascript
const shapeTool = useShapeTool({
  canvasRef,
  elements,
  history,
  renderCanvas,
  color,
  size,
  opacity
})

// 支持的形状类型
- line: 线条
- rect: 矩形
- circle: 圆形
- roundRect: 圆角矩形
- star: 五角星
- arrow: 箭头
```

> 💡 **详细实现请查看**: [src/renderer/src/composables/map/tools/useShapeTool.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/tools/useShapeTool.js)

#### 其他工具

- **橡皮擦工具**: 精确擦除已绘制内容
- **文字工具**: 添加文字标注，支持双击编辑
- **油漆桶工具**: 区域填充，使用洪水填充算法
- **资源工具**: 拖拽添加预设图标和图片
- **移动工具**: 平移画布视图
- **背景工具**: 设置画布背景色

> 💡 **所有工具实现请查看**: [src/renderer/src/composables/map/tools/](https://github.com/xiaoshengxianjun/51mazi/tree/main/src/renderer/src/composables/map/tools)

## 🎨 模块化设计

### Composables 架构优势

1. **高内聚低耦合**: 每个 composable 专注于单一职责
2. **易于测试**: 独立的 composable 便于单元测试
3. **代码复用**: 可以在其他组件中复用相同的 composable
4. **易于维护**: 修改某个功能只需关注对应的 composable
5. **类型安全**: 清晰的接口定义，减少错误

### 工具统一接口

所有工具 composable 都遵循统一的接口模式：

```javascript
// 工具接口规范
export function useXxxTool(options) {
  // 状态
  const drawingActive = ref(false)
  
  // 方法
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

### 事件处理流程

```javascript
// 统一的事件处理
function handleCanvasMouseDown(e) {
  const pos = getCanvasPos(e) // 坐标转换
  
  // 根据当前工具调用对应的方法
  if (tool.value === 'pencil') {
    pencilTool.onMouseDown(pos)
  } else if (tool.value === 'eraser') {
    eraserTool.onMouseDown(pos)
  } else if (tool.value === 'shape') {
    shapeTool.onMouseDown(pos)
  }
  // ... 其他工具
}
```

## ⚡ 技术亮点

### 1. 坐标转换系统

实现屏幕坐标到画布坐标的精确转换，支持缩放和平移：

```javascript
// 坐标转换
const { getCanvasPos } = useCoordinate(
  canvasRef,
  editorContainerRef,
  canvasState.scale,
  canvasState.scrollX,
  canvasState.scrollY
)

// 使用
const pos = getCanvasPos(event) // 自动处理缩放和平移
```

> 💡 **详细实现请查看**: [src/renderer/src/composables/map/useCoordinate.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/useCoordinate.js)

### 2. 智能画布管理

自动调整画布大小以适应内容，支持无限画布：

```javascript
// 画布管理
const { renderCanvas, canvasWrapStyle, updateContentBounds } = useCanvas(
  canvasRef,
  editorContainerRef,
  canvasState,
  elements,
  // ... 其他参数
)

// 自动更新内容边界
updateContentBounds()
```

> 💡 **详细实现请查看**: [src/renderer/src/composables/map/useCanvas.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/useCanvas.js)

### 3. 缩放控制

支持多种缩放方式：鼠标滚轮、按钮、快捷键，以鼠标位置为中心缩放：

```javascript
// 缩放控制
function handleWheel(e) {
  // Ctrl/Cmd + 滚轮：缩放
  if (e.ctrlKey || e.metaKey) {
    // 以鼠标位置为中心缩放
    const sceneX = mouseX / scale.value - scrollX.value
    const sceneY = mouseY / scale.value - scrollY.value
    // ... 计算新的缩放和平移
  }
}
```

### 4. 数据序列化

完整的地图数据序列化和反序列化，支持保存和加载：

```javascript
// 保存地图
async function handleSaveMap() {
  // 生成预览图
  const imageData = await generatePreviewImage()
  
  // 序列化画板内容
  const mapData = elements.serialize(backgroundColor.value)
  
  // 保存到文件系统
  await window.electron.updateMap({
    bookName,
    mapName: mapName.value,
    imageData,
    mapData
  })
}

// 加载地图
async function loadMapData() {
  const mapData = await window.electron.loadMapData({ bookName, mapName })
  if (mapData) {
    const loadedBackgroundColor = elements.deserialize(mapData)
    backgroundColor.value = loadedBackgroundColor
    renderCanvas(true)
  }
}
```

### 5. 快捷键系统

完整的键盘快捷键支持，提升操作效率：

```javascript
// 快捷键配置
function handleKeyDown(e) {
  // 工具快捷键
  switch (e.key.toLowerCase()) {
    case 'v': onToolChange('select'); break
    case 'h': onToolChange('move'); break
    case 'p': onToolChange('pencil'); break
    case 'e': onToolChange('eraser'); break
    case 's': onToolChange('shape'); break
    case 't': onToolChange('text'); break
    case 'b': onToolChange('bucket'); break
    case 'r': onToolChange('resource'); break
  }
  
  // 撤销/重做
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    handleUndo()
  }
  
  // 空格键：临时切换到移动模式
  if (e.key === ' ' && tool.value !== 'move') {
    spaceKeyPressed.value = true
  }
}
```

### 6. 资源管理系统

支持预设图标资源库，拖拽添加和调整：

```javascript
// 资源工具
const resourceTool = useResourceTool({
  canvasRef,
  elements,
  history,
  renderCanvas,
  getCanvasPos
})

// 支持的功能
- 图标资源库（SVG 图标）
- 拖拽添加资源
- 调整资源大小和位置
- 旋转资源
```

> 💡 **详细实现请查看**: [src/renderer/src/composables/map/tools/useResourceTool.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/composables/map/tools/useResourceTool.js)

## 📊 功能特性总结

### ✅ 已实现功能

| 功能模块 | 功能描述 | 技术实现 |
|---------|---------|---------|
| **绘图工具** | 10+ 种绘图工具 | Composables 架构 |
| **画布控制** | 缩放、平移、重置 | useCanvasState + useCanvas |
| **元素管理** | 统一管理所有元素 | useElements |
| **历史记录** | 撤销/重做 | useHistory |
| **渲染系统** | 统一渲染函数 | useRender |
| **坐标转换** | 屏幕坐标转画布坐标 | useCoordinate |
| **数据持久化** | 保存和加载地图 | 序列化/反序列化 |
| **快捷键** | 完整的键盘快捷键 | 事件监听系统 |
| **资源管理** | 图标资源库 | useResourceTool |
| **参数控制** | 颜色、大小、透明度 | 响应式状态管理 |

### 🚀 技术亮点

1. **模块化架构**: Composables 设计实现高可维护性
2. **统一接口**: 所有工具遵循相同的接口规范
3. **性能优化**: 智能渲染，只重绘变化的部分
4. **用户体验**: 流畅的交互，完整的快捷键支持
5. **可扩展性**: 易于添加新的绘图工具
6. **数据安全**: 完整的保存和加载机制

## 📝 总结与展望

地图设计页是 51mazi 项目中最复杂的功能模块之一，通过模块化的 Composables 架构设计，我们实现了：

- ✅ **清晰的代码组织**: 每个功能模块独立，易于理解和维护
- ✅ **高度可扩展**: 添加新工具只需创建新的 composable
- ✅ **优秀的用户体验**: 流畅的交互和完整的快捷键支持
- ✅ **强大的功能**: 10+ 种绘图工具，满足各种地图绘制需求

### 🎯 技术价值

- **架构设计**: 模块化的 Composables 架构，高内聚低耦合
- **代码质量**: 清晰的接口定义，易于测试和维护
- **性能优化**: 智能渲染机制，保证流畅体验
- **用户体验**: 完整的快捷键系统和直观的操作界面

### 🔮 未来规划

- **更多工具**: 支持更多绘图工具和效果（如渐变、阴影等）
- **图层系统**: 支持多层绘图和图层管理
- **导入导出**: 支持多种图片格式导入导出
- **协作功能**: 支持多人协作绘图
- **模板系统**: 提供地图模板，快速创建常用地图

---

### 📚 相关链接

- **项目地址**: [GitHub - 51mazi](https://github.com/xiaoshengxianjun/51mazi)，给个 Star 哦~
- **地图设计页代码**: [src/renderer/src/views/MapDesign.vue](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/views/MapDesign.vue)
- **Composables 目录**: [src/renderer/src/composables/map/](https://github.com/xiaoshengxianjun/51mazi/tree/main/src/renderer/src/composables/map)
- **技术栈**: Vue 3 + Canvas + Element Plus + Composables

### 🏷️ 标签

`#Vue3` `#Canvas` `#小说地图` `#地图设计` `#Composables` `#前端开发` `#架构设计` `#模块化` `#绘图工具`

---

> 💡 **如果这篇文章对你有帮助，请给个 ⭐️ 支持一下！**
>
> 💡 **想深入了解某个具体功能的实现？欢迎查看 GitHub 上对应的代码文件，每个模块都有详细的注释说明！**
