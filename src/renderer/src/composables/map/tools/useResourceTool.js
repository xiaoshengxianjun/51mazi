import { ref } from 'vue'

/**
 * 资源工具 composable
 */
export function useResourceTool({ canvasRef, elements, history, renderCanvas, getCanvasPos }) {
  const draggingResource = ref(null)
  const dragPreviewEl = ref(null)

  /**
   * 选择资源
   */
  function selectResource(resource) {
    startResourceDrag(resource, null)
  }

  /**
   * 开始拖拽资源
   */
  function startResourceDrag(resource, event) {
    draggingResource.value = resource
    if (!dragPreviewEl.value) {
      dragPreviewEl.value = document.createElement('img')
      dragPreviewEl.value.src = resource.url
      dragPreviewEl.value.style.position = 'fixed'
      dragPreviewEl.value.style.pointerEvents = 'none'
      dragPreviewEl.value.style.zIndex = '9999'
      dragPreviewEl.value.style.width = '40px'
      dragPreviewEl.value.style.height = '40px'
      document.body.appendChild(dragPreviewEl.value)
    }
    window.addEventListener('mousemove', onResourceDragMove)
    window.addEventListener('mouseup', onResourceDragEnd)
    if (event) {
      onResourceDragMove(event)
    }
  }

  /**
   * 拖拽资源移动
   */
  function onResourceDragMove(e) {
    if (!dragPreviewEl.value) return
    dragPreviewEl.value.style.left = e.clientX - 20 + 'px'
    dragPreviewEl.value.style.top = e.clientY - 20 + 'px'
  }

  /**
   * 拖拽资源结束
   */
  function onResourceDragEnd(e) {
    if (!draggingResource.value || !canvasRef.value) return
    const canvasRect = canvasRef.value.getBoundingClientRect()
    if (
      e.clientX >= canvasRect.left &&
      e.clientX <= canvasRect.right &&
      e.clientY >= canvasRect.top &&
      e.clientY <= canvasRect.bottom
    ) {
      // 使用 getCanvasPos 获取画布坐标
      const pos = getCanvasPos(e)
      drawResourceOnCanvas(draggingResource.value, pos.x, pos.y)
    }
    if (dragPreviewEl.value) {
      document.body.removeChild(dragPreviewEl.value)
      dragPreviewEl.value = null
    }
    draggingResource.value = null
    window.removeEventListener('mousemove', onResourceDragMove)
    window.removeEventListener('mouseup', onResourceDragEnd)
  }

  /**
   * 资源鼠标按下事件
   */
  function onResourceMouseDown(resource, event) {
    event.preventDefault()
    startResourceDrag(resource, event)
  }

  /**
   * 在画布上绘制资源
   */
  function drawResourceOnCanvas(resource, x, y) {
    if (!canvasRef.value || !history.value) return
    history.value.saveState()

    // 保存资源元素
    elements.resourceElements.value.push({
      type: 'resource',
      url: resource.url,
      name: resource.name,
      x: x,
      y: y,
      width: 40,
      height: 40,
      id: Date.now().toString()
    })

    // 重新渲染画布
    renderCanvas(true)
    history.value.saveState()
  }

  return {
    draggingResource,
    dragPreviewEl,
    selectResource,
    startResourceDrag,
    onResourceDragMove,
    onResourceDragEnd,
    onResourceMouseDown,
    drawResourceOnCanvas
  }
}
