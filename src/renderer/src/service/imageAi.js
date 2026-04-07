/**
 * 图像 AI 多服务商：已配置列表、Gemini/豆包密钥、上次选用的服务商
 */

/** @typedef {'tongyi'|'gemini'|'doubao'} ImageProviderId */

/**
 * @returns {Promise<{ success: boolean, providers?: ImageProviderId[], message?: string }>}
 */
export async function listConfiguredImageProviders() {
  return await window.electron.listConfiguredImageProviders()
}

/**
 * @returns {Promise<{ success: boolean, provider?: string|null, message?: string }>}
 */
export async function getImageAiLastProvider() {
  return await window.electron.getImageAiLastProvider()
}

/**
 * @param {string} provider
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function setImageAiLastProvider(provider) {
  return await window.electron.setImageAiLastProvider(provider)
}

export async function setGeminiApiKey(apiKey) {
  return await window.electron.setGeminiApiKey(apiKey)
}

export async function getGeminiApiKey() {
  return await window.electron.getGeminiApiKey()
}

export async function validateGeminiApiKey() {
  return await window.electron.validateGeminiApiKey()
}

/**
 * @param {{ apiKey?: string, baseUrl?: string, model?: string }} payload
 */
export async function setDoubaoConfig(payload) {
  return await window.electron.setDoubaoConfig(payload)
}

export async function getDoubaoConfig() {
  return await window.electron.getDoubaoConfig()
}

export async function validateDoubaoConfig() {
  return await window.electron.validateDoubaoConfig()
}
