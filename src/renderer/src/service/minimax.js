/**
 * Minimax AI 前端服务封装
 */

/**
 * 设置 Minimax API Key
 * @param {string} apiKey
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function setMinimaxApiKey(apiKey) {
  return await window.electron.setMinimaxApiKey(apiKey)
}

/**
 * 获取 Minimax API Key
 * @returns {Promise<{success: boolean, apiKey?: string}>}
 */
export async function getMinimaxApiKey() {
  return await window.electron.getMinimaxApiKey()
}

/**
 * 设置 Minimax URL
 * @param {string} url
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function setMinimaxUrl(url) {
  return await window.electron.setMinimaxUrl(url)
}

/**
 * 获取 Minimax URL
 * @returns {Promise<{success: boolean, url?: string}>}
 */
export async function getMinimaxUrl() {
  return await window.electron.getMinimaxUrl()
}

/**
 * 验证 API Key
 * @returns {Promise<{success: boolean, isValid: boolean, message?: string}>}
 */
export async function validateMinimaxApiKey() {
  return await window.electron.validateMinimaxApiKey()
}
