/**
 * DeepSeek AI 前端服务封装
 */

/**
 * 设置 DeepSeek API Key
 * @param {string} apiKey
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function setDeepSeekApiKey(apiKey) {
  return await window.electron.setDeepSeekApiKey(apiKey)
}

/**
 * 获取 DeepSeek API Key
 * @returns {Promise<{success: boolean, apiKey?: string}>}
 */
export async function getDeepSeekApiKey() {
  return await window.electron.getDeepSeekApiKey()
}

/**
 * AI 随机起名
 * @param {Object} options
 * @param {string} options.type - 类型：'cn'|'jp'|'en'|'force'|'place'|'book'|'item'|'elixir'
 * @param {string} options.surname - 姓氏（可选）
 * @param {string} options.gender - 性别：'男'|'女'（可选）
 * @param {number} options.nameLength - 名字长度（可选）
 * @param {string} options.middleChar - 中间字（可选）
 * @param {number} options.count - 生成数量，默认 24
 * @returns {Promise<{success: boolean, names: string[], message?: string}>}
 */
export async function generateNamesWithAI(options) {
  return await window.electron.generateNamesWithAI(options)
}

/**
 * 验证 API Key
 * @returns {Promise<{success: boolean, isValid: boolean, message?: string}>}
 */
export async function validateDeepSeekApiKey() {
  return await window.electron.validateDeepSeekApiKey()
}
