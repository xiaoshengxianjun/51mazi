<template>
  <div class="editor-menubar">
    <div class="toolbar-left">
      <el-select
        v-model="fontFamily"
        class="toolbar-item"
        size="small"
        style="width: 85px"
        title="字体"
      >
        <el-option label="宋体" value="SimSun" />
        <el-option label="黑体" value="SimHei" />
        <el-option label="楷体" value="KaiTi" />
        <el-option label="仿宋" value="FangSong" />
        <el-option label="思源黑体" value="SourceHanSans" />
        <el-option label="思源宋体" value="SourceHanSerif" />
        <el-option label="苹方" value="PingFang" />
      </el-select>
      <el-select
        v-if="isNoteEditor"
        :model-value="headingLevel"
        class="toolbar-item"
        size="small"
        style="width: 70px"
        title="标题"
        @change="handleHeadingChange"
      >
        <el-option label="正文" value="0" />
        <el-option label="标题 1" value="1" />
        <el-option label="标题 2" value="2" />
        <el-option label="标题 3" value="3" />
        <el-option label="标题 4" value="4" />
      </el-select>
      <el-select
        v-model="fontSize"
        class="toolbar-item"
        size="small"
        style="width: 65px"
        title="字号"
      >
        <el-option label="12px" value="12px" />
        <el-option label="13px" value="13px" />
        <el-option label="14px" value="14px" />
        <el-option label="15px" value="15px" />
        <el-option label="16px" value="16px" />
        <el-option label="18px" value="18px" />
        <el-option label="20px" value="20px" />
        <el-option label="22px" value="22px" />
        <el-option label="24px" value="24px" />
      </el-select>
      <el-select
        v-model="lineHeight"
        class="toolbar-item"
        size="small"
        style="width: 50px"
        title="行高"
      >
        <el-option label="1.4" value="1.4" />
        <el-option label="1.6" value="1.6" />
        <el-option label="1.8" value="1.8" />
        <el-option label="2" value="2" />
        <el-option label="2.2" value="2.2" />
        <el-option label="2.4" value="2.4" />
      </el-select>
      <el-button
        class="toolbar-item"
        size="small"
        :type="isBold ? 'primary' : 'default'"
        title="加粗"
        @click="handleToggleBold"
      >
        <b>B</b>
      </el-button>
      <el-button
        class="toolbar-item"
        :type="isItalic ? 'primary' : 'default'"
        size="small"
        title="倾斜"
        @click="handleToggleItalic"
      >
        <i>I</i>
      </el-button>
      <el-popover
        v-if="isNoteEditor"
        v-model:visible="highlightPopoverVisible"
        placement="bottom"
        :width="230"
        trigger="click"
        popper-style="padding: 6px;"
      >
        <template #reference>
          <el-button
            size="small"
            class="toolbar-item"
            :type="isHighlight ? 'primary' : 'default'"
            title="高亮"
          >
            <SvgIcon name="highlight" :size="12" />
          </el-button>
        </template>
        <div class="highlight-color-picker">
          <div class="highlight-colors">
            <div
              v-for="color in highlightColors"
              :key="color.value"
              class="highlight-color-item"
              :class="{ active: isHighlightColorActive(color.value) }"
              :title="color.label"
              @click="applyHighlight(color.value)"
            >
              <div
                :style="{ backgroundColor: color.value }"
                class="hightlight-color-item-main"
              ></div>
            </div>
            <div class="highlight-color-split"></div>
            <div
              :class="{ active: !isHighlight }"
              class="highlight-color-item highlight-color-none"
              title="无高亮"
            >
              <SvgIcon
                class="hightlight-color-item-main"
                :size="20"
                name="ban"
                @click="removeHighlight"
              />
            </div>
          </div>
        </div>
      </el-popover>
      <el-button
        v-if="!isNoteEditor"
        size="small"
        class="toolbar-item"
        title="一键排版"
        @click="handleFormatContent"
      >
        <el-icon><Tickets /></el-icon>
      </el-button>
      <el-button size="small" class="toolbar-item" title="复制" @click="handleCopyContent">
        <el-icon><DocumentCopy /></el-icon>
      </el-button>
      <el-button size="small" class="toolbar-item" title="搜索" @click="handleToggleSearchPanel">
        <el-icon><Search /></el-icon>
      </el-button>
    </div>
    <div class="toolbar-right">
      <el-button size="small" class="toolbar-item" title="保存" @click="handleSave">
        <SvgIcon name="save" :size="12" />
      </el-button>
      <el-button
        v-if="!isNoteEditor"
        size="small"
        class="toolbar-item"
        title="导出"
        @click="handleExport"
      >
        <SvgIcon name="export" :size="12" />
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { DocumentCopy, Search, Tickets } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { useEditorStore } from '@renderer/stores/editor'

