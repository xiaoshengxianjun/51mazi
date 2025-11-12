<template>
  <div class="editor-panel">
    <!-- 菜单栏 -->
    <EditorMenubar
      v-model="menubarState"
      :editor="editor"
      :book-name="bookName"
      @toggle-search="toggleSearchPanel"
      @save="saveContent"
      @export="handleExport"
      @update-style="handleStyleUpdate"
    />
    <!-- 章节标题 -->
    <div class="chapter-title">
      <el-input
        v-model="chapterTitle"
        placeholder="章节标题"
        maxlength="20"
        class="chapter-title-input"
        @blur="handleTitleBlur"
      />
    </div>
    <!-- 正文内容编辑区 -->
    <EditorContent class="editor-content" :editor="editor" />
    <!-- <div class="editor-content"></div> -->
    <!-- 码字进度 -->
    <EditorProgress
      v-if="editorStore.file?.type === 'chapter'"
      :current-words="contentWordCount"
      :target-words="editorStore.chapterTargetWords"
      :book-name="bookName"
    />
    <!-- 编辑器统计 -->
    <EditorStats
      ref="editorStatsRef"
      :book-name="bookName"
      :content-word-count="contentWordCount"
      :file-type="editorStore.file?.type"
    />

    <!-- 搜索面板 -->
    <SearchPanel :visible="searchPanelVisible" :editor="editor" @close="closeSearchPanel" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Document from '@tiptap/extension-document'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { useEditorStore } from '@renderer/stores/editor'
import { Extension } from '@tiptap/core'
import { Collapsible } from '@renderer/extensions/Collapsible'
import { NoteOutlineParagraph } from '@renderer/extensions/NoteOutline'
import SearchPanel from './SearchPanel.vue'
import EditorMenubar from './EditorMenubar.vue'
import EditorStats from './EditorStats.vue'
import EditorProgress from './EditorProgress.vue'

const editorStore = useEditorStore()

const props = defineProps({
  bookName: String
})

watch(
  () => props.bookName,
  (name) => {
    if (name) {
      editorStore.currentBookName = name
    }
  },
  { immediate: true }
)

// 计算属性
const contentWordCount = computed(() => editorStore.contentWordCount)

// EditorStats 组件引用
const editorStatsRef = ref(null)

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

// 菜单栏状态
const menubarState = ref({
  fontFamily: 'inherit',
  fontSize: '16px',
  lineHeight: '1.6',
  isBold: false,
  isItalic: false
})

const align = ref('left')

const editor = ref(null)
let saveTimer = null
let styleUpdateTimer = null
let isComposing = false // 是否正在进行输入法输入（composition）
let compositionStartHandler = null
let compositionEndHandler = null
let isTitleSaving = false

async function handleTitleBlur() {
  const fileType = editorStore.file?.type
  if (!fileType || (fileType !== 'chapter' && fileType !== 'note')) return
  if (isTitleSaving) return
  try {
    isTitleSaving = true
    await saveFile(false)
  } finally {
    isTitleSaving = false
  }
}

// 搜索面板状态
const searchPanelVisible = ref(false)

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

// 将笔记的 HTML 内容转换为纯文本（用于字数统计）
function htmlToPlainText(html) {
  if (!html) return ''
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

// 检查内容是否是 HTML 格式
function isHtmlContent(content) {
  if (!content) return false
  return /<[a-z][\s\S]*>/i.test(content)
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
    if (menubarState.value.fontFamily !== 'inherit') {
      // 获取完整的字体族配置（包含回退字体）
      const fullFontFamily = getFontFamily(menubarState.value.fontFamily)
      editorElement.style.setProperty('font-family', fullFontFamily, 'important')
    } else {
      editorElement.style.removeProperty('font-family')
    }
    editorElement.style.setProperty('font-size', menubarState.value.fontSize, 'important')
    editorElement.style.setProperty('line-height', menubarState.value.lineHeight, 'important')
    editorElement.style.setProperty('text-align', align.value, 'important')
  }
}

