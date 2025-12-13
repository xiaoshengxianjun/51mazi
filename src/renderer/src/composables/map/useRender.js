import { getStroke } from 'perfect-freehand'
import rough from 'roughjs'
import { getElementBounds } from './utils/elementBounds.js'

/**
 * 渲染函数集合
 */
export function useRender(canvasRef) {
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

    // 应用旋转（参考 excalidraw）
    const angle = element.angle || 0
    if (angle !== 0) {
      // 计算 freedraw 路径的中心点
      const bounds = getElementBounds(element)
      if (bounds) {
        const centerX = bounds.x + bounds.width / 2
        const centerY = bounds.y + bounds.height / 2
        ctx.translate(centerX, centerY)
        ctx.rotate(angle)
        ctx.translate(-centerX, -centerY)
      }
    }

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

    const options = {
      stroke: element.color,
      strokeWidth: element.strokeWidth,
      roughness: 1,
      seed: 1
    }

    ctx.save()
    ctx.globalAlpha = isPreview ? 0.7 : (element.opacity || 100) / 100

    // 应用旋转（参考 excalidraw：在绘制前应用旋转）
    const angle = element.angle || 0
    if (angle !== 0) {
      // 计算元素中心点
      let centerX, centerY
      if (
        element.type === 'line' ||
        element.type === 'rect' ||
        element.type === 'rounded-rect' ||
        element.type === 'circle' ||
        element.type === 'star' ||
        element.type === 'arrow'
      ) {
        centerX = (element.start.x + element.end.x) / 2
        centerY = (element.start.y + element.end.y) / 2
      } else {
        // 对于其他类型，使用 bounds 计算中心
        const bounds = getElementBounds(element)
        if (bounds) {
          centerX = bounds.x + bounds.width / 2
          centerY = bounds.y + bounds.height / 2
        }
      }
      if (centerX !== undefined && centerY !== undefined) {
        ctx.translate(centerX, centerY)
        ctx.rotate(angle)
        ctx.translate(-centerX, -centerY)
      }
    }

    if (element.type === 'line') {
      rc.line(element.start.x, element.start.y, element.end.x, element.end.y, options)
    } else if (element.type === 'rect') {
      // 矩形：绘制尖角矩形
      // 计算矩形的实际左上角和尺寸（确保 width 和 height 为正）
      const minX = Math.min(element.start.x, element.end.x)
      const minY = Math.min(element.start.y, element.end.y)
      const width = Math.abs(element.end.x - element.start.x)
      const height = Math.abs(element.end.y - element.start.y)
      rc.rectangle(minX, minY, width, height, options)
    } else if (element.type === 'rounded-rect') {
      // 圆角矩形：参考excalidraw的实现方式
      // excalidraw源码：packages/excalidraw/scene/Shape.ts:327-345
      // excalidraw使用相对坐标从(0,0)开始，然后通过ctx.translate移动到实际位置
      const minX = Math.min(element.start.x, element.end.x)
      const minY = Math.min(element.start.y, element.end.y)
      const width = Math.abs(element.end.x - element.start.x)
      const height = Math.abs(element.end.y - element.start.y)
      const w = width
      const h = height

      // 计算圆角半径：使用excalidraw的DEFAULT_PROPORTIONAL_RADIUS = 0.25
      // 参考：packages/excalidraw/constants.ts:346
      const minDim = Math.min(w, h)
      const r = minDim * 0.25 // 25%的比例，与excalidraw一致

      // 使用相对坐标路径（从0,0开始），与excalidraw完全一致
      // excalidraw路径：M r 0 L w-r 0 Q w 0, w r L w h-r Q w h, w-r h L r h Q 0 h, 0 h-r L 0 r Q 0 0, r 0
      const path = `M ${r} 0 L ${w - r} 0 Q ${w} 0, ${w} ${r} L ${w} ${h - r} Q ${w} ${h}, ${w - r} ${h} L ${r} ${h} Q 0 ${h}, 0 ${h - r} L 0 ${r} Q 0 0, ${r} 0`

      // 使用roughjs的path方法，设置preserveVertices=true以保持路径连续性
      // 参考：packages/excalidraw/scene/Shape.ts:343 (continuousPath=true)
      const pathOptions = {
        ...options,
        preserveVertices: true // 保持顶点，确保圆角平滑
      }

      // 先移动到实际位置，然后绘制相对坐标路径
      ctx.save()
      ctx.translate(minX, minY)
      rc.path(path, pathOptions)
      ctx.restore()
    } else if (element.type === 'circle') {
      // 参考excalidraw：使用ellipse而不是circle，支持椭圆
      const minX = Math.min(element.start.x, element.end.x)
      const minY = Math.min(element.start.y, element.end.y)
      const width = Math.abs(element.end.x - element.start.x)
      const height = Math.abs(element.end.y - element.start.y)
      const centerX = minX + width / 2
      const centerY = minY + height / 2
      const radiusX = width / 2
      const radiusY = height / 2
      // 使用ellipse绘制，参考excalidraw的ellipse实现
      rc.ellipse(centerX, centerY, radiusX * 2, radiusY * 2, options)
    } else if (element.type === 'star') {
      const minX = Math.min(element.start.x, element.end.x)
      const minY = Math.min(element.start.y, element.end.y)
      const width = Math.abs(element.end.x - element.start.x)
      const height = Math.abs(element.end.y - element.start.y)
      const centerX = minX + width / 2
      const centerY = minY + height / 2
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
      rc.path(path.join(' '), options)
    } else if (element.type === 'arrow') {
      // 参考excalidraw实现箭头
      // excalidraw源码：packages/excalidraw/scene/Shape.ts:421-504
      const startX = element.start.x
      const startY = element.start.y
      const endX = element.end.x
      const endY = element.end.y

      // 绘制箭头主体（线条）
      rc.line(startX, startY, endX, endY, options)

      // 绘制箭头头部
      const arrowLength = 20 // 箭头长度
      const arrowWidth = 10 // 箭头宽度
      const angle = Math.atan2(endY - startY, endX - startX)

      // 箭头头部的三个点
      const arrowTipX = endX
      const arrowTipY = endY
      const arrowLeftX = endX - arrowLength * Math.cos(angle) + arrowWidth * Math.sin(angle)
      const arrowLeftY = endY - arrowLength * Math.sin(angle) - arrowWidth * Math.cos(angle)
      const arrowRightX = endX - arrowLength * Math.cos(angle) - arrowWidth * Math.sin(angle)
      const arrowRightY = endY - arrowLength * Math.sin(angle) + arrowWidth * Math.cos(angle)

      // 绘制箭头头部（三角形）
      const arrowPath = `M ${arrowTipX} ${arrowTipY} L ${arrowLeftX} ${arrowLeftY} L ${arrowRightX} ${arrowRightY} Z`
      rc.path(arrowPath, { ...options, fill: element.color, fillStyle: 'solid' })
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

    // 获取应用旋转之前的变换矩阵（只包含 scale 和 translate）
    // 用于计算像素对齐，确保文字清晰
    const transform = ctx.getTransform()
    const currentScale = transform.a // scale 值

    // 应用旋转（参考 excalidraw）
    const angle = element.angle || 0
    if (angle !== 0) {
      const centerX = element.x + (element.width || 0) / 2
      const centerY = element.y + (element.height || 0) / 2
      ctx.translate(centerX, centerY)
      ctx.rotate(angle)
      ctx.translate(-centerX, -centerY)
    }

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

    // 绘制每一行，对齐到像素网格以确保清晰
    lines.forEach((line, index) => {
      // 计算实际渲染位置（在场景坐标系中）
      const x = element.x + horizontalOffset
      const y = element.y + index * lineHeightPx

      // 将场景坐标转换为像素坐标，对齐到整数像素，再转换回场景坐标
      // 这样可以确保文字在像素网格上渲染，避免模糊
      // 注意：这里在旋转坐标系中计算，但对齐是在像素坐标系中进行的
      // 由于旋转是在 ctx 上应用的，我们需要在旋转后的坐标系中对齐
      const pixelX = x * currentScale + transform.e
      const pixelY = y * currentScale + transform.f
      const alignedPixelX = Math.round(pixelX)
      const alignedPixelY = Math.round(pixelY)
      const alignedX = (alignedPixelX - transform.e) / currentScale
      const alignedY = (alignedPixelY - transform.f) / currentScale

      ctx.fillText(line, alignedX, alignedY)
    })

    ctx.restore()
  }

  /**
   * SVG 图标缓存，避免重复创建
   */
  const iconImageCache = new Map()

  /**
   * 将 SVG 图标转换为图片
   */
  function svgIconToImage(iconName, size = 40) {
    const cacheKey = `${iconName}-${size}`
    if (iconImageCache.has(cacheKey)) {
      return iconImageCache.get(cacheKey)
    }

    // 查找 SVG symbol
    const svgSymbol = document.querySelector(`#icon-${iconName}`)
    if (!svgSymbol) {
      return null
    }

    // 获取 SVG 的 viewBox
    const viewBox = svgSymbol.getAttribute('viewBox') || '0 0 1024 1024'
    const [x, y, width, height] = viewBox.split(' ').map(Number)

    // 创建 SVG 字符串
    const svgContent = svgSymbol.innerHTML
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
           viewBox="${viewBox}" width="${size}" height="${size}">
        ${svgContent}
      </svg>
    `

    // 将 SVG 转换为图片，使用 data: URL 避免 CSP 错误
    const img = new window.Image()
    // 使用 data: URL 代替 blob: URL，避免 CSP 策略阻止
    const encodedSvg = encodeURIComponent(svgString.trim())
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`
    img.src = dataUrl

    iconImageCache.set(cacheKey, img)
    return img
  }

  /**
   * 渲染资源（支持图标和图片两种类型，支持调整大小）
   */
  function renderResource(ctx, element) {
    ctx.save()
    // 应用旋转（参考 excalidraw）
    const angle = element.angle || 0
    if (angle !== 0) {
      const centerX = element.x
      const centerY = element.y
      ctx.translate(centerX, centerY)
      ctx.rotate(angle)
      ctx.translate(-centerX, -centerY)
    }

    // 获取资源元素的宽度和高度（支持调整大小）
    const width = element.width || 40
    const height = element.height || 40
    const halfWidth = width / 2
    const halfHeight = height / 2

    // 优先使用图标，如果没有图标则使用 URL（兼容旧数据）
    if (element.icon) {
      // 使用实际大小来生成图标图片
      const iconSize = Math.max(width, height)
      const img = svgIconToImage(element.icon, iconSize)
      if (img) {
        if (img.complete && img.naturalWidth > 0) {
          // 图片已加载
          ctx.drawImage(img, element.x - halfWidth, element.y - halfHeight, width, height)
        } else {
          // 等待图片加载
          img.onload = () => {
            ctx.drawImage(img, element.x - halfWidth, element.y - halfHeight, width, height)
            // 触发重新渲染
            if (canvasRef.value) {
              const renderCanvas = canvasRef.value.__renderCanvas
              if (renderCanvas) {
                renderCanvas()
              }
            }
          }
        }
      }
    } else if (element.url) {
      // 兼容旧的图片资源
      const img = new window.Image()
      img.src = element.url
      img.onload = () => {
        ctx.drawImage(img, element.x - halfWidth, element.y - halfHeight, width, height)
      }
    }
    
    ctx.restore()
  }

  /**
   * 渲染填充区域
   * 使用图片缓存避免重复加载导致的闪烁
   */
  const fillImageCache = new Map()

  function renderFill(ctx, element) {
    if (!element.imageDataBase64) return

    // 使用缓存避免重复加载
    let img = fillImageCache.get(element.id)
    if (!img) {
      img = new window.Image()
      img.src = element.imageDataBase64
      fillImageCache.set(element.id, img)
    }

    ctx.save()

    // 应用旋转（参考 excalidraw）
    const angle = element.angle || 0
    if (angle !== 0) {
      const centerX = element.x + (element.width || 0) / 2
      const centerY = element.y + (element.height || 0) / 2
      ctx.translate(centerX, centerY)
      ctx.rotate(angle)
      ctx.translate(-centerX, -centerY)
    }

    // 如果图片已加载，直接绘制；否则不绘制（避免显示灰色占位矩形）
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, element.x, element.y, element.width, element.height)
    }
    // 图片未加载完成时不绘制任何内容，避免显示灰色背景

    ctx.restore()
  }

  return {
    renderFreeDrawPath,
    renderShape,
    renderText,
    renderResource,
    renderFill
  }
}