const props = defineProps({
  editor: {
    type: Object,
    default: null
  },
  bookName: {
    type: String,
    default: ''
  },
  modelValue: {
    type: Object,
    default: () => ({
      fontFamily: 'SimHei',
      fontSize: '16px',
      lineHeight: '1.6',
      isBold: false,
      isItalic: false
    })
  }
})

const emit = defineEmits(['update:modelValue', 'toggle-search', 'save', 'export', 'update-style'])

const editorStore = useEditorStore()

// 判断是否为笔记编辑器
const isNoteEditor = computed(() => editorStore.file?.type === 'note')

// 使用 computed 来双向绑定
const fontFamily = computed({
  get: () => props.modelValue.fontFamily,
  set: (val) => {
    emit('update:modelValue', { ...props.modelValue, fontFamily: val })
    emit('update-style')
  }
})

const fontSize = computed({
  get: () => props.modelValue.fontSize,
  set: (val) => {
    emit('update:modelValue', { ...props.modelValue, fontSize: val })
    emit('update-style')
  }
})

const lineHeight = computed({
  get: () => props.modelValue.lineHeight,
  set: (val) => {
    emit('update:modelValue', { ...props.modelValue, lineHeight: val })
    emit('update-style')
  }
})

// 按钮状态：笔记编辑器根据选中文本格式，章节编辑器使用全局状态
const isBold = computed(() => {
  const isNoteEditor = editorStore.file?.type === 'note'
  if (isNoteEditor && props.editor) {
    // 笔记编辑器：根据当前选中文本的格式
    return props.editor.isActive('bold')
  }
  // 章节编辑器：使用全局状态
  return props.modelValue.isBold
})

const isItalic = computed(() => {
  const isNoteEditor = editorStore.file?.type === 'note'
  if (isNoteEditor && props.editor) {
    // 笔记编辑器：根据当前选中文本的格式
    return props.editor.isActive('italic')
  }
  // 章节编辑器：使用全局状态
  return props.modelValue.isItalic
})

// 高亮状态（仅笔记编辑器）
const isHighlight = computed(() => {
  if (!props.editor) return false
  const isNoteEditor = editorStore.file?.type === 'note'
  if (isNoteEditor) {
    // 笔记编辑器：根据当前选中文本的格式
    return props.editor.isActive('highlight')
  }
  return false
})

// 当前选中的标题级别
const headingLevel = computed(() => {
  if (!props.editor) return '0'
  // 检查当前是否在 heading 节点中
  if (props.editor.isActive('heading')) {
    const level = props.editor.getAttributes('heading').level
    return String(level || 1)
  }
  return '0' // 正文/段落
})

// 全局格式模式，与 menubarState 同步
const globalBoldMode = computed({
  get: () => props.modelValue.isBold,
  set: (val) => {
    emit('update:modelValue', { ...props.modelValue, isBold: val })
  }
})

const globalItalicMode = computed({
  get: () => props.modelValue.isItalic,
  set: (val) => {
    emit('update:modelValue', { ...props.modelValue, isItalic: val })
  }
})

