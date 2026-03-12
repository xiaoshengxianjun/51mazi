# MapDesign.vue 重构方案

## 目标
将 `MapDesign.vue` 中的代码按功能模块拆分，提高代码可维护性和可扩展性。

## 目录结构

```
src/renderer/src/composables/map/
├── useCanvasState.js        # 画布状态管理（缩放、平移、边界）
├── useCoordinate.js         # 坐标转换工具
├── useHistory.js            # 历史记录管理
├── useCanvas.js             # 画布渲染和管理
├── useElements.js          # 元素数据管理（所有绘制元素）
├── useRender.js             # 渲染函数集合
├── tools/
│   ├── usePencilTool.js     # 画笔工具
│   ├── useEraserTool.js     # 橡皮擦工具
│   ├── useLineTool.js       # 线条工具
│   ├── useRectTool.js       # 矩形工具
│   ├── useTextTool.js       # 文字工具
│   ├── useBucketTool.js     # 油漆桶工具
│   ├── useResourceTool.js   # 资源工具
│   ├── useSelectTool.js     # 选框工具（包含移动、调整大小、旋转）
│   ├── useMoveTool.js       # 移动工具（平移画布）
│   └── useBackgroundTool.js # 背景工具
└── utils/
    ├── elementBounds.js     # 元素边界计算
    ├── elementDetection.js  # 元素检测（点击检测等）
    └── selection.js         # 选框相关工具函数
```

## 重构步骤

### 第一步：创建基础 composables（已完成）
- ✅ `useCanvasState.js` - 画布状态管理
- ✅ `useCoordinate.js` - 坐标转换
- ✅ `useHistory.js` - 历史记录管理

### 第二步：创建元素和渲染管理
- `useElements.js` - 管理所有绘制元素（freeDrawElements, shapeElements, textElements, resourceElements, fillElements）
- `useRender.js` - 所有渲染函数（renderFreeDrawPath, renderShape, renderText, renderResource, renderFill, renderSelection）
- `useCanvas.js` - 画布渲染逻辑（renderCanvas, renderCanvasContent, updateContentBounds）

### 第三步：创建工具 composables
每个工具 composable 应该：
1. 接收必要的依赖（canvasRef, elements, history, renderCanvas 等）
2. 返回工具特定的状态和方法
3. 实现 `onMouseDown`, `onMouseMove`, `onMouseUp` 等方法

### 第四步：重构 MapDesign.vue
- 导入所有 composables
- 组合使用各个工具
- 根据当前工具类型调用对应的工具方法
- 简化主组件代码

## 工具接口设计

每个工具 composable 应该遵循统一的接口：

```javascript
export function useXxxTool(dependencies) {
  // 工具特定状态
  const state = ref(...)
  
  // 工具方法
  function onMouseDown(e, pos) { ... }
  function onMouseMove(e, pos) { ... }
  function onMouseUp(e) { ... }
  function onDoubleClick(e, pos) { ... } // 可选
  
  return {
    state,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onDoubleClick
  }
}
```

## 优势

1. **代码组织清晰**：每个工具独立管理，职责单一
2. **易于维护**：修改某个工具不影响其他工具
3. **易于扩展**：添加新工具只需创建新的 composable
4. **易于测试**：每个 composable 可以独立测试
5. **代码复用**：共享的 composables 可以在多个地方使用

