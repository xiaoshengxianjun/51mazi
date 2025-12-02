import { ref } from 'vue'

/**
 * 多边形工具 composable（支持圆形、矩形、五角形）
 */
export function useShapeTool({ canvasRef, elements, history, renderCanvas, color, size, opacity }) {
  const drawingActive = ref(false)
  const shapeType = ref('rect') // 'circle', 'rect', 'star'
  const roundness = ref('round') // 'round' 或 'sharp'

  /**
   * 设置形状类型
   */
  function setShapeType(type) {
    shapeType.value = type
  }

  /**
   * 设置边角类型
   */
  function setRoundness(type) {
    roundness.value = type
  }

  /**
   * 获取当前形状类型
   */
  function getShapeType() {
    return shapeType.value
  }

  /**
   * 获取当前边角类型
   */
  function getRoundness() {
    return roundness.value
  }

  /**
   * 开始绘制形状
   */
  function onMouseDown(pos) {
    if (!canvasRef.value || !history.value) return

    drawingActive.value = true
    elements.currentShape.value = {
      type: shapeType.value,
      start: { ...pos },
      end: { ...pos },
      color: color.value,
      strokeWidth: size.value,
      opacity: opacity ? opacity.value : 100,
      roundness: roundness.value,
      id: Date.now().toString()
    }
    history.value.saveState()
  }

  /**
   * 更新形状预览
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
    roundness,
    setShapeType,
    setRoundness,
    getShapeType,
    getRoundness,
    onMouseDown,
    onMouseMove,
    onMouseUp
  }
}
