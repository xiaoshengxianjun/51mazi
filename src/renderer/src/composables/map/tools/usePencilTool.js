import { ref } from 'vue'

/**
 * 画笔工具 composable
 */
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
  const lastPoint = ref({ x: 0, y: 0 })

  /**
   * 开始绘制
   */
  function onMouseDown(pos) {
    if (!canvasRef.value || !history.value) return

    drawingActive.value = true
    lastPoint.value = { ...pos }

    // 开始新的画笔路径
    elements.currentFreeDrawPath.value = {
      type: 'freedraw',
      points: [{ x: pos.x, y: pos.y }],
      color: color.value,
      strokeWidth: size.value,
      opacity: opacity.value,
      id: Date.now().toString()
    }
    history.value.saveState()
  }

  /**
   * 继续绘制
   */
  function onMouseMove(pos) {
    if (!canvasRef.value || !drawingActive.value) return

    if (elements.currentFreeDrawPath.value) {
      // 添加点到当前路径
      elements.currentFreeDrawPath.value.points.push({ x: pos.x, y: pos.y })
      // 重新渲染画布（但不更新边界，避免画布尺寸频繁变化导致内容丢失）
      renderCanvas(false)
    }
  }

  /**
   * 完成绘制
   */
  function onMouseUp() {
    if (!drawingActive.value) return

    if (elements.currentFreeDrawPath.value) {
      // 完成画笔路径
      if (elements.currentFreeDrawPath.value.points.length > 1) {
        elements.freeDrawElements.value.push({ ...elements.currentFreeDrawPath.value })
        // 绘制完成时更新边界并重新渲染
        renderCanvas(true)
        if (history.value) {
          history.value.saveState()
        }
      }
      elements.currentFreeDrawPath.value = null
    }

    drawingActive.value = false
  }

  return {
    drawingActive,
    lastPoint,
    onMouseDown,
    onMouseMove,
    onMouseUp
  }
}
