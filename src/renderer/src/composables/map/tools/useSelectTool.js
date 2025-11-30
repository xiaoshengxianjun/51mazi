import { ref } from 'vue'
import { getElementBounds } from '../utils/elementBounds.js'
import { getElementAtPoint } from '../utils/elementDetection.js'
import { getElementsInSelectionBox, getCommonBounds } from '../utils/selection.js'
import { getTransformHandlesFromCoords } from '../utils/selectionRender.js'

/**
 * 选框工具 composable（包含移动、调整大小、旋转）
 */
export function useSelectTool({
  elements,
  history,
  renderCanvas,
  selectedElementIds,
  canvasState,
  canvasCursor
}) {
  const isDragging = ref(false)
  const isTransforming = ref(false)
  const isSelecting = ref(false)
  const transformHandleType = ref(null)
  const selectionStart = ref(null)
  const selectionEnd = ref(null)
  const pointerDownState = ref(null)

  /**
   * 获取选中的元素数组
   */
  function getSelectedElements() {
    const allElements = elements.getAllElements()
    return allElements.filter((el) => selectedElementIds.value.has(el.id))
  }

  /**
   * 获取元素的绝对坐标
   */
  function getElementAbsoluteCoordsLocal(element) {
    const bounds = getElementBounds(element)
    if (!bounds) return null
    const x1 = bounds.x
    const y1 = bounds.y
    const x2 = bounds.x + bounds.width
    const y2 = bounds.y + bounds.height
    const cx = (x1 + x2) / 2
    const cy = (y1 + y2) / 2
    return [x1, y1, x2, y2, cx, cy]
  }

  /**
   * 获取单个元素的变换控制点
   */
  function getTransformHandlesForElement(element) {
    const coords = getElementAbsoluteCoordsLocal(element)
    if (!coords) return {}
    return getTransformHandlesFromCoords(coords, 0, canvasState.scale.value)
  }

  /**
   * 从变换控制点中获取点击的控制点类型
   */
  function getTransformHandleTypeFromHandles(pos, transformHandles) {
    const handleSize = 8 / canvasState.scale.value
    for (const [key, handle] of Object.entries(transformHandles)) {
      if (!handle) continue
      const [x, y, w, h] = handle
      const centerX = x + w / 2
      const centerY = y + h / 2
      const distance = Math.sqrt(Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2))
      if (distance <= handleSize) {
        return key
      }
    }
    return false
  }

  /**
   * 获取指定点的变换控制点类型
   */
  function getTransformHandleTypeAtPoint(pos, selectedElements) {
    if (selectedElements.length === 0) return false

    if (selectedElements.length === 1) {
      const element = selectedElements[0]
      const transformHandles = getTransformHandlesForElement(element)
      return getTransformHandleTypeFromHandles(pos, transformHandles)
    } else {
      const bounds = getCommonBounds(selectedElements, getElementBounds)
      if (!bounds) return false
      const coords = [
        bounds.x,
        bounds.y,
        bounds.x + bounds.width,
        bounds.y + bounds.height,
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2
      ]
      const transformHandles = getTransformHandlesFromCoords(coords, 0, canvasState.scale.value)
      return getTransformHandleTypeFromHandles(pos, transformHandles)
    }
  }

  /**
   * 检查点是否在选中框内
   */
  function isPointInSelectionBox(pos, selectedElements) {
    if (selectedElements.length === 0) return false
    let bounds
    if (selectedElements.length === 1) {
      const coords = getElementAbsoluteCoordsLocal(selectedElements[0])
      if (!coords) return false
      bounds = {
        x: coords[0],
        y: coords[1],
        width: coords[2] - coords[0],
        height: coords[3] - coords[1]
      }
    } else {
      bounds = getCommonBounds(selectedElements, getElementBounds)
    }
    if (!bounds) return false
    const padding = 8 / canvasState.scale.value
    return (
      pos.x >= bounds.x - padding &&
      pos.x <= bounds.x + bounds.width + padding &&
      pos.y >= bounds.y - padding &&
      pos.y <= bounds.y + bounds.height + padding
    )
  }

  /**
   * 检查点是否在选中框的边框上
   */
  function isPointOnSelectionBoxBorder(pos, selectedElements) {
    if (selectedElements.length === 0) return null
    let coords
    if (selectedElements.length === 1) {
      coords = getElementAbsoluteCoordsLocal(selectedElements[0])
    } else {
      const bounds = getCommonBounds(selectedElements, getElementBounds)
      if (!bounds) return null
      coords = [bounds.x, bounds.y, bounds.x + bounds.width, bounds.y + bounds.height]
    }
    if (!coords) return null
    const [x1, y1, x2, y2] = coords
    const padding = 8 / canvasState.scale.value
    const borderThreshold = 4 / canvasState.scale.value

    const left = x1 - padding
    const right = x2 + padding
    const top = y1 - padding
    const bottom = y2 + padding

    const isOnLeftBorder =
      Math.abs(pos.x - left) <= borderThreshold && pos.y >= top && pos.y <= bottom
    const isOnRightBorder =
      Math.abs(pos.x - right) <= borderThreshold && pos.y >= top && pos.y <= bottom
    const isOnTopBorder =
      Math.abs(pos.y - top) <= borderThreshold && pos.x >= left && pos.x <= right
    const isOnBottomBorder =
      Math.abs(pos.y - bottom) <= borderThreshold && pos.x >= left && pos.x <= right

    const handleSize = 8 / canvasState.scale.value
    const handleMargin = handleSize / 2

    if (isOnLeftBorder || isOnRightBorder) {
      const isNearCorner =
        Math.abs(pos.y - top) <= handleMargin ||
        Math.abs(pos.y - bottom) <= handleMargin ||
        Math.abs(pos.y - (top + bottom) / 2) <= handleMargin
      if (!isNearCorner) {
        return 'ew-resize'
      }
    }

    if (isOnTopBorder || isOnBottomBorder) {
      const isNearCorner =
        Math.abs(pos.x - left) <= handleMargin ||
        Math.abs(pos.x - right) <= handleMargin ||
        Math.abs(pos.x - (left + right) / 2) <= handleMargin
      if (!isNearCorner) {
        return 'ns-resize'
      }
    }

    return null
  }

  /**
   * 鼠标按下
   */
  function onMouseDown(e, pos) {
    const selectedElements = getSelectedElements()

    // 检查是否点击了变换控制点
    if (selectedElements.length > 0) {
      const handleType = getTransformHandleTypeAtPoint(pos, selectedElements)
      if (handleType) {
        isTransforming.value = true
        transformHandleType.value = handleType
        initializePointerDownState(selectedElements, pos)
        return
      }

      // 检查是否点击了选中框内部（用于移动）
      if (isPointInSelectionBox(pos, selectedElements)) {
        isDragging.value = true
        initializePointerDownState(selectedElements, pos)
        return
      }
    }

    // 检查是否点击了元素
    const clickedElement = getElementAtPoint(pos, elements)
    if (clickedElement) {
      const wasSelected = selectedElementIds.value.has(clickedElement.id)

      if (wasSelected) {
        const selectedElements = getSelectedElements()
        if (selectedElements.length > 0 && isPointInSelectionBox(pos, selectedElements)) {
          isDragging.value = true
          initializePointerDownState(selectedElements, pos)
          return
        }
      }

      // 点击了元素，选中它
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        if (selectedElementIds.value.has(clickedElement.id)) {
          selectedElementIds.value.delete(clickedElement.id)
        } else {
          selectedElementIds.value.add(clickedElement.id)
        }
      } else {
        selectedElementIds.value.clear()
        selectedElementIds.value.add(clickedElement.id)
      }
      renderCanvas()
      return
    }

    // 没有点击元素，开始拖拽选框
    isSelecting.value = true
    selectionStart.value = { ...pos }
    selectionEnd.value = { ...pos }
    selectedElementIds.value.clear()
  }

  /**
   * 鼠标移动
   */
  function onMouseMove(pos) {
    if (isDragging.value) {
      if (!pointerDownState.value) return

      const totalDeltaX = pos.x - pointerDownState.value.startCoords.x
      const totalDeltaY = pos.y - pointerDownState.value.startCoords.y

      const selectedElements = getSelectedElements()
      selectedElements.forEach((element) => {
        const originalElement = pointerDownState.value.originalElements.get(element.id)
        if (!originalElement) return

        if (element.type === 'freedraw') {
          element.points = originalElement.points.map((point) => ({
            x: point.x + totalDeltaX,
            y: point.y + totalDeltaY
          }))
        } else if (element.type === 'line' || element.type === 'rect') {
          element.start = {
            x: originalElement.start.x + totalDeltaX,
            y: originalElement.start.y + totalDeltaY
          }
          element.end = {
            x: originalElement.end.x + totalDeltaX,
            y: originalElement.end.y + totalDeltaY
          }
        } else if (
          element.type === 'text' ||
          element.type === 'resource' ||
          element.type === 'fill'
        ) {
          element.x = originalElement.x + totalDeltaX
          element.y = originalElement.y + totalDeltaY
        }
      })

      renderCanvas()
      return
    } else if (isTransforming.value) {
      if (!pointerDownState.value) return

      const selectedElements = getSelectedElements()
      if (selectedElements.length === 0) return

      if (transformHandleType.value === 'rotation') {
        // 旋转
        const centerX = pointerDownState.value.center.x
        const centerY = pointerDownState.value.center.y
        const startAngle = pointerDownState.value.startAngle

        const currentAngle = (5 * Math.PI) / 2 + Math.atan2(pos.y - centerY, pos.x - centerX)
        const angle = currentAngle - startAngle

        selectedElements.forEach((element) => {
          const originalElement = pointerDownState.value.originalElements.get(element.id)
          if (!originalElement) return

          const bounds = getElementBounds(originalElement)
          if (!bounds) return

          const elementCenterX = bounds.x + bounds.width / 2
          const elementCenterY = bounds.y + bounds.height / 2

          const cos = Math.cos(angle)
          const sin = Math.sin(angle)
          const dx = elementCenterX - centerX
          const dy = elementCenterY - centerY
          const newCenterX = centerX + dx * cos - dy * sin
          const newCenterY = centerY + dx * sin + dy * cos

          const offsetX = newCenterX - elementCenterX
          const offsetY = newCenterY - elementCenterY

          if (element.type === 'freedraw') {
            element.points = originalElement.points.map((point) => {
              const px = point.x - elementCenterX
              const py = point.y - elementCenterY
              return {
                x: elementCenterX + px * cos - py * sin + offsetX,
                y: elementCenterY + px * sin + py * cos + offsetY
              }
            })
          } else if (element.type === 'line' || element.type === 'rect') {
            const startPx = originalElement.start.x - elementCenterX
            const startPy = originalElement.start.y - elementCenterY
            const endPx = originalElement.end.x - elementCenterX
            const endPy = originalElement.end.y - elementCenterY

            element.start = {
              x: elementCenterX + startPx * cos - startPy * sin + offsetX,
              y: elementCenterY + startPx * sin + startPy * cos + offsetY
            }
            element.end = {
              x: elementCenterX + endPx * cos - endPy * sin + offsetX,
              y: elementCenterY + endPx * sin + endPy * cos + offsetY
            }
          } else if (
            element.type === 'text' ||
            element.type === 'resource' ||
            element.type === 'fill'
          ) {
            const px = originalElement.x - elementCenterX
            const py = originalElement.y - elementCenterY
            element.x = elementCenterX + px * cos - py * sin + offsetX
            element.y = elementCenterY + px * sin + py * cos + offsetY
          }
        })
      } else if (transformHandleType.value) {
        // 调整大小
        const handle = transformHandleType.value

        const originalElements = Array.from(pointerDownState.value.originalElements.values())
        let originalBounds
        if (originalElements.length === 1) {
          const bounds = getElementBounds(originalElements[0])
          if (bounds) {
            originalBounds = [
              bounds.x,
              bounds.y,
              bounds.x + bounds.width,
              bounds.y + bounds.height,
              bounds.x + bounds.width / 2,
              bounds.y + bounds.height / 2
            ]
          }
        } else {
          const bounds = getCommonBounds(originalElements, getElementBounds)
          if (bounds) {
            originalBounds = [
              bounds.x,
              bounds.y,
              bounds.x + bounds.width,
              bounds.y + bounds.height,
              bounds.x + bounds.width / 2,
              bounds.y + bounds.height / 2
            ]
          }
        }
        if (!originalBounds) return

        const [ox1, oy1, ox2, oy2] = originalBounds
        const originalWidth = ox2 - ox1
        const originalHeight = oy2 - oy1

        if (!pointerDownState.value.resizeStartPos) {
          pointerDownState.value.resizeStartPos = { ...pos }
        }
        const resizeStartPos = pointerDownState.value.resizeStartPos
        const deltaX = pos.x - resizeStartPos.x
        const deltaY = pos.y - resizeStartPos.y

        let newWidth = originalWidth
        let newHeight = originalHeight
        let anchorX = ox1
        let anchorY = oy1

        if (handle.includes('e') && handle.includes('s')) {
          anchorX = ox1
          anchorY = oy1
          newWidth = originalWidth + deltaX
          newHeight = originalHeight + deltaY
        } else if (handle.includes('e') && handle.includes('n')) {
          anchorX = ox1
          anchorY = oy2
          newWidth = originalWidth + deltaX
          newHeight = originalHeight - deltaY
        } else if (handle.includes('w') && handle.includes('s')) {
          anchorX = ox2
          anchorY = oy1
          newWidth = originalWidth - deltaX
          newHeight = originalHeight + deltaY
        } else if (handle.includes('w') && handle.includes('n')) {
          anchorX = ox2
          anchorY = oy2
          newWidth = originalWidth - deltaX
          newHeight = originalHeight - deltaY
        } else if (handle === 'e') {
          anchorX = ox1
          anchorY = oy1 + originalHeight / 2
          newWidth = originalWidth + deltaX
          newHeight = originalHeight
        } else if (handle === 'w') {
          anchorX = ox2
          anchorY = oy1 + originalHeight / 2
          newWidth = originalWidth - deltaX
          newHeight = originalHeight
        } else if (handle === 's') {
          anchorX = ox1 + originalWidth / 2
          anchorY = oy1
          newWidth = originalWidth
          newHeight = originalHeight + deltaY
        } else if (handle === 'n') {
          anchorX = ox1 + originalWidth / 2
          anchorY = oy2
          newWidth = originalWidth
          newHeight = originalHeight - deltaY
        }

        if (newWidth < 10) newWidth = 10
        if (newHeight < 10) newHeight = 10

        const scaleX = newWidth / originalWidth
        const scaleY = newHeight / originalHeight

        selectedElements.forEach((element) => {
          const originalElement = pointerDownState.value.originalElements.get(element.id)
          if (!originalElement) return

          const originalBounds = getElementBounds(originalElement)
          if (!originalBounds) return

          const offsetX = originalBounds.x - ox1
          const offsetY = originalBounds.y - oy1

          let newBoundsX, newBoundsY
          if (handle.includes('e') && handle.includes('s')) {
            newBoundsX = anchorX
            newBoundsY = anchorY
          } else if (handle.includes('e') && handle.includes('n')) {
            newBoundsX = anchorX
            newBoundsY = anchorY - newHeight
          } else if (handle.includes('w') && handle.includes('s')) {
            newBoundsX = anchorX - newWidth
            newBoundsY = anchorY
          } else if (handle.includes('w') && handle.includes('n')) {
            newBoundsX = anchorX - newWidth
            newBoundsY = anchorY - newHeight
          } else if (handle === 'e') {
            newBoundsX = anchorX
            newBoundsY = anchorY - newHeight / 2
          } else if (handle === 'w') {
            newBoundsX = anchorX - newWidth
            newBoundsY = anchorY - newHeight / 2
          } else if (handle === 's') {
            newBoundsX = anchorX - newWidth / 2
            newBoundsY = anchorY
          } else if (handle === 'n') {
            newBoundsX = anchorX - newWidth / 2
            newBoundsY = anchorY - newHeight
          } else {
            newBoundsX = anchorX
            newBoundsY = anchorY
          }

          const newElementX = newBoundsX + offsetX * scaleX
          const newElementY = newBoundsY + offsetY * scaleY
          const newElementWidth = originalBounds.width * scaleX
          const newElementHeight = originalBounds.height * scaleY

          if (element.type === 'freedraw') {
            const elementCenterX = newElementX + newElementWidth / 2
            const elementCenterY = newElementY + newElementHeight / 2
            const originalCenterX = originalBounds.x + originalBounds.width / 2
            const originalCenterY = originalBounds.y + originalBounds.height / 2

            element.points = originalElement.points.map((point) => ({
              x: elementCenterX + (point.x - originalCenterX) * scaleX,
              y: elementCenterY + (point.y - originalCenterY) * scaleY
            }))
          } else if (element.type === 'line' || element.type === 'rect') {
            const elementCenterX = newElementX + newElementWidth / 2
            const elementCenterY = newElementY + newElementHeight / 2
            const originalCenterX = originalBounds.x + originalBounds.width / 2
            const originalCenterY = originalBounds.y + originalBounds.height / 2

            element.start = {
              x: elementCenterX + (originalElement.start.x - originalCenterX) * scaleX,
              y: elementCenterY + (originalElement.start.y - originalCenterY) * scaleY
            }
            element.end = {
              x: elementCenterX + (originalElement.end.x - originalCenterX) * scaleX,
              y: elementCenterY + (originalElement.end.y - originalCenterY) * scaleY
            }
          } else if (
            element.type === 'text' ||
            element.type === 'resource' ||
            element.type === 'fill'
          ) {
            element.x = newElementX
            element.y = newElementY
            if (element.width) {
              element.width = newElementWidth
            }
            if (element.height) {
              element.height = newElementHeight
            }
          }
        })
      }

      renderCanvas()
      return
    } else if (isSelecting.value) {
      selectionEnd.value = { ...pos }
      renderCanvas()
    }
  }

  /**
   * 鼠标释放
   */
  function onMouseUp() {
    if (isDragging.value) {
      isDragging.value = false
      pointerDownState.value = null
      if (history.value) {
        history.value.saveState()
      }
    } else if (isTransforming.value) {
      isTransforming.value = false
      transformHandleType.value = null
      pointerDownState.value = null
      if (history.value) {
        history.value.saveState()
      }
    } else if (isSelecting.value) {
      isSelecting.value = false
      const box = {
        x: Math.min(selectionStart.value.x, selectionEnd.value.x),
        y: Math.min(selectionStart.value.y, selectionEnd.value.y),
        width: Math.abs(selectionEnd.value.x - selectionStart.value.x),
        height: Math.abs(selectionEnd.value.y - selectionStart.value.y)
      }

      if (box.width > 5 && box.height > 5) {
        const selectedIds = getElementsInSelectionBox(box, elements)
        selectedElementIds.value = selectedIds
        renderCanvas()
      }

      selectionStart.value = null
      selectionEnd.value = null
    }
  }

  /**
   * 初始化指针按下状态
   */
  function initializePointerDownState(selectedElements, pos) {
    const originalElements = new Map()
    selectedElements.forEach((element) => {
      originalElements.set(element.id, JSON.parse(JSON.stringify(element)))
    })

    let centerX, centerY
    if (selectedElements.length === 1) {
      const originalElement = originalElements.get(selectedElements[0].id)
      const coords = getElementAbsoluteCoordsLocal(originalElement || selectedElements[0])
      if (coords) {
        centerX = coords[4]
        centerY = coords[5]
      }
    } else {
      const originalElementsArray = Array.from(originalElements.values())
      const bounds = getCommonBounds(originalElementsArray, getElementBounds)
      if (bounds) {
        centerX = bounds.x + bounds.width / 2
        centerY = bounds.y + bounds.height / 2
      }
    }

    pointerDownState.value = {
      originalElements,
      startCoords: { ...pos },
      center: { x: centerX || 0, y: centerY || 0 },
      startAngle:
        transformHandleType.value === 'rotation'
          ? (5 * Math.PI) / 2 + Math.atan2(pos.y - (centerY || 0), pos.x - (centerX || 0))
          : null,
      resizeStartPos:
        transformHandleType.value && transformHandleType.value !== 'rotation' ? { ...pos } : null
    }
  }

  /**
   * 更新光标样式
   */
  function updateCursorStyle(pos) {
    const selectedElements = getSelectedElements()
    if (selectedElements.length === 0) {
      canvasCursor.value = 'default'
      return
    }

    const handleType = getTransformHandleTypeAtPoint(pos, selectedElements)
    if (handleType) {
      if (handleType === 'rotation') {
        canvasCursor.value = 'grab'
      } else if (handleType === 'n' || handleType === 's') {
        canvasCursor.value = 'ns-resize'
      } else if (handleType === 'e' || handleType === 'w') {
        canvasCursor.value = 'ew-resize'
      } else if (handleType === 'nw' || handleType === 'se') {
        canvasCursor.value = 'nwse-resize'
      } else if (handleType === 'ne' || handleType === 'sw') {
        canvasCursor.value = 'nesw-resize'
      } else {
        canvasCursor.value = 'default'
      }
      return
    }

    const borderCursor = isPointOnSelectionBoxBorder(pos, selectedElements)
    if (borderCursor) {
      canvasCursor.value = borderCursor
      return
    }

    if (isPointInSelectionBox(pos, selectedElements)) {
      canvasCursor.value = 'move'
      return
    }

    canvasCursor.value = 'default'
  }

  return {
    isDragging,
    isTransforming,
    isSelecting,
    transformHandleType,
    selectionStart,
    selectionEnd,
    getSelectedElements,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    updateCursorStyle
  }
}
