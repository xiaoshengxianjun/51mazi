# 🚀 基于 Electron + Vue 3 的桌面小说写作软件架构设计

> 💡 本文介绍了一个功能丰富的桌面小说写作软件的技术架构设计，该项目采用 Electron + Vue 3 技术栈，集成了富文本编辑、地图设计、关系图谱等核心功能模块。

## 📋 目录
- [项目概述](#项目概述)
- [技术栈选择](#技术栈选择)
- [项目架构设计](#项目架构设计)
- [核心功能模块详解](#核心功能模块详解)
- [技术亮点](#技术亮点)
- [开发环境配置](#开发环境配置)
- [项目特色](#项目特色)
- [总结](#总结)

## 🎯 项目概述

**51mazi** 是一个专为小说创作者设计的桌面写作软件，提供了从大纲规划到内容创作的全流程支持。项目采用现代化的技术栈，实现了跨平台、高性能、用户友好的写作体验。

### ✨ 主要功能特性
- 📚 **多书籍管理**: 支持创建、编辑、删除多本书籍
- ✍️ **富文本编辑**: 基于 TipTap 的专业写作体验
- 🗺️ **地图设计**: Canvas 绘制的自定义地图工具
- 👥 **关系图谱**: 可视化人物关系管理
- 📊 **数据统计**: 字数统计和创作进度分析
- 🎨 **主题切换**: 支持多种主题模式

## 🛠️ 技术栈选择

### 核心技术
| 技术 | 版本 | 用途 |
|------|------|------|
| **Electron** | 35.0.3 | 跨平台桌面应用框架 |
| **Vue** | 3.5.13 | 渐进式 JavaScript 框架 |
| **Vite** | 6.2.3 | 现代化构建工具 |
| **Element Plus** | 2.10.1 | 企业级 UI 组件库 |

### 核心功能库
| 库名 | 版本 | 功能 |
|------|------|------|
| **TipTap** | 2.12.0 | 基于 ProseMirror 的富文本编辑器 |
| **ECharts** | 5.6.0 | 数据可视化图表库 |
| **relation-graph-vue3** | 2.2.11 | 关系图谱可视化组件 |
| **Pinia** | 3.0.1 | Vue 3 官方推荐的状态管理库 |

## 🏗️ 项目架构设计

### 目录结构
```bash
51mazi/
├── src/
│   ├── main/           # Electron 主进程
│   ├── preload/        # 预加载脚本
│   └── renderer/       # 渲染进程 (Vue 应用)
│       ├── src/
│       │   ├── components/    # 组件库
│       │   │   ├── EditorPanel.vue      # 编辑器面板
│       │   │   ├── MapDesign.vue        # 地图设计
│       │   │   ├── RelationshipDesign.vue # 关系图谱
│       │   │   └── ...
│       │   ├── views/         # 页面视图
│       │   ├── stores/        # 状态管理
│       │   ├── router/        # 路由配置
│       │   └── utils/         # 工具函数
│       └── assets/            # 静态资源
├── package.json
└── electron.vite.config.mjs
```

### 核心模块设计

#### 1. 编辑器模块 (Editor)
基于 TipTap 富文本编辑器，提供专业的写作体验：

```javascript
// src/renderer/src/components/EditorPanel.vue
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import TextAlign from '@tiptap/extension-text-align'

const editor = new Editor({
  extensions: [
    StarterKit,
    Bold,
    Italic,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TabInsert, // 自定义 Tab 键扩展
    Collapsible // 自定义折叠扩展
  ],
  content: editorStore.content,
  onUpdate: ({ editor }) => {
    const content = editor.getText()
    editorStore.setContent(content)
    // 防抖自动保存
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      autoSaveContent()
    }, 1000)
  }
})
```

#### 2. 状态管理 (Pinia)
使用 Pinia 进行全局状态管理，实现响应式数据流：

```javascript
// src/renderer/src/stores/editor.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useEditorStore = defineStore('editor', () => {
  const content = ref('')
  const file = ref(null)
  const chapterTitle = ref('')
  
  // 码字统计相关
  const typingStartTime = ref(null)
  const typingSpeed = ref({
    perMinute: 0,
    perHour: 0
  })

  // 计算当前字数
  const chapterWords = computed(() => {
    return content.value.length
  })

  // 更新码字速度
  function updateTypingSpeed() {
    if (!typingStartTime.value) return
    
    const now = Date.now()
    const timeElapsed = (now - typingStartTime.value) / 1000
    const wordsTyped = chapterWords.value - initialWordCount.value
    
    if (timeElapsed > 0) {
      typingSpeed.value = {
        perMinute: Math.round((wordsTyped / timeElapsed) * 60),
        perHour: Math.round((wordsTyped / timeElapsed) * 3600)
      }
    }
  }

  return {
    content,
    file,
    chapterTitle,
    chapterWords,
    typingSpeed,
    setContent,
    setFile,
    setChapterTitle,
    resetTypingTimer
  }
})
```

#### 3. 路由配置 (Vue Router)
采用 Hash 模式适配 Electron 环境：

```javascript
// src/renderer/src/router/index.js
import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@renderer/views/Home.vue')
  },
  {
    path: '/editor',
    name: 'Editor',
    component: () => import('@renderer/views/Editor.vue')
  },
  {
    path: '/map-design',
    name: 'MapDesign',
    component: () => import('@renderer/views/MapDesign.vue')
  },
  {
    path: '/relationship-design',
    name: 'RelationshipDesign',
    component: () => import('@renderer/views/RelationshipDesign.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(), // Electron 环境使用 Hash 模式
  routes
})
```

## 🔧 核心功能模块详解

### 1. 多书籍管理系统
- **独立存储**: 每本书独立的数据目录结构
- **目录选择**: 支持自定义书籍主目录
- **数据同步**: 基于文件系统的数据同步机制

### 2. 富文本编辑器
- **TipTap 集成**: 基于 ProseMirror 的专业编辑器
- **自定义扩展**: Tab 键插入、折叠功能等
- **实时统计**: 字数统计和码字速度计算
- **自动保存**: 防抖机制确保数据安全

### 3. 地图设计工具
- **Canvas 绘图**: 自定义地图绘制功能
- **多种工具**: 铅笔、橡皮擦、油漆桶、文字工具
- **资源管理**: 预设图片资源拖拽添加
- **缩放控制**: 支持画布缩放和视图调整

### 4. 关系图谱
- **可视化组件**: 基于 relation-graph-vue3
- **节点管理**: 人物节点的增删改查
- **连线编辑**: 关系连线的类型和描述
- **缩略图生成**: 自动生成关系图预览

### 5. 数据存储方案
- **electron-store**: 本地配置存储
- **文件系统**: 书籍内容的文件化存储
- **版本管理**: 章节历史版本追踪

## ⭐ 技术亮点

### 1. 现代化技术栈
- Vue 3 Composition API 提供更好的代码组织
- Vite 构建工具提供快速的开发体验
- Element Plus 提供企业级 UI 组件

### 2. 性能优化
- 组件懒加载减少初始包大小
- 防抖机制优化频繁操作
- 本地存储减少网络依赖

### 3. 用户体验
- 响应式设计适配不同屏幕
- 多主题支持满足个性化需求
- 快捷键支持提升操作效率

### 4. 数据安全
- 完全本地化存储保护用户隐私
- 自动备份机制防止数据丢失
- 完善的错误处理机制

## 🚀 开发环境配置

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建打包
```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 🎨 项目特色

1. **专业写作体验**: 基于 TipTap 的富文本编辑器提供专业的写作环境
2. **可视化创作工具**: 地图设计和关系图谱帮助作者更好地规划故事
3. **数据驱动**: 完善的统计和分析功能帮助作者了解创作进度
4. **跨平台支持**: 基于 Electron 的跨平台桌面应用
5. **本地化存储**: 数据完全本地化，保护用户隐私

## 📝 总结

该项目展示了如何利用现代化的前端技术栈构建功能丰富的桌面应用。通过合理的架构设计、模块化开发、状态管理优化等技术手段，实现了一个功能完整、用户体验优秀的小说写作软件。

项目的成功实践为类似的应用开发提供了很好的参考，特别是在富文本编辑、Canvas 绘图、数据可视化等复杂功能的集成方面，具有很高的技术价值和参考意义。

---

### 📚 相关链接
- **项目地址**: [GitHub - 51mazi](https://github.com/xiaoshengxianjun/51mazi)
- **技术栈**: Electron + Vue 3 + TipTap + Element Plus + Pinia
- **关键词**: 桌面应用、富文本编辑、Canvas 绘图、关系图谱、小说写作

### 🏷️ 标签
`#Electron` `#Vue3` `#桌面应用` `#富文本编辑` `#Canvas绘图` `#关系图谱` `#小说写作` `#前端开发`

---

> 💡 **如果这篇文章对你有帮助，请给个 ⭐️ 支持一下！** 