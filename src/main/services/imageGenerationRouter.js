/**
 * 文生图统一入口：按 imageProvider 路由到通义万相 / Gemini Imagen / 豆包
 */

import tongyiwanxiangService from './tongyiwanxiang.js'
import * as geminiImagen from './geminiImagen.js'
import * as doubaoImage from './doubaoImage.js'

export const IMAGE_PROVIDER_TONGYI = 'tongyi'
export const IMAGE_PROVIDER_GEMINI = 'gemini'
export const IMAGE_PROVIDER_DOUBAO = 'doubao'

export const IMAGE_PROVIDERS = [
  IMAGE_PROVIDER_TONGYI,
  IMAGE_PROVIDER_GEMINI,
  IMAGE_PROVIDER_DOUBAO
]

/**
 * @param {*} store - electron-store 实例
 * @param {{ imageProvider?: string, prompt: string, size: string, negativePrompt?: string }} options
 * @returns {Promise<Buffer>}
 */
export async function generateImageBuffer(store, options) {
  const { imageProvider = IMAGE_PROVIDER_TONGYI, prompt, size, negativePrompt = '' } =
    options || {}

  if (imageProvider === IMAGE_PROVIDER_TONGYI) {
    await tongyiwanxiangService.initApiKey((key) => store.get(key))
    const imageUrl = await tongyiwanxiangService.generateCover({
      prompt,
      size,
      negativePrompt
    })
    const res = await fetch(imageUrl)
    if (!res.ok) {
      throw new Error(`下载生成图片失败: ${res.status} ${res.statusText}`)
    }
    return Buffer.from(await res.arrayBuffer())
  }

  if (imageProvider === IMAGE_PROVIDER_GEMINI) {
    const apiKey = store.get('gemini.apiKey', '')
    return geminiImagen.generateImageBuffer({
      apiKey,
      prompt,
      size,
      negativePrompt
    })
  }

  if (imageProvider === IMAGE_PROVIDER_DOUBAO) {
    const apiKey = store.get('doubao.apiKey', '')
    const model = store.get('doubao.model', '')
    const baseUrl = store.get('doubao.baseUrl', '') || undefined
    return doubaoImage.generateImageBuffer({
      apiKey,
      model,
      baseUrl,
      prompt,
      size,
      negativePrompt
    })
  }

  throw new Error(`不支持的图像服务: ${imageProvider}`)
}

/**
 * @param {*} store - electron-store 实例
 * @returns {string[]}
 */
export function listConfiguredImageProviders(store) {
  const out = []
  const tongyi = store.get('tongyiwanxiang.apiKey', '')
  if (tongyi && String(tongyi).trim()) out.push(IMAGE_PROVIDER_TONGYI)

  const gemini = store.get('gemini.apiKey', '')
  if (gemini && String(gemini).trim()) out.push(IMAGE_PROVIDER_GEMINI)

  const doubaoKey = store.get('doubao.apiKey', '')
  const doubaoModel = store.get('doubao.model', '')
  if (doubaoKey && String(doubaoKey).trim() && doubaoModel && String(doubaoModel).trim()) {
    out.push(IMAGE_PROVIDER_DOUBAO)
  }

  return out
}
