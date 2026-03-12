# 🎨 小说写作软件中的文本高亮功能：基于 TipTap 的多彩标记技术实现

> 💡 本文深入探讨了在小说写作软件的笔记编辑器中实现文本高亮功能的技术方案，包括多颜色高亮、搜索高亮、状态管理等核心功能的完整实现，为开发者提供一套完整的文本标记解决方案。

## 📋 目录
- [项目背景](#项目背景)
- [技术架构设计](#技术架构设计)
- [核心功能实现](#核心功能实现)
- [高亮颜色选择器](#高亮颜色选择器)
- [搜索高亮集成](#搜索高亮集成)
- [状态管理与交互](#状态管理与交互)
- [样式渲染与优化](#样式渲染与优化)
- [技术亮点总结](#技术亮点总结)
- [总结与展望](#总结与展望)

## 🎯 项目背景

在小说创作过程中，作者经常需要对笔记中的关键信息进行标记和分类，比如重要人物、地点、设定等。传统的文本编辑器往往只支持单一颜色的高亮，无法满足复杂的世界观管理需求。因此，我们在 51mazi 的笔记编辑器中设计了一个多颜色文本高亮功能，让作者能够用不同颜色标记不同类型的内容。

### 🎨 高亮功能展示

![笔记编辑器](https://raw.githubusercontent.com/xiaoshengxianjun/51mazi/main/static/note-editor.png)

*多彩文本高亮功能 - 支持5种颜色标记不同类型的内容*

### ✨ 核心功能特性
- 🎨 **多颜色高亮**: 支持5种颜色（黄色、绿色、蓝色、粉色、紫色）进行文本标记
- 🔍 **搜索高亮**: 搜索功能自动高亮匹配项，当前匹配项特殊标记
- 🎯 **精确控制**: 支持对选中文本应用或移除高亮
- 💾 **数据持久化**: 高亮信息随内容一起保存和加载
- 🎭 **状态同步**: 工具栏按钮状态实时反映当前选中文本的高亮状态

## 🏗️ 技术架构设计

### 核心技术栈
- **TipTap 2.12.0**: 基于 ProseMirror 的富文本编辑器框架
- **@tiptap/extension-highlight**: TipTap 官方高亮扩展
- **Vue 3.5.13**: 渐进式 JavaScript 框架
- **Element Plus 2.10.1**: 企业级 UI 组件库

### 系统架构设计

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   工具栏组件     │    │   编辑器组件     │    │   TipTap扩展    │
│ EditorMenubar   │◄──►│ EditorPanel     │◄──►│ Highlight       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
    ┌─────────────────────────────────────────────────────┐
    │              高亮状态管理与命令执行                  │
    └─────────────────────────────────────────────────────┘
```

### 📁 组件结构设计

```javascript
// src/renderer/src/components/EditorMenubar.vue
<template>
  <div class="editor-menubar">
    <!-- 高亮按钮 -->
    <el-popover v-model:visible="highlightPopoverVisible">
      <template #reference>
        <el-button :type="isHighlight ? 'primary' : 'default'">
          <SvgIcon name="highlight" />
        </el-button>
      </template>
      <!-- 颜色选择器 -->
      <div class="highlight-color-picker">
        <!-- 5种颜色选项 -->
        <!-- 移除高亮选项 -->
      </div>
    </el-popover>
  </div>
</template>
```

## 🔧 核心功能实现

### 1. TipTap Highlight 扩展配置

TipTap 的 Highlight 扩展支持多颜色高亮，我们需要在编辑器初始化时进行配置：

```javascript
// src/renderer/src/components/NoteEditorContent.vue
import Highlight from '@tiptap/extension-highlight'

// 获取笔记编辑器的扩展配置
function getNoteExtensions() {
  return [
    // ... 其他扩展
    Highlight.configure({
      multicolor: true,  // 启用多颜色支持
      HTMLAttributes: {
        class: 'search-highlight'  // 添加自定义类名
      }
    })
  ]
}
```

```javascript
// src/renderer/src/components/ChapterEditorContent.vue
import Highlight from '@tiptap/extension-highlight'

// 获取章节编辑器的扩展配置
function getChapterExtensions() {
  return [
    StarterKit,
    // ... 其他扩展
    Highlight.configure({
      multicolor: true,  // 启用多颜色支持
      HTMLAttributes: {
        class: 'search-highlight'  // 添加自定义类名
      }
    })
  ]
}
```

**关键配置说明**：
- `multicolor: true`: 启用多颜色支持，允许为不同的高亮设置不同的颜色
- `HTMLAttributes`: 为高亮元素添加自定义 HTML 属性，这里添加了 `search-highlight` 类名，方便样式控制

### 2. 高亮颜色定义

在工具栏组件中定义可用的高亮颜色：

```javascript
// src/renderer/src/components/EditorMenubar.vue
// 高亮颜色选项（5个浅色、亮色）
const highlightColors = [
  { value: '#ffeb3b', label: '黄色' },
  { value: '#a8e6cf', label: '绿色' },
  { value: '#a8c8ec', label: '蓝色' },
  { value: '#ffb3ba', label: '粉色' },
  { value: '#dda0dd', label: '紫色' }
]
```

**颜色选择原则**：
- 使用浅色、亮色，确保在白色背景上清晰可见
- 颜色区分度足够，便于快速识别不同类型的内容
- 符合视觉设计规范，不会过于刺眼

### 3. 高亮状态检测

检测当前选中文本是否已应用高亮，以及使用的颜色：

```javascript
// src/renderer/src/components/EditorMenubar.vue
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

// 检查当前高亮是否使用指定颜色
function isHighlightColorActive(color) {
  if (!props.editor || !isHighlight.value) return false
  const attrs = props.editor.getAttributes('highlight')
  // 如果没有 color 属性，默认是黄色
  const currentColor = attrs.color || '#ffeb3b'
  return currentColor === color
}
```

**状态检测逻辑**：
- 使用 `editor.isActive('highlight')` 检测当前选中文本是否已应用高亮
- 使用 `editor.getAttributes('highlight')` 获取高亮的属性，包括颜色
- 如果没有颜色属性，默认使用黄色（`#ffeb3b`）

## 🎨 高亮颜色选择器

### 1. 颜色选择器 UI 实现

使用 Element Plus 的 Popover 组件实现颜色选择器：

```vue
<!-- src/renderer/src/components/EditorMenubar.vue -->
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
      <!-- 颜色选项 -->
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
      <!-- 分隔线 -->
      <div class="highlight-color-split"></div>
      <!-- 移除高亮选项 -->
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
```

### 2. 颜色选择器样式

```scss
// src/renderer/src/components/EditorMenubar.vue
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
}

.highlight-color-split {
  width: 1px;
  height: 15px;
  background: #999;
}
```

**样式设计要点**：
- 圆形颜色块，视觉清晰
- 悬停和激活状态的视觉反馈
- 平滑的过渡动画
- 响应式布局，适配不同屏幕

### 3. 应用高亮颜色

```javascript
// src/renderer/src/components/EditorMenubar.vue
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
```

**命令执行逻辑**：
- `editor.chain().focus()`: 确保编辑器获得焦点
- `.setHighlight({ color })`: 为选中文本应用指定颜色的高亮
- `.unsetHighlight()`: 移除选中文本的高亮
- `.run()`: 执行命令链

## 🔍 搜索高亮集成

### 1. 搜索高亮实现

搜索功能也使用 Highlight 扩展来高亮匹配项，当前匹配项使用蓝色，其他匹配项使用黄色：

```javascript
// src/renderer/src/components/SearchPanel.vue
// 为所有匹配项添加视觉高亮
function addVisualHighlights() {
  if (!props.editor || matches.value.length === 0) return

  // 清除之前的高亮
  clearVisualHighlights()

  // 为每个匹配项添加高亮标记
  matches.value.forEach((match, index) => {
    const isCurrent = index === currentMatchIndex.value

    // 使用Tiptap的setMark命令添加高亮
    props.editor.commands.setTextSelection({
      from: match.from,
      to: match.to
    })

    // 添加高亮标记，使用highlight扩展
    props.editor.commands.setHighlight({
      color: isCurrent ? '#409eff' : '#ffeb3b'
    })
  })

  // 恢复当前匹配项的选择
  if (currentMatchIndex.value >= 0 && currentMatchIndex.value < matches.value.length) {
    highlightMatch(matches.value[currentMatchIndex.value])
  }
}

// 清除视觉高亮
function clearVisualHighlights() {
  if (!props.editor) return

  // 选择整个文档
  props.editor.commands.selectAll()

  // 移除所有高亮标记
  props.editor.commands.unsetHighlight()

  // 清除选择
  props.editor.commands.setTextSelection(0)
}
```

**搜索高亮策略**：
- 当前匹配项使用蓝色（`#409eff`），突出显示
- 其他匹配项使用黄色（`#409eff`），统一标记
- 切换匹配项时，重新应用所有高亮以更新颜色

### 2. 搜索高亮与手动高亮的协调

搜索高亮和手动高亮使用相同的 Highlight 扩展，但通过不同的颜色进行区分：
- 搜索高亮：临时性，仅在搜索时显示，使用蓝色和黄色
- 手动高亮：持久性，随内容保存，使用5种自定义颜色

## 🎭 状态管理与交互

### 1. 高亮状态同步

工具栏按钮的状态需要实时反映当前选中文本的高亮状态：

```javascript
// src/renderer/src/components/EditorMenubar.vue
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
```

**状态同步机制**：
- 使用 Vue 3 的 `computed` 响应式计算属性
- 基于 TipTap 编辑器的 `isActive()` 方法检测状态
- 当用户选择不同文本时，状态自动更新

### 2. 交互优化

```javascript
// 应用高亮后自动关闭颜色选择器
function applyHighlight(color) {
  // ... 应用高亮逻辑
  highlightPopoverVisible.value = false  // 关闭弹窗
}

// 移除高亮后自动关闭颜色选择器
function removeHighlight() {
  // ... 移除高亮逻辑
  highlightPopoverVisible.value = false  // 关闭弹窗
}
```

**交互优化要点**：
- 选择颜色后自动关闭弹窗，减少操作步骤
- 按钮状态实时反映当前选中文本的高亮状态
- 颜色选择器中的当前颜色高亮显示

## 🎨 样式渲染与优化

### 1. TipTap Highlight 扩展的样式渲染

TipTap 的 Highlight 扩展通过内联样式设置背景色，确保颜色正确显示：

```scss
// src/renderer/src/components/EditorPanel.vue
// Tiptap highlight扩展的样式（支持多颜色）
// 确保有 data-color 属性的 mark 元素使用 TipTap 扩展设置的颜色
// TipTap 扩展会通过内联 style 设置 background-color，优先级高于类选择器
```

**样式渲染机制**：
- TipTap 扩展通过内联 `style` 属性设置 `background-color`
- 内联样式优先级高于 CSS 类选择器
- 支持多颜色，每种颜色独立渲染

### 2. 高亮样式优化

```scss
// 搜索高亮样式 - 使用选择高亮
::selection {
  background-color: #409eff;
  color: white;
}
```

**样式优化策略**：
- 使用内联样式确保颜色准确显示
- 保持高亮颜色与文本颜色的良好对比度
- 避免过度装饰，保持简洁美观

## 🎯 技术亮点总结

### 1. 多颜色高亮支持
- **灵活的颜色系统**: 支持5种颜色，满足不同分类需求
- **颜色持久化**: 高亮颜色随内容一起保存和加载
- **状态同步**: 工具栏按钮状态实时反映当前高亮状态

### 2. 搜索与高亮集成
- **统一技术方案**: 搜索高亮和手动高亮使用相同的扩展
- **颜色区分**: 通过不同颜色区分搜索高亮和手动高亮
- **动态更新**: 搜索匹配项切换时，高亮颜色自动更新

### 3. 用户体验优化
- **直观的颜色选择器**: 圆形颜色块，视觉清晰
- **即时反馈**: 应用高亮后立即显示效果
- **操作便捷**: 一键应用或移除高亮

### 4. 技术架构优势
- **基于 TipTap 扩展**: 利用成熟的富文本编辑器框架
- **响应式状态管理**: 基于 Vue 3 的响应式系统
- **模块化设计**: 高亮功能独立封装，易于维护

## 🔮 总结与展望

本文详细介绍了在小说写作软件的笔记编辑器中实现文本高亮功能的技术方案。通过 TipTap 的 Highlight 扩展、Vue 3 的响应式系统以及精心设计的交互逻辑，我们实现了一个功能完善、用户体验优秀的多颜色文本高亮功能。

### 技术优势
- ✅ **多颜色支持**: 5种颜色满足不同分类需求
- ✅ **状态同步**: 工具栏状态实时反映高亮状态
- ✅ **搜索集成**: 搜索功能与高亮功能无缝集成
- ✅ **用户友好**: 直观的颜色选择器，操作便捷

### 未来优化方向
- 🔮 **更多颜色**: 支持自定义颜色选择器
- 🔮 **高亮分类**: 为不同颜色添加标签和说明
- 🔮 **批量操作**: 支持批量应用或移除高亮
- 🔮 **导出支持**: 导出时保留高亮信息

通过这套技术方案，我们为小说创作者提供了一个强大而直观的文本标记工具，大大提升了笔记管理和世界观构建的效率。

---

### 📚 相关链接
- **项目地址**: [GitHub - 51mazi](https://github.com/xiaoshengxianjun/51mazi)，给个 Star 哦~
- **TipTap 官网**: [https://tiptap.dev](https://tiptap.dev)
- **技术栈**: TipTap + Vue 3 + Electron + Element Plus

### 🏷️ 标签
`#TipTap` `#文本高亮` `#Vue3` `#Electron` `#小说写作` `#富文本编辑` `#前端开发` `#用户体验`

---

> 💡 **如果这篇文章对你有帮助，请给个 ⭐️ 支持一下！**

