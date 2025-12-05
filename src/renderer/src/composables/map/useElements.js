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

  /**
   * 序列化所有元素数据（用于保存）
   * 参考excalidraw：将画板内容序列化为JSON格式
   * @param {string} backgroundColor - 背景色
   */
  function serialize(backgroundColor) {
    return {
      version: '1.0.0', // 版本号，用于后续兼容性处理
      freeDrawElements: JSON.parse(JSON.stringify(freeDrawElements.value)),
      shapeElements: JSON.parse(JSON.stringify(shapeElements.value)),
      textElements: JSON.parse(JSON.stringify(textElements.value)),
      resourceElements: JSON.parse(JSON.stringify(resourceElements.value)),
      fillElements: JSON.parse(JSON.stringify(fillElements.value)),
      backgroundColor: backgroundColor || '#ffffff' // 包含背景色
    }
  }

  /**
   * 反序列化元素数据（用于加载）
   * 参考excalidraw：从JSON格式恢复画板内容
   * @returns {string|null} 背景色
   */
  function deserialize(data) {
    if (!data) return null

    try {
      // 清空现有元素
      clearAll()

      // 恢复元素数据
      if (data.freeDrawElements && Array.isArray(data.freeDrawElements)) {
        freeDrawElements.value = JSON.parse(JSON.stringify(data.freeDrawElements))
      }
      if (data.shapeElements && Array.isArray(data.shapeElements)) {
        shapeElements.value = JSON.parse(JSON.stringify(data.shapeElements))
      }
      if (data.textElements && Array.isArray(data.textElements)) {
        textElements.value = JSON.parse(JSON.stringify(data.textElements))
      }
      if (data.resourceElements && Array.isArray(data.resourceElements)) {
        resourceElements.value = JSON.parse(JSON.stringify(data.resourceElements))
      }
      if (data.fillElements && Array.isArray(data.fillElements)) {
        fillElements.value = JSON.parse(JSON.stringify(data.fillElements))
      }

      // 返回背景色
      return data.backgroundColor || null
    } catch (error) {
      console.error('反序列化元素数据失败:', error)
      throw new Error('加载画板内容失败: ' + error.message)
    }
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
    clearAll,
    serialize,
    deserialize
  }
}
