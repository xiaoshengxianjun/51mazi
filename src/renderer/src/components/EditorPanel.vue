<template>
  <div class="editor-panel">
    <!-- 菜单栏 -->
    <div class="editor-toolbar">
      <el-select v-model="fontFamily" class="toolbar-item" size="small" style="width: 110px">
        <el-option label="默认" value="inherit" />
        <el-option label="宋体" value="SimSun" />
        <el-option label="黑体" value="SimHei" />
        <el-option label="楷体" value="KaiTi" />
        <el-option label="仿宋" value="FangSong" />
        <el-option label="思源黑体" value="SourceHanSans" />
        <el-option label="思源宋体" value="SourceHanSerif" />
        <el-option label="苹方" value="PingFang" />
      </el-select>
      <el-select v-model="fontSize" class="toolbar-item" size="small" style="width: 80px">
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
      <el-select v-model="lineHeight" class="toolbar-item" size="small" style="width: 60px">
        <el-option label="1.2" value="1.2" />
        <el-option label="1.3" value="1.3" />
        <el-option label="1.4" value="1.4" />
        <el-option label="1.5" value="1.5" />
        <el-option label="1.6" value="1.6" />
        <el-option label="1.8" value="1.8" />
        <el-option label="2" value="2" />
      </el-select>
      <el-button
        class="toolbar-item"
        size="small"
        :type="isBold ? 'primary' : 'default'"
        @click="toggleBold"
      >
        <b>B</b>
      </el-button>
      <el-button
        class="toolbar-item"
        size="small"
        :type="isItalic ? 'primary' : 'default'"
        @click="toggleItalic"
      >
        <i>I</i>
      </el-button>
      <el-button size="small" class="toolbar-item" @click="copyContent">
        <el-icon><DocumentCopy /></el-icon>
      </el-button>
      <el-button size="small" class="toolbar-item" @click="toggleSearchPanel">
        <el-icon><Search /></el-icon>
      </el-button>
      <!-- <el-button size="small" class="toolbar-item" @click="undo"> 撤销 </el-button> -->
      <el-button size="small" class="toolbar-item" type="primary" @click="saveContent">
        保存
      </el-button>
    </div>
    <!-- 章节标题 -->
    <div class="chapter-title">
      <el-input
        v-model="chapterTitle"
        placeholder="章节标题"
        maxlength="20"
        class="chapter-title-input"
      />
    </div>
    <!-- 正文内容编辑区 -->
    <div class="editor-content">
      <EditorContent :editor="editor" />
    </div>
    <div class="editor-stats">
      <span class="word-count">章节字数：{{ contentWordCount }}字</span>
      <span v-if="typingSpeed.perMinute > 0" class="typing-speed">
        码字速度：{{ typingSpeed.perMinute }}字/分钟 ({{ typingSpeed.perHour }}字/小时)
      </span>
    </div>

    <!-- 搜索面板 -->
    <SearchPanel :visible="searchPanelVisible" :editor="editor" @close="closeSearchPanel" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { DocumentCopy, Search } from '@element-plus/icons-vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { useEditorStore } from '@renderer/stores/editor'
import { Extension } from '@tiptap/core'
import { Collapsible } from '@renderer/extensions/Collapsible'
import SearchPanel from './SearchPanel.vue'

const editorStore = useEditorStore()

const props = defineProps({
  bookName: String
})

// 计算属性
const typingSpeed = computed(() => editorStore.typingSpeed)
const contentWordCount = computed(() => editorStore.contentWordCount)

const chapterTitle = computed({
  get: () => editorStore.chapterTitle,
  set: (val) => editorStore.setChapterTitle(val)
})

// 字体映射表：为每种字体提供完整的字体族配置（包含回退字体）
const fontFamilyMap = {
  inherit: '',
  SimSun: "'STSong', 'SimSun', 'NSimSun', '宋体', serif",
  SimHei: "'SimHei', '黑体', 'STHeiti', sans-serif",
  KaiTi: "'STKaiti', 'KaiTi', '楷体', serif",
  FangSong: "'FangSong', '仿宋', 'STFangsong', serif",
  SourceHanSans: "'Noto Sans CJK SC', 'Source Han Sans SC', '思源黑体', 'PingFang SC', sans-serif",
  SourceHanSerif: "'Noto Serif CJK SC', 'Source Han Serif SC', '思源宋体', 'SimSun', serif",
  PingFang: "'PingFang SC', '苹方', 'Hiragino Sans GB', 'STHeiti', sans-serif"
}

