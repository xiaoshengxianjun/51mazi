import { computed, nextTick } from 'vue'
import {
  getElementAbsoluteCoords,
  getTransformHandlesFromCoords,
  renderTransformHandles,
  renderSelection as renderSelectionBox,
  strokeRectWithRotation
} from './utils/selectionRender.js'
import { getElementBounds } from './utils/elementBounds.js'
import { getCommonBounds } from './utils/selection.js'

/**
 * 画布渲染和管理
 */
export function useCanvas(
  canvasRef,
  editorContainerRef,
  canvasState,
  elements,
  currentPreview,
  renderFunctions,
  backgroundColor,
  tool,
  selectedElementIds,
  isSelecting,
  selectionStart,
  selectionEnd
) {
  /**
   * 更新内容边界
   */
  function updateContentBounds() {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    // 检查所有元素
    elements.freeDrawElements.value.forEach((element) => {
      if (element.points && element.points.length > 0) {
        element.points.forEach((point) => {
          minX = Math.min(minX, point.x)
          minY = Math.min(minY, point.y)
          maxX = Math.max(maxX, point.x)
          maxY = Math.max(maxY, point.y)
        })
      }
    })

    elements.shapeElements.value.forEach((element) => {
      if (element.start && element.end) {
        minX = Math.min(minX, element.start.x, element.end.x)
        minY = Math.min(minY, element.start.y, element.end.y)
        maxX = Math.max(maxX, element.start.x, element.end.x)
        maxY = Math.max(maxY, element.start.y, element.end.y)
      }
    })

    elements.textElements.value.forEach((element) => {
      minX = Math.min(minX, element.x)
      minY = Math.min(minY, element.y)
      maxX = Math.max(maxX, element.x + (element.width || 0))
      maxY = Math.max(maxY, element.y + (element.height || 0))
    })

    elements.resourceElements.value.forEach((element) => {
      minX = Math.min(minX, element.x - 20)
      minY = Math.min(minY, element.y - 20)
      maxX = Math.max(maxX, element.x + 20)
      maxY = Math.max(maxY, element.y + 20)
    })

    elements.fillElements.value.forEach((element) => {
      minX = Math.min(minX, element.x)
      minY = Math.min(minY, element.y)
      maxX = Math.max(maxX, element.x + (element.width || 0))
      maxY = Math.max(maxY, element.y + (element.height || 0))
    })

    // 如果没有内容，使用默认边界
    if (minX === Infinity) {
      canvasState.contentBounds.value = {
        minX: -960,
        minY: -540,
        maxX: 960,
        maxY: 540
      }
    } else {
      canvasState.contentBounds.value = {
        minX: minX - 200,
        minY: minY - 200,
        maxX: maxX + 200,
        maxY: maxY + 200
      }
    }
  }

  /**
   * 渲染画布内容（不更新边界）
   * 参考 excalidraw：在 canvas context 中应用 scale 和 translate，而不是使用 CSS transform
   */
  function renderCanvasContent(ctx) {
    if (!canvasRef.value) return

    // 保存当前状态
    ctx.save()

    // 应用缩放和平移（参考 excalidraw）
    // excalidraw的实现：viewport坐标 = (scene坐标 + scroll) * scale
    // 在canvas context中：先scale，再translate
    // 这样：viewport坐标 = scene坐标 * scale + scroll * scale
    ctx.scale(canvasState.scale.value, canvasState.scale.value)
    ctx.translate(canvasState.scrollX.value, canvasState.scrollY.value)

    // 绘制背景色（在场景坐标系中）
    // 背景应该覆盖整个画布内容区域
    ctx.fillStyle = backgroundColor.value
    ctx.fillRect(
      -canvasState.scrollX.value,
      -canvasState.scrollY.value,
      canvasState.canvasDisplayWidth.value,
      canvasState.canvasDisplayHeight.value
    )

    // 绘制所有已完成的画笔路径
    elements.freeDrawElements.value.forEach((element) => {
      renderFunctions.renderFreeDrawPath(ctx, element)
    })

    // 绘制所有已完成的形状
    elements.shapeElements.value.forEach((element) => {
      renderFunctions.renderShape(ctx, element)
    })

    // 绘制所有文字元素
    elements.textElements.value.forEach((element) => {
      renderFunctions.renderText(ctx, element)
    })

    // 绘制所有资源元素
    elements.resourceElements.value.forEach((element) => {
      renderFunctions.renderResource(ctx, element)
    })

    // 绘制所有填充区域
    elements.fillElements.value.forEach((element) => {
      renderFunctions.renderFill(ctx, element)
    })

    // 绘制当前正在绘制的路径（预览）
    if (
      currentPreview.currentFreeDrawPath.value &&
      currentPreview.drawingActive.value &&
      tool.value === 'pencil'
    ) {
      renderFunctions.renderFreeDrawPath(ctx, currentPreview.currentFreeDrawPath.value, true)
    }

    // 绘制当前正在绘制的形状（预览）
    if (
      currentPreview.currentShape.value &&
      currentPreview.drawingActive.value &&
      (tool.value === 'line' || tool.value === 'rect')
    ) {
      renderFunctions.renderShape(ctx, currentPreview.currentShape.value, true)
    }

    // 绘制选中框和变换控制点
    // 注意：由于已经在context中应用了scale和translate，renderSelection中的translate会导致双重变换
    // 所以传递0作为scrollX和scrollY
    if (tool.value === 'select' && selectedElementIds && selectedElementIds.value.size > 0) {
      const selectedElements = elements
        .getAllElements()
        .filter((el) => selectedElementIds.value.has(el.id))
      if (selectedElements.length > 0) {
        renderSelectionBox(
          ctx,
          selectedElements,
          getElementBounds,
          getElementAbsoluteCoords,
          getCommonBounds,
          getTransformHandlesFromCoords,
          renderTransformHandles,
          canvasState.scale.value,
          0, // scrollX已经在context中应用，这里传0
          0 // scrollY已经在context中应用，这里传0
        )
      }
    }

    // 绘制拖拽选框（在场景坐标系中）
    if (
      tool.value === 'select' &&
      isSelecting &&
      isSelecting.value &&
      selectionStart &&
      selectionStart.value &&
      selectionEnd &&
      selectionEnd.value
    ) {
      ctx.save()

      const x = Math.min(selectionStart.value.x, selectionEnd.value.x)
      const y = Math.min(selectionStart.value.y, selectionEnd.value.y)
      const width = Math.abs(selectionEnd.value.x - selectionStart.value.x)
      const height = Math.abs(selectionEnd.value.y - selectionStart.value.y)

      ctx.strokeStyle = '#1e88e5'
      ctx.lineWidth = 1 / canvasState.scale.value
      ctx.setLineDash([2 / canvasState.scale.value])
      ctx.strokeRect(x, y, width, height)

      ctx.fillStyle = 'rgba(30, 136, 229, 0.1)'
      ctx.fillRect(x, y, width, height)

      ctx.setLineDash([])
      ctx.restore()
    }

    // 恢复状态
    ctx.restore()
  }

  /**
   * 渲染画布（参考 excalidraw 的方式）
   */
  function renderCanvas(updateBounds = true) {
    if (!canvasRef.value) return

    // 更新内容边界（可能会改变画布尺寸）
    if (updateBounds) {
      const oldWidth = canvasRef.value.width
      const oldHeight = canvasRef.value.height

      // 保存当前画布内容（如果画布尺寸即将改变）
      let imageData = null
      if (oldWidth > 0 && oldHeight > 0) {
        try {
          const ctx = canvasRef.value.getContext('2d', { willReadFrequently: true })
          if (ctx) {
            imageData = ctx.getImageData(0, 0, oldWidth, oldHeight)
          }
        } catch {
          // 忽略错误（可能是跨域问题）
        }
      }

      // 更新边界（这可能会改变 canvasDisplayWidth/Height）
      updateContentBounds()

      // 等待 Vue 更新 canvas 尺寸（如果尺寸改变了）
      nextTick(() => {
        if (!canvasRef.value) return
        const ctx = canvasRef.value.getContext('2d', { willReadFrequently: true })
        if (!ctx) return
        const newWidth = canvasRef.value.width
        const newHeight = canvasRef.value.height

        // 如果画布尺寸改变了，先恢复旧内容（只恢复重叠部分）
        if (imageData && (newWidth !== oldWidth || newHeight !== oldHeight)) {
          const restoreWidth = Math.min(oldWidth, newWidth)
          const restoreHeight = Math.min(oldHeight, newHeight)
          if (restoreWidth > 0 && restoreHeight > 0) {
            ctx.putImageData(imageData, 0, 0, 0, 0, restoreWidth, restoreHeight)
          }
        }

        // 重新绘制所有内容
        renderCanvasContent(ctx)
      })

      return
    }

    // 不更新边界时，直接渲染
    const ctx = canvasRef.value.getContext('2d', { willReadFrequently: true })
    if (ctx) {
      renderCanvasContent(ctx)
    }
  }

  // 计算画布包装样式
  // 参考 excalidraw：不使用 CSS transform scale，保持容器尺寸不变
  // 缩放通过 canvas context 的 scale 实现
  const canvasWrapStyle = computed(() => {
    return {
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: canvasState.canvasDisplayWidth.value + 'px',
      height: canvasState.canvasDisplayHeight.value + 'px',
      background: '#fff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      // 不再使用 transform: scale()，缩放通过 canvas context 实现
    }
  })

  return {
    renderCanvas,
    renderCanvasContent,
    updateContentBounds,
    canvasWrapStyle
  }
}
