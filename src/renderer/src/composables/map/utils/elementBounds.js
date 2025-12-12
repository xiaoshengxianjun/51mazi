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
    element.type === 'rounded-rect' ||
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
 * 获取旋转后元素的实际边界框（轴对齐边界框）
 * 对于旋转后的元素，计算其四个角点的最小包围盒
 */
export function getRotatedElementBounds(element) {
  const angle = element.angle || 0
  // 如果没有旋转，直接返回基础边界框
  if (Math.abs(angle) < 0.001) {
    return getElementBounds(element)
  }

  // 对于不同元素类型，使用不同的方法计算旋转后的边界框
  if (
    element.type === 'line' ||
    element.type === 'rect' ||
    element.type === 'rounded-rect' ||
    element.type === 'circle' ||
    element.type === 'star' ||
    element.type === 'arrow'
  ) {
    // 对于形状元素，需要计算旋转后的边界框
    // start/end 定义了形状的边界，但旋转是围绕中心点进行的
    const baseBounds = getElementBounds(element)
    if (!baseBounds) return null

    // 计算基础边界框的中心点（start和end的中点）
    const centerX = (element.start.x + element.end.x) / 2
    const centerY = (element.start.y + element.end.y) / 2

    // 计算基础边界框的四个角点（相对于中心点）
    const halfWidth = baseBounds.width / 2
    const halfHeight = baseBounds.height / 2
    const corners = [
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: -halfWidth, y: halfHeight }
    ]

    // 旋转这些角点
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const rotatedCorners = corners.map((corner) => {
      return {
        x: centerX + corner.x * cos - corner.y * sin,
        y: centerY + corner.x * sin + corner.y * cos
      }
    })

    // 计算旋转后角点的最小包围盒
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    rotatedCorners.forEach((corner) => {
      minX = Math.min(minX, corner.x)
      minY = Math.min(minY, corner.y)
      maxX = Math.max(maxX, corner.x)
      maxY = Math.max(maxY, corner.y)
    })

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  } else if (element.type === 'freedraw') {
    // 对于freedraw，getElementBounds 返回的已经是所有点的边界框（包括旋转）
    return getElementBounds(element)
  } else if (element.type === 'text' || element.type === 'resource' || element.type === 'fill') {
    // 对于text/resource/fill，需要计算旋转后的边界框
    const baseBounds = getElementBounds(element)
    if (!baseBounds) return null

    // 计算基础边界框的中心点
    const centerX = baseBounds.x + baseBounds.width / 2
    const centerY = baseBounds.y + baseBounds.height / 2

    // 计算基础边界框的四个角点（相对于中心点）
    const halfWidth = baseBounds.width / 2
    const halfHeight = baseBounds.height / 2
    const corners = [
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: -halfWidth, y: halfHeight }
    ]

    // 旋转这些角点
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const rotatedCorners = corners.map((corner) => {
      return {
        x: centerX + corner.x * cos - corner.y * sin,
        y: centerY + corner.x * sin + corner.y * cos
      }
    })

    // 计算旋转后角点的最小包围盒
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    rotatedCorners.forEach((corner) => {
      minX = Math.min(minX, corner.x)
      minY = Math.min(minY, corner.y)
      maxX = Math.max(maxX, corner.x)
      maxY = Math.max(maxY, corner.y)
    })

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  // 默认返回基础边界框
  return getElementBounds(element)
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