const fontFamily = ref('inherit')
const fontSize = ref('16px')
const lineHeight = ref('1.6')
const align = ref('left')

const editor = ref(null)
let saveTimer = null
let styleUpdateTimer = null

// 搜索面板状态
const searchPanelVisible = ref(false)

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

// 获取完整的字体族配置
function getFontFamily(fontKey) {
  return fontKey === 'inherit' || !fontKey
    ? ''
    : fontFamilyMap[fontKey] || `'${fontKey}', sans-serif`
}

// 更新编辑器样式
function updateEditorStyle() {
  if (!editor.value) return

  // TipTap的DOM结构：editor.view.dom 就是 .tiptap 元素
  const editorElement = editor.value.view.dom
  if (editorElement) {
    // 使用setProperty with 'important' 确保样式优先级最高
    if (fontFamily.value !== 'inherit') {
      // 获取完整的字体族配置（包含回退字体）
      const fullFontFamily = getFontFamily(fontFamily.value)
      editorElement.style.setProperty('font-family', fullFontFamily, 'important')
    } else {
      editorElement.style.removeProperty('font-family')
    }
    editorElement.style.setProperty('font-size', fontSize.value, 'important')
    editorElement.style.setProperty('line-height', lineHeight.value, 'important')
    editorElement.style.setProperty('text-align', align.value, 'important')
  }
}

// 监听 store 内容变化，回显到编辑器
watch(
  () => editorStore.file,
  (newFile, oldFile) => {
    if (editor.value && newFile?.path !== oldFile?.path) {
      // 文件变化时，重新设置内容并开始编辑会话
      const newContent = editorStore.content || ''
      editor.value.commands.setContent(plainTextToHtml(newContent))

      // 重新开始编辑会话
      editorStore.startEditingSession(newContent)

      // 更新样式
      updateEditorStyle()

      // 如果全局格式模式开启，应用到新内容
      nextTick(() => {
        if (!editor.value) return
        const docSize = editor.value.state.doc.content.size
        if (docSize === 0) return

        if (globalBoldMode.value || globalItalicMode.value) {
          setTimeout(() => {
            if (!editor.value) return
            const currentDocSize = editor.value.state.doc.content.size
            if (currentDocSize === 0) return

            let chain = editor.value.chain().focus().selectAll()
            if (globalBoldMode.value) {
              chain = chain.setBold()
            }
            if (globalItalicMode.value) {
              chain = chain.setItalic()
            }
            chain.run()

            // 恢复光标到末尾
            if (currentDocSize > 0) {
              editor.value.chain().focus().setTextSelection(currentDocSize).run()
            }
          }, 100)
        }
      })
    }
  }
)

// 监听内容变化，确保编辑会话正确初始化
watch(
  () => editorStore.content,
  (newContent, oldContent) => {
    // 如果编辑器已经初始化且内容发生变化
    if (editor.value && newContent !== oldContent) {
      // 如果还没有开始编辑会话，则开始
      if (!editorStore.sessionStartTime) {
        editorStore.startEditingSession(newContent)
      }
    }
  }
)

// 支持Tab键插入制表符
const TabInsert = Extension.create({
  name: 'tabInsert',
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        this.editor.commands.insertContent('\t')
        return true
      }
    }
  }
})

// 键盘快捷键处理
function handleKeydown(event) {
  // Cmd/Ctrl + F: 打开搜索面板
  if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
    event.preventDefault()
    if (!searchPanelVisible.value) {
      searchPanelVisible.value = true
    }
  }

  // Cmd/Ctrl + S: 保存内容
  if ((event.metaKey || event.ctrlKey) && event.key === 's') {
    event.preventDefault()
    saveContent()
  }
}

