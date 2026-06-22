/**
 * AI 漫画 - 前端服务封装
 */

/** IPC 仅接受可 structured clone 的纯数据，剥离 Vue Proxy 等 */
function toIpcPlain(value) {
  return JSON.parse(JSON.stringify(value))
}

/**
 * 生成分镜脚本
 * @param {Object} payload
 * @param {string} payload.text
 * @param {number} [payload.panelCount]
 * @param {string} [payload.comicStyleLabel]
 * @param {string} [payload.bookName]
 */
export async function generateComicStoryboardWithAI(payload) {
  return await window.electron.generateComicStoryboardWithAI(toIpcPlain(payload))
}

/**
 * 初始化漫画批次目录并写入 storyboard.json
 * @param {Object} options
 * @param {string} options.bookName
 * @param {string} [options.chapterTitle]
 * @param {unknown} options.storyboard
 */
export async function initComicBatch(options) {
  return await window.electron.initComicBatch(toIpcPlain(options))
}

/**
 * 生成单格漫画分镜图
 * @param {Object} options
 * @param {string} options.prompt
 * @param {string} options.size
 * @param {string} options.batchDir
 * @param {number} options.panelIndex
 * @param {string} [options.negativePrompt]
 * @param {string} [options.imageProvider]
 */
export async function generateAIComicPanelImage(options) {
  const plain = toIpcPlain(options)
  if (plain.negativePrompt === undefined || plain.negativePrompt === null) {
    delete plain.negativePrompt
  }
  return await window.electron.generateAIComicPanelImage(plain)
}

/**
 * 读取人物谱（用于分镜出图时拼接外貌）
 * @param {string} bookName
 */
export async function readCharactersForComic(bookName) {
  if (!window.electron?.readCharacters) return []
  const data = await window.electron.readCharacters(bookName)
  return Array.isArray(data) ? data : []
}

/** 从人物列表构建 name -> appearance 映射 */
export function buildAppearanceMap(characters, names = []) {
  const out = {}
  const list = Array.isArray(characters) ? characters : []
  const wanted = (Array.isArray(names) ? names : [])
    .map((n) => String(n || '').trim())
    .filter(Boolean)
  if (!wanted.length) return out
  for (const name of wanted) {
    const found = list.find((c) => String(c?.name || '').trim() === name)
    if (found?.appearance) {
      out[name] = String(found.appearance).trim().slice(0, 150)
    }
  }
  return out
}
