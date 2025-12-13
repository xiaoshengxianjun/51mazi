# MapDesign 重构方案

## 已完成

### 基础 Composables
- ✅ `useCanvasState.js` - 画布状态管理（缩放、平移、边界等）
- ✅ `useCoordinate.js` - 坐标转换工具
- ✅ `useHistory.js` - 历史记录管理
- ✅ `useElements.js` - 元素数据管理
- ✅ `useRender.js` - 渲染函数集合

### 工具 Composables（示例）
- ✅ `tools/usePencilTool.js` - 画笔工具（示例实现）
- ✅ `tools/useEraserTool.js` - 橡皮擦工具（示例实现）

## 待完成

### 工具 Composables
- [ ] `tools/useLineTool.js` - 线条工具
- [ ] `tools/useRectTool.js` - 矩形工具
- [ ] `tools/useTextTool.js` - 文字工具
- [ ] `tools/useBucketTool.js` - 油漆桶工具
- [ ] `tools/useResourceTool.js` - 资源工具
- [ ] `tools/useSelectTool.js` - 选框工具（包含移动、调整大小、旋转）
- [ ] `tools/useMoveTool.js` - 移动工具（平移画布）
- [ ] `tools/useBackgroundTool.js` - 背景工具

### 工具函数
- [ ] `utils/elementBounds.js` - 元素边界计算
- [ ] `utils/elementDetection.js` - 元素检测（点击检测等）
- [ ] `utils/selection.js` - 选框相关工具函数

### 画布管理
- [ ] `useCanvas.js` - 画布渲染逻辑（需要整合 useRender 和 useElements）

## 使用示例

### 在 MapDesign.vue 中使用

```javascript
import { useCanvasState } from '@renderer/composables/map/useCanvasState'
import { useCoordinate } from '@renderer/composables/map/useCoordinate'
import { useHistory, HistoryManager } from '@renderer/composables/map/useHistory'
import { useElements } from '@renderer/composables/map/useElements'
import { useRender } from '@renderer/composables/map/useRender'
import { usePencilTool } from '@renderer/composables/map/tools/usePencilTool'
import { useEraserTool } from '@renderer/composables/map/tools/useEraserTool'
// ... 其他工具

export default {
  setup() {
    // 基础状态
    const canvasRef = ref(null)
    const editorContainerRef = ref(null)
    const canvasState = useCanvasState()
    const elements = useElements()
    const { history } = useHistory(canvasRef)
    
    // 坐标转换
    const { getCanvasPos } = useCoordinate(
      canvasRef,
      editorContainerRef,
      canvasState.scale,
      canvasState.scrollX,
      canvasState.scrollY
    )
    
    // 渲染
    const renderFunctions = useRender(canvasRef, canvasState.scale)
    
    // 工具
    const pencilTool = usePencilTool({
      canvasRef,
      elements,
      history,
      renderCanvas,
      color,
      size,
      opacity
    })
    
    const eraserTool = useEraserTool({
      canvasRef,
      history,
      size
    })
    
    // 根据当前工具调用对应的方法
    function handleCanvasMouseDown(e) {
      const pos = getCanvasPos(e)
      if (tool.value === 'pencil') {
        pencilTool.onMouseDown(pos)
      } else if (tool.value === 'eraser') {
        eraserTool.onMouseDown(pos)
      }
      // ... 其他工具
    }
    
    // ...
  }
}
```

## 重构优势

1. **代码组织清晰**：每个工具独立管理，职责单一
2. **易于维护**：修改某个工具不影响其他工具
3. **易于扩展**：添加新工具只需创建新的 composable
4. **易于测试**：每个 composable 可以独立测试
5. **代码复用**：共享的 composables 可以在多个地方使用
6. **减少主组件代码量**：MapDesign.vue 从 3000+ 行减少到约 500-800 行

## 下一步

1. 完成所有工具 composables 的实现
2. 创建工具函数 utils
3. 完成 useCanvas.js（整合渲染逻辑）
4. 重构 MapDesign.vue，使用所有 composables
5. 测试确保功能正常