// 窗口关闭前保存设置
function handleWindowClose() {
  // 清除定时器
  if (saveTimer) clearTimeout(saveTimer)
  if (styleUpdateTimer) clearTimeout(styleUpdateTimer)

  // 同步保存编辑器设置（窗口关闭时无法使用 async/await）
  editorStore
    .saveEditorSettings({
      fontFamily: fontFamily.value,
      fontSize: fontSize.value,
      lineHeight: lineHeight.value,
      globalBoldMode: globalBoldMode.value,
      globalItalicMode: globalItalicMode.value
    })
    .catch((error) => {
      console.error('保存编辑器设置失败:', error)
    })

  // 保存最后的内容
  autoSaveContent().catch((error) => {
    console.error('自动保存失败:', error)
  })
}

onMounted(async () => {
  // 加载编辑器设置
  await editorStore.loadEditorSettings()

  // 应用加载的设置
  if (editorStore.editorSettings) {
    const settings = editorStore.editorSettings
    // 只在值为 undefined 或 null 时才使用默认值，避免覆盖空字符串等有效值
    fontFamily.value =
      settings.fontFamily !== undefined && settings.fontFamily !== null
        ? settings.fontFamily
        : 'inherit'
    fontSize.value =
      settings.fontSize !== undefined && settings.fontSize !== null ? settings.fontSize : '16px'
    lineHeight.value =
      settings.lineHeight !== undefined && settings.lineHeight !== null
        ? settings.lineHeight
        : '1.6'

    // 加载加粗和倾斜状态
    if (settings.globalBoldMode !== undefined) {
      globalBoldMode.value = settings.globalBoldMode
      isBold.value = globalBoldMode.value
    }
    if (settings.globalItalicMode !== undefined) {
      globalItalicMode.value = settings.globalItalicMode
      isItalic.value = globalItalicMode.value
    }
  }

  editor.value = new Editor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'search-highlight'
        }
      }),
      TabInsert,
      Collapsible
    ],
    content: editorStore.content,
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        style: () => {
          let fontFamilyStyle = ''
          if (fontFamily.value !== 'inherit') {
            const fullFontFamily = getFontFamily(fontFamily.value)
            fontFamilyStyle = `font-family: ${fullFontFamily} !important;`
          }
          return `white-space: pre-wrap; ${fontFamilyStyle} font-size: ${fontSize.value} !important; line-height: ${lineHeight.value} !important; text-align: ${align.value} !important;`
        }
      }
    },
    onUpdate: ({ editor }) => {
      const content = editor.getText()
      editorStore.setContent(content)
      // 防抖保存
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(() => {
        autoSaveContent()
      }, 1000)
    },
    onSelectionUpdate: () => {
      // 更新按钮状态为全局模式状态
      isBold.value = globalBoldMode.value
      isItalic.value = globalItalicMode.value
    }
  })

  // 设置初始内容
  const initialContent = editorStore.content || ''
  editor.value.commands.setContent(plainTextToHtml(initialContent))

  // 等待DOM渲染完成后应用样式
  await nextTick()
  updateEditorStyle()

  // 如果加载了加粗或倾斜状态，应用到所有内容
  if (globalBoldMode.value || globalItalicMode.value) {
    if (initialContent) {
      // 等待编辑器完全初始化后再应用格式
      await nextTick()

      // 给编辑器更多时间来渲染内容
      setTimeout(() => {
        if (!editor.value) return

        // 确保有内容再应用格式
        const docSize = editor.value.state.doc.content.size
        if (docSize === 0) return

        // 保存当前选择位置
        const currentFrom = editor.value.state.selection.from
        const currentTo = editor.value.state.selection.to

        // 在同一个命令链中选择所有内容并应用格式
        let chain = editor.value.chain().focus().selectAll()

        if (globalBoldMode.value) {
          chain = chain.setBold()
        }
        if (globalItalicMode.value) {
          chain = chain.setItalic()
        }

        chain.run()

        // 恢复之前的选择位置（如果有的话）
        if (docSize > 0) {
          const newFrom = Math.min(currentFrom, docSize - 1)
          const newTo = Math.min(currentTo, docSize - 1)
          editor.value.chain().focus().setTextSelection({ from: newFrom, to: newTo }).run()
        }
      }, 100)
    }
  }

  // 如果有初始内容，则开始编辑会话
  if (initialContent) {
    editorStore.startEditingSession(initialContent)
  }

  // 添加键盘事件监听器
  document.addEventListener('keydown', handleKeydown)

  // 监听窗口关闭事件，确保设置被保存
  window.addEventListener('beforeunload', handleWindowClose)
})

