import { ref } from 'vue'

/**
 * 历史记录管理
 */
export class HistoryManager {
  constructor(canvas, maxHistory = 50) {
    this.canvas = canvas
    this.maxHistory = maxHistory
    this.history = []
    this.currentIndex = -1
    this.renderCallback = null
    this.getStateCallback = null
    this.setStateCallback = null
  }

  // 保存当前状态
  saveState() {
    if (!this.canvas || !this.getStateCallback) return

    // 获取当前元素状态（而不是 ImageData）
    const state = this.getStateCallback()

    // 移除当前位置之后的历史（如果有回退操作）
    this.history = this.history.slice(0, this.currentIndex + 1)

    // 添加新状态（深拷贝）
    this.history.push(JSON.parse(JSON.stringify(state)))
    this.currentIndex++

    // 限制历史记录数量
    if (this.history.length > this.maxHistory) {
      this.history.shift()
      this.currentIndex--
    }
  }

  // 撤销
  undo() {
    if (this.canUndo() && this.setStateCallback) {
      this.currentIndex--
      // 恢复状态
      const state = this.history[this.currentIndex]
      this.setStateCallback(state)
      // 重新渲染画布
      if (this.renderCallback) {
        this.renderCallback()
      }
      return true
    }
    return false
  }

  // 回退
  redo() {
    if (this.canRedo() && this.setStateCallback) {
      this.currentIndex++
      // 恢复状态
      const state = this.history[this.currentIndex]
      this.setStateCallback(state)
      // 重新渲染画布
      if (this.renderCallback) {
        this.renderCallback()
      }
      return true
    }
    return false
  }

  canUndo() {
    return this.currentIndex > 0
  }

  canRedo() {
    return this.currentIndex < this.history.length - 1
  }

  // 初始化历史记录
  init() {
    if (!this.canvas || !this.getStateCallback) return
    // 获取当前元素状态
    const state = this.getStateCallback()
    this.history = [JSON.parse(JSON.stringify(state))]
    this.currentIndex = 0
  }
}

export function useHistory(canvasRef) {
  const history = ref(null)

  return {
    history
  }
}
