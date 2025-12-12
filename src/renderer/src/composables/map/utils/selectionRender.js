// getElementBounds 和 getCommonBounds 通过参数传递，不需要导入

/**
 * 选中框渲染工具函数
 */

/**
 * 规范化角度到 [0, 2π) 范围
 */
function normalizeAngle(angle) {
  while (angle < 0) angle += 2 * Math.PI
  while (angle >= 2 * Math.PI) angle -= 2 * Math.PI
  return angle
}

/**
 * 获取元素在未旋转状态下的实际边界框
 * 这个方法计算的是元素本身的几何边界框，不考虑旋转
 */
export function getElementOriginalBounds(element, getElementBounds) {
  if (element.type === 'freedraw') {
    // 对于freedraw，需要反向旋转所有点
    if (!element.points || element.points.length === 0) return null
    const angle = normalizeAngle(element.angle || 0)
    if (Math.abs(angle) < 0.001) {
      // 没有旋转，直接使用getElementBounds
      return getElementBounds(element)
    }

    // 计算所有点的中心
    let sumX = 0
    let sumY = 0
    element.points.forEach((point) => {
      sumX += point.x
      sumY += point.y
    })
    const centerX = sumX / element.points.length
    const centerY = sumY / element.points.length

    // 反向旋转所有点
    const cos = Math.cos(-angle)
    const sin = Math.sin(-angle)
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    element.points.forEach((point) => {
      const dx = point.x - centerX
      const dy = point.y - centerY
      const originalX = centerX + dx * cos - dy * sin
      const originalY = centerY + dx * sin + dy * cos
      minX = Math.min(minX, originalX)
      minY = Math.min(minY, originalY)
      maxX = Math.max(maxX, originalX)
      maxY = Math.max(maxY, originalY)
    })

    const padding = (element.strokeWidth || 5) / 2
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    }
  } else if (
    element.type === 'line' ||
    element.type === 'rect' ||
    element.type === 'rounded-rect' ||
    element.type === 'circle' ||
    element.type === 'star' ||
    element.type === 'arrow'
  ) {
    // 对于形状元素，start和end坐标就是未旋转状态下的坐标
    // 因为旋转是通过angle属性应用的，start/end本身不包含旋转信息
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
  } else if (element.type === 'text' || element.type === 'resource' || element.type === 'fill') {
    // 对于text/resource/fill，x/y/width/height是未旋转状态下的坐标
    // 但需要考虑旋转后的位置偏移
    const angle = normalizeAngle(element.angle || 0)
    if (Math.abs(angle) < 0.001) {
      // 没有旋转，直接使用getElementBounds
      return getElementBounds(element)
    }

    // 对于text/resource/fill，它们的x/y就是未旋转状态下的位置
    // 所以我们可以直接使用x/y来计算未旋转状态下的边界框
    const width = element.width || 0
    const height = element.height || 0

    return {
      x: element.x,
      y: element.y,
      width: width,
      height: height
    }
  }

  // 默认使用getElementBounds
  return getElementBounds(element)
}

/**
 * 获取元素的绝对坐标
 */
export function getElementAbsoluteCoords(element, getElementBounds) {
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
 * 绘制旋转矩形
 */
export function strokeRectWithRotation(
  ctx,
  x,
  y,
  width,
  height,
  cx,
  cy,
  angle,
  fillBeforeStroke = false
) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  if (fillBeforeStroke) {
    ctx.fillRect(x - cx, y - cy, width, height)
    ctx.strokeRect(x - cx, y - cy, width, height)
  } else {
    ctx.strokeRect(x - cx, y - cy, width, height)
  }
  ctx.restore()
}

/**
 * 旋转控制点位置
 */
function rotateHandle([x, y, w, h], cx, cy, angle) {
  const centerX = x + w / 2
  const centerY = y + h / 2
  const dx = centerX - cx
  const dy = centerY - cy
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const newX = cx + dx * cos - dy * sin - w / 2
  const newY = cy + dx * sin + dy * cos - h / 2
  return [newX, newY, w, h]
}

/**
 * 从坐标获取变换控制点
 */