onBeforeUnmount(async () => {
  // 移除窗口关闭监听器
  window.removeEventListener('beforeunload', handleWindowClose)

  if (saveTimer) clearTimeout(saveTimer)
  if (styleUpdateTimer) clearTimeout(styleUpdateTimer)

  // 保存编辑器设置
  await editorStore.saveEditorSettings({
    fontFamily: fontFamily.value,
    fontSize: fontSize.value,
    lineHeight: lineHeight.value,
    globalBoldMode: globalBoldMode.value,
    globalItalicMode: globalItalicMode.value
  })

  // 保存最后的内容
  await autoSaveContent()

  // 重置编辑会话
  editorStore.resetEditingSession()

  // 移除键盘事件监听器
  document.removeEventListener('keydown', handleKeydown)

  // 销毁编辑器
  editor.value && editor.value.destroy()
})

// 保存内容的通用函数
async function saveFile(showMessage = false) {
  const file = editorStore.file
  if (!file) {
    if (showMessage) ElMessage.warning('未选择章节或笔记')
    return false
  }

  const saveParams = {
    bookName: props.bookName,
    newName: editorStore.chapterTitle,
    content: editorStore.content
  }

  let result
  if (file.type === 'note') {
    result = await window.electron.editNote({
      ...saveParams,
      notebookName: file.notebook,
      noteName: file.name
    })
    if (showMessage && result.success) emit('refresh-notes')
  } else if (file.type === 'chapter') {
    result = await window.electron.saveChapter({
      ...saveParams,
      volumeName: file.volume,
      chapterName: file.name
    })
    if (showMessage && result.success) emit('refresh-chapters')
  }

  if (result?.success) {
    if (result.name && result.name !== file.name) {
      editorStore.setFile({ ...file, name: result.name })
    }
    if (showMessage) ElMessage.success('保存成功')
    return true
  } else {
    if (showMessage) ElMessage.error(result?.message || '保存失败')
    else ElMessage.error(result?.message || '自动保存失败')
    return false
  }
}

// 手动保存内容
async function saveContent() {
  await saveFile(true)
}

// 搜索面板控制
function toggleSearchPanel() {
  searchPanelVisible.value = !searchPanelVisible.value
}

function closeSearchPanel() {
  searchPanelVisible.value = false
}

// 自动保存内容
async function autoSaveContent() {
  await saveFile(false)
}

// 菜单栏操作
const isBold = ref(false)
const isItalic = ref(false)
const globalBoldMode = ref(false) // 全局加粗模式
const globalItalicMode = ref(false) // 全局倾斜模式

// 应用格式到整个编辑器内容
function applyFormatToAll(markType, enable) {
  if (!editor.value) return

  const { from, to } = editor.value.state.selection
  const docSize = editor.value.state.doc.content.size

  try {
    // 在同一个命令链中选择所有内容并应用格式
    if (markType === 'bold') {
      if (enable) {
        editor.value.chain().focus().selectAll().setBold().run()
        globalBoldMode.value = true
      } else {
        editor.value.chain().focus().selectAll().unsetBold().run()
        globalBoldMode.value = false
      }
    } else if (markType === 'italic') {
      if (enable) {
        editor.value.chain().focus().selectAll().setItalic().run()
        globalItalicMode.value = true
      } else {
        editor.value.chain().focus().selectAll().unsetItalic().run()
        globalItalicMode.value = false
      }
    }

    // 恢复之前的选择位置
    if (docSize > 0) {
      editor.value
        .chain()
        .focus()
        .setTextSelection({ from: Math.min(from, docSize - 1), to: Math.min(to, docSize - 1) })
        .run()
    } else {
      editor.value.chain().focus().setTextSelection(0).run()
    }
  } catch (error) {
    console.error(`应用${markType}格式失败:`, error)
  }
}

// 切换格式的通用函数
function toggleFormat(markType) {
  if (!editor.value) return

  editor.value.commands.focus()

  if (markType === 'bold') {
    const newState = !globalBoldMode.value
    applyFormatToAll('bold', newState)
    isBold.value = newState
    // 立即保存设置（包含所有设置，确保不丢失）
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
    isItalic.value = newState
    // 立即保存设置（包含所有设置，确保不丢失）
    editorStore.saveEditorSettings({
      fontFamily: fontFamily.value,
      fontSize: fontSize.value,
      lineHeight: lineHeight.value,
      globalBoldMode: globalBoldMode.value,
      globalItalicMode: newState
    })
  }
}

