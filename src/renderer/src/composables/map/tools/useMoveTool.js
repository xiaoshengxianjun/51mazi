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
   */
  function onMouseMove(e) {
    if (!panning.value || !editorContainerRef.value) return

    const containerRect = editorContainerRef.value.getBoundingClientRect()
    // 计算鼠标在场景坐标系中的位置
    const sceneX =
      (e.clientX - containerRect.left) / canvasState.scale.value - canvasState.scrollX.value
    const sceneY =
      (e.clientY - containerRect.top) / canvasState.scale.value - canvasState.scrollY.value
    // 计算开始平移时的场景坐标
    const startSceneX =
      (panStart.value.x - containerRect.left) / canvasState.scale.value - canvasState.scrollX.value
    const startSceneY =
      (panStart.value.y - containerRect.top) / canvasState.scale.value - canvasState.scrollY.value
    // 计算 scrollX 和 scrollY 的变化
    canvasState.scrollX.value = canvasState.scrollX.value - (sceneX - startSceneX)
    canvasState.scrollY.value = canvasState.scrollY.value - (sceneY - startSceneY)
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
