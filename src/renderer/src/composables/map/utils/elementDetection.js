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

  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  )
}

/**
 * 获取指定点的元素（从后往前查找，返回最上层的元素）
 */
export function getElementAtPoint(point, elements) {
  // 从后往前查找（后绘制的元素在上层）
  const allElements = [
    ...elements.fillElements,
    ...elements.resourceElements,
    ...elements.textElements,
    ...elements.shapeElements,
    ...elements.freeDrawElements
  ]

  for (let i = allElements.length - 1; i >= 0; i--) {
    const element = allElements[i]
    if (isPointInElement(point, element)) {
      return element
    }
  }

  return null
}
