import { getElementBounds, isElementInBox } from './elementBounds.js'

/**
 * 选框相关工具函数
 */

/**
 * 获取选框内的所有元素
 */
export function getElementsInSelectionBox(box, elements) {
  const selectedIds = new Set()

  // 检查所有元素
  elements.freeDrawElements.forEach((element) => {
    const bounds = getElementBounds(element)
    if (bounds && isElementInBox(bounds, box)) {
      selectedIds.add(element.id)
    }
  })

  elements.shapeElements.forEach((element) => {
    const bounds = getElementBounds(element)
    if (bounds && isElementInBox(bounds, box)) {
      selectedIds.add(element.id)
    }
  })

  elements.textElements.forEach((element) => {
    const bounds = getElementBounds(element)
    if (bounds && isElementInBox(bounds, box)) {
      selectedIds.add(element.id)
    }
  })

  elements.resourceElements.forEach((element) => {
    const bounds = getElementBounds(element)
    if (bounds && isElementInBox(bounds, box)) {
      selectedIds.add(element.id)
    }
  })

  elements.fillElements.forEach((element) => {
    const bounds = getElementBounds(element)
    if (bounds && isElementInBox(bounds, box)) {
      selectedIds.add(element.id)
    }
  })

  return selectedIds
}

/**
 * 获取选中元素的公共边界框
 */
export function getCommonBounds(selectedElements, getElementBounds) {
  if (selectedElements.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  selectedElements.forEach((element) => {
    const bounds = getElementBounds(element)
    if (bounds) {
      minX = Math.min(minX, bounds.x)
      minY = Math.min(minY, bounds.y)
      maxX = Math.max(maxX, bounds.x + bounds.width)
      maxY = Math.max(maxY, bounds.y + bounds.height)
    }
  })

  if (minX === Infinity) return null

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}
