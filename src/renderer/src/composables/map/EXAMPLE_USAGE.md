# Composables 使用示例

## 在 MapDesign.vue 中的使用方式

### 1. 导入 composables

```javascript
import { useCanvasState } from '@renderer/composables/map/useCanvasState'
import { useCoordinate } from '@renderer/composables/map/useCoordinate'
import { useHistory, HistoryManager } from '@renderer/composables/map/useHistory'
import { useElements } from '@renderer/composables/map/useElements'
import { useRender } from '@renderer/composables/map/useRender'
import { useCanvas } from '@renderer/composables/map/useCanvas'
import { usePencilTool } from '@renderer/composables/map/tools/usePencilTool'
import { useEraserTool } from '@renderer/composables/map/tools/useEraserTool'
```

### 2. 在 setup 中使用

```javascript
export default {
  setup() {
    // 基础 refs
    const canvasRef = ref(null)
    const editorContainerRef = ref(null)
    const tool = ref('pencil')
    const color = ref('#222222')
    const size = ref(5)
    const opacity = ref(100)
    const backgroundColor = ref('#ffffff')

    // 基础 composables
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

    // 渲染函数
    const renderFunctions = useRender(canvasRef, canvasState.scale)

    // 画布管理
    const { renderCanvas, canvasWrapStyle } = useCanvas(
      canvasRef,
      editorContainerRef,
      canvasState,
      elements,
      {
        currentFreeDrawPath: elements.currentFreeDrawPath,
        currentShape: elements.currentShape,
        drawingActive: ref(false) // 需要从工具中获取
      },
      renderFunctions,
      backgroundColor,
      tool,
      undefined, // selectedElementIds - 待实现
      undefined, // isSelecting - 待实现
      undefined, // selectionStart - 待实现
      undefined // selectionEnd - 待实现
    )

    // 工具 composables
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

    // 事件处理
    function handleCanvasMouseDown(e) {
      const pos = getCanvasPos(e)
      
      if (tool.value === 'pencil') {
        pencilTool.onMouseDown(pos)
      } else if (tool.value === 'eraser') {
        eraserTool.onMouseDown(pos)
      }
      // ... 其他工具
    }

    function handleCanvasMouseMove(e) {
      const pos = getCanvasPos(e)
      
      if (tool.value === 'pencil' && pencilTool.drawingActive.value) {
        pencilTool.onMouseMove(pos)
      } else if (tool.value === 'eraser' && eraserTool.drawingActive.value) {
        eraserTool.onMouseMove(pos)
      }
      // ... 其他工具
    }

    function handleCanvasMouseUp(e) {
      if (tool.value === 'pencil') {
        pencilTool.onMouseUp()
      } else if (tool.value === 'eraser') {
        eraserTool.onMouseUp()
      }
      // ... 其他工具
    }

    return {
      canvasRef,
      editorContainerRef,
      canvasWrapStyle,
      handleCanvasMouseDown,
      handleCanvasMouseMove,
      handleCanvasMouseUp
    }
  }
}
```

## 优势对比

### 重构前（MapDesign.vue）
- 3000+ 行代码
- 所有工具逻辑混在一起
- 难以维护和扩展

### 重构后
- MapDesign.vue: ~500-800 行（主要是组合 composables）
- 每个工具: ~50-200 行（独立管理）
- 共享逻辑: 可复用
- 易于测试和维护

