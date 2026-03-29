# 写小说也能「所见即所得」？51mazi把正文选段变成 AI 场景图

> **写给爱写小说的你**：环境写了半页，脑子里有画面，手里却没有一张能看的图——约稿贵、自己不会画、搜图又怕版权。**51mazi** 是面向小说作者的**开源**桌面写作软件，**官网**：[www.51mazi.com](https://www.51mazi.com)。最近在章节编辑器里上线了 **「AI 场景图」**：在正文里**划选一段**描写，点一下就能生成**与文字氛围相近**的场景插图，图片**自动保存**到本书文件夹，路径一目了然。  
> 本文既讲**怎么用**，也拆一点**怎么做的**，方便同好体验产品，也方便开发者参考实现。若你觉得有用，欢迎到 **GitHub 点个 ⭐ Star**，这是对开源项目最直接的鼓励。

---

## 📸 先看效果

下面这张是**真实界面截图**：左侧是章节正文与选中的段落，右侧抽屉里是「AI 场景图」——含节选依据、**AI 提炼画面（DeepSeek）**、反向提示词，以及生成好的赛博朋克风场景图与**保存路径**。

![51mazi AI 场景图：编辑器选中文本 + 右侧抽屉生成场景插图](https://raw.githubusercontent.com/xiaoshengxianjun/51mazi/main/static/ai_scene.png)

*示例：选中外貌与环境描写 → 打开「AI 场景图」→ 可选 DeepSeek 提炼画面描述 → 通义万相出图 → 结果落在本书 `scene_images` 目录。*

---

## 📋 目录

- [写小说也能「所见即所得」？51mazi把正文选段变成 AI 场景图](#写小说也能所见即所得51mazi把正文选段变成-ai-场景图)
  - [📸 先看效果](#-先看效果)
  - [📋 目录](#-目录)
  - [💭 你可能也遇到过这些场景](#-你可能也遇到过这些场景)
  - [✍️ 功能怎么用（作者向）](#️-功能怎么用作者向)
  - [⚙️ 实现上做了哪些取舍（技术向）](#️-实现上做了哪些取舍技术向)
  - [🧠 DeepSeek 在这里扮演什么角色](#-deepseek-在这里扮演什么角色)
  - [🎉 小结](#-小结)
  - [🔗 开源仓库与相关链接](#-开源仓库与相关链接)
    - [🏷️ 标签](#️-标签)

---

## 💭 你可能也遇到过这些场景

- 写玄幻、科幻、都市，**大段环境描写**写爽了，想有一张**参考图**做封面氛围或章前插图，却卡在「没有画师、没有预算」。  
- 用通用文生图网页，要**自己编提示词**，和正文**对不上**，改来改去像在写第二份作业。  
- 希望工具**和写作在同一屏**，不要写完一章再切五个网站。

「AI 场景图」的思路很简单：**以你刚写好的正文为锚**，选哪段、图就服务哪段；需要时再用大模型把「小说腔」收成「画面腔」，最后交给**通义万相**出图。

---

## ✍️ 功能怎么用（作者向）

1. **在章节编辑页**写好一段带画面感的正文（环境、人物状态、光线等）。  
2. **用鼠标选中**一段文字（不宜过短或过长：当前版本按**有效字数**校验，约为 **100～1000 字**，与软件全书统计规则一致，不含空白字符）。  
3. 点击编辑区右上角的 **「AI 场景图」**（在「AI 续写」下方）。  
4. 右侧会弹出 **抽屉**，顶部是**节选依据**（只读），中间可调整：  
   - **输出尺寸**（横版 1280×720 或方图 1280×1280）  
   - **画风**（日系动画、吉卜力、写实、国风、水彩等）  
   - **景别 / 环境 / 光线**（可选，帮助模型理解镜头）  
   - **画面描述**（会按节选**智能预填**一截，建议你改成更「画面向」的句子）  
   - 可选点 **「AI 提炼画面（DeepSeek）」**，用 DeepSeek 把整段节选收成短描述（需自行配置 DeepSeek API Key）  
   - **反向提示词**（可选，减少模糊、畸形、水印等）  
5. 点 **「生成场景图」**；满意可 **「再生成一张」** 多试几次。  
6. 生成成功后，抽屉里会**直接预览图片**，并显示**完整本地保存路径**，支持**一键复制**，方便你备份或交给别的工具继续用。

**需要准备的配置**：生成图片必须配置 **通义万相** API Key（在软件设置里，与 AI 封面、人物图共用）；「AI 提炼画面」额外需要 **DeepSeek** Key。

---

## ⚙️ 实现上做了哪些取舍（技术向）

整体仍是 **Electron 经典拆分**：渲染进程做 UI 与编辑器状态，**主进程**调外部 API、落盘，**Preload** 用 `contextBridge` 暴露受限 API，避免把 Key 暴露在网页里。

**和「AI 人物图」不一样的地方**：人物图是「临时目录生成 → 确认后再进 `character_images`」，因为要挂到**角色档案**的多张列表里。场景图当前按**独立插图**理解：**生成成功即写入** `{书籍目录}/scene_images/scene_{时间戳}.png`**，没有二次确认**，路径立刻回显——作者只关心「图在硬盘哪」。

**数据流（简化）**：

```
EditorPanel（选区 + 有效字数校验）
  → AISceneImageDialog（buildFullPrompt 拼接风格与场景词）
    → preload.generateAISceneImage / refineSceneVisualPromptWithAI
      → 主进程 IPC
        → tongyiwanxiangService.generateCover（文生图）
        → 可选：deepseekService.sceneVisualPromptFromExcerpt（提炼描述）
```

**主要源码位置**（便于对照）：

| 模块 | 路径 |
|------|------|
| 入口与选区校验 | `src/renderer/src/components/Editor/EditorPanel.vue` |
| 抽屉 UI 与提示词拼接 | `src/renderer/src/components/Editor/AISceneImageDialog.vue` |
| 场景图 IPC | `src/main/index.js`（`tongyiwanxiang:generate-scene-image`） |
| 提炼画面 IPC | `src/main/index.js`（`deepseek:scene-visual-prompt`） |
| 通义万相封装 | `src/main/services/tongyiwanxiang.js` |
| DeepSeek 封装 | `src/main/services/deepseek.js` |

---

## 🧠 DeepSeek 在这里扮演什么角色

小说正文往往偏**叙事**，整段塞进文生图 prompt 容易又长又散。除了打开抽屉时的**截断预填**，你还可以点 **「AI 提炼画面」**：主进程调用 `sceneVisualPromptFromExcerpt`，让模型只输出**偏视觉的中文描述**（环境、人物外观与动作、光线氛围等），再写回「画面描述」里继续改。  
DeepSeek 与润色、续写等功能共用调用通道，注意**频率限制**；另外在非流式 `chat` 成功返回时会清理 `pending`，避免误判「重复请求」。

---

## 🎉 小结

- **对作者**：选段 → 抽屉里调画风与场景 → 一键出图 → **本地 `scene_images` 落盘 + 路径可复制**，写作与配图尽量**同屏**完成。  
- **对开发者**：复用既有通义万相能力，场景图走独立 IPC 与目录，可选 DeepSeek 做「叙事 → prompt」的桥梁。

后续若你期待「插入到章节正文」「按章管理素材库」等，都可以在开源社区里提想法，一起迭代。

---

## 🔗 开源仓库与相关链接

如果你写小说、做工具，或单纯对 **Electron + Vue + AI** 感兴趣，欢迎来官网与仓库逛逛：

- 🌐 **官网**：[www.51mazi.com](https://www.51mazi.com) — 产品介绍、下载与更新说明  
- ⭐ **点个 Star**：[GitHub - 51mazi / 51mazi](https://github.com/xiaoshengxianjun/51mazi)  
- 📥 **下载体验**：在 [Releases](https://github.com/xiaoshengxianjun/51mazi/releases) 下载对应系统安装包，配置通义万相（及可选 DeepSeek）后即可使用 AI 场景图  
- 📖 **看源码**：`EditorPanel.vue`、`AISceneImageDialog.vue`、`main/index.js` 中 IPC 注册均有完整实现  
- 💬 **交流反馈**：欢迎提 Issue / Discussion，好的建议会变成下一个版本的功能  

**直达实现（GitHub 链接）**：

- [EditorPanel.vue - AI 场景图按钮与选区校验](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/components/Editor/EditorPanel.vue)  
- [AISceneImageDialog.vue - 抽屉与生成逻辑](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/renderer/src/components/Editor/AISceneImageDialog.vue)  
- [主进程 - generate-scene-image IPC](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/main/index.js)  
- [通义万相服务](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/main/services/tongyiwanxiang.js)  
- [DeepSeek 服务 - sceneVisualPromptFromExcerpt](https://github.com/xiaoshengxianjun/51mazi/blob/main/src/main/services/deepseek.js)  

---

### 🏷️ 标签

`#小说写作` `#51mazi` `#开源` `#Electron` `#Vue3` `#AI绘画` `#文生图` `#通义万相` `#DeepSeek` `#写作软件` `#创作工具`

---

> **如果这篇文章对你有帮助，欢迎访问官网 [www.51mazi.com](https://www.51mazi.com) 了解更多，并到 [GitHub 仓库](https://github.com/xiaoshengxianjun/51mazi) 给个 ⭐ Star，让更多人发现这款开源小说写作软件。**  
> 本文为基于 **51mazi** 中「AI 场景图」功能的整理，转载请注明项目出处与开源协议。
