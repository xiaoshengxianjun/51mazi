import { ref } from 'vue'
import { getElementBounds } from '../utils/elementBounds.js'
import { getElementAtPoint } from '../utils/elementDetection.js'
import { getElementsInSelectionBox, getCommonBounds } from '../utils/selection.js'
import { getTransformHandlesFromCoords } from '../utils/selectionRender.js'

/**
 * 规范化角度到 [0, 2π) 范围
 */
function normalizeAngle(angle) {
  while (angle < 0) angle += 2 * Math.PI
  while (angle >= 2 * Math.PI) angle -= 2 * Math.PI
  return angle
}

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
   * 查找与图形元素关联的填充元素
   */
  function getFillElementForShape(shapeElement) {
    const shapeBounds = getElementBounds(shapeElement)
    if (!shapeBounds) return null

    // 查找填充元素的中心点是否在图形元素内
    for (const fillElement of elements.fillElements.value) {
      const fillBounds = getElementBounds(fillElement)
      if (fillBounds) {
        const fillCenterX = fillBounds.x + fillBounds.width / 2
        const fillCenterY = fillBounds.y + fillBounds.height / 2

        // 检查填充元素的中心点是否在图形元素的边界框内
        if (
          fillCenterX >= shapeBounds.x &&
          fillCenterX <= shapeBounds.x + shapeBounds.width &&
          fillCenterY >= shapeBounds.y &&
          fillCenterY <= shapeBounds.y + shapeBounds.height
        ) {
          return fillElement
        }
      }
    }
    return null
  }

  /**
   * 查找与填充元素关联的图形元素
   */
  function getShapeElementForFill(fillElement) {
    const fillBounds = getElementBounds(fillElement)
    if (!fillBounds) return null

    const fillCenterX = fillBounds.x + fillBounds.width / 2
    const fillCenterY = fillBounds.y + fillBounds.height / 2

    // 先检查形状元素（从后往前，优先返回最上层的）
    for (let i = elements.shapeElements.value.length - 1; i >= 0; i--) {
      const shapeElement = elements.shapeElements.value[i]
      if (isPointInSelectionBox({ x: fillCenterX, y: fillCenterY }, [shapeElement])) {
        return shapeElement
      }
    }

    // 再检查画笔路径
    for (let i = elements.freeDrawElements.value.length - 1; i >= 0; i--) {
      const freeDrawElement = elements.freeDrawElements.value[i]
      if (isPointInSelectionBox({ x: fillCenterX, y: fillCenterY }, [freeDrawElement])) {
        return freeDrawElement
      }
    }

    return null
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
    // 使用元素的旋转角度（如果存在），否则为0
    const angle = element.angle || 0
    return getTransformHandlesFromCoords(coords, angle, canvasState.scale.value)
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
      // 多个元素时，如果所有元素角度相同则使用该角度，否则为0
      const angles = selectedElements.map((el) => el.angle || 0)
      const allSameAngle = angles.every((a) => Math.abs(a - angles[0]) < 0.001)
      const angle = allSameAngle ? angles[0] : 0
      const transformHandles = getTransformHandlesFromCoords(coords, angle, canvasState.scale.value)
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
          // 如果取消选中图形元素，也取消选中对应的填充元素
          if (clickedElement.type !== 'fill') {
            const fillElement = getFillElementForShape(clickedElement)
            if (fillElement) {
              selectedElementIds.value.delete(fillElement.id)
            }
          } else {
            // 如果取消选中填充元素，也取消选中对应的图形元素
            const shapeElement = getShapeElementForFill(clickedElement)
            if (shapeElement) {
              selectedElementIds.value.delete(shapeElement.id)
            }
          }
        } else {
          selectedElementIds.value.add(clickedElement.id)
          // 如果选中图形元素，也选中对应的填充元素
          if (clickedElement.type !== 'fill') {
            const fillElement = getFillElementForShape(clickedElement)
            if (fillElement) {
              selectedElementIds.value.add(fillElement.id)
            }
          } else {
            // 如果选中填充元素，也选中对应的图形元素
            const shapeElement = getShapeElementForFill(clickedElement)
            if (shapeElement) {
              selectedElementIds.value.add(shapeElement.id)
            }
          }
        }
      } else {
        selectedElementIds.value.clear()
        selectedElementIds.value.add(clickedElement.id)
        // 如果选中图形元素，也选中对应的填充元素
        if (clickedElement.type !== 'fill') {
          const fillElement = getFillElementForShape(clickedElement)
          if (fillElement) {
            selectedElementIds.value.add(fillElement.id)
          }
        } else {
          // 如果选中填充元素，也选中对应的图形元素
          const shapeElement = getShapeElementForFill(clickedElement)
          if (shapeElement) {
            selectedElementIds.value.add(shapeElement.id)
          }
        }
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
        } else if (
          element.type === 'line' ||
          element.type === 'rect' ||
          element.type === 'rounded-rect' ||
          element.type === 'circle' ||
          element.type === 'star' ||
          element.type === 'arrow'
        ) {
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
        // 旋转逻辑参考 excalidraw
        const centerX = pointerDownState.value.center.x
        const centerY = pointerDownState.value.center.y
        const startAngle = pointerDownState.value.startAngle

        // 计算当前鼠标位置相对于旋转中心的角度
        // (5 * Math.PI) / 2 等于 2.5π，也就是 450度，相当于在 atan2 结果上加上 90度
        // 这是为了让旋转手柄从上方开始（12点钟方向）
        const centerAngle = (5 * Math.PI) / 2 + Math.atan2(pos.y - centerY, pos.x - centerX)

        selectedElements.forEach((element) => {
          const originalElement = pointerDownState.value.originalElements.get(element.id)
          if (!originalElement) return

          // 获取元素的原始角度
          const origAngle = originalElement.angle || 0

          // 计算元素中心点（基于原始元素）
          const bounds = getElementBounds(originalElement)
          if (!bounds) return

          const elementCenterX = bounds.x + bounds.width / 2
          const elementCenterY = bounds.y + bounds.height / 2

          // 计算旋转角度增量（从初始状态到当前状态）
          // excalidraw 使用 centerAngle + origAngle - element.angle
          // 但我们需要基于原始状态计算，所以使用 centerAngle - startAngle 作为增量
          // 然后应用到原始角度上
          const deltaAngle = centerAngle - startAngle
          const newAngle = normalizeAngle(origAngle + deltaAngle)

          // 旋转元素中心点围绕旋转中心
          // 使用 deltaAngle 来旋转元素中心点
          const cos = Math.cos(deltaAngle)
          const sin = Math.sin(deltaAngle)

          // 计算旋转后的元素中心点
          const dx = elementCenterX - centerX
          const dy = elementCenterY - centerY
          const rotatedCenterX = centerX + dx * cos - dy * sin
          const rotatedCenterY = centerY + dx * sin + dy * cos

          // 计算中心点的偏移量
          const offsetX = rotatedCenterX - elementCenterX
          const offsetY = rotatedCenterY - elementCenterY

          // 更新元素的角度（所有元素使用相同的角度增量）
          element.angle = newAngle

          // 对于有 x, y 坐标的元素（text, resource, fill），直接更新位置
          if (element.type === 'text' || element.type === 'resource' || element.type === 'fill') {
            element.x = originalElement.x + offsetX
            element.y = originalElement.y + offsetY
          } else if (element.type === 'freedraw') {
            // 对于 freedraw，需要更新所有点的坐标
            element.points = originalElement.points.map((point) => ({
              x: point.x + offsetX,
              y: point.y + offsetY
            }))
          } else if (
            element.type === 'line' ||
            element.type === 'rect' ||
            element.type === 'rounded-rect' ||
            element.type === 'circle' ||
            element.type === 'star' ||
            element.type === 'arrow'
          ) {
            // 对于形状元素，只更新 start 和 end 的位置，不改变它们的相对位置
            // 这样元素不会变形，只是整体移动和旋转
            element.start = {
              x: originalElement.start.x + offsetX,
              y: originalElement.start.y + offsetY
            }
            element.end = {
              x: originalElement.end.x + offsetX,
              y: originalElement.end.y + offsetY
            }
          }
        })

        // 处理填充元素的旋转（在选中元素之外，但需要一起旋转的填充元素）
        // 查找所有需要一起旋转的填充元素（与选中的图形元素对应的填充元素）
        const selectedGraphicElements = selectedElements.filter(
          (el) =>
            el.type !== 'fill' &&
            (el.type === 'rect' ||
              el.type === 'rounded-rect' ||
              el.type === 'circle' ||
              el.type === 'star' ||
              el.type === 'arrow' ||
              el.type === 'line' ||
              el.type === 'freedraw')
        )

        selectedGraphicElements.forEach((element) => {
          const shapeBounds = getElementBounds(element)
          if (shapeBounds) {
            elements.fillElements.value.forEach((fillElement) => {
              // 如果填充元素已经在选中列表中，跳过（已经处理过了）
              if (selectedElementIds.value.has(fillElement.id)) return

              const fillBounds = getElementBounds(fillElement)
              if (fillBounds) {
                const fillCenterX = fillBounds.x + fillBounds.width / 2
                const fillCenterY = fillBounds.y + fillBounds.height / 2

                // 检查填充元素的中心点是否在图形元素的边界框内
                if (
                  fillCenterX >= shapeBounds.x &&
                  fillCenterX <= shapeBounds.x + shapeBounds.width &&
                  fillCenterY >= shapeBounds.y &&
                  fillCenterY <= shapeBounds.y + shapeBounds.height
                ) {
                  // 找到对应的填充元素，一起旋转
                  let originalFillElement = pointerDownState.value.originalElements.get(
                    fillElement.id
                  )
                  if (!originalFillElement) {
                    // 如果填充元素不在原始元素列表中，创建一个副本
                    originalFillElement = JSON.parse(JSON.stringify(fillElement))
                    pointerDownState.value.originalElements.set(fillElement.id, originalFillElement)
                  }

                  // 获取填充元素的原始角度
                  const origAngle = originalFillElement.angle || 0

                  // 计算填充元素中心点
                  const originalFillBounds = getElementBounds(originalFillElement)
                  if (originalFillBounds) {
                    const fillElementCenterX = originalFillBounds.x + originalFillBounds.width / 2
                    const fillElementCenterY = originalFillBounds.y + originalFillBounds.height / 2

                    // 计算旋转角度增量（从初始状态到当前状态）
                    const deltaAngle = centerAngle - startAngle
                    const newFillAngle = normalizeAngle(origAngle + deltaAngle)

                    // 旋转填充元素中心点围绕旋转中心
                    const fillCos = Math.cos(deltaAngle)
                    const fillSin = Math.sin(deltaAngle)

                    const fillDx = fillElementCenterX - centerX
                    const fillDy = fillElementCenterY - centerY
                    const rotatedFillCenterX = centerX + fillDx * fillCos - fillDy * fillSin
                    const rotatedFillCenterY = centerY + fillDx * fillSin + fillDy * fillCos

                    const fillOffsetX = rotatedFillCenterX - fillElementCenterX
                    const fillOffsetY = rotatedFillCenterY - fillElementCenterY

                    // 更新填充元素的角度和位置
                    fillElement.angle = newFillAngle
                    fillElement.x = originalFillElement.x + fillOffsetX
                    fillElement.y = originalFillElement.y + fillOffsetY
                  }
                }
              }
            })
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
          } else if (
            element.type === 'line' ||
            element.type === 'rect' ||
            element.type === 'rounded-rect' ||
            element.type === 'circle' ||
            element.type === 'star' ||
            element.type === 'arrow'
          ) {
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
            // 填充区域在缩放时，需要保持角度不变（角度在旋转时更新）
            // 这里不需要更新angle，因为缩放不改变角度
          }
        })

        // 如果调整的是图形元素，需要同时调整对应的填充元素
        selectedElements.forEach((element) => {
          if (
            element.type !== 'fill' &&
            (element.type === 'rect' ||
              element.type === 'rounded-rect' ||
              element.type === 'circle' ||
              element.type === 'star' ||
              element.type === 'arrow' ||
              element.type === 'line' ||
              element.type === 'freedraw')
          ) {
            const shapeBounds = getElementBounds(element)
            if (shapeBounds) {
              elements.fillElements.value.forEach((fillElement) => {
                const fillBounds = getElementBounds(fillElement)
                if (fillBounds) {
                  const fillCenterX = fillBounds.x + fillBounds.width / 2
                  const fillCenterY = fillBounds.y + fillBounds.height / 2

                  // 检查填充元素的中心点是否在图形元素的边界框内
                  if (
                    fillCenterX >= shapeBounds.x &&
                    fillCenterX <= shapeBounds.x + shapeBounds.width &&
                    fillCenterY >= shapeBounds.y &&
                    fillCenterY <= shapeBounds.y + shapeBounds.height
                  ) {
                    // 找到对应的填充元素，一起调整大小
                    const originalFillElement = pointerDownState.value.originalElements.get(
                      fillElement.id
                    )
                    if (!originalFillElement) {
                      pointerDownState.value.originalElements.set(fillElement.id, {
                        ...fillElement,
                        x: fillElement.x,
                        y: fillElement.y,
                        width: fillElement.width,
                        height: fillElement.height
                      })
                    }

                    const originalFillBounds = getElementBounds(originalFillElement || fillElement)
                    if (originalFillBounds) {
                      const fillOffsetX = originalFillBounds.x - ox1
                      const fillOffsetY = originalFillBounds.y - oy1

                      let newFillBoundsX, newFillBoundsY
                      if (handle.includes('e') && handle.includes('s')) {
                        newFillBoundsX = anchorX
                        newFillBoundsY = anchorY
                      } else if (handle.includes('e') && handle.includes('n')) {
                        newFillBoundsX = anchorX
                        newFillBoundsY = anchorY - newHeight
                      } else if (handle.includes('w') && handle.includes('s')) {
                        newFillBoundsX = anchorX - newWidth
                        newFillBoundsY = anchorY
                      } else if (handle.includes('w') && handle.includes('n')) {
                        newFillBoundsX = anchorX - newWidth
                        newFillBoundsY = anchorY - newHeight
                      } else if (handle === 'e') {
                        newFillBoundsX = anchorX
                        newFillBoundsY = anchorY - newHeight / 2
                      } else if (handle === 'w') {
                        newFillBoundsX = anchorX - newWidth
                        newFillBoundsY = anchorY - newHeight / 2
                      } else if (handle === 's') {
                        newFillBoundsX = anchorX - newWidth / 2
                        newFillBoundsY = anchorY
                      } else if (handle === 'n') {
                        newFillBoundsX = anchorX - newWidth / 2
                        newFillBoundsY = anchorY - newHeight
                      } else {
                        newFillBoundsX = anchorX
                        newFillBoundsY = anchorY
                      }

                      fillElement.x = newFillBoundsX + fillOffsetX * scaleX
                      fillElement.y = newFillBoundsY + fillOffsetY * scaleY
                      fillElement.width = originalFillBounds.width * scaleX
                      fillElement.height = originalFillBounds.height * scaleY
                    }
                  }
                }
              })
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

        // 对于选中的图形元素，自动选中对应的填充元素
        // 对于选中的填充元素，自动选中对应的图形元素
        const allElements = elements.getAllElements()
        const selectedElements = allElements.filter((el) => selectedIds.has(el.id))

        // 先处理图形元素 -> 填充元素的关联
        selectedElements.forEach((element) => {
          if (
            element.type !== 'fill' &&
            (element.type === 'rect' ||
              element.type === 'rounded-rect' ||
              element.type === 'circle' ||
              element.type === 'star' ||
              element.type === 'arrow' ||
              element.type === 'line' ||
              element.type === 'freedraw')
          ) {
            const fillElement = getFillElementForShape(element)
            if (fillElement && !selectedIds.has(fillElement.id)) {
              selectedElementIds.value.add(fillElement.id)
            }
          }
        })

        // 再处理填充元素 -> 图形元素的关联
        selectedElements.forEach((element) => {
          if (element.type === 'fill') {
            const shapeElement = getShapeElementForFill(element)
            if (shapeElement && !selectedIds.has(shapeElement.id)) {
              selectedElementIds.value.add(shapeElement.id)
            }
          }
        })

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
    let originalBounds = null
    if (selectedElements.length === 1) {
      const originalElement = originalElements.get(selectedElements[0].id)
      const coords = getElementAbsoluteCoordsLocal(originalElement || selectedElements[0])
      if (coords) {
        centerX = coords[4]
        centerY = coords[5]
        const bounds = getElementBounds(originalElement || selectedElements[0])
        if (bounds) {
          originalBounds = bounds
        }
      }
    } else {
      const originalElementsArray = Array.from(originalElements.values())
      const bounds = getCommonBounds(originalElementsArray, getElementBounds)
      if (bounds) {
        centerX = bounds.x + bounds.width / 2
        centerY = bounds.y + bounds.height / 2
        originalBounds = bounds
      }
    }

    pointerDownState.value = {
      originalElements,
      startCoords: { ...pos },
      center: { x: centerX || 0, y: centerY || 0 },
      originalBounds, // 保存原始边界框，用于旋转时保持选框宽高不变
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

  /**
   * 获取旋转时的原始边界框（用于保持选框宽高不变）
   * 注意：只在旋转时返回原始边界框，调整大小时返回 null（让选框跟随内容变化）
   */
  function getOriginalBounds() {
    // 只在旋转时使用原始边界框，调整大小时应该使用当前边界框
    if (
      isTransforming.value &&
      transformHandleType.value === 'rotation' &&
      pointerDownState.value &&
      pointerDownState.value.originalBounds
    ) {
      return pointerDownState.value.originalBounds
    }
    return null
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
    updateCursorStyle,
    getOriginalBounds
  }
}
