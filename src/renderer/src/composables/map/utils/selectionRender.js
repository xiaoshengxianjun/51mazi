import { getElementBounds } from './elementBounds.js'
import { getCommonBounds } from './selection.js'

/**
 * 选中框渲染工具函数
 */

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
  scrollY
) {
  if (selectedElements.length === 0) return

  ctx.save()
  ctx.translate(scrollX, scrollY)

  const selectionColor = '#1e88e5'

  if (selectedElements.length === 1) {
    // 单个元素
    const element = selectedElements[0]
    const coords = getElementAbsoluteCoords(element, getElementBounds)
    if (!coords) return
    const [x1, y1, x2, y2, cx, cy] = coords
    // 使用元素的旋转角度（如果存在），否则为0
    const angle = element.angle || 0

    const padding = 8 / scale
    const lineWidth = 8 / scale
    const spaceWidth = 4 / scale

    ctx.lineWidth = 1 / scale
    ctx.strokeStyle = selectionColor
    ctx.setLineDash([lineWidth, spaceWidth])
    ctx.lineDashOffset = 0
    strokeRectWithRotation(ctx, x1 - padding, y1 - padding, x2 - x1 + padding * 2, y2 - y1 + padding * 2, cx, cy, angle)
    ctx.setLineDash([])

    const transformHandles = getTransformHandlesFromCoords([x1, y1, x2, y2, cx, cy], angle, scale)
    renderTransformHandles(ctx, transformHandles, angle, scale)
  } else {
    // 多个元素
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

    ctx.lineWidth = 1 / scale
    ctx.strokeStyle = selectionColor
    ctx.setLineDash([2 / scale])
    strokeRectWithRotation(ctx, x1 - padding, y1 - padding, x2 - x1 + padding * 2, y2 - y1 + padding * 2, cx, cy, 0)
    ctx.setLineDash([])

    const transformHandles = getTransformHandlesFromCoords([x1, y1, x2, y2, cx, cy], 0, scale)
    renderTransformHandles(ctx, transformHandles, 0, scale)
  }

  ctx.restore()
}

