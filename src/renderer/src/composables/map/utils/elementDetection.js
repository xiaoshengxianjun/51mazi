import { getElementBounds } from './elementBounds.js'

/**
 * 元素检测工具函数
 */

/**
 * 检查点是否在元素内（参考 excalidraw）
 */
export function isPointInElement(point, element) {
  const bounds = getElementBounds(element)
  if (!bounds) return false

  // 对于圆形，使用椭圆检测
  if (element.type === 'circle') {
    const width = element.end.x - element.start.x
    const height = element.end.y - element.start.y
    const centerX = element.start.x + width / 2
    const centerY = element.start.y + height / 2
    const radiusX = Math.abs(width) / 2
    const radiusY = Math.abs(height) / 2

    // 椭圆方程：(x-cx)^2/rx^2 + (y-cy)^2/ry^2 <= 1
    const dx = (point.x - centerX) / radiusX
    const dy = (point.y - centerY) / radiusY
    return dx * dx + dy * dy <= 1
  }

  // 对于五角星，使用多边形检测（简化：使用边界框检测）
  // TODO: 可以实现更精确的五角星内部检测
  if (element.type === 'star') {
    // 先检查边界框
    if (
      point.x < bounds.x ||
      point.x > bounds.x + bounds.width ||
      point.y < bounds.y ||
      point.y > bounds.y + bounds.height
    ) {
      return false
    }
    // 简化处理：使用边界框（可以后续优化为精确的五角星检测）
    return true
  }

  // 对于线条和箭头，使用边界框检测（可以后续优化为精确的线段检测）
  if (element.type === 'line' || element.type === 'arrow') {
    // 先检查边界框
    if (
      point.x < bounds.x ||
      point.x > bounds.x + bounds.width ||
      point.y < bounds.y ||
      point.y > bounds.y + bounds.height
    ) {
      return false
    }
    // 简化处理：使用边界框（可以后续优化为精确的线段检测）
    return true
  }

  // 其他类型使用矩形检测
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  )
}

/**
 * 获取指定点的元素（从后往前查找，返回最上层的元素）
 * 注意：如果点击的是填充元素，优先返回对应的图形元素
 */
export function getElementAtPoint(point, elements) {
  // 从后往前查找（后绘制的元素在上层）
  const allElements = [
    ...elements.fillElements.value,
    ...elements.resourceElements.value,
    ...elements.textElements.value,
    ...elements.shapeElements.value,
    ...elements.freeDrawElements.value
  ]

  let clickedFillElement = null

  // 先查找所有匹配的元素
  for (let i = allElements.length - 1; i >= 0; i--) {
    const element = allElements[i]
    if (isPointInElement(point, element)) {
      // 如果找到的是图形元素（非填充元素），直接返回
      if (element.type !== 'fill') {
        return element
      }
      // 如果找到的是填充元素，先记录下来，继续查找图形元素
      if (!clickedFillElement) {
        clickedFillElement = element
      }
    }
  }

  // 如果只找到了填充元素，查找对应的图形元素
  if (clickedFillElement) {
    const fillBounds = {
      x: clickedFillElement.x,
      y: clickedFillElement.y,
      width: clickedFillElement.width,
      height: clickedFillElement.height
    }
    const fillCenterX = fillBounds.x + fillBounds.width / 2
    const fillCenterY = fillBounds.y + fillBounds.height / 2

    // 检查填充元素的中心点是否在图形元素内
    // 先检查形状元素（从后往前，优先返回最上层的）
    for (let i = elements.shapeElements.value.length - 1; i >= 0; i--) {
      const shapeElement = elements.shapeElements.value[i]
      if (isPointInElement({ x: fillCenterX, y: fillCenterY }, shapeElement)) {
        return shapeElement
      }
    }

    // 再检查画笔路径
    for (let i = elements.freeDrawElements.value.length - 1; i >= 0; i--) {
      const freeDrawElement = elements.freeDrawElements.value[i]
      if (isPointInElement({ x: fillCenterX, y: fillCenterY }, freeDrawElement)) {
        return freeDrawElement
      }
    }

    // 如果找不到对应的图形元素，返回填充元素
    return clickedFillElement
  }

  return null
}
