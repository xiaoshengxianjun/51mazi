import { ref } from 'vue'

/**
 * 历史记录管理
 * 支持最多 maxHistory 步撤销（默认50步）
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
    // 用于防止连续保存相同状态
    this.lastSavedStateString = null
  }

  /**
   * 保存当前状态
   * 如果状态与上次保存的状态相同，则跳过保存（避免重复状态）
   */
  saveState() {
    if (!this.canvas || !this.getStateCallback) {
      console.warn('HistoryManager: 无法保存状态，canvas 或 getStateCallback 未设置')
      return
    }

    try {
      // 获取当前元素状态（而不是 ImageData）
      const state = this.getStateCallback()

      // 序列化状态用于比较（避免保存完全相同的状态）
      const stateString = JSON.stringify(state)
      if (stateString === this.lastSavedStateString) {
        // 状态相同，跳过保存
        return
      }

      // 移除当前位置之后的历史（如果有回退操作）
      this.history = this.history.slice(0, this.currentIndex + 1)

      // 添加新状态（深拷贝）
      this.history.push(JSON.parse(JSON.stringify(state)))
      this.currentIndex++
      this.lastSavedStateString = stateString

      // 限制历史记录数量
      if (this.history.length > this.maxHistory) {
        this.history.shift()
        this.currentIndex--
        // 更新 lastSavedStateString 为新的第一个状态
        if (this.history.length > 0) {
          this.lastSavedStateString = JSON.stringify(this.history[0])
        }
      }
    } catch (error) {
      console.error('HistoryManager: 保存状态失败', error)
    }
  }

  /**
   * 撤销
   * @returns {boolean} 是否成功撤销
   */
  undo() {
    if (!this.canUndo()) {
      return false
    }

    if (!this.setStateCallback) {
      console.warn('HistoryManager: 无法撤销，setStateCallback 未设置')
      return false
    }

    try {
      this.currentIndex--
      // 恢复状态
      const state = this.history[this.currentIndex]
      this.setStateCallback(state)
      // 更新 lastSavedStateString
      this.lastSavedStateString = JSON.stringify(state)
      // 重新渲染画布
      if (this.renderCallback) {
        this.renderCallback()
      }
      return true
    } catch (error) {
      console.error('HistoryManager: 撤销失败', error)
      return false
    }
  }

  /**
   * 回退（重做）
   * @returns {boolean} 是否成功回退
   */
  redo() {
    if (!this.canRedo()) {
      return false
    }

    if (!this.setStateCallback) {
      console.warn('HistoryManager: 无法回退，setStateCallback 未设置')
      return false
    }

    try {
      this.currentIndex++
      // 恢复状态
      const state = this.history[this.currentIndex]
      this.setStateCallback(state)
      // 更新 lastSavedStateString
      this.lastSavedStateString = JSON.stringify(state)
      // 重新渲染画布
      if (this.renderCallback) {
        this.renderCallback()
      }
      return true
    } catch (error) {
      console.error('HistoryManager: 回退失败', error)
      return false
    }
  }

  /**
   * 检查是否可以撤销
   * @returns {boolean}
   */
  canUndo() {
    return this.currentIndex > 0
  }

  /**
   * 检查是否可以回退
   * @returns {boolean}
   */
  canRedo() {
    return this.currentIndex < this.history.length - 1
  }

  /**
   * 获取当前可撤销的步数
   * @returns {number}
   */
  getUndoSteps() {
    return Math.max(0, this.currentIndex)
  }

  /**
   * 获取当前可回退的步数
   * @returns {number}
   */
  getRedoSteps() {
    return Math.max(0, this.history.length - 1 - this.currentIndex)
  }

  /**
   * 初始化历史记录
   * 应该在加载地图数据后调用，将当前状态作为初始状态
   */
  init() {
    if (!this.canvas || !this.getStateCallback) {
      console.warn('HistoryManager: 无法初始化，canvas 或 getStateCallback 未设置')
      return
    }

    try {
      // 获取当前元素状态
      const state = this.getStateCallback()
      this.history = [JSON.parse(JSON.stringify(state))]
      this.currentIndex = 0
      this.lastSavedStateString = JSON.stringify(state)
    } catch (error) {
      console.error('HistoryManager: 初始化失败', error)
    }
  }

  /**
   * 清空历史记录
   */
  clear() {
    this.history = []
    this.currentIndex = -1
    this.lastSavedStateString = null
  }
}

// eslint-disable-next-line no-unused-vars
export function useHistory(canvasRef) {
  const history = ref(null)

  return {
    history
  }
}
