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

/**
 * 确认使用某张已生成的封面：复制为书籍 cover 并清理临时文件
 * @param {Object} options
 * @param {string} options.bookName - 书籍名称
 * @param {string} options.chosenPath - 选中的本地图片路径
 * @returns {Promise<{success: boolean, localPath?: string, message?: string}>}
 */
export async function confirmAICover(options) {
  return await window.electron.confirmAICover(options)
}

/**
 * 丢弃本会话生成的临时封面（关闭抽屉未确认时调用）
 * @param {Object} options
 * @param {string} options.bookName - 书籍名称
 */
export async function discardAICovers(options) {
  return await window.electron.discardAICovers(options)
}

// --------- 通义万相 AI 人物图 ---------

/**
 * 调用通义万相生成人物图，并在主进程中下载保存到书籍目录临时文件夹
 * @param {Object} options
 * @param {string} options.prompt - 人物图提示词（正向）
 * @param {string} options.size - API 尺寸，如 "1024*1024"
 * @param {string} options.bookName - 书籍名称
 * @param {string} [options.negativePrompt] - 反向提示词，可选
 * @returns {Promise<{success: boolean, localPath?: string, message?: string}>}
 */
export async function generateAICharacterImage(options) {
  return await window.electron.generateAICharacterImage(options)
}

/**
 * 确认使用某张已生成的人物图：复制到书籍 avatars 目录并返回本地路径
 * @param {Object} options
 * @param {string} options.bookName - 书籍名称
 * @param {string} options.chosenPath - 选中的本地图片路径
 * @returns {Promise<{success: boolean, localPath?: string, message?: string}>}
 */
export async function confirmAICharacterImage(options) {
  return await window.electron.confirmAICharacterImage(options)
}

/**
 * 丢弃本会话生成的临时人物图（关闭抽屉未确认时调用）
 * @param {Object} options
 * @param {string} options.bookName - 书籍名称
 */
export async function discardAICharacterImages(options) {
  return await window.electron.discardAICharacterImages(options)
}
