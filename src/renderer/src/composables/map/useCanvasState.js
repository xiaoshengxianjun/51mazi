import { ref, computed } from 'vue'

/**
 * 画布状态管理（缩放、平移、边界等）
 */
export function useCanvasState() {
  // 画布缩放
  const scale = ref(1)
  const minScale = 0.1
  const maxScale = 5

  // 视口位置（参考 excalidraw 的 scrollX/scrollY）
  const scrollX = ref(0)
  const scrollY = ref(0)

  // 画布平移
  const panning = ref(false)
  const panStart = ref({ x: 0, y: 0 })
  const spaceKeyPressed = ref(false)

  // 画布内容边界（用于动态计算画布大小）
  const contentBounds = ref({
    minX: 0,
    minY: 0,
    maxX: 1920,
    maxY: 1080
  })

  // 计算画布显示尺寸（基于内容边界和视口）
  const canvasDisplayWidth = computed(() => {
    const padding = 200 // 内容周围的 padding
    return Math.max(contentBounds.value.maxX - contentBounds.value.minX + padding * 2, 1920)
  })

  const canvasDisplayHeight = computed(() => {
    const padding = 200
    return Math.max(contentBounds.value.maxY - contentBounds.value.minY + padding * 2, 1080)
  })

  return {
    scale,
    minScale,
    maxScale,
    scrollX,
    scrollY,
    panning,
    panStart,
    spaceKeyPressed,
    contentBounds,
    canvasDisplayWidth,
    canvasDisplayHeight
  }
}
