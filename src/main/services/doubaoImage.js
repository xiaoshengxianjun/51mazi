/**
 * 火山引擎方舟 — 豆包等文生图（OpenAI 兼容 images/generations）
 * 文档：https://www.volcengine.com/docs/82379/（以控制台当前文档为准）
 */

export const DEFAULT_DOUBAO_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'

/**
 * 通义「宽*高」转为方舟常见「宽x高」
 * @param {string} sizeStr
 * @returns {string}
 */
export function mapTongyiSizeToDoubaoSize(sizeStr) {
  const parts = String(sizeStr || '').split('*')
  const w = parseInt(parts[0], 10)
  const h = parseInt(parts[1], 10)
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    return `${w}x${h}`
  }
  return '1024x1024'
}

/**
 * @param {Object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.model
 * @param {string} [opts.baseUrl]
 * @param {string} opts.prompt
 * @param {string} [opts.size] 通义格式 宽*高
 * @param {string} [opts.negativePrompt]
 * @returns {Promise<Buffer>}
 */
export async function generateImageBuffer({
  apiKey,
  model,
  baseUrl,
  prompt,
  size,
  negativePrompt
}) {
  if (!apiKey?.trim()) {
    throw new Error('豆包 API Key 未设置，请在设置中配置')
  }
  if (!model?.trim()) {
    throw new Error('豆包模型 ID 未设置，请在设置中填写')
  }
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('提示词不能为空')
  }

  const root = String(baseUrl || DEFAULT_DOUBAO_BASE_URL).replace(/\/$/, '')
  const url = `${root}/images/generations`

  let fullPrompt = prompt.trim()
  if (negativePrompt && String(negativePrompt).trim()) {
    fullPrompt += `，避免：${String(negativePrompt).trim()}`
  }

  const body = {
    model: model.trim(),
    prompt: fullPrompt,
    n: 1,
    size: mapTongyiSizeToDoubaoSize(size),
    response_format: 'b64_json'
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`
    },
    body: JSON.stringify(body)
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      `豆包图像 API 请求失败: ${response.status} ${response.statusText}`
    throw new Error(msg)
  }

  const b64 = data.data?.[0]?.b64_json
  if (b64) {
    return Buffer.from(b64, 'base64')
  }

  const imageUrl = data.data?.[0]?.url
  if (imageUrl && typeof imageUrl === 'string') {
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) {
      throw new Error(`下载豆包返回的图片失败: ${imgRes.status}`)
    }
    return Buffer.from(await imgRes.arrayBuffer())
  }

  throw new Error('豆包图像 API 未返回有效图片数据')
}

/**
 * 与通义万相当前策略一致：仅检查字段已填，避免无谓扣费
 * @param {string} apiKey
 * @param {string} model
 * @returns {{ isValid: boolean, message?: string }}
 */
export function validateConfigNonEmpty(apiKey, model) {
  if (!apiKey?.trim()) {
    return { isValid: false, message: 'API Key 未设置' }
  }
  if (!model?.trim()) {
    return { isValid: false, message: '模型 ID 未设置' }
  }
  return { isValid: true }
}
