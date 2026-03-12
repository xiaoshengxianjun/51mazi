/**
 * 坐标转换工具（参考 excalidraw）
 */
export function useCoordinate(canvasRef, editorContainerRef, scale, scrollX, scrollY) {
  /**
   * 将视口坐标转换为场景坐标（viewportCoordsToSceneCoords）
   */
  function getCanvasPos(e) {
    if (!canvasRef.value || !editorContainerRef.value) return { x: 0, y: 0 }

    const containerRect = editorContainerRef.value.getBoundingClientRect()

    let clientX, clientY
    if ('touches' in e && e.touches) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    // 参考 excalidraw: (clientX - offsetLeft) / zoom.value - scrollX
    const x = (clientX - containerRect.left) / scale.value - scrollX.value
    const y = (clientY - containerRect.top) / scale.value - scrollY.value

    return { x, y }
  }

  /**
   * 将场景坐标转换为视口坐标（sceneCoordsToViewportCoords）
   */
  function sceneToViewport(sceneX, sceneY, containerRect) {
    const viewportX = (sceneX + scrollX.value) * scale.value + containerRect.left
    const viewportY = (sceneY + scrollY.value) * scale.value + containerRect.top
    return { x: viewportX, y: viewportY }
  }

  return {
    getCanvasPos,
    sceneToViewport
  }
}
