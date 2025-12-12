import { ref } from 'vue'

/**
 * 油漆桶工具 composable
 */
export function useBucketTool({ canvasRef, elements, history, renderCanvas, color, canvasState }) {
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

    // 先渲染当前画布，获取最新状态（不更新边界，避免不必要的延迟）
    renderCanvas(false)

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
    // 在canvas context中，先scale后translate，所以：
    // 画布像素坐标 = (场景坐标 + scrollX) * scale
    // 注意：getImageData获取的是画布的原始像素数据，已经应用了scale和translate变换
    // 背景绘制在场景坐标(-scrollX, -scrollY)，对应像素坐标(0, 0)
    // 所以场景坐标(x, y)对应的像素坐标为: (x + scrollX) * scale, (y + scrollY) * scale
    const pixelX = Math.floor((pos.x + canvasState.scrollX.value) * canvasState.scale.value)
    const pixelY = Math.floor((pos.y + canvasState.scrollY.value) * canvasState.scale.value)

    // 检查坐标是否在画布范围内
    if (pixelX < 0 || pixelX >= width || pixelY < 0 || pixelY >= height) return

    const startIdx = (pixelY * width + pixelX) * 4
    const startColor = [data[startIdx], data[startIdx + 1], data[startIdx + 2], data[startIdx + 3]]
    const fillColor = hexToRgba(color.value)

    if (colorsMatch(startColor, fillColor)) return

    const stack = [[pixelX, pixelY]]
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
    // 使用 reduce 而不是展开运算符，避免大数组导致调用栈溢出
    const visitedArray = Array.from(visited)
    if (visitedArray.length === 0) return

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    visitedArray.forEach((key) => {
      const [x, y] = key.split(',').map(Number)
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    })

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

    // 将画布像素坐标转换为场景坐标
    // getImageData 获取的是画布像素坐标，但元素需要存储场景坐标
    // 画布像素坐标 = (场景坐标 + scrollX) * scale
    // 所以场景坐标 = 画布像素坐标 / scale - scrollX
    const sceneX = minX / canvasState.scale.value - canvasState.scrollX.value
    const sceneY = minY / canvasState.scale.value - canvasState.scrollY.value
    const sceneWidth = fillWidth / canvasState.scale.value
    const sceneHeight = fillHeight / canvasState.scale.value

    // 创建填充元素（使用场景坐标）
    const fillElement = {
      type: 'fill',
      x: sceneX,
      y: sceneY,
      width: sceneWidth,
      height: sceneHeight,
      imageDataBase64: imageDataBase64,
      id: Date.now().toString()
    }

    // 预加载图片，确保在渲染时图片已经准备好
    // 这样可以避免 renderFill 中因为图片未加载完成而不绘制的问题
    const img = new window.Image()
    let imageReady = false // 防止重复执行
    
    // 处理图片加载完成的回调
    const handleImageReady = () => {
      if (imageReady) return // 防止重复执行
      imageReady = true
      
      // 图片加载完成后，添加到元素数组并渲染
      elements.fillElements.value.push(fillElement)
      // 重新渲染画布
      renderCanvas(true)
      history.value.saveState()
    }
    
    img.onload = handleImageReady
    img.onerror = () => {
      if (imageReady) return
      imageReady = true
      // 即使加载失败，也添加元素（renderFill 会处理未加载的情况）
      elements.fillElements.value.push(fillElement)
      renderCanvas(true)
      history.value.saveState()
    }
    
    // 设置图片源
    img.src = imageDataBase64
    
    // 如果图片已经加载完成（base64 数据通常是同步的），立即执行回调
    // 注意：需要在设置 src 后检查，因为 base64 数据可能立即加载完成
    if (img.complete && img.naturalWidth > 0) {
      handleImageReady()
    }
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
