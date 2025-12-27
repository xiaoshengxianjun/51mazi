<script setup>
import { ref } from 'vue'
import { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { Extension } from '@tiptap/core'
import { Collapsible } from '@renderer/extensions/Collapsible'

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

// 获取章节编辑器的扩展配置
function getChapterExtensions() {
  return [
    StarterKit,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Highlight.configure({
      multicolor: true,
      HTMLAttributes: {
        class: 'search-highlight'
      }
    }),
    TabInsert,
    Collapsible // Collapsible 扩展只在章节模式下使用
  ]
}

// 创建章节编辑器实例
function createEditor() {
  const editor = new Editor({
    extensions: getChapterExtensions(),
    // 不在创建时设置内容，由 initEditor 统一控制内容设置时机，避免重复设置
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        style: () => {
          const fullFontFamily = props.getFontFamily(props.menubarState.fontFamily)
          const fontFamilyStyle = `font-family: ${fullFontFamily} !important;`
          return `white-space: pre-wrap; ${fontFamilyStyle} font-size: ${props.menubarState.fontSize} !important; line-height: ${props.menubarState.lineHeight} !important;`
        }
      }
    },
    onUpdate: ({ editor }) => {
      // 章节模式：保存纯文本格式
      const content = editor.getText()

      // 如果正在进行输入法输入（composition），不更新字数统计
      if (!props.isComposing) {
        props.editorStore.setContent(content)
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

// 设置章节编辑器内容
function setChapterContent(editor, content) {
  if (!editor) return
  // 即使内容为空，也要清空编辑器，确保显示空内容而不是保留之前的内容
  const htmlContent = content ? plainTextToHtml(content) : ''
  editor.commands.setContent(htmlContent)
}

// 获取章节编辑器保存内容
function getSaveContent(editor) {
  if (!editor) return ''
  return editor.getText()
}

// 暴露方法给父组件
defineExpose({
  createEditor,
  setChapterContent,
  getSaveContent,
  plainTextToHtml
})
</script>

<template>
  <span style="display: none"></span>
</template>

<style scoped>
/* 章节模式：段落首行缩进，确保进入编辑器首次加载也生效 */
:deep(.tiptap-editor p) {
  text-indent: 2em;
  margin: 0; /* 避免浏览器默认 margin 影响视觉缩进 */
}
</style>
