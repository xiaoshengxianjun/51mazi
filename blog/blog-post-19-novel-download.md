# 🔍 在 Electron 里造一个「搜书 + 下载」：从 so-novel 到 51mazi 的爬虫实践

> **一句话推荐**：在 Electron + Vue 3 里实现「搜书名 → 选书源 → 一键下载到本地」的完整方案，含多书源配置、Cheerio 解析、GBK 编码、正文去广告与 IPC 踩坑实录，附源码与 GitHub 链接。

> 💡 **适合谁读**：做 Electron / Vue 桌面应用、想接「网页抓取」或「多数据源聚合」的开发者；对 so-novel、小说下载、Cheerio 爬虫感兴趣的读者。本文从产品界面到主进程实现、从书源配置到踩坑实录一条龙讲清，文末附完整代码地图与 GitHub 链接，欢迎 Star 与 Fork，仅供学习与合规使用。
>
> **📌 阅读收获**：Electron 主进程里用 fetch + Cheerio 做多书源抓取的完整思路；书源配置驱动、GET/POST/编码/选择器的落地写法；Vue 响应式对象经 IPC 传递时的「对象无法克隆」问题与解决方案；正文去广告的 filterTxt 设计。

## 📋 目录

- [📸 功能长什么样：一图看懂](#-功能长什么样一图看懂)
- [💡 需求从哪来：so-novel 的启发](#-需求从哪来so-novel-的启发)
- [🏗️ 整体架构：谁在干活、谁在展示](#️-整体架构谁在干活谁在展示)
- [⚙️ 书源配置：把「规则」搬进 JavaScript](#️-书源配置把规则搬进-javascript)
- [🛠️ 抓取三板斧：请求、编码、解析](#️-抓取三板斧请求编码解析)
- [🧹 正文清洗：filterTxt 与广告说再见](#-正文清洗filtertxt-与广告说再见)
- [🐛 踩坑实录：超时、编码、以及「对象无法克隆」](#-踩坑实录超时编码以及对象无法克隆)
- [🎨 前端体验：进度、取消与免责](#-前端体验进度取消与免责)
- [🎉 小结与 GitHub](#-小结与-github)

---

## 📸 功能长什么样：一图看懂

在 51mazi 里，从首页侧栏进入「下载小说」，你会看到：顶部悬浮栏（返回首页 + 页面说明）、书源选择与搜索框、搜索结果列表，以及选中某本书后的目录信息与操作按钮。

![51mazi 下载小说页面](https://raw.githubusercontent.com/xiaoshengxianjun/51mazi/main/static/novelDownload.png)

*搜索「火影」后的结果：多书源列表、选中书籍的章节数与「下载并加入书架 / 导出为 TXT / 取消」操作 — 全部在写作软件内完成，无需切浏览器*

流程很简单：**选书源 → 输入书名或作者 → 搜索 → 点某本书的「下载」→ 拉取目录后选择「下载并加入书架」或「导出为 TXT」**。下面从实现角度拆解：规则从哪来、谁在请求、谁在解析、以及我们踩了哪些坑。文末有完整代码地图与 GitHub 链接，方便你直接对照源码或给项目点个 Star。

---

## 💡 需求从哪来：so-novel 的启发

[so-novel](https://github.com/freeok/so-novel) 是一个用 Java 写的小说搜索与下载工具，核心思路是：**用 JSON 配置描述每个书源的搜索方式、列表/目录/正文的 CSS 选择器**，再写一套通用引擎去「按规则抓」。我们不想重写 Java，但可以复用同一套「规则思维」：把 main.json 里的书源抽象成「搜索接口 + 选择器 + 过滤正则」，在 Node 里用 `fetch` + Cheerio 实现一版，塞进 Electron 主进程，渲染进程只负责搜索框、结果列表和「下载 / 导出 TXT」。

目标很明确：

- 用户输入书名或作者 → 当前书源搜索 → 展示结果列表  
- 用户点某本书 → 拉取目录 → 可选「下载并加入书架」或「导出为 TXT」  
- 正文要能去广告、去站内推广文案，尽量干净

下面就从架构到实现、从配置到坑，捋一遍。

---

## 🏗️ 整体架构：谁在干活、谁在展示

51mazi 是 Electron + Vue 3。**所有对外请求和 HTML 解析都放在主进程**，避免渲染进程直接请求第三方站点带来的跨域和安全性问题；渲染进程只通过 IPC 发「搜索 / 拉目录 / 下载章节」的指令，并接收进度事件。

```
┌─────────────────────────────────────────────────────────────────┐
│  渲染进程 (Vue 3)                                                │
│  NovelDownload.vue：搜索框、书源选择、结果表、下载区、进度条      │
│  novel.js：封装 window.electron.novel*，序列化章节再发 IPC        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ IPC: novel:search / get-chapter-list / download-chapters
                            │ 事件: novel-download-progress
▼───────────────────────────┴─────────────────────────────────────┐
│  主进程 (Node.js)                                                  │
│  novelDownloader.js：fetchHtml、Cheerio 解析、cleanContent        │
│  index.js：ipcMain.handle('novel:*')，下载时 send('novel-download-progress') │
└───────────────────────────────────────────────────────────────────┘
```

这样做的结果：**爬虫逻辑和书源规则集中在一个服务文件里**，便于维护和扩展书源；前端只关心「调接口、展示、进度」。

---

## ⚙️ 书源配置：把「规则」搬进 JavaScript

so-novel 的规则是 JSON：搜索 URL、GET/POST、搜索参数模板、列表/书名/作者/目录/正文的选择器、正文过滤正则等。我们在 `novelDownloader.js` 里用了一个 `BOOK_SOURCES` 数组，每个元素对应一个书源，例如：

```javascript
{
  id: 'xbiqugu',
  name: '香书小说',
  encoding: 'utf-8',
  searchMethod: 'post',
  searchUrl: 'http://www.xbiqugu.la/modules/article/waps.php',
  searchData: '{"searchkey": "%s"}',
  searchListSelector: '#checkform > table > tbody > tr',
  searchTitleSelector: 'td.even > a',
  searchAuthorSelector: 'td:nth-of-type(3)',
  searchBookUrlAttr: 'href',
  chapterListSelector: '#list > dl > dd > a',
  contentSelector: '#content',
  filterTxt: '一秒记住【文学巴士...】|(www.xbiquge.la...)|...'
}
```

- **GET / POST**：`searchMethod` 为 `get` 时用 URL 拼 `%s`（关键词）；为 `post` 时用 `searchData` 模板，`%s` 替换为 JSON 转义后的关键词，再 `fetch(..., { method: 'POST', body })`。  
- **目录 URL 不一定等于书籍页**：有的书源目录是单独路径，用 `tocUrlPattern: 'https://xxx/read/%s/'`，从书籍 URL 里抽出 bookId 再拼成目录页。  
- **encoding**：不少站是 GBK，用 `iconv-lite` 在拿到 `ArrayBuffer` 后解码成字符串再交给 Cheerio。

这样，新增书源就是往 `BOOK_SOURCES` 里推一个对象，不用改业务逻辑。

---

## 🛠️ 抓取三板斧：请求、编码、解析

### 📡 1. 请求：fetch + 超时 + 像浏览器

主进程里用原生 `fetch`，配合 `AbortController` 做超时（例如 25 秒），避免某个书源卡死整条链路。请求头尽量像浏览器：`User-Agent`、`Accept`、`Accept-Language`、`Cache-Control`、`Pragma`，减少被站点当脚本直接掐的概率。

```javascript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
const res = await fetch(url, { signal: controller.signal, redirect: 'follow', headers })
// ...
clearTimeout(timeoutId)
```

超时或连接失败时，把错误转成用户可读的「请求超时 / 无法连接书源，请检查网络或更换书源」再抛给前端。

### 🔤 2. 编码：UTF-8 与 GBK

`res.arrayBuffer()` 拿到的是原始字节。若书源声明 `encoding: 'gbk'`，就用 `iconv-lite` 解码：

```javascript
const buf = await res.arrayBuffer()
const bytes = new Uint8Array(buf)
if (encoding && encoding.toLowerCase() !== 'utf-8') {
  return iconv.decode(Buffer.from(bytes), encoding)
}
return new TextDecoder('utf-8').decode(bytes)
```

否则 Cheerio 解析时会得到乱码，书名、作者、正文全挂。

### 🔍 3. 解析：Cheerio 按选择器抽

搜索页：用 `searchListSelector` 找到每一行，再在每行里用 `searchTitleSelector` / `searchAuthorSelector` 取书名、作者，用 `searchBookUrlAttr` 取链接，并 `resolveUrl(base, href)` 转成绝对 URL。  
目录页：用 `chapterListSelector` 遍历 `<a>`，收集 `text` 和 `href`。  
正文页：用 `contentSelector` 取一块 HTML，交给清洗函数。

---

## 🧹 正文清洗：filterTxt 与广告说再见

很多站会在正文里插「一秒记住本站」「手机用户请…」「本章完」等。我们在 so-novel 里看到用 `filterTxt` 存一串正则，用 `|` 分隔，在正文里逐个替换掉。实现方式：

- 先把 HTML 变成纯文本：去 `<script>` / `<style>`，`<br>` 换行，其他标签去壳，HTML 实体解码。  
- 若配置了 `filterTxt`，按 `|` 拆成多条正则，对文本做 `replace(re, '')`，无效正则静默跳过。  
- 最后把连续多个换行压成双换行，trim。

这样导出的 TXT 和加入书架后的正文会干净很多。

---

## 🐛 踩坑实录：超时、编码、以及「对象无法克隆」

### ⏱️ 超时与连接错误

一开始用较短超时，部分书源响应慢，容易报错。把超时调到 25 秒，并对 `AbortError`、`ECONNREFUSED`、`UND_ERR_CONNECT_TIMEOUT` 做专门处理，统一成前端可展示的文案，避免直接把 Node 的报错扔给用户。

### 🔤 编码

某书源列表乱码，检查后发现该站是 GBK 而代码里按 UTF-8 解。给该书源加上 `encoding: 'gbk'`，并用 `iconv-lite` 解码后恢复正常。

### 🔗 「An object could not be cloned」

下载章节时要把「章节列表」从渲染进程传到主进程。章节列表来自 Vue 的响应式数据，本质是 Proxy。Electron IPC 使用结构化克隆，**无法序列化 Proxy**，会报 "An object could not be cloned"。

解决办法：在调用 `novelDownloadChapters` 前，先把章节列表转成纯对象数组再传：

```javascript
const plainList = (chapterList || []).map((c) => ({
  title: String(c.title),
  url: String(c.url)
}))
return window.electron.novelDownloadChapters({ chapterList: plainList, sourceId })
```

这样主进程拿到的是普通数组，不再碰 Vue 的 Proxy。

---

## 🎨 前端体验：进度、取消与免责

- **进度**：主进程在每章抓取完成后 `event.sender.send('novel-download-progress', { current, total })`，渲染进程监听 `novel-download-progress`，更新进度条并禁用按钮，避免重复点击。  
- **取消 / 换书**：用户取消或切换书籍时，除了清空当前选中书和目录，还要把「下载中」状态和进度重置，否则会一直卡在「下载中」。  
- **导出 TXT**：和「下载并加入书架」共用同一套章节拉取逻辑，只是最后一步改为写单个 TXT 文件到用户选择目录。  
- **免责声明**：页面顶部保留醒目免责说明：个人非商业使用、用户对内容合法性自负、禁止传播侵权内容等，既合规又降低法律风险。

---

## 🎉 小结与 GitHub

在 Electron 里做「搜书 + 下载」，本质是：**主进程负责请求与解析，书源用配置驱动，渲染进程只发指令和展示**。借鉴 so-novel 的规则设计，用 Node + Cheerio + iconv-lite 实现多书源、GET/POST、编码与正文过滤，再把 IPC 和 Vue 响应式之间的「可序列化」问题处理掉，就能在 51mazi 里实现一版可用的下载小说功能。

**本文要点回顾：**

- ✅ **多书源、可配置**：书源用 JS 对象描述，新增书源只需加配置，无需改引擎
- ✅ **主进程抓取、渲染进程展示**：请求与解析在主进程，避免跨域与安全风险
- ✅ **编码与超时**：GBK 用 iconv-lite，fetch 用 AbortController 超时，错误转成用户可读提示
- ✅ **正文去广告**：filterTxt 多段正则，导出 TXT 与加入书架后的正文更干净
- ✅ **Vue Proxy 与 IPC**：章节列表先转成纯对象再传主进程，避免「对象无法克隆」

**核心文件一览：**

| 文件 | 职责 |
|------|------|
| `src/main/services/novelDownloader.js` | 书源配置、fetchHtml、搜索/目录/正文解析、cleanContent |
| `src/main/index.js` | `novel:get-sources` / `novel:search` / `novel:get-chapter-list` / `novel:download-chapters`，进度事件 |
| `src/preload/index.js` | 暴露 `novel*` API，转发 `novel-download-progress` |
| `src/renderer/src/service/novel.js` | 封装 IPC，章节列表序列化后再传主进程 |
| `src/renderer/src/views/NovelDownload.vue` | 搜索 UI、结果表、下载区、进度条、免责声明 |

如果你也在给桌面应用加「从网页抓内容」的能力，希望这篇从 so-novel 到 51mazi 的实践能帮你少踩一点坑。**51mazi 完全开源**，欢迎直接拿代码、提 Issue、提 PR；使用本功能时请务必遵守当地法律法规与版权要求，仅限个人学习与合规使用。

- **GitHub 仓库**：[51mazi](https://github.com/xiaoshengxianjun/51mazi) — ⭐ **给个 Star 支持一下，让更多写作者发现这款工具！**
- **同系列**：书架管理、AI 封面、地图设计等可参考仓库内其他博客与源码。

### 🏷️ 标签

`#Electron` `#Vue3` `#爬虫` `#Cheerio` `#小说下载` `#so-novel` `#IPC` `#多书源` `#51mazi` `#写作软件`

---

> 💡 **如果这篇文章对你有帮助，欢迎在 GitHub 给 51mazi 点个 ⭐️ Star，让更多写作者和开发者发现这个项目！**
>
> 本文基于 51mazi 开源项目「下载小说」功能，仅供学习与合规使用。
