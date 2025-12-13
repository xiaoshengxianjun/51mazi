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
    // 先清理之前的拖拽状态，避免重复拖拽时状态混乱
    cleanupDragState()
    
    draggingResource.value = resource
    
    // 支持图标资源
    if (resource.icon) {
      // 创建 SVG 图标元素作为拖拽预览
      dragPreviewEl.value = document.createElement('div')
      dragPreviewEl.value.innerHTML = `<svg style="width: 40px; height: 40px;"><use xlink:href="#icon-${resource.icon}"></use></svg>`
      dragPreviewEl.value.style.position = 'fixed'
      dragPreviewEl.value.style.pointerEvents = 'none'
      dragPreviewEl.value.style.zIndex = '9999'
      dragPreviewEl.value.style.width = '40px'
      dragPreviewEl.value.style.height = '40px'
    } else {
      // 兼容旧的图片资源
      dragPreviewEl.value = document.createElement('img')
      dragPreviewEl.value.src = resource.url
      dragPreviewEl.value.style.position = 'fixed'
      dragPreviewEl.value.style.pointerEvents = 'none'
      dragPreviewEl.value.style.zIndex = '9999'
      dragPreviewEl.value.style.width = '40px'
      dragPreviewEl.value.style.height = '40px'
    }
    document.body.appendChild(dragPreviewEl.value)
    
    window.addEventListener('mousemove', onResourceDragMove)
    window.addEventListener('mouseup', onResourceDragEnd)
    if (event) {
      onResourceDragMove(event)
    }
  }

  /**
   * 清理拖拽状态（移除事件监听器和预览元素）
   */
  function cleanupDragState() {
    // 移除事件监听器
    window.removeEventListener('mousemove', onResourceDragMove)
    window.removeEventListener('mouseup', onResourceDragEnd)
    
    // 移除预览元素
    if (dragPreviewEl.value) {
      try {
        if (dragPreviewEl.value.parentNode) {
          document.body.removeChild(dragPreviewEl.value)
        }
      } catch (error) {
        // 忽略错误（元素可能已经被移除）
      }
      dragPreviewEl.value = null
    }
    
    // 注意：不清空 draggingResource.value，因为可能正在使用
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
    // 保存当前拖拽的资源，因为 cleanupDragState 会清理状态
    const currentResource = draggingResource.value
    
    // 先清理拖拽状态
    cleanupDragState()
    
    // 如果没有资源或画布，直接返回
    if (!currentResource || !canvasRef.value) {
      draggingResource.value = null
      return
    }
    
    // 检查是否在画布内释放
    const canvasRect = canvasRef.value.getBoundingClientRect()
    if (
      e.clientX >= canvasRect.left &&
      e.clientX <= canvasRect.right &&
      e.clientY >= canvasRect.top &&
      e.clientY <= canvasRect.bottom
    ) {
      // 使用 getCanvasPos 获取画布坐标
      const pos = getCanvasPos(e)
      drawResourceOnCanvas(currentResource, pos.x, pos.y)
    }
    
    // 清空拖拽资源引用
    draggingResource.value = null
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
    
    // 在创建元素前保存状态
    history.value.saveState()

    // 保存资源元素（支持图标和图片两种类型）
    const resourceElement = {
      type: 'resource',
      name: resource.name,
      x: x,
      y: y,
      width: 40,
      height: 40,
      id: Date.now().toString()
    }
    
    // 优先使用图标，如果没有图标则使用 URL（兼容旧数据）
    if (resource.icon) {
      resourceElement.icon = resource.icon
    } else if (resource.url) {
      resourceElement.url = resource.url
    }

    elements.resourceElements.value.push(resourceElement)

    // 重新渲染画布
    renderCanvas(true)
    // 注意：这里不再保存状态，因为已经在创建前保存了
    // 如果用户想撤销，可以撤销到创建前的状态
  }

  return {
    draggingResource,
    dragPreviewEl,
    selectResource,
    startResourceDrag,
    onResourceDragMove,
    onResourceDragEnd,
    onResourceMouseDown,
    drawResourceOnCanvas,
    cleanupDragState // 导出清理函数，供组件卸载时调用
  }
}