function toggleBold() {
  toggleFormat('bold')
}

function toggleItalic() {
  toggleFormat('italic')
}

function copyContent() {
  const html = editor.value.getHTML()
  navigator.clipboard.writeText(html)
  ElMessage.success('已复制内容')
}

const emit = defineEmits(['refresh-notes', 'refresh-chapters'])

// 监听字体、字号、行高变化，动态应用样式
watch([fontFamily, fontSize, lineHeight, align], () => {
  if (editor.value) {
    // 直接更新DOM样式，使用!important确保优先级
    updateEditorStyle()

    // 保存设置（防抖）- 保存简化的字体key，而不是完整的字体族
    if (styleUpdateTimer) clearTimeout(styleUpdateTimer)
    styleUpdateTimer = setTimeout(() => {
      editorStore.saveEditorSettings({
        fontFamily: fontFamily.value, // 保存简化的key，如 'KaiTi'
        fontSize: fontSize.value,
        lineHeight: lineHeight.value,
        globalBoldMode: globalBoldMode.value,
        globalItalicMode: globalItalicMode.value
      })
    }, 500)
  }
})

// 监听当前文件类型，动态设置首行缩进
watch(
  () => editorStore.file,
  (file) => {
    if (editor.value) {
      const isChapter = file?.type === 'chapter'
      const style = document.querySelector('.tiptap')
      if (style) {
        style.style.textIndent = isChapter ? '2em' : '0'
      }
    }
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.editor-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
  color: var(--text-base);
  min-height: 0;
  overflow: hidden;
}
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 15px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-soft);
}
.toolbar-item {
  margin: 0;
}
.chapter-title {
  padding: 8px 15px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-soft);
}
.chapter-title-input {
  font-size: 20px;
  font-weight: bold;
}
.editor-content {
  flex: 1;
  min-height: 0;
  padding: 16px;
  overflow-y: auto;
  background: var(--bg-primary);
  white-space: pre-wrap; // 保证Tab缩进和换行显示
  font-family: inherit, monospace;
  > div {
    height: 100%;
  }
}
.editor-stats {
  height: auto;
  min-height: 28px;
  width: 100%;
  line-height: 28px;
  padding: 8px 15px;
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-mute);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  color: var(--text-base);
  flex-wrap: wrap;

  .word-count {
    font-weight: bold;
    color: var(--primary-color);
  }

  .typing-speed {
    color: var(--warning-color);
  }
}
::v-deep(.tiptap) {
  height: 100%;
  white-space: pre-wrap; // 保证Tab缩进和换行显示
  // 字体、字号、行高通过动态样式设置，不在这里固定设置

  &:focus {
    outline: none;
  }

  // 加粗样式 - 确保在所有情况下都生效
  strong,
  b,
  [data-type='bold'] {
    font-weight: 700;
    font-style: normal;
  }

  // 倾斜样式 - 确保在所有情况下都生效
  em,
  i,
  [data-type='italic'] {
    font-style: italic;
    font-weight: inherit;
  }

  // 同时加粗和倾斜
  strong em,
  strong i,
  b em,
  b i,
  em strong,
  i strong,
  em b,
  i b {
    font-weight: 700;
    font-style: italic;
  }

  // 搜索高亮样式 - 使用选择高亮
  ::selection {
    background-color: #409eff;
    color: white;
  }

  // 搜索匹配文本的高亮样式
  .search-highlight {
    background-color: #ffeb3b !important;
    color: #000 !important;
    padding: 1px 2px;
    border-radius: 2px;
    border: 1px solid #f4d03f;
  }

  .search-highlight-current {
    background-color: #409eff !important;
    color: white !important;
    padding: 1px 2px;
    border-radius: 2px;
    box-shadow: 0 0 4px rgba(64, 158, 255, 0.5);
  }

  // Tiptap highlight扩展的样式
  mark[data-color] {
    padding: 1px 2px;
    border-radius: 2px;
  }
}
</style>
