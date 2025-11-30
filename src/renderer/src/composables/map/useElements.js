import { ref } from 'vue'

/**
 * 元素数据管理（所有绘制元素）
 */
export function useElements() {
  // 画笔路径元素
  const freeDrawElements = ref([]) // 保存所有已完成的画笔路径
  const currentFreeDrawPath = ref(null) // 当前正在绘制的路径

  // 线条和多边形元素
  const shapeElements = ref([]) // 保存所有已完成的形状
  const currentShape = ref(null) // 当前正在绘制的形状

  // 文字元素
  const textElements = ref([]) // 保存所有文字元素

  // 资源元素
  const resourceElements = ref([]) // 保存所有资源元素

  // 油漆桶填充区域
  const fillElements = ref([]) // 保存所有填充区域

  // 获取所有元素（用于遍历）
  function getAllElements() {
    return [
      ...freeDrawElements.value,
      ...shapeElements.value,
      ...textElements.value,
      ...resourceElements.value,
      ...fillElements.value
    ]
  }

  // 清空所有元素
  function clearAll() {
    freeDrawElements.value = []
    shapeElements.value = []
    textElements.value = []
    resourceElements.value = []
    fillElements.value = []
    currentFreeDrawPath.value = null
    currentShape.value = null
  }

  return {
    freeDrawElements,
    currentFreeDrawPath,
    shapeElements,
    currentShape,
    textElements,
    resourceElements,
    fillElements,
    getAllElements,
    clearAll
  }
}
