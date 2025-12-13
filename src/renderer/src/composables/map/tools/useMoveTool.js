import { ref } from 'vue'

/**
 * 移动工具 composable（平移画布）
 */
export function useMoveTool({ editorContainerRef, canvasState }) {
  const panning = ref(false)
  const panStart = ref({ x: 0, y: 0 })

  /**
   * 开始平移
   */
  function onMouseDown(e) {
    panning.value = true
    panStart.value = {
      x: e.clientX,
      y: e.clientY
    }
  }

  /**
   * 继续平移
   * 参考excalidraw：直接计算鼠标移动的差值，更新scrollX和scrollY
   * 注意：ctx.translate(scrollX, scrollY) 会将坐标系向右下移动
   * 所以鼠标向右移动时，scrollX应该增加，使内容跟随鼠标向右移动
   */
  function onMouseMove(e) {
    if (!panning.value || !editorContainerRef.value) return

    // 计算鼠标移动的差值（视口坐标）
    const deltaX = e.clientX - panStart.value.x
    const deltaY = e.clientY - panStart.value.y

    // 将视口坐标差值转换为场景坐标差值
    // 场景坐标 = 视口坐标 / scale
    const sceneDeltaX = deltaX / canvasState.scale.value
    const sceneDeltaY = deltaY / canvasState.scale.value

    // 更新scrollX和scrollY
    // 鼠标向右移动（deltaX > 0）→ scrollX增加 → 内容向右移动
    // 鼠标向左移动（deltaX < 0）→ scrollX减少 → 内容向左移动
    canvasState.scrollX.value += sceneDeltaX
    canvasState.scrollY.value += sceneDeltaY

    // 更新 panStart
    panStart.value = { x: e.clientX, y: e.clientY }
  }

  /**
   * 结束平移
   */
  function onMouseUp() {
    panning.value = false
  }

  return {
    panning,
    panStart,
    onMouseDown,
    onMouseMove,
    onMouseUp
  }
}
