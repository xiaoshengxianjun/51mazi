<script setup>
import { ref } from 'vue'
import { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Document from '@tiptap/extension-document'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { Extension } from '@tiptap/core'
import { NoteOutlineParagraph } from '@renderer/extensions/NoteOutline'
import { Plugin, PluginKey, NodeSelection } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Fragment } from 'prosemirror-model'
import { Extension as PMExtension } from '@tiptap/core'

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

// Tab 键处理已由 NoteOutlineParagraph 扩展提供（增加/减少缩进级别）

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
    })
  ]
}

// 处理回车换行与段落拆分的修复：避免产生多余空段、确保连续回车可用
const NoteEnterFix = PMExtension.create({
  name: 'noteEnterFix',
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const editor = this.editor
        const { state } = editor
        const paragraphType = state.schema.nodes.noteOutlineParagraph
        const $from = state.selection.$from
        if (!$from || $from.parent.type !== paragraphType) return false

        // 执行默认的块拆分
        const did = editor.commands.splitBlock()
        if (!did) return true

        // 轻量归一化：删除“当前位置附近多余的顶层空段”
        editor
          .chain()
          .focus()
          .command(({ tr }) => {
            const isEmptyNote = (n) =>
              n &&
              n.type === paragraphType &&
              (n.content.size === 0 ||
                (typeof n.textContent === 'string' && n.textContent.trim() === ''))

            const sel = tr.selection
            const $pos = tr.doc.resolve(sel.from)
            // 前后各检查一段
            const prev = $pos.nodeBefore
            const next = $pos.nodeAfter

            if (isEmptyNote(next)) {
              tr.delete(sel.from, sel.from + next.nodeSize)
            } else if (isEmptyNote(prev)) {
              tr.delete(sel.from - prev.nodeSize, sel.from)
            }
            return true
          })
          .run()

        return true
      }
    }
  }
})