// 处理样式更新
function handleStyleUpdate() {
  updateEditorStyle()
  // 防抖保存设置
  if (styleUpdateTimer) clearTimeout(styleUpdateTimer)
  styleUpdateTimer = setTimeout(() => {
    editorStore.saveEditorSettings({
      fontFamily: menubarState.value.fontFamily,
      fontSize: menubarState.value.fontSize,
      lineHeight: menubarState.value.lineHeight,
      globalBoldMode: menubarState.value.isBold,
      globalItalicMode: menubarState.value.isItalic
    })
  }, 500)
}

// 处理导出事件
function handleExport() {
  // 导出功能已在 EditorMenubar 组件中实现，这里只需要处理事件
}

// 监听 store 内容变化，回显到编辑器
watch(
  () => editorStore.file,
  async (newFile, oldFile) => {
    // 如果编辑器不存在且新文件存在，初始化编辑器
    if (!editor.value && newFile) {
      try {
        await initEditor()
        await nextTick()
        setupCompositionHandlers()
        // 初始化后，initEditor 已经设置了内容，这里不需要再次设置
        return
      } catch (error) {
        console.error('初始化编辑器失败:', error)
        return
      }
    }

    if (!newFile) return

    // 如果文件类型发生变化，需要重新初始化编辑器
    const fileTypeChanged = newFile?.type !== oldFile?.type

    if (fileTypeChanged && editor.value) {
      try {
        // 销毁旧编辑器
        editor.value.destroy()
        editor.value = null
        // 等待一下确保完全销毁
        await nextTick()
        // 重新初始化编辑器（initEditor 内部会设置内容）
        await initEditor()
        // 等待编辑器完全初始化
        await nextTick()
        setupCompositionHandlers()
        // 重新初始化后，initEditor 已经设置了内容，这里不需要再次设置
        return
      } catch (error) {
        console.error('重新初始化编辑器失败:', error)
        // 出错时尝试恢复编辑器
        if (oldFile) {
          try {
            await initEditor()
          } catch (retryError) {
            console.error('恢复编辑器失败:', retryError)
          }
        }
        return
      }
    }

    // 只有在文件路径变化且编辑器已存在时才设置内容
    if (editor.value && newFile?.path !== oldFile?.path) {
      // 文件变化时，先开始编辑会话（设置初始化标志），再设置内容
      const newContent = editorStore.content || ''
      const isNote = newFile?.type === 'note'

      // 先开始编辑会话，设置 isInitializing = true，避免加载已有内容时被计入码字速度
      editorStore.startEditingSession(newContent)

      // 根据文件类型决定如何加载内容
      if (isNote && isHtmlContent(newContent)) {
        // 笔记模式：如果内容是 HTML，直接加载
        // 确保 HTML 内容格式正确
        let htmlContent = newContent
        // 如果 HTML 中没有 note-outline 段落，尝试转换
        if (!htmlContent.includes('data-note-outline')) {
          // 可能是旧的 HTML 格式，尝试转换
          htmlContent = htmlContent.replace(/<p([^>]*)>/gi, (match, attrs) => {
            if (attrs.includes('data-note-outline')) return match
            return `<p data-note-outline data-level="0"${attrs}>`
          })
        }
        editor.value.commands.setContent(htmlContent)
      } else if (isNote) {
        // 笔记模式：如果是纯文本，转换为笔记大纲格式
        const lines = (newContent || '').split('\n')
        const htmlContent = lines
          .map((line) => {
            const trimmed = line.trim()
            if (!trimmed) return '<p data-note-outline data-level="0"></p>'
            // 检测缩进级别（Tab 或空格）
            const indentMatch = line.match(/^(\t| {2,})*/)
            const level = indentMatch
              ? Math.floor(indentMatch[0].replace(/\t/g, '  ').length / 2)
              : 0
            return `<p data-note-outline data-level="${Math.min(level, 10)}">${trimmed}</p>`
          })
          .join('')
        editor.value.commands.setContent(htmlContent || '<p data-note-outline data-level="0"></p>')
      } else {
        // 章节模式：使用纯文本转 HTML
        editor.value.commands.setContent(plainTextToHtml(newContent))
      }

      // 书籍总字数由 EditorStats 组件通过 watch fileType 自动加载

      // 更新样式
      updateEditorStyle()

      // 如果全局格式模式开启，应用到新内容
      nextTick(() => {
        if (!editor.value) return
        const docSize = editor.value.state.doc.content.size
        if (docSize === 0) return

        if (menubarState.value.isBold || menubarState.value.isItalic) {
          setTimeout(() => {
            if (!editor.value) return
            const currentDocSize = editor.value.state.doc.content.size
            if (currentDocSize === 0) return

            let chain = editor.value.chain().focus().selectAll()
            if (menubarState.value.isBold) {
              chain = chain.setBold()
            }
            if (menubarState.value.isItalic) {
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
      fontFamily: menubarState.value.fontFamily,
      fontSize: menubarState.value.fontSize,
      lineHeight: menubarState.value.lineHeight,
      globalBoldMode: menubarState.value.isBold,
      globalItalicMode: menubarState.value.isItalic
    })
    .catch((error) => {
      console.error('保存编辑器设置失败:', error)
    })

  // 保存最后的内容
  autoSaveContent().catch((error) => {
    console.error('自动保存失败:', error)
  })
}

// 初始化编辑器的函数
async function initEditor() {
  if (editor.value) {
    // 如果编辑器已存在，先销毁
    editor.value.destroy()
    editor.value = null
  }

  // 加载编辑器设置
  await editorStore.loadEditorSettings()

  // 应用加载的设置
  if (editorStore.editorSettings) {
    const settings = editorStore.editorSettings
    // 只在值为 undefined 或 null 时才使用默认值，避免覆盖空字符串等有效值
    menubarState.value = {
      fontFamily:
        settings.fontFamily !== undefined && settings.fontFamily !== null
          ? settings.fontFamily
          : 'inherit',
      fontSize:
        settings.fontSize !== undefined && settings.fontSize !== null ? settings.fontSize : '16px',
      lineHeight:
        settings.lineHeight !== undefined && settings.lineHeight !== null
          ? settings.lineHeight
          : '1.6',
      isBold: settings.globalBoldMode !== undefined ? settings.globalBoldMode : false,
      isItalic: settings.globalItalicMode !== undefined ? settings.globalItalicMode : false
    }
  }

  // 根据文件类型决定使用的扩展
  const isNoteMode = editorStore.file?.type === 'note'

  // 基础扩展
  let baseExtensions = []

  if (isNoteMode) {
    // 笔记模式：手动配置，禁用依赖 paragraph 的扩展
    // 扩展顺序很重要：NoteOutlineParagraph 必须在 StarterKit 之前，这样 trailingNode 才能找到它
    baseExtensions = [
      Document.configure({
        content: 'noteOutlineParagraph block*' // 使用 noteOutlineParagraph 替代 paragraph
      }),
      NoteOutlineParagraph, // 必须在 StarterKit 之前定义，这样 trailingNode 才能找到它
      StarterKit.configure({
        paragraph: false, // 禁用 paragraph
        document: false, // 禁用默认的 Document，使用上面自定义的
        heading: true,
        blockquote: false, // 禁用 blockquote（依赖 paragraph）
        codeBlock: true,
        horizontalRule: true,
        hardBreak: true,
        dropcursor: true,
        gapcursor: true,
        history: true,
        bulletList: false, // 禁用 bulletList（listItem 依赖 paragraph）
        orderedList: false, // 禁用 orderedList（listItem 依赖 paragraph）
        listItem: false, // 禁用 listItem（content 是 'paragraph block*'）
        listKeymap: false, // 禁用 listKeymap
        trailingNode: {
          node: 'noteOutlineParagraph', // 使用 noteOutlineParagraph 替代 paragraph
          notAfter: ['noteOutlineParagraph'] // 在 noteOutlineParagraph 后不插入
        }
      }),
      TextAlign.configure({ types: ['heading', 'noteOutlineParagraph'] })
    ]
  } else {
    // 章节模式：使用完整的 StarterKit
    baseExtensions = [StarterKit, TextAlign.configure({ types: ['heading', 'paragraph'] })]
  }

  baseExtensions.push(
    Highlight.configure({
      multicolor: true,
      HTMLAttributes: {
        class: 'search-highlight'
      }
    }),
    TabInsert
  )

  // Collapsible 扩展只在章节模式下使用（因为它依赖 paragraph）
  if (!isNoteMode) {
    baseExtensions.push(Collapsible)
  }

  editor.value = new Editor({
    extensions: baseExtensions,
    content: editorStore.content,
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        style: () => {
          let fontFamilyStyle = ''
          if (menubarState.value.fontFamily !== 'inherit') {
            const fullFontFamily = getFontFamily(menubarState.value.fontFamily)
            fontFamilyStyle = `font-family: ${fullFontFamily} !important;`
          }
          return `white-space: pre-wrap; ${fontFamilyStyle} font-size: ${menubarState.value.fontSize} !important; line-height: ${menubarState.value.lineHeight} !important; text-align: ${align.value} !important;`
        }
      }
    },
    onUpdate: ({ editor }) => {
      // 根据文件类型决定保存格式
      const isNote = editorStore.file?.type === 'note'
      const content = isNote ? editor.getHTML() : editor.getText()

      // 如果正在进行输入法输入（composition），不更新字数统计
      // 等待compositionend事件后再更新
      if (!isComposing) {
        // 字数统计始终使用纯文本
        const textContent = isNote ? htmlToPlainText(content) : content
        editorStore.setContent(textContent)
      }

      // 防抖保存（无论是否在composition状态都保存内容）
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(() => {
        autoSaveContent()
      }, 1000)
    },
    onSelectionUpdate: () => {
      // 按钮状态由 EditorMenubar 组件管理
    }
  })

  // 设置初始内容
  const initialContent = editorStore.content || ''

  // 如果有初始内容，先开始编辑会话（设置初始化标志），再设置内容
  if (initialContent) {
    editorStore.startEditingSession(initialContent)
  }

  if (editorStore.file?.name) {
    editorStore.setChapterTitle(editorStore.file.name)
  }

  // 根据文件类型决定如何加载内容
  const isNote = editorStore.file?.type === 'note'
  if (isNote && isHtmlContent(initialContent)) {
    // 笔记模式：如果内容是 HTML，直接加载
    // 确保 HTML 内容格式正确
    let htmlContent = initialContent
    // 如果 HTML 中没有 note-outline 段落，尝试转换
    if (!htmlContent.includes('data-note-outline')) {
      // 可能是旧的 HTML 格式，尝试转换
      htmlContent = htmlContent.replace(/<p([^>]*)>/gi, (match, attrs) => {
        if (attrs.includes('data-note-outline')) return match
        return `<p data-note-outline data-level="0"${attrs}>`
      })
    }
    editor.value.commands.setContent(htmlContent)
  } else if (isNote) {
    // 笔记模式：如果是纯文本，转换为笔记大纲格式
    const lines = (initialContent || '').split('\n')
    const htmlContent = lines
      .map((line) => {
        const trimmed = line.trim()
        if (!trimmed) return '<p data-note-outline data-level="0"></p>'
        // 检测缩进级别（Tab 或空格）
        const indentMatch = line.match(/^(\t| {2,})*/)
        const level = indentMatch ? Math.floor(indentMatch[0].replace(/\t/g, '  ').length / 2) : 0
        return `<p data-note-outline data-level="${Math.min(level, 10)}">${trimmed}</p>`
      })
      .join('')
    editor.value.commands.setContent(htmlContent || '<p data-note-outline data-level="0"></p>')
  } else {
    // 章节模式：使用纯文本转 HTML
    editor.value.commands.setContent(plainTextToHtml(initialContent))
  }

  // 等待DOM渲染完成后应用样式
  await nextTick()
  updateEditorStyle()

  // 如果加载了加粗或倾斜状态，应用到所有内容
  if (menubarState.value.isBold || menubarState.value.isItalic) {
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

        if (menubarState.value.isBold) {
          chain = chain.setBold()
        }
        if (menubarState.value.isItalic) {
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

  // 注意：startEditingSession 已经在上面调用过了，这里不需要重复调用

  // 设置输入法事件监听器
  setupCompositionHandlers()
}

// 设置输入法事件监听器的函数
function setupCompositionHandlers() {
  if (!editor.value || !editor.value.view || !editor.value.view.dom) return

  const editorElement = editor.value.view.dom

  // 先移除旧的监听器（如果存在）
  if (compositionStartHandler) {
    editorElement.removeEventListener('compositionstart', compositionStartHandler)
  }
  if (compositionEndHandler) {
    editorElement.removeEventListener('compositionend', compositionEndHandler)
  }

  // compositionstart: 开始输入法输入
  compositionStartHandler = () => {
    isComposing = true
  }
  editorElement.addEventListener('compositionstart', compositionStartHandler)

  // compositionend: 输入法确认（回车或选择）
  compositionEndHandler = () => {
    isComposing = false
    // 输入法确认后，立即更新字数统计
    if (editor.value) {
      const content = editor.value.getText()
      editorStore.setContent(content)
    }
  }
  editorElement.addEventListener('compositionend', compositionEndHandler)
}

onMounted(async () => {
  // 书籍总字数由 EditorStats 组件通过 watch fileType 自动加载

  editorStore.registerExternalSaveHandler(saveFile)

  // 延迟初始化编辑器，等待文件加载完成
  // 如果 file 已经存在，立即初始化；否则等待 file 变化后再初始化
  if (editorStore.file) {
    await initEditor()
    await nextTick()
    setupCompositionHandlers()
  }
  // 如果 file 不存在，watch 会在文件加载后触发初始化

  // 添加键盘事件监听器
  document.addEventListener('keydown', handleKeydown)

  // 监听窗口关闭事件，确保设置被保存
  window.addEventListener('beforeunload', handleWindowClose)
})

onBeforeUnmount(async () => {
  editorStore.registerExternalSaveHandler(null)
  // 移除窗口关闭监听器
  window.removeEventListener('beforeunload', handleWindowClose)

  // 移除输入法事件监听器
  if (editor.value && editor.value.view && editor.value.view.dom) {
    const editorElement = editor.value.view.dom
    if (compositionStartHandler) {
      editorElement.removeEventListener('compositionstart', compositionStartHandler)
    }
    if (compositionEndHandler) {
      editorElement.removeEventListener('compositionend', compositionEndHandler)
    }
  }

  if (saveTimer) clearTimeout(saveTimer)
  if (styleUpdateTimer) clearTimeout(styleUpdateTimer)

  // 保存编辑器设置
  await editorStore.saveEditorSettings({
    fontFamily: menubarState.value.fontFamily,
    fontSize: menubarState.value.fontSize,
    lineHeight: menubarState.value.lineHeight,
    globalBoldMode: menubarState.value.isBold,
    globalItalicMode: menubarState.value.isItalic
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

  // 根据文件类型决定保存格式
  const isNote = file.type === 'note'
  let contentToSave = editorStore.content

  if (editor.value) {
    if (isNote) {
      // 笔记模式：保存 HTML 格式
      contentToSave = editor.value.getHTML()
      // 同时更新 store 中的纯文本内容用于字数统计
      const textContent = htmlToPlainText(contentToSave)
      editorStore.setContent(textContent)
    } else {
      // 章节模式：保存纯文本格式
      contentToSave = editor.value.getText()
      editorStore.setContent(contentToSave)
    }
  }

  const saveParams = {
    bookName: props.bookName,
    newName: editorStore.chapterTitle,
    content: contentToSave
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
    if (showMessage && result.success) {
      emit('refresh-chapters')
      // 保存成功后，重新加载书籍总字数（确保与服务器同步）
      if (editorStatsRef.value) {
        await editorStatsRef.value.loadBookTotalWords(true)
      }
    }
  }

  if (result?.success) {
    if (result.name && result.name !== file.name) {
      editorStore.setFile({ ...file, name: result.name })
      if (file.type === 'note') {
        emit('refresh-notes')
      } else if (file.type === 'chapter') {
        emit('refresh-chapters')
      }
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

const emit = defineEmits(['refresh-notes', 'refresh-chapters'])

// 监听对齐方式变化
watch([align], () => {
  if (editor.value) {
    updateEditorStyle()
  }
})

// 监听当前文件类型，动态设置首行缩进和编辑器模式
watch(
  () => editorStore.file,
  async (file) => {
    if (editor.value) {
      const isChapter = file?.type === 'chapter'
      const style = document.querySelector('.tiptap')
      if (style) {
        style.style.textIndent = isChapter ? '2em' : '0'
      }

      // 如果切换到笔记模式，需要重新初始化编辑器以加载 NoteOutlineParagraph 扩展
      // 但这里我们已经在 onMounted 中根据文件类型加载了扩展
      // 所以只需要确保内容正确加载即可
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
}

::v-deep(.tiptap) {
  height: max-content;
  min-height: 100%;
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

  // 笔记大纲样式
  p[data-note-outline] {
    position: relative;
    margin: 6px 0;
    // 缩进通过 renderHTML 中的 style 属性控制（padding-left: level * 24px）
    // 但需要为控制按钮留出空间
    min-height: 24px;
    line-height: 1.6;
    display: block;
    width: 100%;

    &:hover {
      .note-outline-controls {
        opacity: 1 !important;
        pointer-events: auto !important;
      }
    }
  }

  // 控制按钮容器（使用全局样式，因为是通过装饰器添加的）
  :global(.note-outline-controls) {
    position: absolute;
    left: -50px;
    top: 50%;
    transform: translateY(-50%);
    height: 20px;
    display: flex;
    align-items: center;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
    z-index: 10;

    .note-outline-toggle {
      width: 16px;
      height: 16px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 10px;
      color: var(--text-base, #333);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border-radius: 2px;
      transition: background-color 0.2s;
      flex-shrink: 0;

      &:hover {
        background-color: var(--bg-mute, rgba(0, 0, 0, 0.05));
      }
    }

    .note-outline-spacer {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .note-outline-drag-handle {
      width: 12px;
      height: 12px;
      cursor: grab !important;
      font-size: 10px;
      color: var(--text-mute, #999);
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      user-select: none;
      flex-shrink: 0;
      pointer-events: auto !important;

      &:hover {
        cursor: grab !important;
        color: var(--text-base, #333);
      }

      &:active {
        cursor: grabbing !important;
      }
    }
  }

  // 当段落悬停时显示控制按钮
  p[data-note-outline]:hover ~ :global(.note-outline-controls),
  p[data-note-outline]:hover :global(.note-outline-controls) {
    opacity: 1 !important;
    pointer-events: auto !important;
  }

  // 确保段落悬停时，控制按钮可以交互
  p[data-note-outline]:hover {
    :global(.note-outline-controls) {
      opacity: 1 !important;
      pointer-events: auto !important;

      .note-outline-drag-handle {
        pointer-events: auto !important;
        cursor: grab !important;
      }
    }
  }
}
</style>
