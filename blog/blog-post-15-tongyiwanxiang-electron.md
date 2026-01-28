# 🎨 Electron 桌面应用接入通义万相：文生图从 0 到 1 实战

> 💡 想在 Electron 应用里一键「画」出小说封面、海报、插画？阿里云通义万相（文生图）是个不错的选择。本文以 51mazi 小说写作软件的 AI 封面功能为例，手把手讲清：主进程如何安全调用 API、图片如何落盘到书籍目录、以及渲染进程如何优雅对接。看完你就能在自己的 Electron 项目里接好通义万相，实现「提示词 → 图片 → 本地文件」全链路。

## 📋 目录

- [🎨 Electron 桌面应用接入通义万相：文生图从 0 到 1 实战](#-electron-桌面应用接入通义万相文生图从-0-到-1-实战)
  - [📋 目录](#-目录)
  - [🎯 为什么选通义万相](#-为什么选通义万相)
  - [🏗️ 整体架构：主进程干活，渲染进程展示](#️-整体架构主进程干活渲染进程展示)
  - [🔧 核心实现：服务层 + IPC + 落盘](#-核心实现服务层--ipc--落盘)
    - [1. 服务层：通义万相文生图](#1-服务层通义万相文生图)
    - [2. IPC：生成封面 + 确认使用 + 丢弃](#2-ipc生成封面--确认使用--丢弃)
    - [3. Preload：统一暴露，避免「is not a function」](#3-preload统一暴露避免is-not-a-function)
  - [🛡️ 安全与体验：Key 存储、错误码、提示语](#️-安全与体验key-存储错误码提示语)
  - [📝 完整代码在哪看](#-完整代码在哪看)
  - [🎉 小结与 GitHub](#-小结与-github)
    - [🏷️ 标签](#️-标签)

## 🎯 为什么选通义万相

通义万相是阿里云百炼平台提供的**文生图**能力，适合在桌面应用里做「根据文字生成图片」的功能：

- ✅ **国内服务**：延迟低、无需科学上网
- ✅ **REST API**：`POST` + JSON，和 Electron 主进程里的 `fetch` 天然契合
- ✅ **模型能力**：支持中文提示词、多种尺寸、正向/反向提示词，适合小说封面、插画等场景
- ✅ **按量计费**：个人或小团队可控成本

在 51mazi 里，我们用它做「AI 生成小说封面」：用户输入书名、笔名、风格描述，由通义万相生成图片，再保存到书籍根目录（如 `ai_cover1.png`、确认后复制为 `cover.png`）。

## 🏗️ 整体架构：主进程干活，渲染进程展示

原则和接入 DeepSeek 时一致：**API Key 和网络请求只在主进程，渲染进程只发 IPC、不碰 Key**。

```
┌─────────────────────┐
│  Vue 组件            │  渲染进程：填写提示词、选尺寸、点「生成」
│  (AICoverDrawer)    │
└──────────┬──────────┘
           │ IPC: tongyiwanxiang:generate-cover
           ▼
┌─────────────────────┐
│  Preload            │  contextBridge 暴露 generateAICover、confirmAICover 等
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  主进程              │  调用 tongyiwanxiang 服务 → 拿到图片 URL → 下载 → 写入书籍目录
│  tongyiwanxiang.js  │
└──────────┬──────────┘
           │ HTTPS
           ▼
┌─────────────────────┐
│  阿里云 通义万相 API │  dashscope.aliyuncs.com
└─────────────────────┘
```

这样做的直接好处：

1. **安全**：API Key 存在 electron-store（用户目录），渲染进程拿不到。
2. **可控**：限流、重试、错误码解析都可以在主进程统一处理。
3. **可维护**：换模型或换接口时只改主进程服务层即可。

## 🔧 核心实现：服务层 + IPC + 落盘

### 1. 服务层：通义万相文生图

在主进程里单独建一个服务类（如 `src/main/services/tongyiwanxiang.js`），只做三件事：**组请求体 → 发 HTTP → 解析返回里的图片 URL**。

接口形式（以当前使用的多模态生成接口为例）：

- **URL**：`https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`
- **鉴权**：Header `Authorization: Bearer <API Key>`
- **Body**：`model`、`input.messages[].content[].text`（提示词）、`parameters`（尺寸、负向提示词、是否扩展提示词等）

**核心代码示例：**

```javascript
// src/main/services/tongyiwanxiang.js
const DASHSCOPE_API_BASE =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
const MODEL = 'wan2.6-t2i'

class TongyiwanxiangService {
  async generateCover(options = {}) {
    const { prompt, size = '1280*1280', negativePrompt = '' } = options

    const body = {
      model: MODEL,
      input: {
        messages: [{ role: 'user', content: [{ text: prompt.trim() }] }]
      },
      parameters: {
        prompt_extend: true,
        watermark: false,
        n: 1,
        negative_prompt: negativePrompt || '',
        size: String(size)
      }
    }

    const response = await fetch(DASHSCOPE_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    })

    const data = await response.json().catch(() => ({}))
    if (data.code) {
      throw new Error(this._formatErrorMessage(data.code, data.message))
    }
    const imageUrl = data.output?.choices?.[0]?.message?.content?.[0]?.image
    if (!imageUrl) throw new Error('接口未返回有效图片地址')
    return imageUrl
  }
}
```

返回的 `imageUrl` 是临时可访问的地址，需在有效期内（通常 24 小时内）下载到本地，否则会失效。所以下一步就是在主进程里「下载 → 落盘」。

### 2. IPC：生成封面 + 确认使用 + 丢弃

主进程注册三个 IPC Handler，对应前端三个操作：

| 操作       | IPC Channel                        | 作用 |
|------------|------------------------------------|------|
| 生成封面   | `tongyiwanxiang:generate-cover`   | 调服务 → 拿 URL → 下载 → 保存到书籍目录 `ai_cover1.png`、`ai_cover2.png`… |
| 确认使用   | `tongyiwanxiang:confirm-cover`     | 把用户选中的那张复制为 `cover.png` |
| 取消/关闭  | `tongyiwanxiang:discard-ai-covers` | 当前实现不删文件，仅关闭弹框 |

生成封面的主流程示例（逻辑在主进程）：

```javascript
// 1. 调通义万相拿到图片 URL
const imageUrl = await tongyiwanxiangService.generateCover({ prompt, size, negativePrompt })

// 2. 下载图片
const res = await fetch(imageUrl)
const buf = Buffer.from(await res.arrayBuffer())

// 3. 保存到书籍根目录：ai_cover1.png, ai_cover2.png ...
const existing = fs.readdirSync(bookPath).filter((f) => /^ai_cover\d+\.png$/i.test(f))
const nextNum = existing.length === 0 ? 1 : Math.max(...existing.map(解析数字)) + 1
const fileName = `ai_cover${nextNum}.png`
const coverPath = join(bookPath, fileName)
fs.writeFileSync(coverPath, buf)

return { success: true, localPath: coverPath }
```

这样渲染进程拿到的就是本地路径，可以直接用 `file://` 做预览；确认使用时再根据 `chosenPath` 复制为 `cover.png` 即可。

### 3. Preload：统一暴露，避免「is not a function」

渲染进程通过 `window.electron.generateAICover`、`confirmAICover` 等调用。若只在 `contextIsolated === true` 时通过 `contextBridge` 暴露了这些方法，而在 `contextIsolated === false` 时只挂了 `electronAPI`，就会出现「confirmAICover is not a function」。

做法：把「自定义 API」抽成一份（如 `customElectronAPI`），两种情况下都挂到 `window.electron` 上：

```javascript
const customElectronAPI = {
  // ... 其他 API
  generateAICover: (options) => ipcRenderer.invoke('tongyiwanxiang:generate-cover', options),
  confirmAICover: (options) => ipcRenderer.invoke('tongyiwanxiang:confirm-cover', options),
  discardAICovers: (options) => ipcRenderer.invoke('tongyiwanxiang:discard-ai-covers', options)
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', { ...electronAPI, ...customElectronAPI })
} else {
  window.electron = { ...electronAPI, ...customElectronAPI }
}
```

这样无论是否开启上下文隔离，前端都能稳定调到这些方法。

## 🛡️ 安全与体验：Key 存储、错误码、提示语

- **API Key**：从 electron-store 读（如 `tongyiwanxiang.apiKey`），只在主进程使用，不通过 IPC 把 Key 本身传给渲染进程。
- **错误码**：通义万相会返回 `code`（如 `InvalidApiKey`、`DataInspectionFailed`、`Throttling`），在主进程里用 `_formatErrorMessage` 转成中文提示，再通过 IPC 返回给前端展示。
- **体验**：生成时前端可提示「正在努力生图中，不要关闭弹框」，并禁用关闭或二次点击，避免中途关掉导致状态错乱。

## 📝 完整代码在哪看

实现涉及的文件：

- `src/main/services/tongyiwanxiang.js`：通义万相服务层
- `src/main/index.js`：`tongyiwanxiang:generate-cover` / `confirm-cover` / `discard-ai-covers` 的 IPC 实现
- `src/preload/index.js`：`customElectronAPI` 与 `window.electron` 的挂载
- `src/renderer/src/service/tongyiwanxiang.js`：前端对 `generateAICover`、`confirmAICover` 的封装
- `src/renderer/src/components/AICoverDrawer.vue`：封面生成弹框 UI 与提示词拼接（书名、笔名、风格）

可直接在仓库里按文件名搜索，每个模块都有注释，便于对照本文捋清链路。

## 🎉 小结与 GitHub

在 Electron 里接入通义万相文生图，核心就是三件事：

1. **主进程服务层**：组好请求、调 API、拿图片 URL，并做好错误码与异常处理。
2. **主进程 IPC + 落盘**：下载图片、按规则命名（如 `ai_cover1.png`）、确认后复制为 `cover.png`，所有写盘都在主进程完成。
3. **Preload 统一暴露**：自定义 API 与 electronAPI 合并后一起挂到 `window.electron`，避免上下文隔离开关导致的方法缺失。

按这个思路，你可以把「通义万相 + Electron」复用到任何需要文生图的桌面功能上（海报、插画、配图等）。若你想直接看完整工程和交互细节，欢迎到 51mazi 仓库里翻代码、提 Issue 或 Star。

- **GitHub 仓库**：[https://github.com/xiaoshengxianjun/51mazi](https://github.com/xiaoshengxianjun/51mazi) ⭐ 给个 Star 支持一下！
- **通义万相 API 文档**：[阿里云百炼 - 文生图](https://help.aliyun.com/zh/model-studio/text-to-image-v2-api-reference)

### 🏷️ 标签

`#Electron` `#通义万相` `#文生图` `#阿里云` `#桌面应用` `#Vue3` `#IPC` `#51mazi`

---

> 💡 **如果这篇文章对你有帮助，请在GitHub上给个 ⭐️ 支持一下！**

*本文基于 51mazi 开源项目，通义万相文生图接入方案*
