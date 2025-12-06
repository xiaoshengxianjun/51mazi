import { ref } from 'vue'

/**
 * 油漆桶工具 composable
 */
export function useBucketTool({ canvasRef, elements, history, renderCanvas, color }) {
  /**
   * 填充颜色
   */
  function onMouseDown(pos) {
    if (!canvasRef.value || !history.value) return

    fillBucket(pos)
  }

  /**
   * 油漆桶填充（洪水填充算法）
   * 注意：pos 是场景坐标，需要转换为画布像素坐标
   */
  function fillBucket(pos) {
    if (!canvasRef.value || !history.value) return
    const ctx = canvasRef.value.getContext('2d')
    history.value.saveState()

    // 先渲染当前画布，获取最新状态
    renderCanvas()

    // 获取画布尺寸
    const canvasWidth = canvasRef.value.width
    const canvasHeight = canvasRef.value.height

    // 获取画布的像素数据
    // 注意：getImageData获取的是画布的原始像素数据，已经应用了scale和translate
    // 但我们需要在场景坐标系中进行填充，所以需要将场景坐标转换为画布像素坐标
    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight)
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height

    // 将场景坐标转换为画布像素坐标
    // 由于renderCanvasContent中使用了scale和translate：
    // ctx.scale(scale, scale)
    // ctx.translate(scrollX, scrollY)
    // 所以画布像素坐标 = (场景坐标 + scrollX) * scale
    // 但getImageData获取的是画布原始像素，没有应用这些变换
    // 实际上，画布的尺寸等于内容边界，所以场景坐标可以直接使用
    // 但为了安全，我们使用场景坐标，因为填充应该在场景坐标系中进行
    const x = Math.floor(pos.x)
    const y = Math.floor(pos.y)

    // 检查坐标是否在画布范围内
    if (x < 0 || x >= width || y < 0 || y >= height) return

    const startIdx = (y * width + x) * 4
    const startColor = [data[startIdx], data[startIdx + 1], data[startIdx + 2], data[startIdx + 3]]
    const fillColor = hexToRgba(color.value)

    if (colorsMatch(startColor, fillColor)) return

    const stack = [[x, y]]
    const visited = new Set()

    while (stack.length) {
      const [cx, cy] = stack.pop()
      const key = `${cx},${cy}`
      if (visited.has(key) || cx < 0 || cy < 0 || cx >= width || cy >= height) continue
      visited.add(key)

      const idx = (cy * width + cx) * 4
      const currColor = [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]]
      if (!colorsMatch(currColor, startColor)) continue

      data[idx] = fillColor[0]
      data[idx + 1] = fillColor[1]
      data[idx + 2] = fillColor[2]
      data[idx + 3] = fillColor[3]

      stack.push([cx + 1, cy])
      stack.push([cx - 1, cy])
      stack.push([cx, cy + 1])
      stack.push([cx, cy - 1])
    }

    // 计算填充区域的边界
    const visitedArray = Array.from(visited)
    if (visitedArray.length === 0) return

    const minX = Math.min(...visitedArray.map((key) => parseInt(key.split(',')[0])))
    const maxX = Math.max(...visitedArray.map((key) => parseInt(key.split(',')[0])))
    const minY = Math.min(...visitedArray.map((key) => parseInt(key.split(',')[1])))
    const maxY = Math.max(...visitedArray.map((key) => parseInt(key.split(',')[1])))

    // 裁剪 imageData 到填充区域
    const fillWidth = maxX - minX + 1
    const fillHeight = maxY - minY + 1
    const fillImageData = ctx.createImageData(fillWidth, fillHeight)

    for (let fy = 0; fy < fillHeight; fy++) {
      for (let fx = 0; fx < fillWidth; fx++) {
        const srcX = minX + fx
        const srcY = minY + fy
        const srcIdx = (srcY * width + srcX) * 4
        const dstIdx = (fy * fillWidth + fx) * 4

        fillImageData.data[dstIdx] = data[srcIdx]
        fillImageData.data[dstIdx + 1] = data[srcIdx + 1]
        fillImageData.data[dstIdx + 2] = data[srcIdx + 2]
        fillImageData.data[dstIdx + 3] = data[srcIdx + 3]
      }
    }

    // 将 imageData 转换为 base64 字符串以便序列化
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = fillWidth
    tempCanvas.height = fillHeight
    const tempCtx = tempCanvas.getContext('2d')
    tempCtx.putImageData(fillImageData, 0, 0)
    const imageDataBase64 = tempCanvas.toDataURL('image/png')

    // 保存填充元素
    elements.fillElements.value.push({
      type: 'fill',
      x: minX,
      y: minY,
      width: fillWidth,
      height: fillHeight,
      imageDataBase64: imageDataBase64,
      id: Date.now().toString()
    })

    // 重新渲染画布
    renderCanvas(true)
    history.value.saveState()
  }

  /**
   * 颜色匹配（精确匹配）
   */
  function colorsMatch(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]
  }

  /**
   * 十六进制颜色转 RGBA
   */
  function hexToRgba(hex) {
    let c = hex.replace('#', '')
    if (c.length === 3) {
      c = c
        .split('')
        .map((s) => s + s)
        .join('')
    }
    const num = parseInt(c, 16)
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 255]
  }

  return {
    onMouseDown,
    fillBucket
  }
}
