import { Node, mergeAttributes } from '@tiptap/core'

// 自定义 Collapsible 扩展，基于 <details><summary>...</summary>...</details>
export const Collapsible = Node.create({
  name: 'collapsible',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      collapsed: {
        default: false,
        parseHTML: (element) => (element.hasAttribute('open') ? false : true),
        renderHTML: (attributes) => (attributes.collapsed ? {} : { open: '' })
      },
      label: {
        default: '折叠段落',
        parseHTML: (element) => element.querySelector('summary')?.innerText || '折叠段落',
        renderHTML: (attributes) => ({})
      }
    }
  },
  parseHTML() {
    return [
      {
        tag: 'details'
      }
    ]
  },
  renderHTML({ node, HTMLAttributes }) {
    // 渲染为 <details><summary>label</summary>内容</details>
    return ['details', mergeAttributes(HTMLAttributes), ['summary', {}, node.attrs.label], 0]
  },
  addCommands() {
    return {
      insertCollapsible:
        (label = '折叠段落') =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { label },
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: '这里是可折叠内容' }]
              }
            ]
          })
    }
  }
})
