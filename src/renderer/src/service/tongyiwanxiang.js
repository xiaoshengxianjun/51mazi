/**
 * 通义万相 AI 封面 - 前端服务封装
 * 通过 IPC 调用主进程中的通义万相能力
 */

/**
 * 设置通义万相 API Key
 * @param {string} apiKey
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function setTongyiwanxiangApiKey(apiKey) {
  return await window.electron.setTongyiwanxiangApiKey(apiKey)
}

/**
 * 获取通义万相 API Key
 * @returns {Promise<{success: boolean, apiKey?: string}>}
 */
export async function getTongyiwanxiangApiKey() {
  return await window.electron.getTongyiwanxiangApiKey()
}

/**
 * 验证通义万相 API Key
 * @returns {Promise<{success: boolean, isValid: boolean, message?: string}>}
 */
export async function validateTongyiwanxiangApiKey() {
  return await window.electron.validateTongyiwanxiangApiKey()
}

/**
 * 调用通义万相生成封面，并在主进程中下载保存到书籍目录
 * @param {Object} options
 * @param {string} options.prompt - 封面提示词（正向）
 * @param {string} options.size - API 尺寸，如 "1200*1600"
 * @param {string} options.bookName - 书籍名称（用于落盘路径）
 * @param {string} [options.negativePrompt] - 反向提示词，可选
 * @returns {Promise<{success: boolean, localPath?: string, message?: string}>}
 */
export async function generateAICover(options) {
  return await window.electron.generateAICover(options)
}
