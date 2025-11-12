import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

// 笔记大纲段落节点，支持折叠、缩进和拖拽
export const NoteOutlineParagraph = Node.create({
  name: 'noteOutlineParagraph',
  group: 'block',
  content: 'inline*',
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      level: {
        default: 0,
        parseHTML: (element) => {
          const level = parseInt(element.getAttribute('data-level') || '0', 10)
          return Math.max(0, Math.min(level, 10)) // 限制层级在 0-10
        },
        renderHTML: (attributes) => {
          if (!attributes.level) return {}
          return { 'data-level': attributes.level }
        }
      },
      collapsed: {
        default: false,
        parseHTML: (element) => element.hasAttribute('data-collapsed'),
        renderHTML: (attributes) => {
          if (!attributes.collapsed) return {}
          return { 'data-collapsed': 'true' }
        }
      },
      hasChildren: {
        default: false,
        parseHTML: () => false, // 这个属性在运行时动态计算
        renderHTML: () => ({})
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'p[data-note-outline]',
        getAttrs: (node) => {
          const level = parseInt(node.getAttribute('data-level') || '0', 10)
          const collapsed = node.hasAttribute('data-collapsed')
          return { level, collapsed }
        }
      },
      {
        // 也支持没有 data-note-outline 属性的 p 标签（兼容旧数据）
        tag: 'p',
        getAttrs: (node) => {
          // 如果已经有 data-note-outline，会被上面的规则匹配
          // 这里只处理没有 data-note-outline 的 p 标签
          if (node.hasAttribute('data-note-outline')) {
            return false // 让上面的规则处理
          }
          // 默认转换为 level 0 的 noteOutlineParagraph
          return { level: 0, collapsed: false }
        }
      }
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level || 0
    return [
      'p',
      mergeAttributes(HTMLAttributes, {
        'data-note-outline': 'true',
        'data-level': level,
        style: `padding-left: ${level * 24}px; position: relative;`
      }),
      0
    ]
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        // 在笔记模式下，回车创建新段落，保持当前缩进级别
        const { state } = editor
        const { selection } = state
        const { $from } = selection

        // 检查当前节点是否是 noteOutlineParagraph
        if ($from.parent.type.name === 'noteOutlineParagraph') {
          const currentLevel = $from.parent.attrs.level || 0

          // 使用 Tiptap 的 insertContent 命令插入新段落
          // 这会自动处理光标位置
          editor.commands.insertContent({
            type: 'noteOutlineParagraph',
            attrs: { level: currentLevel },
            content: []
          })

          return true
        }
        return false
      },
      Tab: ({ editor }) => {
        // Tab 键增加缩进
        const { state } = editor
        const { selection } = state
        const { $from } = selection

        if ($from.parent.type.name === 'noteOutlineParagraph') {
          const currentLevel = $from.parent.attrs.level || 0
          if (currentLevel < 10) {
            editor.commands.updateAttributes('noteOutlineParagraph', {
              level: currentLevel + 1
            })
          }
          return true
        }
        return false
      },
      'Shift-Tab': ({ editor }) => {
        // Shift+Tab 减少缩进
        const { state } = editor
        const { selection } = state
        const { $from } = selection

        if ($from.parent.type.name === 'noteOutlineParagraph') {
          const currentLevel = $from.parent.attrs.level || 0
          if (currentLevel > 0) {
            editor.commands.updateAttributes('noteOutlineParagraph', {
              level: currentLevel - 1
            })
          }
          return true
        }
        return false
      }
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('noteOutline'),
        props: {
          decorations: (state) => {
            const decorations = []
            const { doc } = state

            doc.descendants((node, pos) => {
              if (node.type.name === 'noteOutlineParagraph') {
                // 检查是否有子段落（下一段落的层级大于当前）
                const currentLevel = node.attrs.level || 0
                let hasChildren = false
                let nextPos = pos + node.nodeSize

                while (nextPos < doc.content.size) {
                  const nextNode = doc.nodeAt(nextPos)
                  if (!nextNode) break

                  if (nextNode.type.name === 'noteOutlineParagraph') {
                    const nextLevel = nextNode.attrs.level || 0
                    if (nextLevel > currentLevel) {
                      hasChildren = true
                    } else {
                      break
                    }
                  } else {
                    break
                  }

                  nextPos += nextNode.nodeSize
                }

                // 使用 Decoration.node 装饰段落节点，标记需要添加控制按钮
                const collapsed = node.attrs.collapsed || false
                const level = node.attrs.level || 0

                // 使用 node 装饰来标记段落，然后通过插件在 DOM 更新后添加控制按钮
                const nodeDecoration = Decoration.node(pos, pos + node.nodeSize, {
                  class: 'note-outline-paragraph',
                  'data-note-outline-level': level,
                  'data-note-outline-has-children': hasChildren ? 'true' : 'false',
                  'data-note-outline-collapsed': collapsed ? 'true' : 'false',
                  'data-note-outline-pos': pos
                })

                decorations.push(nodeDecoration)

                // 如果折叠，隐藏子段落
                if (collapsed && hasChildren) {
                  let nextPos = pos + node.nodeSize
                  while (nextPos < doc.content.size) {
                    const nextNode = doc.nodeAt(nextPos)
                    if (!nextNode) break

                    if (nextNode.type.name === 'noteOutlineParagraph') {
                      const nextLevel = nextNode.attrs.level || 0
                      if (nextLevel > currentLevel) {
                        const hideDecoration = Decoration.node(
                          nextPos,
                          nextPos + nextNode.nodeSize,
                          {
                            style: 'display: none;'
                          }
                        )
                        decorations.push(hideDecoration)
                        nextPos += nextNode.nodeSize
                      } else {
                        break
                      }
                    } else {
                      break
                    }
                  }
                }
              }
            })

            return DecorationSet.create(doc, decorations)
          },
          view: (view) => {
            // 在视图更新后，为每个段落添加控制按钮
            const updateControls = () => {
              const paragraphs = view.dom.querySelectorAll('p[data-note-outline]')
              paragraphs.forEach((paragraph) => {
                // 检查是否已经有控制按钮
                if (paragraph.querySelector('.note-outline-controls')) {
                  return
                }

                // 获取段落属性
                const level = parseInt(paragraph.getAttribute('data-level') || '0', 10)
                const hasChildrenAttr = paragraph.getAttribute('data-note-outline-has-children')
                const collapsedAttr = paragraph.getAttribute('data-note-outline-collapsed')
                const posAttr = paragraph.getAttribute('data-note-outline-pos')

                // 如果没有这些属性，尝试从装饰中获取
                let hasChildren = false
                let collapsed = false
                let pos = 0

                if (hasChildrenAttr !== null) {
                  hasChildren = hasChildrenAttr === 'true'
                }
                if (collapsedAttr !== null) {
                  collapsed = collapsedAttr === 'true'
                }
                if (posAttr !== null) {
                  pos = parseInt(posAttr, 10)
                } else {
                  // 尝试从 DOM 位置计算
                  const domPos = view.posAtDOM(paragraph, 0)
                  if (domPos !== null) {
                    pos = domPos
                  }
                }

                // 如果没有子节点信息，检查下一个段落
                if (hasChildrenAttr === null) {
                  let nextSibling = paragraph.nextElementSibling
                  while (nextSibling) {
                    if (nextSibling.hasAttribute('data-note-outline')) {
                      const nextLevel = parseInt(nextSibling.getAttribute('data-level') || '0', 10)
                      if (nextLevel > level) {
                        hasChildren = true
                        break
                      } else {
                        break
                      }
                    }
                    nextSibling = nextSibling.nextElementSibling
                  }
                }

                // 确保段落有相对定位
                if (paragraph.style.position !== 'relative') {
                  paragraph.style.position = 'relative'
                }

                // 创建控制按钮容器
                const button = document.createElement('div')
                button.className = 'note-outline-controls'
                button.setAttribute('data-level', level)
                button.setAttribute('data-has-children', hasChildren ? 'true' : 'false')
                button.setAttribute('data-collapsed', collapsed ? 'true' : 'false')

                // 折叠/展开按钮
                if (hasChildren) {
                  const toggleBtn = document.createElement('button')
                  toggleBtn.className = 'note-outline-toggle'
                  toggleBtn.innerHTML = collapsed ? '▶' : '▼'
                  toggleBtn.setAttribute('data-pos', pos)
                  button.appendChild(toggleBtn)
                } else {
                  // 占位，保持对齐
                  const spacer = document.createElement('div')
                  spacer.className = 'note-outline-spacer'
                  button.appendChild(spacer)
                }

                // 拖拽锚点
                const dragHandle = document.createElement('div')
                dragHandle.className = 'note-outline-drag-handle'
                dragHandle.innerHTML = '⋮⋮'
                dragHandle.style.cursor = 'grab'
                dragHandle.setAttribute('draggable', 'false')
                button.appendChild(dragHandle)

                // 添加悬停事件
                const showControls = () => {
                  button.style.opacity = '1'
                  button.style.pointerEvents = 'auto'
                  const handle = button.querySelector('.note-outline-drag-handle')
                  if (handle) {
                    handle.style.cursor = 'grab'
                  }
                }
                const hideControls = () => {
                  if (!button.matches(':hover') && !paragraph.matches(':hover')) {
                    button.style.opacity = '0'
                    button.style.pointerEvents = 'none'
                  }
                }
                paragraph.addEventListener('mouseenter', showControls)
                paragraph.addEventListener('mouseleave', hideControls)
                button.addEventListener('mouseenter', showControls)
                button.addEventListener('mouseleave', hideControls)

                // 将控制按钮添加到段落
                paragraph.appendChild(button)
              })
            }

            // 初始更新
            setTimeout(updateControls, 0)

            // 返回视图更新函数
            return {
              update: (view, prevState) => {
                if (prevState && prevState.doc !== view.state.doc) {
                  setTimeout(updateControls, 0)
                }
              },
              destroy: () => {
                // 清理
              }
            }
          },
          handleDOMEvents: {
            click: (view, event) => {
              const target = event.target
              if (target && target.classList.contains('note-outline-toggle')) {
                event.stopPropagation()
                event.preventDefault()
                const pos = parseInt(target.getAttribute('data-pos'), 10)
                if (!isNaN(pos)) {
                  const { state, dispatch } = view
                  const node = state.doc.nodeAt(pos)
                  if (node && node.type.name === 'noteOutlineParagraph') {
                    const tr = state.tr
                    tr.setNodeMarkup(pos, null, {
                      ...node.attrs,
                      collapsed: !node.attrs.collapsed
                    })
                    dispatch(tr)
                    return true
                  }
                }
              }
              return false
            }
          }
        }
      })
    ]
  }
})