// 应用格式到整个编辑器内容
function applyFormatToAll(markType, enable) {
  if (!props.editor) return

  const { from, to } = props.editor.state.selection
  const docSize = props.editor.state.doc.content.size

  try {
    // 在同一个命令链中选择所有内容并应用格式
    if (markType === 'bold') {
      if (enable) {
        props.editor.chain().focus().selectAll().setBold().run()
        globalBoldMode.value = true
      } else {
        props.editor.chain().focus().selectAll().unsetBold().run()
        globalBoldMode.value = false
      }
    } else if (markType === 'italic') {
      if (enable) {
        props.editor.chain().focus().selectAll().setItalic().run()
        globalItalicMode.value = true
      } else {
        props.editor.chain().focus().selectAll().unsetItalic().run()
        globalItalicMode.value = false
      }
    }

    // 恢复之前的选择位置
    if (docSize > 0) {
      props.editor
        .chain()
        .focus()
        .setTextSelection({ from: Math.min(from, docSize - 1), to: Math.min(to, docSize - 1) })
        .run()
    } else {
      props.editor.chain().focus().setTextSelection(0).run()
    }
  } catch (error) {
    console.error(`应用${markType}格式失败:`, error)
  }
}

// 切换格式的通用函数
function toggleFormat(markType) {
  if (!props.editor) return

  props.editor.commands.focus()

  // 判断是笔记编辑器还是章节编辑器
  const isNoteEditor = editorStore.file?.type === 'note'

  if (isNoteEditor) {
    // 笔记编辑器：只对选中文本应用格式
    if (markType === 'bold') {
      props.editor.commands.toggleBold()
    } else if (markType === 'italic') {
      props.editor.commands.toggleItalic()
    }
  } else {
    // 章节编辑器：对整个文档应用格式
    if (markType === 'bold') {
      const newState = !globalBoldMode.value
      applyFormatToAll('bold', newState)
      emit('update:modelValue', { ...props.modelValue, isBold: newState })
      // 立即保存设置
      editorStore.saveEditorSettings({
        fontFamily: fontFamily.value,
        fontSize: fontSize.value,
        lineHeight: lineHeight.value,
        globalBoldMode: newState,
        globalItalicMode: globalItalicMode.value
      })
    } else if (markType === 'italic') {
      const newState = !globalItalicMode.value
      applyFormatToAll('italic', newState)
      emit('update:modelValue', { ...props.modelValue, isItalic: newState })
      // 立即保存设置
      editorStore.saveEditorSettings({
        fontFamily: fontFamily.value,
        fontSize: fontSize.value,
        lineHeight: lineHeight.value,
        globalBoldMode: globalBoldMode.value,
        globalItalicMode: newState
      })
    }
  }
}

function handleToggleBold() {
  toggleFormat('bold')
}

function handleToggleItalic() {
  toggleFormat('italic')
}

// 高亮颜色选择器显示状态
const highlightPopoverVisible = ref(false)

// 高亮颜色选项（5个浅色、亮色）
const highlightColors = [
  { value: '#ffeb3b', label: '黄色' },
  { value: '#a8e6cf', label: '绿色' },
  { value: '#a8c8ec', label: '蓝色' },
  { value: '#ffb3ba', label: '粉色' },
  { value: '#dda0dd', label: '紫色' }
]

// 检查当前高亮是否使用指定颜色
function isHighlightColorActive(color) {
  if (!props.editor || !isHighlight.value) return false
  const attrs = props.editor.getAttributes('highlight')
  // 如果没有 color 属性，默认是黄色
  const currentColor = attrs.color || '#ffeb3b'
  return currentColor === color
}

// 应用高亮颜色
function applyHighlight(color) {
  if (!props.editor) return
  const isNoteEditor = editorStore.file?.type === 'note'
  if (isNoteEditor) {
    // 使用 setHighlight 确保应用正确的颜色
    props.editor.chain().focus().setHighlight({ color }).run()
    highlightPopoverVisible.value = false
  }
}

// 移除高亮
function removeHighlight() {
  if (!props.editor) return
  const isNoteEditor = editorStore.file?.type === 'note'
  if (isNoteEditor) {
    props.editor.chain().focus().unsetHighlight().run()
    highlightPopoverVisible.value = false
  }
}

