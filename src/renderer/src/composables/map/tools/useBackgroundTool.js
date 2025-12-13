/**
 * 背景工具 composable
 */
export function useBackgroundTool({ canvasRef, history, renderCanvas, backgroundColor }) {
  /**
   * 处理背景颜色变化
   */
  function handleColorChange(newColor) {
    if (!canvasRef.value) return

    if (history.value) {
      history.value.saveState()
      backgroundColor.value = newColor
      renderCanvas()
      history.value.saveState()
    } else {
      backgroundColor.value = newColor
      renderCanvas()
    }
  }

  return {
    handleColorChange
  }
}
