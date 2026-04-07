/**
 * Google Gemini API — Imagen 文生图（predict）
 * 文档：https://ai.google.dev/gemini-api/docs/imagen
 * 鉴权：Header x-goog-api-key
 */

const IMAGEN_MODEL = 'imagen-4.0-generate-001'
const PREDICT_URL = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict`

/**
 * 将「宽*高」映射到 Imagen 支持的 aspectRatio
 * @param {string} sizeStr
 * @returns {string}
 */
export function mapTongyiSizeToAspectRatio(sizeStr) {
  const parts = String(sizeStr || '').split('*')
  const w = parseInt(parts[0], 10)
  const h = parseInt(parts[1], 10)
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return '1:1'
  const ratio = w / h
  const targets = [
    { ar: '1:1', r: 1 },
    { ar: '3:4', r: 3 / 4 },
    { ar: '4:3', r: 4 / 3 },
    { ar: '9:16', r: 9 / 16 },
    { ar: '16:9', r: 16 / 9 }
  ]
  let best = targets[0]
  let bestDiff = Math.abs(Math.log(ratio) - Math.log(best.r))
  for (const t of targets) {
    const d = Math.abs(Math.log(ratio) - Math.log(t.r))
    if (d < bestDiff) {
      best = t
      bestDiff = d
    }
  }
  return best.ar
}

/**
 * 从 predict 响应中取出第一张图的 base64 字符串
 * @param {unknown} pred
 * @returns {string|null}
 */
function extractBase64FromPrediction(pred) {
  if (!pred || typeof pred !== 'object') {
    if (typeof pred === 'string') return pred
    return null
  }
  if (typeof pred.bytesBase64Encoded === 'string') return pred.bytesBase64Encoded
  if (typeof pred.bytes_base64_encoded === 'string') return pred.bytes_base64_encoded
  if (pred.image?.imageBytes) return pred.image.imageBytes
  if (pred.image?.bytesBase64Encoded) return pred.image.bytesBase64Encoded
  const gi = pred.generatedImages?.[0]?.image
  if (gi?.imageBytes) return gi.imageBytes
  if (gi?.bytesBase64Encoded) return gi.bytesBase64Encoded
  return null
}

/**
 * @param {Object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.prompt
 * @param {string} [opts.size]
 * @param {string} [opts.negativePrompt]
 * @returns {Promise<Buffer>}
 */
export async function generateImageBuffer({ apiKey, prompt, size, negativePrompt }) {
  if (!apiKey?.trim()) {
    throw new Error('Gemini API Key 未设置，请在设置中配置')
  }
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('提示词不能为空')
  }

  let fullPrompt = prompt.trim()
  // Imagen REST 无独立 negative_prompt 字段时，合并进主提示（与官方「英文 prompt」建议一致）
  if (negativePrompt && String(negativePrompt).trim()) {
    fullPrompt += `. Avoid the following: ${String(negativePrompt).trim()}`
  }

  const aspectRatio = mapTongyiSizeToAspectRatio(size)
  const body = {
    instances: [{ prompt: fullPrompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio,
      imageSize: '1K',
      personGeneration: 'allow_adult'
    }
  }

  const response = await fetch(PREDICT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey.trim()
    },
    body: JSON.stringify(body)
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      `Gemini Imagen 请求失败: ${response.status} ${response.statusText}`
    throw new Error(msg)
  }

  const predictions = data.predictions
  if (!Array.isArray(predictions) || predictions.length === 0) {
    throw new Error('Gemini Imagen 未返回图片数据')
  }

  const b64 = extractBase64FromPrediction(predictions[0])
  if (!b64) {
    throw new Error('Gemini Imagen 返回格式异常，无法解析图片')
  }

  return Buffer.from(b64, 'base64')
}

/**
 * 低成本校验：拉取模型列表（不产生图像计费）
 * @param {string} apiKey
 * @returns {Promise<{ isValid: boolean, message?: string }>}
 */
export async function validateApiKey(apiKey) {
  if (!apiKey?.trim()) {
    return { isValid: false, message: 'API Key 未设置' }
  }
  try {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1'
    const res = await fetch(url, {
      headers: { 'x-goog-api-key': apiKey.trim() }
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        isValid: false,
        message: data?.error?.message || `校验失败: ${res.status}`
      }
    }
    return { isValid: true }
  } catch (e) {
    return { isValid: false, message: e?.message || '网络错误' }
  }
}
