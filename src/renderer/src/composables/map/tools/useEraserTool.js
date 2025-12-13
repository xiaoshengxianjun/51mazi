import { ref } from 'vue'

/**
 * 橡皮擦工具 composable
 */
export function useEraserTool({ canvasRef, history, size }) {
  const drawingActive = ref(false)
  const lastPoint = ref({ x: 0, y: 0 })

  /**
   * 开始擦除
   */
  function onMouseDown(pos) {
    if (!canvasRef.value || !history.value) return

    drawingActive.value = true
    lastPoint.value = { ...pos }
    history.value.saveState()
  }

  /**
   * 继续擦除
   */
  function onMouseMove(pos) {
    if (!canvasRef.value || !drawingActive.value) return

    // 橡皮擦使用直接绘制的方式
    const ctx = canvasRef.value.getContext('2d')
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = size.value

    ctx.beginPath()
    ctx.moveTo(lastPoint.value.x, lastPoint.value.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()

    lastPoint.value = { ...pos }
  }

  /**
   * 完成擦除
   */
  function onMouseUp() {
    if (!drawingActive.value) return

    drawingActive.value = false
    if (history.value) {
      history.value.saveState()
    }
  }

  return {
    drawingActive,
    lastPoint,
    onMouseDown,
    onMouseMove,
    onMouseUp
  }
}