// 段落拖拽锚点扩展：为每个 noteOutlineParagraph 添加可拖拽锚点
const NoteDragHandle = Extension.create({
  name: 'noteDragHandle',
  addProseMirrorPlugins() {
    const key = new PluginKey('note-drag-handle')
    // 运行时拖拽起点（段落起始位置）
    let draggingPos = null
    // 计算并执行在屏幕坐标处的顶层段落重排（包括所有子段落）
    function moveParagraphAtPoint(view, clientX, clientY) {
      const { state } = view
      const rect = view.dom.getBoundingClientRect()
      const clampedX = Math.max(rect.left + 1, Math.min(clientX, rect.right - 1))
      const clampedY = Math.max(rect.top + 1, Math.min(clientY, rect.bottom - 1))
      const posInfo = view.posAtCoords({ left: clampedX, top: clampedY })
      if (!posInfo) return false
      const $from = state.doc.resolve(draggingPos)
      const sourceIndex = $from.index(0)
      const sourceNode = state.doc.child(sourceIndex)

      // 检查源节点是否是 noteOutlineParagraph
      if (sourceNode.type.name !== 'noteOutlineParagraph') return false

      const sourceLevel = sourceNode.attrs.level || 0

      const $pos = state.doc.resolve(posInfo.pos)
      let targetIndex = $pos.index(0)

      const domAt = view.nodeDOM($pos.before(1))
      let insertAfter = false
      if (domAt) {
        const tRect = domAt.getBoundingClientRect()
        const midY = tRect.top + tRect.height / 2
        insertAfter = clampedY >= midY
      }

      // 找到源段落及其所有子段落（缩进级别大于源段落的连续段落）
      let moveCount = 1 // 至少移动源段落本身
      let nextIndex = sourceIndex + 1

      // 从源段落的下一个段落开始，查找所有子段落
      while (nextIndex < state.doc.childCount) {
        const nextNode = state.doc.child(nextIndex)
        if (nextNode.type.name === 'noteOutlineParagraph') {
          const nextLevel = nextNode.attrs.level || 0
          // 如果下一段落的层级大于源段落，说明是子段落，需要一起移动
          if (nextLevel > sourceLevel) {
            moveCount++
            nextIndex++
          } else {
            // 遇到同级或更高级的段落，停止查找
            break
          }
        } else {
          // 遇到非 noteOutlineParagraph 节点，停止查找
          break
        }
      }

      // 检查目标位置是否在要移动的段落范围内
      if (!insertAfter && targetIndex >= sourceIndex && targetIndex < sourceIndex + moveCount) {
        return true // 目标位置在移动范围内，不需要移动
      }
      if (insertAfter && targetIndex >= sourceIndex && targetIndex < sourceIndex + moveCount - 1) {
        return true // 目标位置在移动范围内，不需要移动
      }

      const children = []
      state.doc.forEach((child) => {
        children.push(child)
      })

      // 移除源段落及其所有子段落
      const movedParagraphs = children.splice(sourceIndex, moveCount)

      // 计算目标插入位置
      let destIndex = targetIndex
      if (sourceIndex < targetIndex) {
        // 如果源位置在目标位置之前，需要减去已移除的段落数
        destIndex -= moveCount
      }

      // 确保目标位置不在要移动的段落范围内
      if (destIndex >= sourceIndex && destIndex < sourceIndex + moveCount) {
        destIndex = sourceIndex // 如果目标位置在移动范围内，保持原位置
      }

      // 在目标位置插入所有段落（包括子段落）
      if (insertAfter) {
        children.splice(destIndex + 1, 0, ...movedParagraphs)
      } else {
        children.splice(destIndex, 0, ...movedParagraphs)
      }

      const newDoc = state.doc.type.create(state.doc.attrs, Fragment.from(children))
      const tr = state.tr.replaceWith(0, state.doc.content.size, newDoc.content)
      view.dispatch(tr.scrollIntoView())
      return true
    }
    return [
      new Plugin({
        key,
        state: {
          init: (_, { doc, schema }) => {
            return buildDecorations(doc, schema)
          },
          apply: (tr, old) => {
            // 当文档变化时，重新构建装饰
            if (tr.docChanged) {
              return buildDecorations(tr.doc, tr.doc.type.schema)
            }
            return old.map(tr.mapping, tr.doc)
          }
        },
        view(editorView) {
          // 捕获全局拖拽结束/放置，覆盖左侧功能栏等非编辑区位置
          let lastPoint = null
          const onDocDrop = (e) => {
            if (draggingPos == null) return
            e.preventDefault()
            moveParagraphAtPoint(editorView, e.clientX, e.clientY)
            draggingPos = null
          }
          const onDocDragOver = (e) => {
            if (draggingPos == null) return
            // 确保会触发 drop 事件
            e.preventDefault()
            lastPoint = { x: e.clientX, y: e.clientY }
          }
          const onDocDragEnd = () => {
            if (draggingPos != null && lastPoint) {
              // 如果没有触发 drop，也在 dragend 时根据最后位置执行一次移动
              moveParagraphAtPoint(editorView, lastPoint.x, lastPoint.y)
            }
            draggingPos = null
            lastPoint = null
          }
          document.addEventListener('drop', onDocDrop)
          document.addEventListener('dragover', onDocDragOver)
          document.addEventListener('dragend', onDocDragEnd)
          return {
            destroy() {
              document.removeEventListener('drop', onDocDrop)
              document.removeEventListener('dragover', onDocDragOver)
              document.removeEventListener('dragend', onDocDragEnd)
            }
          }
        },
        props: {
          decorations(state) {
            return buildDecorations(state.doc, state.schema)
          },
          handleDOMEvents: {
            mousedown: (view, event) => {
              const target = event.target
              if (!(target instanceof HTMLElement)) return false
              if (!target.classList.contains('note-outline-drag-handle')) return false
              const pos = Number(target.dataset.pos || -1)
              if (pos < 0) return false
              const { state } = view
              // 选中整个段落节点，后续由 ProseMirror 内置的拖拽/放置完成移动
              // 找到段落节点起始位置
              const node = state.doc.nodeAt(pos)
              if (!node) return false
              const tr = state.tr.setSelection(NodeSelection.create(state.doc, pos))
              view.dispatch(tr)
              // 让锚点可拖拽，显示为“抓取”手势
              target.setAttribute('draggable', 'true')
              // 记录拖拽起点
              draggingPos = pos
              return true
            },
            dragstart: (view, event) => {
              const target = event.target
              if (!(event instanceof DragEvent)) return false
              if (!(target instanceof HTMLElement)) return false
              if (!target.classList.contains('note-outline-drag-handle')) return false
              const pos = Number(target.dataset.pos || -1)
              if (pos < 0) return false
              // 确保拖拽开始时已记录 draggingPos
              if (draggingPos == null) draggingPos = pos
              // 使用整段节点作为拖拽预览
              const nodeDom = view.nodeDOM(pos)
              if (!(nodeDom instanceof HTMLElement)) return false
              try {
                // 克隆节点作为 drag image，避免直接使用原节点造成布局抖动
                const clone = nodeDom.cloneNode(true)
                if (clone instanceof HTMLElement) {
                  clone.style.position = 'fixed'
                  clone.style.pointerEvents = 'none'
                  clone.style.top = '-10000px'
                  clone.style.left = '-10000px'
                  clone.style.width = getComputedStyle(nodeDom).width
                  clone.style.background = getComputedStyle(nodeDom).backgroundColor || '#fff'
                  document.body.appendChild(clone)
                  if (event.dataTransfer) {
                    event.dataTransfer.effectAllowed = 'move'
                    // 设置任意数据以启用 Firefox 的 drop
                    event.dataTransfer.setData('text/plain', 'move-note-paragraph')
                    event.dataTransfer.setDragImage(clone, 8, 8)
                  }
                  // 下一帧移除克隆节点
                  requestAnimationFrame(() => {
                    if (clone.parentNode) {
                      clone.parentNode.removeChild(clone)
                    }
                  })
                }
              } catch {
                // 安全兜底：忽略 drag image 设置失败
              }
              return true
            },
            dragover: (view, event) => {
              // 允许放置
              if (draggingPos != null) {
                event.preventDefault()
                if (event.dataTransfer) {
                  event.dataTransfer.dropEffect = 'move'
                }
                return true
              }
              return false
            },
            drop: (view, event) => {
              if (draggingPos == null) return false
              event.preventDefault()
              moveParagraphAtPoint(view, event.clientX, event.clientY)
              draggingPos = null
              return true
            },
            dragend: () => {
              draggingPos = null
              return false
            }
          }
        }
      })
    ]
  }
})

