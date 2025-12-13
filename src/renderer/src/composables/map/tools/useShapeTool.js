import { ref } from 'vue'

/**
 * 形状工具 composable（支持线条、圆形、矩形、五角形、箭头）
 */
export function useShapeTool({ canvasRef, elements, history, renderCanvas, color, size, opacity }) {
  const drawingActive = ref(false)
  const shapeType = ref('line') // 'line', 'circle', 'rect', 'rounded-rect', 'star', 'arrow' - 默认线条

  /**
   * 设置形状类型
   */
  function setShapeType(type) {
    shapeType.value = type
  }

  /**
   * 获取当前形状类型
   */
  function getShapeType() {
    return shapeType.value
  }

  /**
   * 开始绘制形状
   */
  function onMouseDown(pos) {
    if (!canvasRef.value || !history.value) {
      return
    }

    // 确保shapeType有值
    if (!shapeType.value) {
      shapeType.value = 'line' // 默认值
    }

    drawingActive.value = true
    elements.currentShape.value = {
      type: shapeType.value,
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
   * 更新形状预览
   */
  function onMouseMove(pos) {
    if (!canvasRef.value || !drawingActive.value) {
      return
    }

    if (elements.currentShape.value) {
      // 更新形状的结束点
      elements.currentShape.value.end = { ...pos }
      // 重新渲染画布（但不更新边界，避免画布尺寸频繁变化）
      renderCanvas(false)
    }
  }

  /**
   * 完成形状绘制
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
    shapeType,
    setShapeType,
    getShapeType,
    onMouseDown,
    onMouseMove,
    onMouseUp
  }
}