export function getTransformHandlesFromCoords([x1, y1, x2, y2, cx, cy], angle, scale) {
  const size = 8
  const handleWidth = size / scale
  const handleHeight = size / scale
  const handleMarginX = size / scale
  const handleMarginY = size / scale
  const spacing = 4 / scale
  const margin = 4 / scale
  const dashedLineMargin = margin
  const centeringOffset = (size - spacing * 2) / (2 * scale)

  const width = x2 - x1
  const height = y2 - y1

  const handles = {}

  // 角点
  handles.nw = rotateHandle(
    [
      x1 - dashedLineMargin - handleMarginX + centeringOffset,
      y1 - dashedLineMargin - handleMarginY + centeringOffset,
      handleWidth,
      handleHeight
    ],
    cx,
    cy,
    angle
  )
  handles.ne = rotateHandle(
    [
      x2 + dashedLineMargin - centeringOffset,
      y1 - dashedLineMargin - handleMarginY + centeringOffset,
      handleWidth,
      handleHeight
    ],
    cx,
    cy,
    angle
  )
  handles.sw = rotateHandle(
    [
      x1 - dashedLineMargin - handleMarginX + centeringOffset,
      y2 + dashedLineMargin - centeringOffset,
      handleWidth,
      handleHeight
    ],
    cx,
    cy,
    angle
  )
  handles.se = rotateHandle(
    [
      x2 + dashedLineMargin - centeringOffset,
      y2 + dashedLineMargin - centeringOffset,
      handleWidth,
      handleHeight
    ],
    cx,
    cy,
    angle
  )

  // 边中点
  handles.n = rotateHandle(
    [
      x1 + width / 2 - handleWidth / 2,
      y1 - dashedLineMargin - handleMarginY + centeringOffset,
      handleWidth,
      handleHeight
    ],
    cx,
    cy,
    angle
  )
  handles.s = rotateHandle(
    [
      x1 + width / 2 - handleWidth / 2,
      y2 + dashedLineMargin - centeringOffset,
      handleWidth,
      handleHeight
    ],
    cx,
    cy,
    angle
  )
  handles.w = rotateHandle(
    [
      x1 - dashedLineMargin - handleMarginX + centeringOffset,
      y1 + height / 2 - handleHeight / 2,
      handleWidth,
      handleHeight
    ],
    cx,
    cy,
    angle
  )
  handles.e = rotateHandle(
    [
      x2 + dashedLineMargin - centeringOffset,
      y1 + height / 2 - handleHeight / 2,
      handleWidth,
      handleHeight
    ],
    cx,
    cy,
    angle
  )

  // 旋转控制点
  const rotationGap = 16 / scale
  handles.rotation = rotateHandle(
    [
      x1 + width / 2 - handleWidth / 2,
      y1 - dashedLineMargin - handleMarginY - rotationGap,
      handleWidth,
      handleHeight
    ],
    cx,
    cy,
    angle
  )

  return handles
}

/**
 * 渲染变换控制点
 */
export function renderTransformHandles(ctx, transformHandles, angle, scale) {
  const selectionColor = '#1e88e5'

  Object.keys(transformHandles).forEach((key) => {
    const handle = transformHandles[key]
    if (handle === undefined) return
    const [x, y, w, h] = handle

    ctx.save()
    ctx.lineWidth = 1 / scale
    ctx.strokeStyle = selectionColor
    ctx.fillStyle = '#fff'

    if (key === 'rotation') {
      ctx.beginPath()
      ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else if (ctx.roundRect) {
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, 2 / scale)
      ctx.fill()
      ctx.stroke()
    } else {
      strokeRectWithRotation(ctx, x, y, w, h, x + w / 2, y + h / 2, angle, true)
    }

    ctx.restore()
  })
}

/**
 * 渲染选中框和变换控制点
 */
