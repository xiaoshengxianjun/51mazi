<script setup>
import { ref } from 'vue'
import { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Document from '@tiptap/extension-document'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { Extension } from '@tiptap/core'
import { NoteOutlineParagraph } from '@renderer/extensions/NoteOutline'

const props = defineProps({
  editorStore: {
    type: Object,
    required: true
  },
  menubarState: {
    type: Object,
    required: true
  },
  isComposing: {
    type: Boolean,
    default: false
  },
  getFontFamily: {
    type: Function,
    required: true
  },
  autoSaveContent: {
    type: Function,
    required: true
  }
})

// 本地定时器，避免直接修改 prop
const saveTimer = ref(null)

const emit = defineEmits(['editor-created', 'content-updated'])

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

// 获取笔记编辑器的扩展配置
function getNoteExtensions() {
  // 笔记模式：手动配置，禁用依赖 paragraph 的扩展
  // 扩展顺序很重要：NoteOutlineParagraph 必须在 StarterKit 之前，这样 trailingNode 才能找到它
  return [
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
    TextAlign.configure({ types: ['heading', 'noteOutlineParagraph'] }),
    Highlight.configure({
      multicolor: true,
      HTMLAttributes: {
        class: 'search-highlight'
      }
    }),
    TabInsert
  ]
}

// 创建笔记编辑器实例
function createEditor() {
  const editor = new Editor({
    extensions: getNoteExtensions(),
    content: props.editorStore.content,
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        style: () => {
          let fontFamilyStyle = ''
          if (props.menubarState.fontFamily !== 'inherit') {
            const fullFontFamily = props.getFontFamily(props.menubarState.fontFamily)
            fontFamilyStyle = `font-family: ${fullFontFamily} !important;`
          }
          return `white-space: pre-wrap; ${fontFamilyStyle} font-size: ${props.menubarState.fontSize} !important; line-height: ${props.menubarState.lineHeight} !important;`
        }
      }
    },
    onUpdate: ({ editor }) => {
      // 笔记模式：保存 HTML 格式
      const content = editor.getHTML()

      // 如果正在进行输入法输入（composition），不更新字数统计
      if (!props.isComposing) {
        // 字数统计始终使用纯文本
        const textContent = htmlToPlainText(content)
        props.editorStore.setContent(textContent)
      }

      // 防抖保存
      if (saveTimer.value) clearTimeout(saveTimer.value)
      saveTimer.value = setTimeout(() => {
        props.autoSaveContent()
      }, 1000)

      emit('content-updated', content)
    },
    onSelectionUpdate: () => {
      // 按钮状态由 EditorMenubar 组件管理
    }
  })

  return editor
}

// 设置笔记编辑器内容
function setNoteContent(editor, content) {
  if (!editor || !content) return

  if (isHtmlContent(content)) {
    // 笔记模式：如果内容是 HTML，直接加载
    // 确保 HTML 内容格式正确
    let htmlContent = content
    // 如果 HTML 中没有 note-outline 段落，尝试转换
    if (!htmlContent.includes('data-note-outline')) {
      // 可能是旧的 HTML 格式，尝试转换
      htmlContent = htmlContent.replace(/<p([^>]*)>/gi, (match, attrs) => {
        if (attrs.includes('data-note-outline')) return match
        return `<p data-note-outline data-level="0"${attrs}>`
      })
    }
    editor.commands.setContent(htmlContent)
  } else {
    // 笔记模式：如果是纯文本，转换为笔记大纲格式
    const lines = (content || '').split('\n')
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
    editor.commands.setContent(htmlContent || '<p data-note-outline data-level="0"></p>')
  }
}

// 获取笔记编辑器保存内容
function getSaveContent(editor) {
  if (!editor) return ''
  return editor.getHTML()
}

// 暴露方法给父组件
defineExpose({
  createEditor,
  setNoteContent,
  getSaveContent,
  htmlToPlainText,
  isHtmlContent
})
</script>
