import { ref } from 'vue'

/**
 * 线条工具 composable
 */
export function useLineTool({ canvasRef, elements, history, renderCanvas, color, size, opacity }) {
  const drawingActive = ref(false)

  /**
   * 开始绘制线条
   */
  function onMouseDown(pos) {
    if (!canvasRef.value || !history.value) return

    drawingActive.value = true
    elements.currentShape.value = {
      type: 'line',
      start: { ...pos },
      end: { ...pos },
      color: color.value,
      strokeWidth: size.value,
      opacity: opacity ? opacity.value : 100,
      id: Date.now().toString()
    }
    history.value.saveState()
  }

  /**
   * 更新线条预览
   */
  function onMouseMove(pos) {
    if (!canvasRef.value || !drawingActive.value) return

    if (elements.currentShape.value) {
      // 更新形状的结束点
      elements.currentShape.value.end = { ...pos }
      // 重新渲染画布（但不更新边界，避免画布尺寸频繁变化）
      renderCanvas(false)
    }
  }

  /**
   * 完成线条绘制
   */
  function onMouseUp() {
    if (!drawingActive.value) return

    if (elements.currentShape.value) {
      // 保存完成的形状
      elements.shapeElements.value.push({ ...elements.currentShape.value })
      // 重新渲染画布
      renderCanvas(true)
      if (history.value) {
        history.value.saveState()
      }
      elements.currentShape.value = null
    }

    drawingActive.value = false
  }

  return {
    drawingActive,
    onMouseDown,
    onMouseMove,
    onMouseUp
  }
}
