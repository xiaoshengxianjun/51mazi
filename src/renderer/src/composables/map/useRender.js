import { getStroke } from 'perfect-freehand'
import rough from 'roughjs'

/**
 * 渲染函数集合
 */
export function useRender(canvasRef, scale) {
  /**
   * 渲染画笔路径（使用 perfect-freehand）
   */
  function renderFreeDrawPath(ctx, element, isPreview = false) {
    if (!element.points || element.points.length === 0) return

    const options = {
      size: element.strokeWidth, // 直接使用 strokeWidth，不乘以倍数
      thinning: 0.6,
      smoothing: 0.5,
      streamline: 0.5,
      easing: (t) => Math.sin((t * Math.PI) / 2),
      simulatePressure: true
    }

    // 将点数组转换为 perfect-freehand 需要的格式
    const inputPoints = element.points.map((p) => [p.x, p.y])
    const stroke = getStroke(inputPoints, options)

    // 绘制路径
    ctx.save()
    ctx.globalAlpha = isPreview ? 0.7 : (element.opacity || 100) / 100
    ctx.fillStyle = element.color

    if (stroke.length > 0) {
      ctx.beginPath()
      ctx.moveTo(stroke[0][0], stroke[0][1])
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i][0], stroke[i][1])
      }
      ctx.closePath()
      ctx.fill()
    }

    ctx.restore()
  }

  /**
   * 渲染形状（使用 roughjs）
   * 支持：line, rect, circle, star
   * 支持圆角/尖角设置
   */
  function renderShape(ctx, element, isPreview = false) {
    if (!canvasRef.value) return

    const rc = rough.canvas(canvasRef.value)
    const roundness = element.roundness || 'sharp'
    const borderRadius = roundness === 'round' ? 20 : 0 // 圆角半径（增大以更圆润）

    const options = {
      stroke: element.color,
      strokeWidth: element.strokeWidth,
      roughness: 1,
      seed: 1
    }

    ctx.save()
    ctx.globalAlpha = isPreview ? 0.7 : (element.opacity || 100) / 100

    if (element.type === 'line') {
      rc.line(element.start.x, element.start.y, element.end.x, element.end.y, options)
    } else if (element.type === 'rect') {
      const width = element.end.x - element.start.x
      const height = element.end.y - element.start.y
      if (roundness === 'round' && borderRadius > 0) {
        // 使用圆角矩形路径（roughjs不支持borderRadius参数，需要手动绘制路径）
        const x = element.start.x
        const y = element.start.y
        const w = width
        const h = height
        const r = Math.min(borderRadius, Math.abs(w) / 2, Math.abs(h) / 2)
        const path = `M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`
        rc.path(path, options)
      } else {
        rc.rectangle(element.start.x, element.start.y, width, height, options)
      }
    } else if (element.type === 'circle') {
      const width = element.end.x - element.start.x
      const height = element.end.y - element.start.y
      const centerX = element.start.x + width / 2
      const centerY = element.start.y + height / 2
      const radius = Math.min(Math.abs(width), Math.abs(height)) / 2
      rc.circle(centerX, centerY, radius * 2, options)
    } else if (element.type === 'star') {
      const width = element.end.x - element.start.x
      const height = element.end.y - element.start.y
      const centerX = element.start.x + width / 2
      const centerY = element.start.y + height / 2
      const outerRadius = Math.min(Math.abs(width), Math.abs(height)) / 2
      const innerRadius = outerRadius * 0.4
      const points = 5

      // 绘制五角星
      const path = []
      for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI) / points - Math.PI / 2
        const radius = i % 2 === 0 ? outerRadius : innerRadius
        const x = centerX + radius * Math.cos(angle)
        const y = centerY + radius * Math.sin(angle)
        if (i === 0) {
          path.push(`M ${x} ${y}`)
        } else {
          path.push(`L ${x} ${y}`)
        }
      }
      path.push('Z')

      if (roundness === 'round') {
        // 圆角五角星：使用roughjs的path，但需要手动处理圆角
        // 简化处理：使用较小的roughness来模拟圆角效果
        rc.path(path.join(' '), { ...options, roughness: 0.5 })
      } else {
        rc.path(path.join(' '), options)
      }
    }

    ctx.restore()
  }

  /**
   * 渲染文字
   */
  function renderText(ctx, element) {
    if (!element.text) return

    ctx.save()
    const fontSize = element.fontSize || 14
    const fontFamily = element.fontFamily || 'Arial'
    const lineHeight = element.lineHeight || 1.2
    const textAlign = element.textAlign || 'left'

    ctx.font = `${fontSize}px ${fontFamily}`
    ctx.fillStyle = element.color || '#000000'
    ctx.textBaseline = 'top'
    ctx.textAlign = textAlign

    // 处理多行文字
    const lines = element.text.replace(/\r\n?/g, '\n').split('\n')
    const lineHeightPx = fontSize * lineHeight

    // 计算水平偏移
    let horizontalOffset = 0
    if (textAlign === 'center') {
      horizontalOffset = (element.width || 0) / 2
    } else if (textAlign === 'right') {
      horizontalOffset = element.width || 0
    }

    // 绘制每一行
    lines.forEach((line, index) => {
      ctx.fillText(line, element.x + horizontalOffset, element.y + index * lineHeightPx)
    })

    ctx.restore()
  }

  /**
   * 渲染资源
   */
  function renderResource(ctx, element) {
    const img = new window.Image()
    img.src = element.url
    img.onload = () => {
      ctx.drawImage(img, element.x - 20, element.y - 20, 40, 40)
    }
  }

  /**
   * 渲染填充区域
   */
  function renderFill(ctx, element) {
    // 填充区域保存为 base64 图片，直接绘制
    if (element.imageDataBase64) {
      const img = new window.Image()
      img.src = element.imageDataBase64
      ctx.drawImage(img, element.x, element.y, element.width, element.height)
    }
  }

  return {
    renderFreeDrawPath,
    renderShape,
    renderText,
    renderResource,
    renderFill
  }
}