function handleHeadingChange(level) {
  if (!props.editor) return
  const levelNum = parseInt(level, 10)

  if (levelNum === 0) {
    // 切换回段落
    if (isNoteEditor.value) {
      // 笔记编辑器：使用 noteOutlineParagraph（没有 paragraph 节点类型）
      // setNode 会自动处理当前节点类型，无需手动查找
      props.editor.chain().focus().setNode('noteOutlineParagraph', { level: 0 }).run()
    } else {
      // 章节编辑器：使用 paragraph
      props.editor.commands.setParagraph()
    }
  } else {
    // 设置为对应的标题级别
    if (isNoteEditor.value) {
      // 笔记编辑器：使用 setHeading 而不是 toggleHeading
      // toggleHeading 内部会调用 toggleNode(this.name, 'paragraph')，导致报错
      // setHeading 只是简单地调用 setNode，更安全
      props.editor.commands.setHeading({ level: levelNum })
    } else {
      // 章节编辑器：使用 toggleHeading（可以正常切换 heading 和 paragraph）
      props.editor.commands.toggleHeading({ level: levelNum })
    }
  }
}

// 一键排版功能（仅章节编辑器）
function handleFormatContent() {
  if (!props.editor) return

  try {
    // 获取当前文本内容
    const text = props.editor.getText()

    // 执行排版处理
    const formattedText = formatText(text)

    // 将排版后的文本设置回编辑器
    // 章节编辑器使用纯文本格式，需要通过 HTML 转换
    const formattedHtml = plainTextToHtml(formattedText)

    // 保存当前光标位置
    const { from } = props.editor.state.selection

    // 设置新内容
    props.editor.commands.setContent(formattedHtml)

    // 恢复光标位置（如果可能）
    const newDocSize = props.editor.state.doc.content.size
    if (newDocSize > 0) {
      const newPosition = Math.min(from, newDocSize - 1)
      props.editor.commands.setTextSelection(newPosition)
    }

    ElMessage.success('排版完成')
  } catch (error) {
    console.error('排版失败:', error)
    ElMessage.error('排版失败：' + (error.message || '未知错误'))
  }
}

// 文本排版处理函数
function formatText(text) {
  if (!text) return ''

  // 1. 按行分割
  const lines = text.split('\n')

  // 2. 处理每一行
  const processedLines = lines.map((line) => {
    // 清理行首行尾空格
    return line.trim()
  })

  // 3. 合并连续空行（最多保留一个空行）
  const mergedLines = []
  let lastWasEmpty = false

  for (const line of processedLines) {
    if (line === '') {
      // 如果是空行，且上一个不是空行，则添加
      if (!lastWasEmpty) {
        mergedLines.push('')
        lastWasEmpty = true
      }
    } else {
      mergedLines.push(line)
      lastWasEmpty = false
    }
  }

  // 4. 清理开头和结尾的空行
  while (mergedLines.length > 0 && mergedLines[0] === '') {
    mergedLines.shift()
  }
  while (mergedLines.length > 0 && mergedLines[mergedLines.length - 1] === '') {
    mergedLines.pop()
  }

  // 5. 合并为文本
  return mergedLines.join('\n')
}

// 将纯文本转换为 HTML（用于章节模式）
function plainTextToHtml(text) {
  if (!text) return ''
  // 1. 按行分割
  const lines = text.split('\n')
  // 2. 每行处理缩进和空格
  const htmlLines = lines.map((line) => {
    // 替换Tab为8个&nbsp;
    let html = line.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')
    // 替换连续空格为 &nbsp;
    html = html.replace(/ {2,}/g, (match) => '&nbsp;'.repeat(match.length))
    // 包裹为<p>
    return html ? `<p>${html}</p>` : ''
  })
  // 3. 拼接
  return htmlLines.join('')
}

function handleCopyContent() {
  if (!props.editor) return
  const html = props.editor.getHTML()
  navigator.clipboard.writeText(html)
  ElMessage.success('已复制内容')
}

function handleToggleSearchPanel() {
  emit('toggle-search')
}

function handleSave() {
  emit('save')
}