function buildDecorations(doc, schema) {
  const decorations = []
  const paragraphType = schema.nodes.noteOutlineParagraph
  if (!paragraphType) return DecorationSet.empty

  doc.descendants((node, nodePos) => {
    if (node.type === paragraphType) {
      // 给段落增加相对定位类，便于绝对定位锚点
      const nodeDeco = Decoration.node(nodePos, nodePos + node.nodeSize, {
        class: 'has-note-drag-handle'
      })
      decorations.push(nodeDeco)
      // 在段首插入一个锚点控件
      const handle = document.createElement('span')
      handle.className = 'note-outline-drag-handle'
      handle.dataset.pos = String(nodePos)
      handle.setAttribute('draggable', 'true')
      handle.title = '拖动以移动该段落'
      handle.textContent = '⋮⋮'
      // 将锚点作为小部件挂载在段首（side: -1 更贴近段落开始）
      const widget = Decoration.widget(nodePos + 1, handle, { side: -1 })
      decorations.push(widget)
    }
    return true
  })
  return DecorationSet.create(doc, decorations)
}

// 创建笔记编辑器实例
function createEditor() {
  const editor = new Editor({
    extensions: [...getNoteExtensions(), NoteEnterFix, NoteDragHandle],
    content: props.editorStore.content,
    editorProps: {
      attributes: {
        class: 'tiptap-editor note-editor',
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

<template>
  <span style="display: none"></span>
</template>

<style>
/* 段落拖拽锚点样式（仅笔记模式生效） */
/* 为笔记编辑区预留统一左侧功能栏宽度，便于放置多个功能图标 */
.tiptap.note-editor {
  --note-gutter-width: 36px; /* 图标区宽度，可按需调整 */
  padding-left: var(--note-gutter-width);
}

.tiptap.note-editor p[data-note-outline] {
  position: relative;
  /* 段落内仍保留少量缩进，避免特殊样式覆盖容器内边距时产生重叠 */
  padding-left: 4px;
}

/* 扩展段落的悬停热区到左侧功能栏，避免从文本移动到图标途中消失 */
.tiptap.note-editor p[data-note-outline]::before {
  content: '';
  position: absolute;
  left: calc(-1 * var(--note-gutter-width));
  top: 0;
  width: var(--note-gutter-width);
  height: 100%;
  /* 透明覆盖层，仅用于保持 :hover，不影响视觉 */
  background: transparent;
  pointer-events: auto; /* 让该区域参与 :hover 命中 */
  z-index: 1; /* 位于文本下、图标下 */
}

/* 折叠按钮样式（和拖拽锚点使用相同的定位方式） */
.tiptap.note-editor .note-outline-toggle {
  position: absolute;
  left: calc(-1 * var(--note-gutter-width, 36px)); /* 在左侧功能栏最左侧 */
  top: 0;
  width: 16px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  user-select: none;
  z-index: 3; /* 确保位于文本之上 */
  line-height: 1;
  /* 默认隐藏（展开状态） */
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease-in-out;
}

/* 使用 CSS 绘制箭头图标（类似 > 的形状） */
.tiptap.note-editor .note-outline-toggle::before {
  content: '';
  display: block;
  width: 6px;
  height: 6px;
  border-right: 1.5px solid var(--text-mute, #999);
  border-bottom: 1.5px solid var(--text-mute, #999);
  transition:
    transform 0.15s ease-in-out,
    border-color 0.15s ease-in-out;
}

/* 展开状态：向下箭头（类似 v） */
.tiptap.note-editor .note-outline-toggle.expanded::before {
  transform: rotate(45deg) translateY(-1px);
}

/* 折叠状态：向右箭头（类似 >） */
.tiptap.note-editor .note-outline-toggle.collapsed::before {
  transform: rotate(-45deg) translateX(1px);
}

/* 悬停时显示（展开状态） */
.tiptap.note-editor p[data-note-outline]:hover .note-outline-toggle.expanded,
.tiptap.note-editor .note-outline-toggle.expanded:hover {
  opacity: 1;
  pointer-events: auto;
}

.tiptap.note-editor p[data-note-outline]:hover .note-outline-toggle.expanded::before,
.tiptap.note-editor .note-outline-toggle.expanded:hover::before {
  border-right-color: var(--text-base, #333);
  border-bottom-color: var(--text-base, #333);
}

/* 折叠状态始终显示 */
.tiptap.note-editor .note-outline-toggle.collapsed {
  opacity: 1;
  pointer-events: auto;
}

.tiptap.note-editor .note-outline-toggle.collapsed:hover::before {
  border-right-color: var(--text-base, #333);
  border-bottom-color: var(--text-base, #333);
}

.tiptap.note-editor .note-outline-drag-handle {
  position: absolute;
  left: calc(-1 * var(--note-gutter-width, 36px) + 16px); /* 折叠按钮右侧 */
  top: 0;
  width: 16px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  color: var(--text-mute, #333);
  opacity: 0; /* 默认隐藏 */
  user-select: none;
  pointer-events: none; /* 隐藏时不拦截事件 */
  transition: opacity 0.15s ease-in-out;
  display: none; /* 强制默认不展示，防止被其他样式覆盖 */
  z-index: 2; /* 确保位于文本之上，但不影响布局 */
}

/* 悬停段落显示锚点 */
.tiptap.note-editor p[data-note-outline]:hover .note-outline-drag-handle,
.tiptap.note-editor .has-note-drag-handle:hover .note-outline-drag-handle,
.tiptap.note-editor .note-outline-drag-handle:hover {
  opacity: 1;
  pointer-events: auto; /* 显示时可交互 */
  cursor: move; /* 悬停锚点显示为可移动图标 */
  display: flex; /* 悬停时再显示 */
  color: var(--text-base, #333); /* 悬停时使用更深的颜色 */
}
.tiptap.note-editor .note-outline-drag-handle:active {
  cursor: move;
  color: var(--text-base, #333);
}
</style>