export function renderSelection(
  ctx,
  selectedElements,
  getElementBounds,
  getElementAbsoluteCoords,
  getCommonBounds,
  getTransformHandlesFromCoords,
  renderTransformHandles,
  scale,
  scrollX,
  scrollY,
  originalBounds = null, // 可选的原始边界框，用于旋转时保持选框宽高不变（单选时使用）
  rotationAngle = null // 可选的旋转角度，用于多选旋转时选框同步旋转（单选时使用，多选时忽略，保留参数以保持兼容性）
) {
  // eslint-disable-next-line no-unused-vars
  const _ = rotationAngle // 多选时不再使用此参数，但保留以保持函数签名兼容性
  if (selectedElements.length === 0) return

  ctx.save()
  // 注意：如果scrollX和scrollY为0，说明已经在context中应用了变换，不需要再次translate
  // 但为了保持代码一致性，仍然执行translate(0,0)，不会有任何影响
  ctx.translate(scrollX, scrollY)

  const selectionColor = '#1e88e5'

  if (selectedElements.length === 1) {
    // 单个元素
    // 如果提供了原始边界框（旋转时），使用它来保持选框宽高不变
    let bounds = originalBounds
    if (!bounds) {
      const coords = getElementAbsoluteCoords(selectedElements[0], getElementBounds)
      if (!coords) {
        ctx.restore()
        return
      }
      bounds = {
        x: coords[0],
        y: coords[1],
        width: coords[2] - coords[0],
        height: coords[3] - coords[1]
      }
    }
    const x1 = bounds.x
    const y1 = bounds.y
    const x2 = bounds.x + bounds.width
    const y2 = bounds.y + bounds.height
    const cx = bounds.x + bounds.width / 2
    const cy = bounds.y + bounds.height / 2
    // 使用元素的旋转角度（如果存在），否则为0
    const angle = selectedElements[0].angle || 0

    const padding = 8 / scale
    const lineWidth = 8 / scale
    const spaceWidth = 4 / scale

    ctx.lineWidth = 1 / scale
    ctx.strokeStyle = selectionColor
    ctx.setLineDash([lineWidth, spaceWidth])
    ctx.lineDashOffset = 0

    // 绘制旋转的选中框
    // 注意：必须在strokeRectWithRotation之前设置lineDash，因为strokeRectWithRotation内部会save/restore
    const boxX = x1 - padding
    const boxY = y1 - padding
    const boxWidth = x2 - x1 + padding * 2
    const boxHeight = y2 - y1 + padding * 2

    // 直接在这里实现旋转绘制，确保旋转正确应用
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)
    ctx.strokeRect(boxX - cx, boxY - cy, boxWidth, boxHeight)
    ctx.restore()

    ctx.setLineDash([])

    const transformHandles = getTransformHandlesFromCoords([x1, y1, x2, y2, cx, cy], angle, scale)
    renderTransformHandles(ctx, transformHandles, angle, scale)
  } else {
    // 多个元素
    // 参考excalidraw：多选时选框始终是轴对齐的（不旋转），旋转锚点在正上方
    // 直接使用当前所有元素的轴对齐边界框
    const bounds = getCommonBounds(selectedElements, getElementBounds)
    if (!bounds) {
      ctx.restore()
      return
    }

    const x1 = bounds.x
    const y1 = bounds.y
    const x2 = bounds.x + bounds.width
    const y2 = bounds.y + bounds.height
    const cx = bounds.x + bounds.width / 2
    const cy = bounds.y + bounds.height / 2
    const padding = 8 / scale
    const lineWidth = 8 / scale
    const spaceWidth = 4 / scale

    ctx.lineWidth = 1 / scale
    ctx.strokeStyle = selectionColor
    ctx.setLineDash([lineWidth, spaceWidth])
    ctx.lineDashOffset = 0

    // 绘制轴对齐的选中框（不旋转）
    const boxX = x1 - padding
    const boxY = y1 - padding
    const boxWidth = x2 - x1 + padding * 2
    const boxHeight = y2 - y1 + padding * 2

    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight)

    ctx.setLineDash([])

    // 多选时选框不旋转，角度始终为0，旋转锚点在正上方
    const transformHandles = getTransformHandlesFromCoords(
      [x1, y1, x2, y2, cx, cy],
      0, // 多选时选框不旋转
      scale
    )
    renderTransformHandles(ctx, transformHandles, 0, scale) // 多选时选框不旋转
  }

  ctx.restore()
}
