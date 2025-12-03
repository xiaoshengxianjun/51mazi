/**
 * 元素边界计算工具函数
 */

/**
 * 获取元素的边界框（参考 excalidraw）
 */
export function getElementBounds(element) {
  if (element.type === 'freedraw') {
    // 画笔路径：计算所有点的边界
    if (!element.points || element.points.length === 0) return null
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    element.points.forEach((point) => {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    })
    // 考虑 strokeWidth
    const padding = (element.strokeWidth || 5) / 2
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    }
  } else if (element.type === 'line') {
    // 线条：计算起点和终点的边界
    const minX = Math.min(element.start.x, element.end.x)
    const minY = Math.min(element.start.y, element.end.y)
    const maxX = Math.max(element.start.x, element.end.x)
    const maxY = Math.max(element.start.y, element.end.y)
    const padding = (element.strokeWidth || 2) / 2
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    }
  } else if (
    element.type === 'rect' ||
    element.type === 'circle' ||
    element.type === 'star' ||
    element.type === 'arrow'
  ) {
    // 矩形、圆形、五角形、箭头：直接使用坐标
    const minX = Math.min(element.start.x, element.end.x)
    const minY = Math.min(element.start.y, element.end.y)
    const maxX = Math.max(element.start.x, element.end.x)
    const maxY = Math.max(element.start.y, element.end.y)
    const padding = (element.strokeWidth || 2) / 2
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    }
  } else if (element.type === 'text') {
    // 文字：使用 x, y, width, height
    return {
      x: element.x,
      y: element.y,
      width: element.width || 0,
      height: element.height || 0
    }
  } else if (element.type === 'resource') {
    // 资源：使用 x, y, width, height
    return {
      x: element.x - 20,
      y: element.y - 20,
      width: element.width || 40,
      height: element.height || 40
    }
  } else if (element.type === 'fill') {
    // 填充区域
    return {
      x: element.x,
      y: element.y,
      width: element.width || 0,
      height: element.height || 0
    }
  }
  return null
}

/**
 * 检查元素的边界框是否完全在选框内
 */
export function isElementInBox(elementBounds, box) {
  return (
    elementBounds.x >= box.x &&
    elementBounds.y >= box.y &&
    elementBounds.x + elementBounds.width <= box.x + box.width &&
    elementBounds.y + elementBounds.height <= box.y + box.height
  )
}