// 导出书籍全部内容
async function handleExport() {
  try {
    // 显示确认对话框
    await ElMessageBox.confirm('本操作会将正文下所有章节导出到一个文件，是否继续？', '导出确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 生成时间戳：YYMMDDHHmm（例如：2511041729 表示 2025年11月04日17点29分）
    const timestamp = dayjs().format('YYMMDDHHmm')

    // 用户确认后，显示保存文件对话框
    const saveResult = await window.electron.showSaveDialog({
      title: '导出章节',
      defaultPath: `${props.bookName}_${timestamp}.txt`,
      filters: [{ name: '文本文件', extensions: ['txt'] }],
      buttonLabel: '保存'
    })

    if (!saveResult || !saveResult.filePath) {
      // 用户取消了保存
      return
    }

    // 显示加载提示
    const loadingMessage = ElMessage({
      message: '正在导出章节，请稍候...',
      type: 'info',
      duration: 0,
      showClose: false
    })

    try {
      // 加载所有章节数据
      const chapters = await window.electron.loadChapters(props.bookName)

      if (!chapters || chapters.length === 0) {
        loadingMessage.close()
        ElMessage.warning('没有找到任何章节')
        return
      }

      // 收集所有章节内容
      const allContent = []
      let totalChapters = 0

      // 遍历所有卷和章节
      for (const volume of chapters) {
        if (volume.type === 'volume' && volume.children && volume.children.length > 0) {
          // 添加卷标题
          allContent.push(`\n${'='.repeat(50)}`)
          allContent.push(`【${volume.name}】`)
          allContent.push(`${'='.repeat(50)}\n`)

          // 遍历该卷下的所有章节
          for (const chapter of volume.children) {
            if (chapter.type === 'chapter') {
              try {
                // 读取章节内容
                const result = await window.electron.readChapter(
                  props.bookName,
                  volume.name,
                  chapter.name
                )

                if (result.success && result.content) {
                  // 添加章节标题
                  allContent.push(`\n${'-'.repeat(40)}`)
                  allContent.push(`${chapter.name}`)
                  allContent.push(`${'-'.repeat(40)}\n`)
                  // 添加章节内容
                  allContent.push(result.content)
                  allContent.push('\n')
                  totalChapters++
                }
              } catch (error) {
                console.error(`读取章节 ${chapter.name} 失败:`, error)
                // 继续处理其他章节
              }
            }
          }
        }
      }

      if (totalChapters === 0) {
        loadingMessage.close()
        ElMessage.warning('没有找到任何可导出的章节内容')
        return
      }

      // 合并所有内容
      const finalContent = allContent.join('\n')

      // 写入文件（通过 IPC 调用主进程写入）
      const writeResult = await window.electron.writeExportFile({
        filePath: saveResult.filePath,
        content: finalContent
      })

      if (!writeResult || !writeResult.success) {
        loadingMessage.close()
        ElMessage.error(writeResult?.message || '写入文件失败')
        return
      }

      loadingMessage.close()
      ElMessage.success(`导出成功！共导出 ${totalChapters} 个章节`)
      emit('export', { success: true, totalChapters })
    } catch (error) {
      loadingMessage.close()
      console.error('导出失败:', error)
      ElMessage.error('导出失败：' + (error.message || '未知错误'))
      emit('export', { success: false, error })
    }
  } catch (error) {
    // 用户取消了确认对话框
    if (error !== 'cancel') {
      console.error('导出操作失败:', error)
      ElMessage.error('导出操作失败：' + (error.message || '未知错误'))
      emit('export', { success: false, error })
    }
  }
}

// 暴露方法供父组件调用
defineExpose({
  globalBoldMode,
  globalItalicMode
})
</script>

<style lang="scss" scoped>
.editor-menubar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 15px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-soft);
  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }
}
.toolbar-item {
  margin: 0;
}

.highlight-colors {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.highlight-color-item {
  padding: 5px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;

  .hightlight-color-item-main {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid transparent;
  }

  &:hover {
    transform: scale(1.15);
    background: #e3e3e3;
    .hightlight-color-item-main {
      border-color: var(--el-color-primary);
    }
  }

  &.active {
    background: #e3e3e3;
    .hightlight-color-item-main {
      border-color: var(--el-color-primary);
    }
  }

  &.highlight-color-none {
    .hightlight-color-item-main {
      border-color: transparent;
      &:hover,
      &.active {
        border-color: transparent;
      }
    }
  }
}

.highlight-color-split {
  width: 1px;
  height: 15px;
  background: #999;
}
</style>
