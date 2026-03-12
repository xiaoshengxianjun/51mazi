# 从「选中一段」到「整章润色」：编辑器里的 AI 润色是怎么做出来的

> 在 **51 码字**里，写作者可以选中任意一段文字或整章正文，一键交给 AI 润色，在弹框里对比原文与润色结果，再决定是「替换」还是「复制走」。本文从产品意图到技术实现，拆解这套「AI 润色」功能是如何在 Electron + Vue + TipTap 编辑器里落地的。**51 码字为完全开源项目**，完整代码与可运行程序欢迎在 **GitHub** 查看与下载体验。

---

## 📋 目录

- [功能长什么样](#功能长什么样)
- [为什么这样设计](#为什么这样设计)
- [技术架构：谁负责什么](#技术架构谁负责什么)
- [前端：选区 vs 整章、弹框与替换](#前端选区-vs-整章弹框与替换)
- [主进程与 DeepSeek：润色接口与 IPC](#主进程与-deepseek润色接口与-ipc)
- [小结与可扩展点](#小结与可扩展点)
- [体验完整功能与 GitHub](#体验完整功能与-github)

---

## 功能长什么样

在章节编辑页，编辑区**右上角**有一个半透明的 **「AI 润色」** 按钮，鼠标悬停时变为不透明；点击后出现下拉菜单：

| 菜单项           | 含义 |
|------------------|------|
| **润色选中文本** | 先选中一段或多段文字，再点此项，只对选区内容调用 AI 润色。 |
| **润色整章**     | 不依赖选区，把当前章节的整篇正文发给 AI 润色。 |

无论选哪一种，都会：

1. 把对应**纯文本**发到 DeepSeek 做润色；
2. 弹出**左右分栏**的弹框：左侧「原文」，右侧「润色后」；
3. 底部提供：**取消**、**一键复制**（复制润色结果）、**确认替换**（用润色结果替换选区或整章）。

未选中文字就点「润色选中文本」时，会提示「请先选中要润色的文本」；整章为空时点「润色整章」会提示「当前章节内容为空，无法润色」。

---

## 为什么这样设计

- **润色选中文本**：适合「这一段写得不顺，只想改这一块」的场景，减少误改、提高可控性。
- **润色整章**：适合「整章初稿写完，想统一提升一遍语感」的场景，一次请求、一次确认。
- **弹框左右对比 + 一键复制**：方便先看再决定——要么在编辑器里直接「确认替换」，要么「一键复制」到别处用，不强制覆盖原文。

这样既照顾「局部打磨」，又照顾「整章优化」，同时把「是否替换」的决策权留给用户。

---

## 技术架构：谁负责什么

整体仍是「渲染进程只负责 UI 与编辑器状态，主进程负责调用 DeepSeek、保管 API Key」的拆分方式。

```
┌─────────────────────────────────────────────────────────────────┐
│  EditorPanel.vue（Vue 3 + TipTap）                                │
│  · 获取选区/整章纯文本  · 弹框展示  · 替换选区/整章  · 一键复制   │
└────────────────────────────┬────────────────────────────────────┘
                              │ window.electron.polishTextWithAI(text)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Preload（contextBridge）                                        │
│  polishTextWithAI(text) → ipcRenderer.invoke('deepseek:polish-text', { text }) │
└────────────────────────────┬────────────────────────────────────┘
                              │ IPC
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  主进程（Node）                                                   │
│  ipcMain.handle('deepseek:polish-text', …) → deepseekService.polishChapter(text) │
└────────────────────────────┬────────────────────────────────────┘
                              │ HTTP
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  DeepSeek Chat API（/chat/completions）                          │
│  系统提示：专业写作编辑，润色整章正文，只输出正文、无解释         │
└─────────────────────────────────────────────────────────────────┘
```

- **渲染进程**：不碰 API Key，只通过 `window.electron.polishTextWithAI(text)` 传纯文本、收润色结果。
- **主进程**：负责鉴权、限频、调用 DeepSeek，并返回 `{ success, content }` 或错误信息。
- **Preload**：只做 IPC 桥接，把「润色」这一能力以「一个函数」的形式暴露给前端。

---

## 前端：选区 vs 整章、弹框与替换

编辑器基于 **TipTap（ProseMirror）**，因此「选区」和「整章」都来自同一套文档模型。

### 润色选中文本

- 从 `editor.state.selection` 取 `from`、`to`。
- 若 `from === to`，说明是光标而非选区，提示「请先选中要润色的文本」。
- 否则用 `state.doc.textBetween(from, to, '\n')` 得到选区纯文本，发给 `polishTextWithAI(text)`。
- 弹框打开前，把 `polishMode` 设为 `'selection'`，并保存 `polishReplaceFrom`、`polishReplaceTo`。
- 用户点「确认替换」时，用 **TipTap 的 `insertContentAt({ from, to }, polishedText)`** 只替换这一段，其它内容不动。

### 润色整章

- 用 `editor.getText()` 取整章纯文本；若为空，提示「当前章节内容为空，无法润色」。
- 同样调用 `polishTextWithAI(fullText)`，弹框打开前把 `polishMode` 设为 `'chapter'`。
- 用户点「确认替换整章」时，需要把**纯文本**转成编辑器可接受的 **HTML**（段落用 `<p>`，段内换行用 `<br>`，并做转义），再用 **`editor.chain().focus().setContent(html)`** 整章替换。

纯文本转 HTML 的规则可以简单归纳为：按 `\n\n` 分段，每段包成 `<p>…</p>`，段内 `\n` 换成 `<br>`，并对 `<`、`>`、`&` 等做转义，避免注入和格式错乱。

### 弹框与按钮

- 弹框标题和底部主按钮根据 `polishMode` 切换：「选中文本」时显示「AI 润色结果（选中文本）」和「确认替换」；「整章」时显示「AI 润色结果（整章）」和「确认替换整章」。
- **一键复制**：`navigator.clipboard.writeText(polishResultText)`，成功后提示「已复制到剪贴板」，不改变编辑器内容。
- 弹框采用左右布局（原文 | 润色后）、宽度 80%，内容区域可滚动，便于长文对比。

### 按钮位置与样式

- 「AI 润色」按钮放在 **编辑区右上角**：在包裹编辑区的容器上使用 `position: absolute; top: 12px; right: 12px`，保证始终相对编辑区定位。
- 默认半透明（如 `opacity: 0.45`），悬停时变为不透明，减少对写作时的视觉干扰。

> 💡 **完整前端实现**：选区获取、弹框左右布局、一键复制与确认替换等逻辑均在 [EditorPanel.vue](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/components/Editor/EditorPanel.vue) 中，欢迎在 GitHub 仓库查看带注释的源码。

---

## 主进程与 DeepSeek：润色接口与 IPC

主进程里已有 DeepSeek 服务（如 `src/main/services/deepseek.js`），润色只新增一个**纯文本进、纯文本出**的接口即可。完整实现可在 [GitHub 仓库](https://github.com/xiaoshengxianjun/51mazi) 中按文件名搜索查看。

### polishChapter(text)

- **入参**：待润色的纯文本（可以是选区的一段，也可以是整章）。
- **系统提示**：强调角色是「专业中文写作编辑」、润色「整章正文」、优化表达与语病、保持原意与段落结构、**只输出润色后的正文，不要任何解释或前后缀**。
- **调用**：`this.chat({ messages, temperature: 0.5, max_tokens: 8000, requestId })`，其中 `max_tokens` 留足空间给长章。
- **返回**：从响应中取出 `content`，trim 后返回；若为空则抛错「润色结果为空，请重试」。

这样「选中一段」和「润色整章」共用同一套 API 和提示词，只是传入的文本长度不同。

### IPC 与 Preload

- 主进程：`ipcMain.handle('deepseek:polish-text', async (_, { text }) => { … })`，内部调用 `deepseekService.polishChapter(text)`，返回 `{ success, content }` 或 `{ success: false, message }`。
- Preload：`polishTextWithAI: (text) => ipcRenderer.invoke('deepseek:polish-text', { text })`，通过 `contextBridge` 挂到 `window.electron`，供渲染进程调用。

API Key 的读取、限频、错误信息友好化等，沿用项目里已有 DeepSeek 能力即可，无需为润色单独开一套。

---

## 小结与可扩展点

- **产品**：支持「润色选中文本」和「润色整章」两种范围，弹框左右对比 + 一键复制 + 确认替换，满足局部打磨和整章优化两种场景。
- **前端**：TipTap 选区（`selection` + `textBetween`）与整章（`getText`）统一成「一段纯文本」；替换时选区用 `insertContentAt`，整章用 `setContent(plainTextToEditorHtml(...))`；弹框与按钮根据 `polishMode` 切换文案。
- **后端**：主进程提供 `polishChapter(text)`，IPC 暴露 `polish-text`，Preload 暴露 `polishTextWithAI`，API Key 与限频仍在主进程，安全且易维护。

后续若要增强，可以考虑：流式输出润色结果、支持「仅替换当前段落」的快捷方式、或对超长章做分段润色再合并等。当前实现已经为「选中即润、整章可替换」提供了一个清晰、可扩展的技术底座。

---

## 🔗 体验完整功能与 GitHub

如果你想亲自体验 AI 润色，或在自己的项目里做类似功能，欢迎访问 51 码字开源仓库：

- ⭐ **Star 项目**：[GitHub 仓库](https://github.com/xiaoshengxianjun/51mazi)
- 📥 **下载使用**：在 GitHub Release 中下载对应平台安装包，配置 DeepSeek API Key 后即可使用 AI 润色
- 📖 **查看源码**：编辑器润色 UI、主进程润色接口、IPC 与 Preload 暴露方式均有完整实现与注释
- 💬 **反馈建议**：使用中若有问题或想法，欢迎提 Issue 或 Discussion
- 🐛 **报告问题**：遇到 Bug 可直接在仓库提 Issue，帮助项目改进

**51 码字** — 开源小说写作软件，让 AI 润色无缝融入写作流程。

### 📚 相关链接

- **项目地址**：[GitHub - 51mazi](https://github.com/xiaoshengxianjun/51mazi)，给个 Star 哦~
- **AI 润色编辑器侧**：[EditorPanel.vue](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/components/Editor/EditorPanel.vue)（按钮、下拉、弹框、选区/整章逻辑、一键复制与替换）
- **DeepSeek 润色服务**：[deepseek.js - polishChapter](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/main/services/deepseek.js)（润色提示词与 Chat 调用）
- **主进程 IPC**：[index.js - deepseek:polish-text](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/main/index.js)（润色 IPC 注册）
- **Preload 暴露**：[preload/index.js](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/preload/index.js)（`polishTextWithAI` 暴露给渲染进程）
- **DeepSeek 官方文档**：[DeepSeek API Documentation](https://platform.deepseek.com/api-docs/)

### 🏷️ 标签

`#AI润色` `#DeepSeek` `#小说写作` `#51码字` `#Electron` `#Vue3` `#TipTap` `#编辑器` `#写作辅助` `#开源` `#创作效率`

---

> 💡 **如果这篇文章对你有帮助，请到 GitHub 给个 ⭐️ Star，就是对项目最好的支持！**
>
> 💡 **想直接看实现细节？欢迎在 [GitHub 仓库](https://github.com/xiaoshengxianjun/51mazi) 中打开上述代码文件，每个模块都有注释说明。**

*本文基于 51 码字（51mazi）开源项目中的 AI 润色功能整理，技术栈：Electron、Vue 3、TipTap、DeepSeek API。*
