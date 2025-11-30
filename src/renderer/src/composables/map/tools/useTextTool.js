import { ref, nextTick } from 'vue'

/**
 * 文字工具 composable
 */
export function useTextTool({ canvasRef, elements, history, renderCanvas, color, getCanvasPos }) {
  const textInputVisible = ref(false)
  const textInputValue = ref('')
  const textInputPosition = ref({ x: 0, y: 0 })
  const textInputRef = ref(null)
  const editingTextElement = ref(null) // 当前正在编辑的文字元素

  /**
   * 显示文字输入框
   */
  function showTextInput(e, element = null) {
    if (!canvasRef.value) return
    // 使用 getCanvasPos 获取画布坐标
    const pos = getCanvasPos(e)

    if (element) {
      // 编辑现有文字元素
      editingTextElement.value = { ...element }
      textInputValue.value = element.text
      textInputPosition.value = { x: element.x, y: element.y }
    } else {
      // 创建新文字元素
      editingTextElement.value = {
        fontSize: 14,
        fontFamily: 'Arial',
        textAlign: 'left',
        lineHeight: 1.2,
        color: color.value
      }
      textInputValue.value = ''
      textInputPosition.value = { x: pos.x, y: pos.y }
    }

    textInputVisible.value = true

    nextTick(() => {
      if (textInputRef.value) {
        textInputRef.value.focus()
        if (!element) {
          textInputRef.value.select()
        } else {
          // 编辑时，将光标移到末尾
          const length = textInputRef.value.value.length
          textInputRef.value.setSelectionRange(length, length)
        }
        // 自动调整 textarea 大小
        adjustTextareaSize()
      }
    })
  }

  /**
   * 调整 textarea 大小
   */
  function adjustTextareaSize() {
    if (!textInputRef.value) return

    const textarea = textInputRef.value
    const fontSize = editingTextElement.value?.fontSize || 14
    const lineHeight = editingTextElement.value?.lineHeight || 1.2

    // 重置高度以获取准确的 scrollHeight
    textarea.style.height = 'auto'

    // 获取实际内容高度
    const actualContentHeight = textarea.scrollHeight
    const minHeight = fontSize * lineHeight

    // 判断是否为单行
    const isSingleLine = actualContentHeight <= minHeight

    if (isSingleLine) {
      // 单行：只显示一行高度 + 上下各 4px padding
      textarea.style.height = minHeight + 8 + 'px'
      textarea.style.minHeight = minHeight + 8 + 'px'
    } else {
      // 多行：按内容高度显示
      textarea.style.height = actualContentHeight + 'px'
      textarea.style.minHeight = minHeight + 8 + 'px'
    }
  }

  /**
   * 处理文字输入
   */
  function handleTextInput() {
    // 实时更新预览
    if (editingTextElement.value && textInputRef.value) {
      adjustTextareaSize()
      // 如果正在编辑现有元素，实时更新
      if (editingTextElement.value.id) {
        const element = elements.textElements.value.find(
          (el) => el.id === editingTextElement.value.id
        )
        if (element) {
          element.text = textInputValue.value
          renderCanvas()
        }
      }
    }
  }

  /**
   * 确认文字输入
   */
  function confirmTextInput() {
    if (!textInputVisible.value) return

    const text = textInputValue.value.trim()

    if (editingTextElement.value?.id) {
      // 编辑现有元素
      const element = elements.textElements.value.find(
        (el) => el.id === editingTextElement.value.id
      )
      if (element) {
        if (text) {
          element.text = text
        } else {
          // 如果文本为空，删除元素
          const index = elements.textElements.value.indexOf(element)
          if (index > -1) {
            elements.textElements.value.splice(index, 1)
          }
        }
        renderCanvas()
        if (history.value) {
          history.value.saveState()
        }
      }
    } else if (text) {
      // 创建新元素
      drawTextOnCanvas(text, textInputPosition.value.x, textInputPosition.value.y)
    }

    textInputVisible.value = false
    textInputValue.value = ''
    editingTextElement.value = null
  }

  /**
   * 取消文字输入
   */
  function cancelTextInput() {
    // 如果正在编辑现有元素，恢复原文本
    if (editingTextElement.value?.id) {
      const element = elements.textElements.value.find(
        (el) => el.id === editingTextElement.value.id
      )
      if (element) {
        renderCanvas()
      }
    }
    textInputVisible.value = false
    textInputValue.value = ''
    editingTextElement.value = null
  }

  /**
   * 在画布上绘制文字
   */
  function drawTextOnCanvas(text, x, y) {
    if (!canvasRef.value || !history.value) return
    history.value.saveState()

    // 计算文字尺寸
    const fontSize = editingTextElement.value?.fontSize || 14
    const fontFamily = editingTextElement.value?.fontFamily || 'Arial'
    const lineHeight = editingTextElement.value?.lineHeight || 1.2
    const textAlign = editingTextElement.value?.textAlign || 'left'
    const lines = text.split('\n')
    const ctx = canvasRef.value.getContext('2d')
    ctx.font = `${fontSize}px ${fontFamily}`
    ctx.textAlign = textAlign

    // 计算文字宽度和高度
    let maxWidth = 0
    lines.forEach((line) => {
      const metrics = ctx.measureText(line)
      maxWidth = Math.max(maxWidth, metrics.width)
    })
    const textHeight = lines.length * fontSize * lineHeight

    // 保存文字元素
    elements.textElements.value.push({
      type: 'text',
      text: text,
      x: x,
      y: y,
      width: maxWidth,
      height: textHeight,
      fontSize: fontSize,
      fontFamily: fontFamily,
      textAlign: textAlign,
      lineHeight: lineHeight,
      color: editingTextElement.value?.color || color.value,
      id: Date.now().toString()
    })

    // 重新渲染画布
    renderCanvas(true)
    history.value.saveState()
  }

  /**
   * 双击文字元素进行编辑
   */
  function onDoubleClick(e) {
    // 使用 getCanvasPos 获取画布坐标
    const pos = getCanvasPos(e)

    // 查找点击的文字元素
    const clickedElement = elements.textElements.value.find((element) => {
      const right = element.x + (element.width || 0)
      const bottom = element.y + (element.height || 0)
      return pos.x >= element.x && pos.x <= right && pos.y >= element.y && pos.y <= bottom
    })

    if (clickedElement) {
      showTextInput(e, clickedElement)
    }
  }

  /**
   * 点击画布创建新文字
   */
  function onMouseDown(e) {
    // 如果已经有文字输入框在显示，先确认当前输入
    if (textInputVisible.value) {
      confirmTextInput()
    }
    // 然后创建新的文字输入框
    showTextInput(e)
  }

  return {
    textInputVisible,
    textInputValue,
    textInputPosition,
    textInputRef,
    editingTextElement,
    showTextInput,
    adjustTextareaSize,
    handleTextInput,
    confirmTextInput,
    cancelTextInput,
    onDoubleClick,
    onMouseDown
  }
}
